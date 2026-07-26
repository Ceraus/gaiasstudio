import type { TFunction } from 'i18next';
import type { IngredientCategory } from '@/types';
import i18n from '@/i18n';

/** Must match UI: ing.name.toLowerCase().replace(/ /g, '_') */
export function ingredientNameKey(name: string): string {
  return name.toLowerCase().replace(/ /g, '_');
}

export function getIngredientDisplayName(name: string, t: TFunction): string {
  return t(`ingredientNames.${ingredientNameKey(name)}`, name);
}

export function getCategoryLabel(category: IngredientCategory, t: TFunction): string {
  return t(`ingredients.categories.${category}`, category);
}

/** Lowercase blob of English name, both translations, benefit, and INCI — for bilingual search. */
export function getIngredientSearchText(ing: {
  name: string;
  benefit?: string;
  inci?: string;
}): string {
  const key = `ingredientNames.${ingredientNameKey(ing.name)}`;
  const enName = i18n.getFixedT('en')(key, ing.name);
  const esName = i18n.getFixedT('es')(key, ing.name);
  return [ing.name, enName, esName, ing.benefit ?? '', ing.inci ?? ''].join(' ').toLowerCase();
}

export function ingredientMatchesQuery(
  ing: { name: string; benefit?: string; inci?: string },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return getIngredientSearchText(ing).includes(q);
}
