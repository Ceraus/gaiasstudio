import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, BookOpen, Check, Plus, Trash2 } from 'lucide-react';
import type { Ingredient, Recipe } from '@/types';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';

interface RecipeForm {
  name: string;
  benefit: string;
  netWeight: string;
  directions: string;
  warnings: string;
  footer: string;
  ingredientIds: string[];
}

const emptyForm: RecipeForm = {
  name: '',
  benefit: '',
  netWeight: '',
  directions: '',
  warnings: '',
  footer: '',
  ingredientIds: [],
};

export default function RecipesScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);

  const reload = async () => {
    setRecipes(await recipesRepo.all());
    setIngredients(await ingredientsRepo.all());
  };
  useEffect(() => {
    void reload();
  }, []);

  const selectRecipe = (r: Recipe) => {
    setEditingId(r.id);
    setForm({
      name: r.name,
      benefit: r.benefit,
      netWeight: r.netWeight ?? '',
      directions: r.directions ?? '',
      warnings: r.warnings ?? '',
      footer: r.footer ?? '',
      ingredientIds: r.ingredientIds,
    });
  };

  const newRecipe = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editingId) await recipesRepo.update(editingId, form);
    else {
      const created = await recipesRepo.create(form);
      setEditingId(created.id);
    }
    await reload();
  };

  const remove = async (id: string) => {
    await recipesRepo.remove(id);
    if (editingId === id) newRecipe();
    await reload();
  };

  const toggleIngredient = (id: string) => {
    setForm((f) => ({
      ...f,
      ingredientIds: f.ingredientIds.includes(id)
        ? f.ingredientIds.filter((x) => x !== id)
        : [...f.ingredientIds, id],
    }));
  };

  const checklist = useMemo(() => {
    const selected = ingredients.filter((i) => form.ingredientIds.includes(i.id));
    return {
      hasName: !!form.name.trim(),
      hasIngredients: selected.length > 0,
      hasSoapBase: selected.some((i) => i.isSoapBase),
      hasBenefit: !!form.benefit.trim(),
    };
  }, [form, ingredients]);

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gaia-900">{t('recipes.title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{t('recipes.subtitle')}</p>
          </div>
          <button className="btn-primary" onClick={newRecipe}>
            <Plus className="h-4 w-4" /> {t('recipes.new')}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Recipe list */}
          <div className="space-y-2">
            {recipes.length === 0 ? (
              <div className="card text-center text-sm text-slate-500">{t('recipes.empty')}</div>
            ) : (
              recipes.map((r) => (
                <button
                  key={r.id}
                  onClick={() => selectRecipe(r)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition ${
                    editingId === r.id
                      ? 'bg-white ring-2 ring-gaia-500'
                      : 'bg-white ring-slate-100 hover:ring-gaia-200'
                  }`}
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gaia-100 text-gaia-700">
                    <BookOpen className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">{r.name}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {r.ingredientIds.length} {t('recipes.ingredients').toLowerCase()}
                    </span>
                  </span>
                  <Trash2
                    className="h-4 w-4 shrink-0 text-slate-300 hover:text-rose-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      void remove(r.id);
                    }}
                  />
                </button>
              ))
            )}
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <div className="card space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t('recipes.name')}</label>
                  <input
                    className="input"
                    placeholder={t('recipes.namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('recipes.netWeight')}</label>
                  <input
                    className="input"
                    placeholder={t('recipes.netWeightPlaceholder')}
                    value={form.netWeight}
                    onChange={(e) => setForm({ ...form, netWeight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">{t('recipes.benefit')}</label>
                <input
                  className="input"
                  placeholder={t('recipes.benefitPlaceholder')}
                  value={form.benefit}
                  onChange={(e) => setForm({ ...form, benefit: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t('recipes.directions')}</label>
                  <textarea
                    className="input min-h-[64px]"
                    placeholder={t('recipes.directionsPlaceholder')}
                    value={form.directions}
                    onChange={(e) => setForm({ ...form, directions: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('recipes.warnings')}</label>
                  <textarea
                    className="input min-h-[64px]"
                    placeholder={t('recipes.warningsPlaceholder')}
                    value={form.warnings}
                    onChange={(e) => setForm({ ...form, warnings: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">{t('recipes.footer')}</label>
                <input
                  className="input"
                  placeholder={t('recipes.footerPlaceholder')}
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Ingredient picker */}
              <div className="card">
                <div className="mb-2 flex items-center justify-between">
                  <p className="label mb-0">{t('recipes.ingredients')}</p>
                  <button className="text-xs text-gaia-700 hover:underline" onClick={() => goto('ingredients')}>
                    + {t('ingredients.new')}
                  </button>
                </div>
                {ingredients.length === 0 ? (
                  <p className="text-xs text-slate-400">{t('ingredients.empty')}</p>
                ) : (
                  <ul className="max-h-56 space-y-1 overflow-y-auto pr-1">
                    {ingredients.map((i) => (
                      <li key={i.id}>
                        <label className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-gaia-600"
                            checked={form.ingredientIds.includes(i.id)}
                            onChange={() => toggleIngredient(i.id)}
                          />
                          <span className="flex-1 truncate text-slate-700">{i.name}</span>
                          {i.isSoapBase && (
                            <span className="chip bg-gaia-100 text-gaia-700">{t('ingredients.soapBaseTag')}</span>
                          )}
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Live checklist */}
              <div className="card">
                <p className="label">{t('recipes.checklist')}</p>
                <ul className="space-y-2 text-sm">
                  <ChecklistRow ok={checklist.hasName} label={t('recipes.hasName')} />
                  <ChecklistRow ok={checklist.hasIngredients} label={t('recipes.hasIngredients')} />
                  <ChecklistRow
                    ok={checklist.hasSoapBase}
                    warn
                    label={t('recipes.hasSoapBase')}
                    warnText={t('recipes.soapBaseWarning')}
                  />
                  <ChecklistRow ok={checklist.hasBenefit} label={t('recipes.hasBenefit')} />
                </ul>
              </div>
            </div>

            <button className="btn-primary" onClick={save} disabled={!form.name.trim()}>
              <Check className="h-4 w-4" /> {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChecklistRow({
  ok,
  label,
  warn,
  warnText,
}: {
  ok: boolean;
  label: string;
  warn?: boolean;
  warnText?: string;
}) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : warn ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300" />
      )}
      <span className={ok ? 'text-slate-700' : 'text-slate-500'}>
        {label}
        {!ok && warn && warnText && <span className="block text-xs text-amber-600">{warnText}</span>}
      </span>
    </li>
  );
}
