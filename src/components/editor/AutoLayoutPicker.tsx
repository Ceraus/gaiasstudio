import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages, Wand2 } from 'lucide-react';
import type { Ingredient, Recipe } from '@/types';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { applyAutoLayout, type LayoutLang } from '@/lib/layoutEngine';
import { editor } from '@/lib/fabric/editorController';
import { useAppStore } from '@/store/useAppStore';
import Modal from '@/components/common/Modal';

export default function AutoLayoutPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const context = useAppStore((s) => s.context);
  const goto = useAppStore((s) => s.goto);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const settings = useAppStore((s) => s.settings);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [lang, setLang] = useState<LayoutLang>('en');

  useEffect(() => {
    if (!open) return;
    void recipesRepo.all().then(setRecipes);
    void ingredientsRepo.all().then(setIngredients);
  }, [open]);

  const choose = async (recipe: Recipe) => {
    const canvas = editor.canvas;
    const hasContent = canvas && canvas.getObjects().some(
      (o) => {
        const kind = String((o as { gaiaKind?: string }).gaiaKind ?? '');
        return !['background', 'logo'].includes(kind) && !kind.startsWith('__');
      },
    );
    if (hasContent && !window.confirm(t('layout.confirmClear', 'This will replace your current label content. Continue?'))) return;
    await applyAutoLayout(recipe, ingredients, context, lang, settings);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('add.autoLayout')}>
      {/* Language toggle */}
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">{t('recipes.chooseForLayout')}</p>
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 p-1">
          <Languages className="ml-1 h-3.5 w-3.5 text-slate-400" />
          <button
            onClick={() => setLang('en')}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition ${
              lang === 'en'
                ? 'bg-gaia-600 text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title={t('layout.langEn', 'English label text')}
          >
            EN
          </button>
          <button
            onClick={() => setLang('es')}
            className={`rounded px-2 py-0.5 text-xs font-semibold transition ${
              lang === 'es'
                ? 'bg-gaia-600 text-white'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            title={t('layout.langEs', 'Spanish label text')}
          >
            ES
          </button>
        </div>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-xl bg-slate-50 p-6 text-center text-sm text-slate-500">
          {t('recipes.empty')}
          <button
            className="btn-primary mx-auto mt-4"
            onClick={() => {
              onClose();
              goto('recipes');
            }}
          >
            {t('recipes.new')}
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {/* Sort: active recipe first */}
          {[...recipes].sort((a, b) =>
            a.id === activeRecipeId ? -1 : b.id === activeRecipeId ? 1 : 0
          ).map((r) => {
            const isActive = r.id === activeRecipeId;
            return (
              <li key={r.id}>
                <button
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 transition hover:bg-gaia-50 hover:ring-gaia-300 ${
                    isActive ? 'bg-gaia-50 ring-2 ring-gaia-400' : 'ring-slate-200'
                  }`}
                  onClick={() => void choose(r)}
                >
                  <span className={`flex h-9 w-9 items-center justify-center rounded-lg ${isActive ? 'bg-gaia-600 text-white' : 'bg-gaia-100 text-gaia-700'}`}>
                    <Wand2 className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-slate-800">
                      {r.name}
                      {isActive && (
                        <span className="ml-2 inline-flex items-center rounded-full bg-gaia-100 px-1.5 py-0.5 text-[10px] font-semibold text-gaia-700">
                          {t('recipes.active', 'active')}
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-slate-500">
                      {r.ingredientIds.length} {t('recipes.ingredients').toLowerCase()}
                      {r.benefit ? ` · ${r.benefit}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-slate-300">
                    {lang}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
