import type { TFunction } from 'i18next';
import type { IngredientCategory } from '@/types';
import { resources } from '@/i18n';
import { canonicalizeIngredientName } from '@/lib/ingredientResolution';

/** Must match UI: ing.name.toLowerCase().replace(/ /g, '_') */
export function ingredientNameKey(name: string): string {
  return name.toLowerCase().replace(/ /g, '_');
}

type IngredientNameMap = Record<string, string>;

function ingredientNameMaps(): { en: IngredientNameMap; es: IngredientNameMap } {
  const en = (resources.en.translation as { ingredientNames?: IngredientNameMap }).ingredientNames ?? {};
  const es = (resources.es.translation as { ingredientNames?: IngredientNameMap }).ingredientNames ?? {};
  return { en, es };
}

let enValueToEs: Map<string, string> | undefined;

function spanishByEnglishValue(): Map<string, string> {
  if (enValueToEs) return enValueToEs;
  const { en, es } = ingredientNameMaps();
  const map = new Map<string, string>();
  for (const [key, enName] of Object.entries(en)) {
    const esName = es[key]?.trim();
    if (!esName) continue;
    map.set(canonicalizeIngredientName(enName), esName);
  }
  enValueToEs = map;
  return map;
}

function lookupLocaleName(lng: 'en' | 'es', name: string): string | undefined {
  const maps = ingredientNameMaps();
  const fromKey = maps[lng][ingredientNameKey(name)]?.trim();
  if (fromKey) return fromKey;
  if (lng === 'es') {
    const fromEnglish = spanishByEnglishValue().get(canonicalizeIngredientName(name));
    if (fromEnglish) return fromEnglish;
  }
  return undefined;
}

export function getIngredientDisplayName(name: string, t: TFunction): string {
  return t(`ingredientNames.${ingredientNameKey(name)}`, name);
}

export function getCategoryLabel(category: IngredientCategory, t: TFunction): string {
  return t(`categories.${category}`, t(`ingredients.categories.${category}`, category));
}

export interface BilingualIngredientNames {
  en: string;
  es: string;
  /** True when the Spanish label is not just the English name / INCI repeated. */
  distinctSpanish: boolean;
}

export function namesAreDistinct(a: string, b: string): boolean {
  return canonicalizeIngredientName(a) !== canonicalizeIngredientName(b);
}

/**
 * English common name + Spanish common name for dual-language listings.
 * CosIng-only rows without a real translation keep INCI in the ES column
 * rather than inventing Spanish.
 */
export function getIngredientBilingualNames(input: {
  name: string;
  inci?: string;
  nameEs?: string;
  aliases?: string[];
}): BilingualIngredientNames {
  const en = lookupLocaleName('en', input.name) || input.name;
  const esFromCatalog = input.nameEs?.trim();
  const esFromI18n = lookupLocaleName('es', input.name);
  const es = esFromCatalog || esFromI18n || input.inci?.trim() || en;
  return {
    en,
    es,
    distinctSpanish: namesAreDistinct(es, en),
  };
}

/** Lowercase blob of English name, both translations, benefit, and INCI — for bilingual search. */
export function getIngredientSearchText(ing: {
  name: string;
  benefit?: string;
  inci?: string;
  nameEs?: string;
  aliases?: string[];
}): string {
  const names = getIngredientBilingualNames(ing);
  return [
    ing.name,
    names.en,
    names.es,
    ing.nameEs ?? '',
    ing.benefit ?? '',
    ing.inci ?? '',
    ...(ing.aliases ?? []),
  ].join(' ').toLowerCase();
}

export function ingredientMatchesQuery(
  ing: { name: string; benefit?: string; inci?: string; nameEs?: string; aliases?: string[] },
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return getIngredientSearchText(ing).includes(q);
}
