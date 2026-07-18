import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Wand2 } from 'lucide-react';
import type { Ingredient, Recipe } from '@/types';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { applyAutoLayout } from '@/lib/layoutEngine';
import { useAppStore } from '@/store/useAppStore';
import Modal from '@/components/common/Modal';

export default function AutoLayoutPicker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const context = useAppStore((s) => s.context);
  const goto = useAppStore((s) => s.goto);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (!open) return;
    void recipesRepo.all().then(setRecipes);
    void ingredientsRepo.all().then(setIngredients);
  }, [open]);

  const choose = async (recipe: Recipe) => {
    await applyAutoLayout(recipe, ingredients, context);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={t('add.autoLayout')}>
      <p className="mb-4 text-sm text-slate-500">{t('recipes.chooseForLayout')}</p>
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
          {recipes.map((r) => (
            <li key={r.id}>
              <button
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left ring-1 ring-slate-200 transition hover:bg-gaia-50 hover:ring-gaia-300"
                onClick={() => void choose(r)}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gaia-100 text-gaia-700">
                  <Wand2 className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">{r.name}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {r.ingredientIds.length} {t('recipes.ingredients').toLowerCase()}
                    {r.benefit ? ` · ${r.benefit}` : ''}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
