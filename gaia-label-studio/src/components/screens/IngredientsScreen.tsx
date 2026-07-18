import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlaskConical, Pencil, Plus, Trash2 } from 'lucide-react';
import type { Ingredient } from '@/types';
import { ingredientsRepo } from '@/db/repositories';

const empty = { name: '', benefit: '', inci: '', isSoapBase: false };

export default function IngredientsScreen() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Ingredient[]>([]);
  const [form, setForm] = useState<typeof empty>(empty);
  const [editingId, setEditingId] = useState<string | null>(null);

  const reload = () => ingredientsRepo.all().then(setItems);
  useEffect(() => {
    void reload();
  }, []);

  const save = async () => {
    if (!form.name.trim()) return;
    if (editingId) await ingredientsRepo.update(editingId, form);
    else await ingredientsRepo.create(form);
    setForm(empty);
    setEditingId(null);
    void reload();
  };

  const edit = (i: Ingredient) => {
    setEditingId(i.id);
    setForm({ name: i.name, benefit: i.benefit, inci: i.inci ?? '', isSoapBase: i.isSoapBase });
  };

  const remove = async (id: string) => {
    await ingredientsRepo.remove(id);
    if (editingId === id) {
      setEditingId(null);
      setForm(empty);
    }
    void reload();
  };

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-gaia-900">{t('ingredients.title')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-slate-600">{t('ingredients.subtitle')}</p>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr]">
          <div className="card h-fit space-y-3">
            <h2 className="text-sm font-semibold text-slate-700">
              {editingId ? t('common.edit') : t('ingredients.new')}
            </h2>
            <div>
              <label className="label">{t('ingredients.name')}</label>
              <input
                className="input"
                placeholder={t('ingredients.namePlaceholder')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('ingredients.benefit')}</label>
              <input
                className="input"
                placeholder={t('ingredients.benefitPlaceholder')}
                value={form.benefit}
                onChange={(e) => setForm({ ...form, benefit: e.target.value })}
              />
            </div>
            <div>
              <label className="label">
                {t('ingredients.inci')} <span className="text-slate-400">({t('common.optional')})</span>
              </label>
              <input
                className="input"
                placeholder={t('ingredients.inciPlaceholder')}
                value={form.inci}
                onChange={(e) => setForm({ ...form, inci: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 accent-gaia-600"
                checked={form.isSoapBase}
                onChange={(e) => setForm({ ...form, isSoapBase: e.target.checked })}
              />
              {t('ingredients.isSoapBase')}
            </label>
            <div className="flex gap-2 pt-1">
              <button className="btn-primary flex-1" onClick={save} disabled={!form.name.trim()}>
                <Plus className="h-4 w-4" /> {t('common.save')}
              </button>
              {editingId && (
                <button
                  className="btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm(empty);
                  }}
                >
                  {t('common.cancel')}
                </button>
              )}
            </div>
          </div>

          <div>
            {items.length === 0 ? (
              <div className="card flex flex-col items-center gap-2 py-12 text-center text-sm text-slate-500">
                <FlaskConical className="h-8 w-8 text-slate-300" />
                {t('ingredients.empty')}
              </div>
            ) : (
              <ul className="space-y-2">
                {items.map((i) => (
                  <li key={i.id} className="card flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-slate-800">
                        {i.name}
                        {i.isSoapBase && <span className="chip bg-gaia-100 text-gaia-700">{t('ingredients.soapBaseTag')}</span>}
                      </p>
                      {i.benefit && <p className="truncate text-xs text-slate-500">{i.benefit}</p>}
                      {i.inci && <p className="truncate text-[11px] italic text-slate-400">{i.inci}</p>}
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <button className="icon-btn" onClick={() => edit(i)} title={t('common.edit')}>
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        className="icon-btn text-rose-500 hover:bg-rose-50"
                        onClick={() => void remove(i.id)}
                        title={t('common.delete')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
