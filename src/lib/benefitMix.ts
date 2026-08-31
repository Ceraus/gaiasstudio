import { MODULAR_BENEFITS } from '@/data/benefits';
import {
  describeIngredientSkinFeel,
  isColorOnlyIngredient,
  recipeEffectTags,
  unlistedNamedFamilies,
  type EffectTag,
} from '@/lib/ingredientSkinFeel';
import type { IngredientCategory } from '@/types';

/**
 * Same mix-and-match table the BenefitPicker uses (no AI):
 * each ingredient category unlocks a few benefit families, then we pick
 * 2–3 shopper-safe phrases to weave into one label line.
 */
export const INGREDIENT_CATEGORY_TO_BENEFITS: Partial<Record<IngredientCategory, string[]>> = {
  oil: ['Moisturizing', 'Nourishing', 'Conditioning'],
  butter: ['Moisturizing', 'Nourishing', 'Conditioning'],
  milk: ['Conditioning', 'Nourishing', 'Moisturizing', 'Sensitive Skin'],
  clay: ['Detoxifying', 'Mineral-Rich', 'Balancing', 'Acne & Blemish'],
  botanical: ['Soothing', 'Natural & Clean', 'Healing'],
  floral: ['Aromatherapy — Calming', 'Aromatherapy — Romantic', 'Soothing'],
  citrus: ['Brightening', 'Aromatherapy — Uplifting'],
  exfoliant: ['Exfoliating'],
  'essential-oil': ['Aromatherapy — Calming', 'Aromatherapy — Uplifting', 'Aromatherapy — Grounding'],
  fragrance: ['Aromatherapy — Calming', 'Aromatherapy — Uplifting'],
  base: ['Cleansing', 'Conditioning'],
  seed: ['Nourishing', 'Moisturizing'],
  spice: ['Warming & Stimulating', 'Aromatherapy — Grounding'],
  wax: ['Protective', 'Moisturizing'],
  additive: ['Multi-Benefit', 'Conditioning'],
  colorant: ['Natural & Clean'],
  other: ['Multi-Benefit', 'Moisturizing'],
};

export interface BenefitMixIngredient {
  name: string;
  category?: string;
  benefit?: string;
  inci?: string;
}

export function recipeMentionsCitrus(ingredients: BenefitMixIngredient[]): boolean {
  return recipeEffectTags(ingredients).has('citrus');
}

const CLAIM_BLOCKLIST =
  /eczema|rosacea|psoriasis|collagen|wound|scar|stretch mark|cellulite|spf|acne-causing|overnight|dermatologist|pediatrician|disease|hypoallergenic/i;

export interface BenefitMix {
  families: string[];
  phrases: string[];
  atlas: string;
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(haystack);
}

const TAG_TO_FAMILIES: Partial<Record<EffectTag, string[]>> = {
  cooling: ['Cooling & Refreshing', 'Aromatherapy — Uplifting'],
  citrus: ['Brightening', 'Aromatherapy — Uplifting'],
  warming: ['Warming & Stimulating', 'Aromatherapy — Grounding'],
  floral: ['Aromatherapy — Calming', 'Aromatherapy — Romantic', 'Soothing'],
  woody: ['Aromatherapy — Grounding'],
  tropical: ['Moisturizing', 'Conditioning'],
  melon: ['Moisturizing', 'Conditioning'],
  berry: ['Moisturizing', 'Conditioning'],
  orchard: ['Moisturizing', 'Conditioning'],
  emollient: ['Moisturizing', 'Nourishing', 'Conditioning'],
  cleanse: ['Detoxifying', 'Cleansing'],
  soothe: ['Soothing', 'Sensitive Skin'],
  honey: ['Conditioning', 'Moisturizing'],
  exfoliate: ['Exfoliating'],
  creamy: ['Conditioning', 'Nourishing', 'Sensitive Skin'],
  purify: ['Cleansing', 'Detoxifying'],
};

/** Extra families from the ingredient name — fruit is produce, not "healing botanical". */
export function nameBenefitFamilies(name: string, category?: string): string[] {
  if (isColorOnlyIngredient(name, category)) return [];
  const { tags } = describeIngredientSkinFeel(name, category);
  const families: string[] = [];
  for (const tag of tags) {
    for (const family of TAG_TO_FAMILIES[tag] ?? []) {
      if (!families.includes(family)) families.push(family);
    }
  }
  return families;
}

export function familiesForIngredient(name: string, category?: string): string[] {
  const named = nameBenefitFamilies(name, category);
  const fromCat = INGREDIENT_CATEGORY_TO_BENEFITS[(category as IngredientCategory) ?? 'other'] ?? [];
  if (!named.length) return [...fromCat];
  const skip = new Set(['Anti-aging', 'Healing', 'Acne & Blemish', 'Sun-Damaged Skin']);
  return [...named, ...fromCat.filter((family) => !skip.has(family) && !named.includes(family))];
}

function phraseFitsIngredients(
  label: string,
  ingredients: BenefitMixIngredient[],
  names: string,
  tags: Set<EffectTag>,
): boolean {
  const text = label.toLowerCase();
  if (/\b(citrus|lemon|lime|orange|grapefruit|zesty)\b/.test(text) && !tags.has('citrus')) return false;
  if (/\b(cool(?:ing|s)?|minty|tingl\w*)\b/.test(text) && !tags.has('cooling')) return false;
  if (/\b(peppermint|mint)\b/.test(text) && !/\b(pepper)?mint|spearmint|menthol|wintergreen\b/.test(names)) return false;
  if (/\beucalyptus\b/.test(text) && !hasPhrase(names, 'eucalyptus')) return false;
  if (/\b(lavender|rose|jasmine|ylang|neroli|sandalwood|vanilla|vetiver|patchouli|cedarwood|pine)\b/.test(text)) {
    const mentioned = text.match(/\b(lavender|rose|jasmine|ylang|neroli|sandalwood|vanilla|vetiver|patchouli|cedarwood|pine)\b/g) ?? [];
    if (mentioned.some((word) => !hasPhrase(names, word) && !names.includes(word))) return false;
  }
  if (/\bcharcoal\b/.test(text) && !hasPhrase(names, 'charcoal')) return false;
  if (unlistedNamedFamilies(label, ingredients).length) return false;
  return true;
}

function phrasesForFamily(
  family: string,
  ingredients: BenefitMixIngredient[],
  names: string,
  tags: Set<EffectTag>,
): string[] {
  return MODULAR_BENEFITS
    .filter((entry) => entry.category === family && !CLAIM_BLOCKLIST.test(entry.label) && phraseFitsIngredients(entry.label, ingredients, names, tags))
    .map((entry) => entry.label);
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

/** Pick up to three complementary studio phrases — the non-AI mix-and-match. */
export function mixBenefitsForIngredients(
  ingredients: BenefitMixIngredient[],
  variant = 0,
): BenefitMix {
  const families: string[] = [];
  for (const item of ingredients.slice(0, 12)) {
    for (const family of familiesForIngredient(item.name, item.category)) {
      if (!families.includes(family)) families.push(family);
    }
  }

  const preferred = [
    'Moisturizing',
    'Conditioning',
    'Cleansing',
    'Nourishing',
    'Aromatherapy — Uplifting',
    'Aromatherapy — Calming',
    'Soothing',
    'Brightening',
    'Detoxifying',
    'Cooling & Refreshing',
    'Multi-Benefit',
  ];
  const ordered = [
    ...preferred.filter((family) => families.includes(family)),
    ...families.filter((family) => !preferred.includes(family)),
  ];

  const names = ingredients.map((item) => item.name.toLowerCase()).join(' ');
  const tags = recipeEffectTags(ingredients);
  const start = ordered.length ? Math.abs(variant) % ordered.length : 0;
  const rotated = ordered.length ? [...ordered.slice(start), ...ordered.slice(0, start)] : ordered;
  const phrases = rotated
    .map((family, index) => {
      const options = phrasesForFamily(family, ingredients, names, tags);
      if (!options.length) return undefined;
      return options[Math.abs(variant + index * 3) % options.length];
    })
    .filter((phrase): phrase is string => !!phrase)
    .slice(0, 3);

  const usedCats = new Set(ingredients.map((item) => item.category).filter(Boolean));
  const atlas = Object.entries(INGREDIENT_CATEGORY_TO_BENEFITS)
    .filter(([category]) => usedCats.has(category))
    .map(([category, list]) => `- ${category}: ${(list ?? []).join(', ') || '(color only)'}`)
    .join('\n');

  return { families: unique(ordered), phrases, atlas };
}

export const BENEFIT_MIX_JOINER = ' · ';
