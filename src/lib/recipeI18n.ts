import type { TFunction } from 'i18next';
import i18n from '@/i18n';
import { displayStoredBenefitLabel } from '@/lib/benefitI18n';

/** Stable slug for recipeBenefits.* i18n keys. */
export function recipeNameKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, 'and')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
}

/** Original English seed taglines — still stored in many Rosa profiles. */
export const LEGACY_RECIPE_BENEFITS: Record<string, string> = {
  sandalwood_bliss: 'Moisturizing & Aromatic',
  rose_petal: 'Romantic & Moisturizing',
  ocean_dreams: 'Fresh & Hydrating',
  watermelon_fresh: 'Light & Refreshing',
  rice_and_geranium: 'Brightening & Balancing',
  coffee_scrub: 'Invigorating Exfoliant',
  rose_garden: 'Luxurious & Anti-Aging',
  aloe_fresh: 'Soothing & Hydrating',
  golden_turmeric: 'Brightening & Anti-Inflammatory',
  detox_charcoal: 'Deep Cleansing & Purifying',
  lavender_dreams: 'Calming & Cleansing',
  mango_peach: 'Tropical & Nourishing',
  chia_pineapple: 'Brightening & Energizing',
  chia_watermelon: 'Refreshing & Hydrating',
  chia_cherry: 'Sweet & Antioxidant-Rich',
  chia_mango_peach: 'Tropical & Omega-Rich',
  chia_strawberry: 'Sweet & Nourishing',
  chia_apple: 'Crisp & Antioxidant',
  chia_passion_fruit: 'Exotic & Nourishing',
  coconut_scrub: 'Tropical Exfoliant',
  rice_and_honey: 'Brightening & Clarifying',
  oatmeal_honey: 'Soothing & Deeply Moisturizing',
  coffee_turmeric: 'Energizing & Anti-Inflammatory',
  argan_mango_peach: 'Luxurious & Tropical',
  shea_rose: 'Rich & Romantic',
  calendula_gentle: 'Ultra-Gentle & Soothing',
  oatmeal_vanilla: 'Comforting & Nourishing',
  chamomile_calm: 'Calming & Gentle',
};

const EN_DEFAULT_DIRECTIONS = 'Lather with water and apply to skin. Rinse thoroughly.';
const EN_DEFAULT_WARNINGS = 'For external use only. Avoid contact with eyes.';

function allBenefitVariants(recipeName: string): Set<string> {
  const key = recipeNameKey(recipeName);
  const variants = new Set<string>();
  for (const lng of ['en', 'es'] as const) {
    const label = i18n.getFixedT(lng)(`recipeBenefits.${key}`, '');
    if (label) variants.add(label);
  }
  const legacy = LEGACY_RECIPE_BENEFITS[key];
  if (legacy) variants.add(legacy);
  return variants;
}

/** Locale-aware headline benefit for Rosa's seeded recipes and modular phrases. */
export function localizeRecipeBenefit(
  recipeName: string,
  stored: string | undefined,
  t: TFunction,
): string {
  const key = recipeNameKey(recipeName);
  const byRecipe = t(`recipeBenefits.${key}`, '');
  if (byRecipe) return byRecipe;

  const trimmed = stored?.trim() ?? '';
  if (trimmed) {
    const modular = displayStoredBenefitLabel(trimmed, t);
    if (modular !== trimmed) return modular;
  }
  return trimmed;
}

export function isKnownRecipeBenefitVariant(recipeName: string, value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return true;
  return allBenefitVariants(recipeName).has(trimmed);
}

export function localizeRecipeDirections(stored: string | undefined, t: TFunction): string {
  const trimmed = stored?.trim() ?? '';
  if (trimmed && trimmed !== EN_DEFAULT_DIRECTIONS) return trimmed;
  return t('recipes.defaultDirections');
}

export function localizeRecipeWarnings(stored: string | undefined, t: TFunction): string {
  const trimmed = stored?.trim() ?? '';
  if (trimmed && trimmed !== EN_DEFAULT_WARNINGS) return trimmed;
  return t('recipes.defaultWarnings');
}

export function relocalizeRecipeFormFields(
  recipeName: string,
  current: { benefit: string; directions: string; warnings: string },
  stored: { benefit?: string; directions?: string; warnings?: string },
  t: TFunction,
): { benefit: string; directions: string; warnings: string } {
  const benefit =
    isKnownRecipeBenefitVariant(recipeName, current.benefit)
      ? localizeRecipeBenefit(recipeName, stored.benefit, t)
      : current.benefit;

  const directions =
    !current.directions.trim()
      || current.directions === EN_DEFAULT_DIRECTIONS
      || current.directions === i18n.getFixedT('en')('recipes.defaultDirections')
      || current.directions === i18n.getFixedT('es')('recipes.defaultDirections')
      ? localizeRecipeDirections(stored.directions, t)
      : current.directions;

  const warnings =
    !current.warnings.trim()
      || current.warnings === EN_DEFAULT_WARNINGS
      || current.warnings === i18n.getFixedT('en')('recipes.defaultWarnings')
      || current.warnings === i18n.getFixedT('es')('recipes.defaultWarnings')
      ? localizeRecipeWarnings(stored.warnings, t)
      : current.warnings;

  return { benefit, directions, warnings };
}
