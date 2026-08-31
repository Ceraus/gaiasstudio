import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import type { RecipeAmountUnit } from '@/types';
import { RECIPE_AMOUNT_UNITS } from '@/lib/inventoryMath';

export function recipeAmountUnitLabel(unit: RecipeAmountUnit, t: TFunction): string {
  switch (unit) {
    case 'g':
      return t('inventory.grams', 'grams');
    case 'oz':
      return t('inventory.oz', 'oz');
    case 'ml':
      return t('inventory.ml', 'ml');
    case 'drops':
      return t('inventory.drops', 'drops');
  }
}

export default function RecipeAmountUnitSelect({
  value,
  onChange,
  ariaLabel,
}: {
  value: RecipeAmountUnit;
  onChange: (unit: RecipeAmountUnit) => void;
  ariaLabel?: string;
}) {
  const { t } = useTranslation();
  return (
    <select
      className="w-[4.75rem] shrink-0 rounded-lg border border-slate-200 bg-white px-1 py-0.5 text-xs font-medium text-slate-900 focus:border-gaia-400 focus:outline-none"
      value={value}
      onChange={(event) => onChange(event.target.value as RecipeAmountUnit)}
      aria-label={ariaLabel ?? t('recipes.amountUnit', 'Unit')}
    >
      {RECIPE_AMOUNT_UNITS.map((unit) => (
        <option key={unit} value={unit}>
          {recipeAmountUnitLabel(unit, t)}
        </option>
      ))}
    </select>
  );
}
