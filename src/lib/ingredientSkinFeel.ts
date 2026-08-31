/**
 * Shopper-safe skin-feel atlas for the 670+ catalog names (active + inactive).
 *
 * Seed "benefit" lines often mix medical claims (heal, eczema, SPF) or borrow
 * the wrong sensation (aloe "cooling", mango "citrus"). This module maps each
 * name to the actual cosmetic effect we may put on a glycerin-soap label.
 */

export type EffectTag =
  | 'cooling'
  | 'citrus'
  | 'warming'
  | 'floral'
  | 'woody'
  | 'tropical'
  | 'melon'
  | 'berry'
  | 'orchard'
  | 'emollient'
  | 'cleanse'
  | 'soothe'
  | 'honey'
  | 'exfoliate'
  | 'creamy'
  | 'purify'
  | 'color-only'
  | 'scent-only';

export interface IngredientFeel {
  feel: string;
  tags: EffectTag[];
}

export interface FeelIngredient {
  name: string;
  category?: string;
  benefit?: string;
  inci?: string;
}

interface FeelRule {
  /** Lowercase phrase; longer phrases are matched first. */
  phrase: string;
  feel: string;
  tags: EffectTag[];
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(haystack);
}

function normalizeNamedText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Botanicals / oils / bases small models invent on soap labels.
 * `recipe` tokens unlock the family from the ingredient name or INCI.
 * `copy` tokens are rejected in benefit text unless that family is present.
 */
export interface NamedIngredientFamily {
  id: string;
  recipe: string[];
  copy: string[];
}

export const NAMED_INGREDIENT_FAMILIES: NamedIngredientFamily[] = [
  { id: 'aloe', recipe: ['aloe'], copy: ['aloe', 'sabila', 'aloe vera'] },
  { id: 'shea', recipe: ['shea'], copy: ['shea', 'karite'] },
  { id: 'lavender', recipe: ['lavender', 'lavanda', 'lavandula'], copy: ['lavender', 'lavanda', 'lavandula'] },
  { id: 'honey', recipe: ['honey', 'miel', 'mel'], copy: ['honey', 'miel'] },
  { id: 'oat', recipe: ['oat', 'oatmeal', 'avena'], copy: ['oat', 'oatmeal', 'avena'] },
  { id: 'charcoal', recipe: ['charcoal', 'carbon'], copy: ['charcoal', 'carbon'] },
  { id: 'tea-tree', recipe: ['tea tree', 'teatree', 'melaleuca'], copy: ['tea tree', 'teatree', 'melaleuca', 'arbol de te'] },
  { id: 'mint', recipe: ['peppermint', 'spearmint', 'mint', 'menthol', 'wintergreen', 'menta'], copy: ['peppermint', 'spearmint', 'mint', 'menthol', 'menta'] },
  { id: 'eucalyptus', recipe: ['eucalyptus', 'eucalipto'], copy: ['eucalyptus', 'eucalipto'] },
  { id: 'rose', recipe: ['rose', 'rosa'], copy: ['rose', 'rosa'] },
  { id: 'jasmine', recipe: ['jasmine', 'jazmin'], copy: ['jasmine', 'jazmin'] },
  { id: 'vanilla', recipe: ['vanilla', 'vainilla'], copy: ['vanilla', 'vainilla'] },
  { id: 'jojoba', recipe: ['jojoba'], copy: ['jojoba'] },
  { id: 'argan', recipe: ['argan'], copy: ['argan'] },
  { id: 'avocado', recipe: ['avocado', 'aguacate'], copy: ['avocado', 'aguacate'] },
  { id: 'hemp', recipe: ['hemp', 'canamo', 'cannabis'], copy: ['hemp', 'canamo'] },
  { id: 'goat-milk', recipe: ['goat milk', 'goat', 'caprae', 'leche de cabra'], copy: ['goat milk', 'leche de cabra'] },
  { id: 'calendula', recipe: ['calendula'], copy: ['calendula'] },
  { id: 'chamomile', recipe: ['chamomile', 'manzanilla', 'camomila'], copy: ['chamomile', 'manzanilla', 'camomila'] },
  { id: 'cucumber', recipe: ['cucumber', 'pepino'], copy: ['cucumber', 'pepino'] },
  { id: 'mango', recipe: ['mango'], copy: ['mango'] },
  { id: 'cocoa', recipe: ['cocoa', 'cacao', 'theobroma'], copy: ['cocoa', 'cacao'] },
  { id: 'olive', recipe: ['olive', 'oliva', 'olea'], copy: ['olive', 'oliva'] },
  { id: 'castor', recipe: ['castor', 'ricinus'], copy: ['castor'] },
  { id: 'almond', recipe: ['almond', 'almendra'], copy: ['almond', 'almendra'] },
  { id: 'ylang', recipe: ['ylang'], copy: ['ylang'] },
  { id: 'neroli', recipe: ['neroli'], copy: ['neroli'] },
  { id: 'sandalwood', recipe: ['sandalwood', 'sandalo'], copy: ['sandalwood', 'sandalo'] },
  { id: 'vetiver', recipe: ['vetiver'], copy: ['vetiver'] },
  { id: 'patchouli', recipe: ['patchouli'], copy: ['patchouli'] },
  { id: 'cedarwood', recipe: ['cedarwood', 'cedar', 'cedro'], copy: ['cedarwood', 'cedar', 'cedro'] },
  { id: 'pine', recipe: ['pine', 'pino'], copy: ['pine', 'pino'] },
  { id: 'lemon', recipe: ['lemon', 'limon'], copy: ['lemon', 'limon'] },
  { id: 'lime', recipe: ['lime', 'lima'], copy: ['lime', 'lima'] },
  { id: 'orange', recipe: ['orange', 'naranja'], copy: ['orange', 'naranja'] },
  { id: 'grapefruit', recipe: ['grapefruit', 'pomelo', 'toronja'], copy: ['grapefruit', 'pomelo', 'toronja'] },
  { id: 'bergamot', recipe: ['bergamot', 'bergamota'], copy: ['bergamot', 'bergamota'] },
  { id: 'watermelon', recipe: ['watermelon', 'sandia'], copy: ['watermelon', 'sandia'] },
  { id: 'baking-soda', recipe: ['baking soda', 'bicarbonate', 'bicarbonato'], copy: ['baking soda', 'bicarbonato'] },
  { id: 'silk', recipe: ['silk', 'seda'], copy: ['silk', 'seda'] },
  { id: 'dead-sea', recipe: ['dead sea', 'mar muerto'], copy: ['dead sea', 'mar muerto'] },
  { id: 'iris', recipe: ['iris'], copy: ['iris'] },
  { id: 'neem', recipe: ['neem'], copy: ['neem'] },
  { id: 'milk', recipe: ['milk', 'leche', 'lac'], copy: ['milk protein', 'milk proteins'] },
  { id: 'clay', recipe: ['clay', 'kaolin', 'bentonite', 'rhassoul', 'arcilla'], copy: ['clay', 'arcilla'] },
];

export function recipeNamedIngredientText(ingredients: FeelIngredient[]): string {
  return ingredients
    .map((item) => [item.name, item.inci ?? ''].filter(Boolean).join(' '))
    .join(' ');
}

export function namedFamilyPresentInRecipe(
  family: NamedIngredientFamily,
  recipeText: string,
): boolean {
  const blob = normalizeNamedText(recipeText);
  return family.recipe.some((token) => hasPhrase(blob, normalizeNamedText(token)));
}

export function unlistedNamedFamilies(
  text: string,
  ingredients: FeelIngredient[],
): NamedIngredientFamily[] {
  const recipeText = recipeNamedIngredientText(ingredients);
  const blob = normalizeNamedText(text);
  return NAMED_INGREDIENT_FAMILIES.filter((family) => {
    if (namedFamilyPresentInRecipe(family, recipeText)) return false;
    return family.copy.some((token) => hasPhrase(blob, normalizeNamedText(token)));
  });
}

function accentFlexiblePattern(token: string): string {
  return token
    .normalize('NFD')
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .replace(/\s+/g, '\\s+')
    .replace(/a/gi, '[aáàä]')
    .replace(/e/gi, '[eéèë]')
    .replace(/i/gi, '[iíìï]')
    .replace(/o/gi, '[oóòö]')
    .replace(/u/gi, '[uúùü]')
    .replace(/n/gi, '[nñ]');
}

/** Drop a clause that names a botanical/oil not in this recipe ("and aloe vera"). */
export function stripUnlistedIngredientMentions(
  text: string,
  ingredients: FeelIngredient[],
): string {
  const unlisted = unlistedNamedFamilies(text, ingredients);
  if (!unlisted.length) return text.trim();

  const tokens = [...new Set(unlisted.flatMap((family) => family.copy))]
    .sort((a, b) => b.length - a.length);

  let out = text;
  for (const token of tokens) {
    const body = accentFlexiblePattern(token);
    const joined = `(?:\\s*(?:,|;|&|/|\\b(?:and|y|e|with|con|plus|e)\\b)\\s*)?\\b${body}\\b(?:\\s*(?:,|;|&|/|\\b(?:and|y|e)\\b))?`;
    out = out.replace(new RegExp(joined, 'gi'), ' ');
  }

  out = out
    .replace(/\s+/g, ' ')
    .replace(/\s+,/g, ',')
    .replace(/,(?=\s*[.!?])/g, '')
    .replace(/\s+([.!?])/g, '$1')
    .replace(/^(?:and|y|e|with|con)\s+/i, '')
    .replace(/\s+(?:and|y|e|with|con)\s*$/i, '')
    .trim();
  if (out && /^[a-z]/.test(out)) {
    out = out.charAt(0).toUpperCase() + out.slice(1);
  }
  return out;
}

/** Glycerin / M&P base is always in the recipe — never name it on the front label. */
export function isSilentBenefitIngredient(name: string, category?: string): boolean {
  const n = name.toLowerCase();
  if (/\bglycerin\b|\bglycerine\b|\bglicerina\b/.test(n)) return true;
  return category === 'base' && /melt\s*&\s*pour|soap base/.test(n);
}

export function ingredientsForBenefitCopy<T extends { name: string; category?: string }>(ingredients: T[]): T[] {
  return ingredients.filter((item) => !isSilentBenefitIngredient(item.name, item.category));
}

export function isColorOnlyIngredient(name: string, category?: string): boolean {
  if (category === 'colorant') return true;
  const n = name.toLowerCase();
  return /\b(colorant|mica|glitter|soap dye|ultramarine|iron oxide|titanium dioxide|woad|alkanet|madder|annatto|indigo powder|spirulina|paprika|chromium oxide|manganese violet)\b/.test(n);
}

/**
 * Catalog families → one soap-label feel each.
 * Order is longest-first so "mango butter" wins over "mango", and
 * "grapefruit mint" picks up both citrus and cooling via two rules.
 */
const FEEL_RULES: FeelRule[] = [
  // ── Mint / true cooling (the only ingredients allowed to be minty) ──
  { phrase: 'peppermint vanilla', feel: 'cool peppermint with sweet vanilla — cooling tingle from mint only', tags: ['cooling', 'scent-only'] },
  { phrase: 'eucalyptus spearmint', feel: 'camphor-fresh eucalyptus with sweet mint — cooling spa scent', tags: ['cooling', 'scent-only'] },
  { phrase: 'eucalyptus mint', feel: 'clearing eucalyptus with mint — cooling, not fruity', tags: ['cooling', 'scent-only'] },
  { phrase: 'grapefruit mint', feel: 'tart grapefruit with mint — citrus + cooling because both are in the name', tags: ['citrus', 'cooling', 'scent-only'] },
  { phrase: 'lavender mint', feel: 'calm lavender with mint — cooling from mint, not from lavender', tags: ['cooling', 'floral', 'scent-only'] },
  { phrase: 'rosemary mint', feel: 'herbal rosemary with mint — cooling from mint only', tags: ['cooling', 'scent-only'] },
  { phrase: 'tea tree mint', feel: 'clarifying tea tree with mint — cooling from mint only', tags: ['cooling', 'purify', 'scent-only'] },
  { phrase: 'peppermint', feel: 'cooling, clean, tingly-fresh mint — cooling is only for mint/menthol', tags: ['cooling'] },
  { phrase: 'spearmint', feel: 'sweeter mint, gently cooling — not citrus, not fruit', tags: ['cooling'] },
  { phrase: 'wintergreen', feel: 'minty-sweet wintergreen — cooling scent, not fruit', tags: ['cooling'] },
  { phrase: 'menthol', feel: 'cooling menthol tingle', tags: ['cooling'] },
  { phrase: 'mint', feel: 'cooling mint — only this family may be called minty or cooling', tags: ['cooling'] },

  // ── Camphor-fresh (clearing, not fruit, not mango) ──
  { phrase: 'eucalyptus', feel: 'clearing camphor-fresh scent — not fruity, not tropical', tags: ['cooling'] },
  { phrase: 'camphor', feel: 'sharp camphor-fresh — cooling-clear, not fruit', tags: ['cooling'] },
  { phrase: 'cajeput', feel: 'tea-tree-like, fresh and clarifying — not fruit', tags: ['purify'] },

  // ── True citrus (lemon/lime/orange family only — mango is NOT citrus) ──
  { phrase: 'coconut lime', feel: 'sweet coconut with zesty lime — citrus comes from lime, not coconut', tags: ['tropical', 'citrus', 'scent-only'] },
  { phrase: 'grapefruit mango', feel: 'tart grapefruit with tropical mango — citrus only because grapefruit is present', tags: ['citrus', 'tropical', 'scent-only'] },
  { phrase: 'lime basil', feel: 'herbal basil with lime — citrus from lime', tags: ['citrus', 'scent-only'] },
  { phrase: 'lemon verbena', feel: 'lemony-herbal, bright and clean', tags: ['citrus', 'scent-only'] },
  { phrase: 'lemon drop', feel: 'tart candy lemon — true citrus scent', tags: ['citrus', 'scent-only'] },
  { phrase: 'lemon myrtle', feel: 'intensely lemony herbal — true citrus character', tags: ['citrus'] },
  { phrase: 'lemon peel', feel: 'bright lemon peel — zesty citrus clean feel', tags: ['citrus'] },
  { phrase: 'lemon butter', feel: 'light citrus-infused butter — brightening, not mint-cool', tags: ['citrus', 'emollient'] },
  { phrase: 'orange peel', feel: 'uplifting orange peel — citrus scent and a clean feel', tags: ['citrus'] },
  { phrase: 'orange blossom', feel: 'delicate white-floral citrus from orange blossom', tags: ['citrus', 'floral'] },
  { phrase: 'sweet orange', feel: 'bright sweet orange — true citrus, uplifting scent', tags: ['citrus'] },
  { phrase: 'key lime', feel: 'tart key-lime citrus — zesty, not tropical-mango', tags: ['citrus'] },
  { phrase: 'may chang', feel: 'lemony litsea — true citrus-like scent', tags: ['citrus'] },
  { phrase: 'bergamot', feel: 'floral-citrus bergamot — uplifting, not mint', tags: ['citrus'] },
  { phrase: 'grapefruit', feel: 'tart grapefruit — true citrus, bright and clean', tags: ['citrus'] },
  { phrase: 'tangerine', feel: 'sweet tangerine — true citrus', tags: ['citrus'] },
  { phrase: 'mandarin', feel: 'gentle mandarin — true citrus', tags: ['citrus'] },
  { phrase: 'clementine', feel: 'sweet clementine — true citrus', tags: ['citrus'] },
  { phrase: 'lemongrass', feel: 'fresh lemony-herbal grass — citrus-herbal, not fruit-mango', tags: ['citrus'] },
  { phrase: 'citronella', feel: 'fresh grassy-lemon scent — herbal, not a fruit soap story', tags: ['citrus'] },
  { phrase: 'petitgrain', feel: 'woody-citrus orange leaf — citrus family, not fruit pulp', tags: ['citrus'] },
  { phrase: 'neroli', feel: 'delicate orange-blossom floral — citrus-floral, not mint', tags: ['citrus', 'floral'] },
  { phrase: 'yuzu', feel: 'bright yuzu — true citrus', tags: ['citrus'] },
  { phrase: 'pomelo', feel: 'fresh pomelo — true citrus', tags: ['citrus'] },
  { phrase: 'citrus burst', feel: 'bright mixed citrus — only because citrus is named', tags: ['citrus', 'scent-only'] },
  { phrase: 'citrus', feel: 'true citrus scent — lemon/lime/orange family only', tags: ['citrus'] },
  { phrase: 'lemon', feel: 'bright lemon — true citrus, never mint-cool', tags: ['citrus'] },
  { phrase: 'lime', feel: 'zesty lime — true citrus, not melon or mango', tags: ['citrus'] },
  { phrase: 'orange', feel: 'bright orange — true citrus', tags: ['citrus'] },

  // ── Tropical fruit (NOT citrus, NOT mint, NOT cooling) ──
  { phrase: 'mango peach', feel: 'sun-ripe mango with juicy peach — tropical orchard fruit, never citrus or mint', tags: ['tropical', 'orchard', 'scent-only'] },
  { phrase: 'tropical mango', feel: 'ripe tropical mango — sweet and sun-warmed, never citrus or cooling', tags: ['tropical', 'scent-only'] },
  { phrase: 'mango butter', feel: 'creamy mango-seed butter — cushiony moisture like shea, not a citrus fruit', tags: ['tropical', 'emollient'] },
  { phrase: 'mango seed oil', feel: 'nourishing mango-seed oil — softens skin, not minty or citrus', tags: ['tropical', 'emollient'] },
  { phrase: 'mango seed', feel: 'tropical seed polish that conditions while it smooths — not citrus', tags: ['tropical', 'exfoliate'] },
  { phrase: 'passion fruit', feel: 'exotic passion fruit — tangy tropical, not citrus peel and not mint', tags: ['tropical'] },
  { phrase: 'shredded coconut', feel: 'textured coconut scrub that moisturizes while it polishes', tags: ['tropical', 'exfoliate'] },
  { phrase: 'coconut milk', feel: 'creamy tropical milk — softens and cushions lather', tags: ['tropical', 'creamy'] },
  { phrase: 'coconut cream', feel: 'rich coconut cream — nourishing, creamy lather', tags: ['tropical', 'creamy'] },
  { phrase: 'coconut butter', feel: 'whole-coconut butter — tropical moisture with a mild coconut scent', tags: ['tropical', 'emollient'] },
  { phrase: 'coconut oil', feel: 'coconut oil — softens and helps a rich clean lather', tags: ['tropical', 'emollient'] },
  { phrase: 'island coconut', feel: 'sweet tropical coconut scent — vacation-warm, not mint-cool', tags: ['tropical', 'scent-only'] },
  { phrase: 'mango', feel: 'sun-warmed tropical mango — softening and sweetly scented, never minty, never citrus', tags: ['tropical'] },
  { phrase: 'pineapple', feel: 'bright tangy pineapple — tropical fruit, not citrus peel', tags: ['tropical'] },
  { phrase: 'papaya', feel: 'softening papaya — tropical fruit that helps skin feel smoother', tags: ['tropical'] },
  { phrase: 'coconut', feel: 'tropical coconut — creamy-sweet moisture, not citrus unless lime is also named', tags: ['tropical'] },
  { phrase: 'guava', feel: 'tropical guava — juicy and softening, not citrus', tags: ['tropical'] },
  { phrase: 'banana', feel: 'creamy banana — softening tropical fruit, not mint', tags: ['tropical'] },
  { phrase: 'kiwi', feel: 'fresh kiwi — lightly tart fruit, not citrus peel', tags: ['tropical'] },
  { phrase: 'plumeria', feel: 'Hawaiian floral — tropical blossom scent, not fruit-citrus', tags: ['floral', 'scent-only'] },

  // ── Melon / cucumber (juicy-fresh, NEVER mint-cool) ──
  { phrase: 'cucumber melon', feel: 'light cucumber-melon spa scent — watery-fresh, not mint-cool', tags: ['melon', 'scent-only'] },
  { phrase: 'green tea & cucumber', feel: 'clean green tea with cucumber — crisp and watery, not mint unless mint is named', tags: ['melon', 'scent-only'] },
  { phrase: 'green tea cucumber', feel: 'clean green tea with cucumber — crisp and watery, not mint', tags: ['melon', 'scent-only'] },
  { phrase: 'watermelon', feel: 'juicy watermelon — light, hydrating summer-fresh, never cooling like mint', tags: ['melon'] },
  { phrase: 'honeydew', feel: 'sweet honeydew melon — juicy and light, not mint', tags: ['melon'] },
  { phrase: 'cantaloupe', feel: 'soft cantaloupe — melon-sweet, not citrus', tags: ['melon'] },
  { phrase: 'cucumber', feel: 'watery-fresh cucumber — clean and light, not mint-cool', tags: ['melon'] },
  { phrase: 'melon', feel: 'sweet fresh melon — juicy summer scent, not mint', tags: ['melon'] },

  // ── Berries (fruity, not citrus, not mint) ──
  { phrase: 'black raspberry vanilla', feel: 'sweet berry with vanilla — fruity-gourmand, not citrus', tags: ['berry', 'scent-only'] },
  { phrase: 'black cherry', feel: 'rich dark cherry — sweet fruit, not citrus', tags: ['berry'] },
  { phrase: 'strawberry', feel: 'ripe strawberry — sweet berry, not mint or citrus', tags: ['berry'] },
  { phrase: 'blueberry', feel: 'sweet blueberry — berry fruit, not citrus', tags: ['berry'] },
  { phrase: 'raspberry', feel: 'tart raspberry — berry fruit, not citrus', tags: ['berry'] },
  { phrase: 'blackberry', feel: 'wild blackberry — sweet-tart berry, not citrus', tags: ['berry'] },
  { phrase: 'cranberry', feel: 'tart cranberry — festive berry, not citrus', tags: ['berry'] },
  { phrase: 'pomegranate', feel: 'juicy pomegranate — tart fruit, not a citrus peel', tags: ['berry'] },
  { phrase: 'red currant', feel: 'tart currant berry — bright fruit, not citrus', tags: ['berry'] },
  { phrase: 'cherry almond', feel: 'sweet cherry with toasted almond — bakery-fruit, not citrus', tags: ['berry', 'scent-only'] },
  { phrase: 'cherry blossom', feel: 'delicate spring blossom — floral, not cherry candy unless the fruit is also named', tags: ['floral'] },
  { phrase: 'cherry', feel: 'sweet cherry — orchard-berry fruit, not citrus', tags: ['berry'] },

  // ── Orchard fruit ──
  { phrase: 'peach bellini', feel: 'sparkling peach — juicy orchard fruit, not citrus', tags: ['orchard', 'scent-only'] },
  { phrase: 'apricot', feel: 'soft apricot — orchard fruit that helps skin feel smooth', tags: ['orchard'] },
  { phrase: 'nectarine', feel: 'juicy nectarine — orchard fruit, not citrus', tags: ['orchard'] },
  { phrase: 'peach', feel: 'ripe peach — juicy orchard fruit, not citrus or mint', tags: ['orchard'] },
  { phrase: 'apple', feel: 'crisp apple — clean orchard fruit, not citrus', tags: ['orchard'] },
  { phrase: 'pear', feel: 'soft pear — orchard fruit, not citrus', tags: ['orchard'] },
  { phrase: 'plum', feel: 'ripe plum — orchard fruit, not citrus', tags: ['orchard'] },
  { phrase: 'fig', feel: 'sweet earthy fig — warm fruit, not citrus', tags: ['orchard'] },

  // ── Butters / rich emollients ──
  { phrase: 'shea butter', feel: 'rich, cushiony shea moisture that softens dry-feeling skin', tags: ['emollient'] },
  { phrase: 'cocoa butter', feel: 'rich cocoa-butter moisture with a warm chocolate scent', tags: ['emollient'] },
  { phrase: 'kokum', feel: 'firm kokum butter — moisturizes without a greasy feel', tags: ['emollient'] },
  { phrase: 'murumuru', feel: 'tropical murumuru butter — softens and conditions', tags: ['emollient', 'tropical'] },
  { phrase: 'illipe', feel: 'illipe butter — adds a cushiony, non-greasy moisture', tags: ['emollient'] },
  { phrase: 'cupuaçu', feel: 'cupuaçu butter — deeply hydrating tropical moisture', tags: ['emollient', 'tropical'] },
  { phrase: 'cupuacu', feel: 'cupuaçu — deeply hydrating tropical moisture', tags: ['emollient', 'tropical'] },
  { phrase: 'avocado butter', feel: 'velvety avocado butter — nourishes dry-feeling skin', tags: ['emollient'] },
  { phrase: 'baobab', feel: 'baobab butter/oil — vitamin-rich cushiony moisture', tags: ['emollient'] },
  { phrase: 'macadamia', feel: 'creamy macadamia — softens and conditions', tags: ['emollient'] },
  { phrase: 'tucuma', feel: 'Amazonian tucuma butter — protective, conditioning film', tags: ['emollient'] },
  { phrase: 'olive butter', feel: 'olive butter — skin-softening, squalene-rich moisture', tags: ['emollient'] },
  { phrase: 'coffee butter', feel: 'coffee-infused butter — rich moisture with a roasted scent', tags: ['emollient'] },
  { phrase: 'aloe butter', feel: 'aloe-infused butter — soothing moisture, not mint-cool', tags: ['soothe', 'emollient'] },
  { phrase: 'hemp seed butter', feel: 'hemp butter — calming, omega-rich moisture', tags: ['emollient', 'soothe'] },

  // ── Carrier oils (soften / condition — never mint unless mint is named) ──
  { phrase: 'sweet almond', feel: 'gentle almond oil — nourishes and softens', tags: ['emollient'] },
  { phrase: 'olive oil', feel: 'olive oil — deeply conditions and moisturizes', tags: ['emollient'] },
  { phrase: 'castor oil', feel: 'castor oil — boosts a cushiony lather and helps skin feel soft', tags: ['emollient'] },
  { phrase: 'jojoba', feel: 'jojoba — lightweight, skin-similar moisture', tags: ['emollient'] },
  { phrase: 'avocado oil', feel: 'avocado oil — rich, nourishing moisture', tags: ['emollient'] },
  { phrase: 'argan', feel: 'argan oil — luxury conditioning for dry-feeling skin', tags: ['emollient'] },
  { phrase: 'hemp seed oil', feel: 'hemp seed oil — omega-rich conditioning', tags: ['emollient'] },
  { phrase: 'rosehip', feel: 'rosehip — helps skin feel smoother and more even, not minty', tags: ['emollient'] },
  { phrase: 'rose hip', feel: 'rose hip — helps skin feel smoother and more even', tags: ['emollient'] },
  { phrase: 'grape seed', feel: 'grape-seed oil — lightweight, fast-absorbing moisture', tags: ['emollient'] },
  { phrase: 'grapeseed', feel: 'grapeseed oil — lightweight, non-greasy moisture', tags: ['emollient'] },
  { phrase: 'sunflower', feel: 'sunflower oil — light vitamin-E moisture', tags: ['emollient'] },
  { phrase: 'rice bran', feel: 'rice bran — gentle brightening polish or light moisture', tags: ['emollient'] },
  { phrase: 'sea buckthorn', feel: 'sea buckthorn — rich, softening oil with a warm hue', tags: ['emollient'] },
  { phrase: 'tamanu', feel: 'tamanu — comforting, skin-softening oil', tags: ['emollient', 'soothe'] },
  { phrase: 'neem', feel: 'neem — clarifying botanical for a clean, comforted feel', tags: ['purify'] },
  { phrase: 'marula', feel: 'marula — fast-absorbing nourishing oil', tags: ['emollient'] },
  { phrase: 'meadowfoam', feel: 'meadowfoam — silky conditioning oil', tags: ['emollient'] },
  { phrase: 'apricot kernel', feel: 'apricot kernel — gentle emollient for sensitive-feeling skin', tags: ['emollient'] },
  { phrase: 'black seed', feel: 'black seed oil — comforting moisture for reactive-feeling skin', tags: ['emollient', 'soothe'] },
  { phrase: 'black cumin', feel: 'black cumin — comforting moisture for reactive-feeling skin', tags: ['emollient', 'soothe'] },
  { phrase: 'evening primrose', feel: 'evening primrose — comforting oil for dry-feeling skin', tags: ['emollient', 'soothe'] },
  { phrase: 'borage', feel: 'borage — comforting oil for dry-feeling skin', tags: ['emollient', 'soothe'] },
  { phrase: 'prickly pear', feel: 'prickly-pear seed oil — lightweight luxury moisture', tags: ['emollient'] },
  { phrase: 'squalane', feel: 'squalane — weightless, skin-similar softness', tags: ['emollient'] },
  { phrase: 'kukui', feel: 'kukui — fast-absorbing Hawaiian moisture', tags: ['emollient', 'tropical'] },
  { phrase: 'babassu', feel: 'babassu — coconut-like moisture with a lighter feel', tags: ['emollient', 'tropical'] },
  { phrase: 'moringa', feel: 'moringa — light conditioning oil that helps skin feel clean', tags: ['emollient'] },

  // ── Clays / charcoal ──
  { phrase: 'activated charcoal', feel: 'charcoal — helps skin feel deeply clean and clarified', tags: ['cleanse'] },
  { phrase: 'charcoal', feel: 'charcoal — helps skin feel clean and clarified, not scented unless a FO is named', tags: ['cleanse'] },
  { phrase: 'bentonite', feel: 'bentonite clay — draws oil and helps pores feel cleaner', tags: ['cleanse'] },
  { phrase: 'kaolin', feel: 'kaolin — gentle cleanse that does not strip', tags: ['cleanse'] },
  { phrase: 'rhassoul', feel: 'rhassoul — mineral clay that leaves skin feeling clean and soft', tags: ['cleanse'] },
  { phrase: 'fuller\'s earth', feel: 'fuller\'s earth — strong oil-absorbing cleanse', tags: ['cleanse'] },
  { phrase: 'dead sea', feel: 'Dead Sea minerals — mineral-rich cleanse or polish', tags: ['cleanse'] },
  { phrase: 'french green', feel: 'French green clay — oil-balancing mineral cleanse', tags: ['cleanse'] },
  { phrase: 'montmorillonite', feel: 'montmorillonite — absorbent clay that helps skin feel clarified', tags: ['cleanse'] },
  { phrase: 'zeolite', feel: 'zeolite — mineral powder that helps skin feel purified', tags: ['cleanse'] },
  { phrase: 'white clay', feel: 'mild white clay — gentle cleanse and a soft finish', tags: ['cleanse'] },
  { phrase: 'clay', feel: 'mineral clay — helps skin feel clean and balanced', tags: ['cleanse'] },

  // ── Soothe family (aloe is NOT mint-cool) ──
  { phrase: 'colloidal oatmeal', feel: 'colloidal oatmeal — comforts dry or sensitive-feeling skin', tags: ['soothe'] },
  { phrase: 'oatmeal milk', feel: 'cozy oatmeal-milk-honey comfort scent — soothing, not mint', tags: ['soothe', 'honey', 'scent-only'] },
  { phrase: 'oat milk', feel: 'oat milk — creamy, soothing lather for sensitive-feeling skin', tags: ['soothe', 'creamy'] },
  { phrase: 'oatmeal', feel: 'oatmeal — soothes and comforts dry or sensitive-feeling skin', tags: ['soothe'] },
  { phrase: 'aloe vera', feel: 'aloe — soothing hydration that comforts dry-feeling skin, not mint-cool', tags: ['soothe'] },
  { phrase: 'aloe', feel: 'aloe — soothing and hydrating, never minty or tingly', tags: ['soothe'] },
  { phrase: 'chamomile', feel: 'chamomile — calming scent and a gentle, comforted skin feel', tags: ['soothe', 'floral'] },
  { phrase: 'calendula', feel: 'calendula — gentle botanical that comforts sensitive-feeling skin', tags: ['soothe'] },
  { phrase: 'marshmallow root', feel: 'marshmallow root — slippery-soothing comfort on skin', tags: ['soothe'] },
  { phrase: 'slippery elm', feel: 'slippery elm — soothing, protective comfort on skin', tags: ['soothe'] },
  { phrase: 'plantain', feel: 'plantain leaf — comforts redness-feeling skin', tags: ['soothe'] },
  { phrase: 'chickweed', feel: 'chickweed — comforting botanical for itchy-feeling skin', tags: ['soothe'] },
  { phrase: 'bisabolol', feel: 'bisabolol — chamomile-derived calm for reactive-feeling skin', tags: ['soothe'] },
  { phrase: 'witch hazel', feel: 'witch hazel — light astringent cleanse, comforting after rinse', tags: ['cleanse'] },
  { phrase: 'comfrey', feel: 'comfrey — skin-softening botanical comfort', tags: ['soothe'] },
  { phrase: 'lavender', feel: 'lavender — calming floral scent, gentle on skin — not mint-cool', tags: ['floral'] },
  { phrase: 'green tea', feel: 'green tea — clean, lightly astringent comfort, not mint', tags: ['soothe'] },

  // ── Honey / milks ──
  { phrase: 'honey almond', feel: 'sweet honey with toasted almond — cozy, nourishing scent', tags: ['honey', 'scent-only'] },
  { phrase: 'goat milk', feel: 'goat milk — creamy lather that leaves skin feeling soft', tags: ['creamy'] },
  { phrase: 'buttermilk', feel: 'buttermilk — creamy lather with a gentle polished feel', tags: ['creamy'] },
  { phrase: 'whole milk', feel: 'milk — creamy lather that softens', tags: ['creamy'] },
  { phrase: 'almond milk', feel: 'almond milk — gentle, nourishing creamy lather', tags: ['creamy'] },
  { phrase: 'rice milk', feel: 'rice milk — light, brightening-feel creamy rinse', tags: ['creamy'] },
  { phrase: 'hemp milk', feel: 'hemp milk — soothing creamy lather', tags: ['creamy', 'soothe'] },
  { phrase: 'honey', feel: 'honey — softens and helps skin feel nourished (humectant, not medical)', tags: ['honey'] },

  // ── Florals ──
  { phrase: 'ylang ylang', feel: 'ylang ylang — intensely floral, balancing scent', tags: ['floral'] },
  { phrase: 'rose petal', feel: 'rose — romantic floral scent, softly comforting on skin', tags: ['floral'] },
  { phrase: 'rose water', feel: 'light rose-water scent — clean and elegant', tags: ['floral', 'scent-only'] },
  { phrase: 'rose absolute', feel: 'luxury rose — deeply floral and skin-softening', tags: ['floral'] },
  { phrase: 'moroccan rose', feel: 'rich rose — exotic floral scent', tags: ['floral', 'scent-only'] },
  { phrase: 'jasmine', feel: 'jasmine — blooming floral scent, lightly moisturizing feel', tags: ['floral'] },
  { phrase: 'gardenia', feel: 'gardenia — lush white floral scent', tags: ['floral', 'scent-only'] },
  { phrase: 'honeysuckle', feel: 'honeysuckle — delicate sweet floral', tags: ['floral', 'scent-only'] },
  { phrase: 'hibiscus', feel: 'hibiscus — gently brightening floral, not citrus', tags: ['floral'] },
  { phrase: 'geranium', feel: 'geranium — balancing floral scent for a comfortable skin feel', tags: ['floral'] },
  { phrase: 'peony', feel: 'peony — soft romantic floral', tags: ['floral', 'scent-only'] },
  { phrase: 'magnolia', feel: 'magnolia — creamy white floral', tags: ['floral', 'scent-only'] },
  { phrase: 'lilac', feel: 'lilac — nostalgic spring floral', tags: ['floral', 'scent-only'] },
  { phrase: 'tuberose', feel: 'tuberose — heady white floral', tags: ['floral', 'scent-only'] },
  { phrase: 'freesia', feel: 'freesia — crisp fresh floral', tags: ['floral', 'scent-only'] },
  { phrase: 'orchid', feel: 'orchid — lush tropical floral, not fruit-citrus', tags: ['floral', 'scent-only'] },
  { phrase: 'violet', feel: 'violet — powdery floral, not mint-cool', tags: ['floral', 'scent-only'] },
  { phrase: 'iris', feel: 'iris — powdery sophisticated floral, not mint-cool', tags: ['floral', 'scent-only'] },
  { phrase: 'sweet pea', feel: 'sweet pea — light powdery floral', tags: ['floral', 'scent-only'] },
  { phrase: 'lily', feel: 'lily — clean white floral', tags: ['floral', 'scent-only'] },
  { phrase: 'elder flower', feel: 'elder flower — soft floral that helps skin feel smoother', tags: ['floral'] },
  { phrase: 'rose', feel: 'rose — romantic floral scent, comforting on skin', tags: ['floral'] },

  // ── Woods / resins / musk ──
  { phrase: 'sandalwood rose', feel: 'warm sandalwood with rose — woody floral, not mint', tags: ['woody', 'floral', 'scent-only'] },
  { phrase: 'patchouli sandalwood', feel: 'earthy patchouli with warm sandalwood', tags: ['woody', 'scent-only'] },
  { phrase: 'frankincense myrrh', feel: 'warm sacred resins — grounding scent, not fruit', tags: ['woody', 'scent-only'] },
  { phrase: 'cedarwood sage', feel: 'woodsy cedar with earthy sage — grounding, not mint', tags: ['woody', 'scent-only'] },
  { phrase: 'balsam & cedar', feel: 'warm forest balsam and cedar', tags: ['woody', 'scent-only'] },
  { phrase: 'teak & mahogany', feel: 'rich masculine woods', tags: ['woody', 'scent-only'] },
  { phrase: 'sandalwood', feel: 'warm sandalwood — grounding, skin-softening scent', tags: ['woody'] },
  { phrase: 'cedarwood', feel: 'woodsy cedar — grounding scent', tags: ['woody'] },
  { phrase: 'frankincense', feel: 'frankincense resin — warm, grounding scent', tags: ['woody'] },
  { phrase: 'patchouli', feel: 'earthy patchouli — grounding, musky scent', tags: ['woody'] },
  { phrase: 'vetiver', feel: 'smoky-earthy vetiver — grounding scent', tags: ['woody'] },
  { phrase: 'oakmoss', feel: 'forest-moss scent — earthy and grounding', tags: ['woody', 'scent-only'] },
  { phrase: 'myrrh', feel: 'warm myrrh resin — grounding scent', tags: ['woody'] },
  { phrase: 'amber vanilla', feel: 'warm amber with sweet vanilla', tags: ['woody', 'scent-only'] },
  { phrase: 'amber', feel: 'warm golden amber — resinous scent', tags: ['woody', 'scent-only'] },
  { phrase: 'pine', feel: 'crisp pine forest — fresh woods, not mint-fruit', tags: ['woody'] },
  { phrase: 'fir', feel: 'fresh fir-needle forest scent', tags: ['woody'] },
  { phrase: 'spruce', feel: 'deep spruce forest scent', tags: ['woody'] },
  { phrase: 'dragon\'s blood', feel: 'dark resinous scent — mysterious, not fruity', tags: ['woody', 'scent-only'] },

  // ── Warming spices (the opposite of cooling) ──
  { phrase: 'pumpkin spice', feel: 'warm autumn spice — cinnamon-ginger warmth, not mint', tags: ['warming', 'scent-only'] },
  { phrase: 'cinnamon roll', feel: 'warm bakery cinnamon — cozy spice, not cooling', tags: ['warming', 'scent-only'] },
  { phrase: 'gingerbread', feel: 'warm holiday spice bakery scent', tags: ['warming', 'scent-only'] },
  { phrase: 'chai tea', feel: 'spiced chai — warming cinnamon-ginger comfort', tags: ['warming', 'scent-only'] },
  { phrase: 'white tea & ginger', feel: 'clean tea with warm ginger — spice warmth, not mint-cool', tags: ['warming', 'scent-only'] },
  { phrase: 'cinnamon', feel: 'warming cinnamon spice — cozy heat, never cooling', tags: ['warming'] },
  { phrase: 'ginger', feel: 'warming ginger — stimulating spice, not mint', tags: ['warming'] },
  { phrase: 'clove', feel: 'warming clove spice — not mint, not fruit-citrus', tags: ['warming'] },
  { phrase: 'black pepper', feel: 'warming pepper — spicy, not mint-cool', tags: ['warming'] },
  { phrase: 'allspice', feel: 'warming sweet-spice', tags: ['warming'] },
  { phrase: 'nutmeg', feel: 'warming nutmeg', tags: ['warming'] },
  { phrase: 'cardamom', feel: 'warm spicy-sweet cardamom', tags: ['warming'] },
  { phrase: 'cassia', feel: 'warming cinnamon-like cassia', tags: ['warming'] },
  { phrase: 'vanilla', feel: 'warm sweet vanilla — cozy scent, not mint unless mint is also named', tags: ['scent-only'] },
  { phrase: 'turmeric', feel: 'golden turmeric — helps skin look brighter, warm spice, not mint', tags: ['warming'] },

  // ── Exfoliants ──
  { phrase: 'ground coffee', feel: 'coffee scrub — invigorating polish, roasted scent, not mint', tags: ['exfoliate'] },
  { phrase: 'coffee grounds', feel: 'coffee grounds — body-polish texture with a roasted scent', tags: ['exfoliate'] },
  { phrase: 'walnut shell', feel: 'walnut-shell powder — medium scrub that smooths', tags: ['exfoliate'] },
  { phrase: 'apricot shell', feel: 'apricot-shell powder — gentle facial polish', tags: ['exfoliate'] },
  { phrase: 'jojoba beads', feel: 'round jojoba beads — gentle non-scratchy polish', tags: ['exfoliate'] },
  { phrase: 'poppy seed', feel: 'poppy seeds — gentle textured polish', tags: ['exfoliate'] },
  { phrase: 'chia seed', feel: 'chia — gentle texture plus a softening feel', tags: ['exfoliate'] },
  { phrase: 'pumice', feel: 'pumice — strong polish for rough spots', tags: ['exfoliate'] },
  { phrase: 'loofah', feel: 'loofah powder — fibrous deep-scrub texture', tags: ['exfoliate'] },
  { phrase: 'bamboo powder', feel: 'bamboo powder — silky fine polish', tags: ['exfoliate'] },
  { phrase: 'himalayan salt', feel: 'mineral salt — polishing, mineral-rich rinse', tags: ['exfoliate'] },
  { phrase: 'sea salt', feel: 'sea salt — mineral polish', tags: ['exfoliate'] },
  { phrase: 'brown sugar', feel: 'brown sugar — gentle dissolving polish with a warm-sweet scent', tags: ['exfoliate'] },
  { phrase: 'sugar', feel: 'sugar — gentle humectant polish that dissolves in the wash', tags: ['exfoliate'] },
  { phrase: 'coffee', feel: 'coffee — invigorating polish and roasted scent', tags: ['exfoliate'] },
  { phrase: 'oat', feel: 'oat — soothing comfort for dry or sensitive-feeling skin', tags: ['soothe'] },

  // ── Tea tree / clarifying (not cooling unless mint is named) ──
  { phrase: 'tea tree', feel: 'tea tree — purifying, clarifying scent — not mint-cool unless mint is named', tags: ['purify'] },
  { phrase: 'manuka', feel: 'manuka — purifying tea-tree relative', tags: ['purify'] },
  { phrase: 'rosemary', feel: 'rosemary — herbal, clarifying scent — not mint unless mint is named', tags: ['scent-only'] },

  // ── Clean / spa / aquatic FOs (scent only) ──
  { phrase: 'fresh linen', feel: 'clean laundry scent — fresh, not mint or fruit', tags: ['scent-only'] },
  { phrase: 'clean cotton', feel: 'just-washed cotton scent — clean, not mint', tags: ['scent-only'] },
  { phrase: 'ocean breeze', feel: 'light aquatic sea-air scent', tags: ['scent-only'] },
  { phrase: 'ocean dreams', feel: 'fresh aquatic sea-air scent', tags: ['scent-only'] },
  { phrase: 'sea breeze', feel: 'clean ocean-breeze scent', tags: ['scent-only'] },
  { phrase: 'rain', feel: 'clean earthy after-rain scent', tags: ['scent-only'] },
  { phrase: 'baby powder', feel: 'soft powder scent — comforting, not mint', tags: ['scent-only'] },
  { phrase: 'bamboo', feel: 'fresh green bamboo — clean spa scent, not mint', tags: ['scent-only'] },
  { phrase: 'egyptian musk', feel: 'clean sensual musk', tags: ['scent-only'] },
  { phrase: 'white musk', feel: 'soft clean musk', tags: ['scent-only'] },

  // ── Bakery FOs ──
  { phrase: 'sugar cookie', feel: 'warm bakery vanilla-sugar scent', tags: ['scent-only'] },
  { phrase: 'buttercream', feel: 'sweet buttery vanilla bakery scent', tags: ['scent-only'] },
  { phrase: 'caramel', feel: 'warm burnt-caramel gourmand scent', tags: ['scent-only'] },
  { phrase: 'chocolate', feel: 'rich chocolate gourmand scent', tags: ['scent-only'] },
  { phrase: 'brown sugar', feel: 'warm molasses-sweet bakery scent', tags: ['scent-only'] },
  { phrase: 'coffee house', feel: 'fresh-roasted coffee scent', tags: ['scent-only'] },
  { phrase: 'espresso', feel: 'rich espresso scent', tags: ['scent-only'] },

  // ── Humectants / everyday additives ──
  { phrase: 'hyaluronic', feel: 'hyaluronic acid — helps skin feel plump and hydrated', tags: ['emollient'] },
  { phrase: 'glycerin', feel: 'glycerin — draws moisture so skin feels comfortable after rinse', tags: ['emollient'] },
  { phrase: 'panthenol', feel: 'panthenol — helps skin feel moisturized and comfortable', tags: ['emollient'] },
  { phrase: 'vitamin e', feel: 'vitamin E — nourishing antioxidant oil feel', tags: ['emollient'] },
  { phrase: 'vitamin c', feel: 'vitamin C — helps skin look brighter (cosmetic only)', tags: [] },
  { phrase: 'silk amino', feel: 'silk amino acids — silky conditioned skin feel', tags: ['emollient'] },
  { phrase: 'arrowroot', feel: 'arrowroot — silky, oil-absorbing finish', tags: ['cleanse'] },
  { phrase: 'beeswax', feel: 'beeswax — protective feel that helps lock in softness', tags: ['emollient'] },
  { phrase: 'lanolin', feel: 'lanolin — rich protective moisture', tags: ['emollient'] },
];

const RULES_LONGEST_FIRST = [...FEEL_RULES].sort((a, b) => b.phrase.length - a.phrase.length);

const CATEGORY_FALLBACK: Partial<Record<string, IngredientFeel>> = {
  oil: { feel: 'carrier oil — softens and moisturizes dry-feeling skin', tags: ['emollient'] },
  butter: { feel: 'butter — rich, cushiony moisture', tags: ['emollient'] },
  milk: { feel: 'milk or cream — creamy lather that leaves skin comfortable', tags: ['creamy'] },
  clay: { feel: 'mineral clay — helps skin feel clean and clarified', tags: ['cleanse'] },
  botanical: { feel: 'botanical — gentle comfort on skin, no medical claims', tags: ['soothe'] },
  floral: { feel: 'floral — scent and a soft, comforting skin feel', tags: ['floral'] },
  citrus: { feel: 'true citrus — bright, zesty clean feel, not mint-cool', tags: ['citrus'] },
  exfoliant: { feel: 'exfoliant — polishes so skin feels smoother', tags: ['exfoliate'] },
  'essential-oil': { feel: 'essential oil — describe the named aroma only, no medical effect', tags: ['scent-only'] },
  fragrance: { feel: 'fragrance — describe the named aroma only, no borrowed skin miracle', tags: ['scent-only'] },
  base: { feel: 'glycerin soap base — gentle cleanse that leaves skin comfortable', tags: [] },
  seed: { feel: 'seed — nourishing or gently polishing, not mint or citrus unless named', tags: ['emollient'] },
  spice: { feel: 'spice — warming aromatic character, never cooling', tags: ['warming'] },
  wax: { feel: 'wax — protective feel that helps seal in softness', tags: ['emollient'] },
  additive: { feel: 'additive — everyday soap comfort (soften, hydrate) — no disease claims', tags: [] },
  colorant: { feel: 'color only — do not invent a scent or skin effect from the color name', tags: ['color-only'] },
  other: { feel: 'everyday soap feel: soften, hydrate, or gently refresh — never cooling unless mint', tags: [] },
};

export function describeIngredientSkinFeel(name: string, category?: string): IngredientFeel {
  if (isColorOnlyIngredient(name, category)) {
    return {
      feel: 'color only — never invent a fruit, mint, or citrus effect from a dye or mica name (lemon yellow ≠ lemon)',
      tags: ['color-only'],
    };
  }

  const n = name.toLowerCase();
  const tags = new Set<EffectTag>();
  const feels: string[] = [];

  for (const rule of RULES_LONGEST_FIRST) {
    if (!hasPhrase(n, rule.phrase)) continue;
    if (rule.phrase === 'mint' && /\b(wintergreen|peppermint|spearmint)\b/.test(n)) continue;
    if (rule.phrase === 'rose' && /\b(rosehip|rose hip|primrose)\b/.test(n)) continue;
    if (rule.phrase === 'orange' && /\b(orange blossom|neroli)\b/.test(n)) continue;
    feels.push(rule.feel);
    for (const tag of rule.tags) tags.add(tag);
    if (feels.length >= 2) break;
  }

  if (feels.length) {
    return { feel: uniqueJoin(feels), tags: [...tags] };
  }

  return CATEGORY_FALLBACK[category ?? 'other'] ?? CATEGORY_FALLBACK.other!;
}

function uniqueJoin(values: string[]): string {
  return [...new Set(values)].join('; ');
}

export function recipeEffectTags(ingredients: FeelIngredient[]): Set<EffectTag> {
  const tags = new Set<EffectTag>();
  for (const item of ingredients) {
    for (const tag of describeIngredientSkinFeel(item.name, item.category).tags) {
      if (tag !== 'color-only') tags.add(tag);
    }
  }
  return tags;
}

const CLAIM_WORDS: Array<{ tag: EffectTag; pattern: RegExp; label: string }> = [
  { tag: 'cooling', pattern: /\b(cool(?:ing|s)?|minty|tingl\w*|menthol)\b/i, label: 'cooling/mint/tingle' },
  { tag: 'citrus', pattern: /\b(citrus|cítrico|cítrica|cítricos|zesty|lemony)\b/i, label: 'citrus/zesty' },
  { tag: 'warming', pattern: /\b(warming|spicy heat|circulation)\b/i, label: 'warming' },
];

/** Human-readable contract injected into the AI prompt. */
export function buildEffectContract(ingredients: FeelIngredient[]): string {
  const tags = recipeEffectTags(ingredients);
  const listed = ingredients.map((item) => item.name).filter(Boolean).join(', ');
  const allowed: string[] = [];
  if (tags.has('cooling')) allowed.push('cooling/mint/tingle from the mint or eucalyptus actually listed');
  if (tags.has('citrus')) allowed.push('citrus/zesty from the citrus ingredients actually listed');
  if (tags.has('warming')) allowed.push('warming spice from the spices actually listed');
  if (tags.has('tropical')) allowed.push('tropical moisture/scent from the tropical ingredients actually listed');
  if (tags.has('melon')) allowed.push('juicy melon freshness — watery, not mint-cool');
  if (tags.has('berry')) allowed.push('berry fruit from the berries actually listed');
  if (tags.has('orchard')) allowed.push('orchard-fruit feel from the fruit actually listed');
  if (tags.has('floral')) allowed.push('the floral names actually in the list');
  if (tags.has('woody')) allowed.push('woody/resin scent actually in the list');
  if (tags.has('emollient')) allowed.push('moisturizing/softening from the oils and butters listed');
  if (tags.has('cleanse')) allowed.push('clean/clarified feel from clay or charcoal if listed');
  if (tags.has('soothe')) allowed.push('soothing comfort from the soothing ingredients listed');
  if (tags.has('honey')) allowed.push('honey softness');
  if (tags.has('exfoliate')) allowed.push('smoother, polished feel from the scrubs listed');
  if (tags.has('creamy')) allowed.push('creamy lather from the milks listed');
  if (tags.has('purify')) allowed.push('clarifying/purifying from tea tree or neem if listed');

  const forbidden: string[] = [];
  if (!tags.has('cooling')) forbidden.push('cooling, cools, minty, tingle, menthol');
  if (!tags.has('citrus')) forbidden.push('citrus, cítrico, zesty, lemony');
  if (!tags.has('warming')) forbidden.push('warming, spicy heat');
  forbidden.push('glycerin, glicerina, glycerin base (silent soap base — do not name it)');
  forbidden.push('medical/disease words (eczema, heal, wound, SPF, collagen, acne treatment)');
  forbidden.push('naming any botanical, oil, butter, milk, clay, or base that is not in this recipe');
  forbidden.push('defaulting to aloe vera, shea, lavender, honey, or other catalog stock names');

  return [
    'EFFECT CONTRACT — only use effects earned by the listed recipe ingredients:',
    listed ? `You may name only: ${listed}.` : '',
    `Allowed: ${allowed.join('; ') || 'moisturizing, conditioning, gentle cleanse, rinse feel'}`,
    `Forbidden: ${forbidden.join('; ')}`,
    'Do not mention botanicals, oils, or bases that are not in the provided ingredient list.',
    'Do not invent a citrus, mint-cool, or borrowed botanical feel.',
  ].filter(Boolean).join('\n');
}

export function benefitCopyViolatesEffects(
  en: string,
  es: string,
  ingredients: FeelIngredient[],
): string | null {
  const blob = `${en} ${es}`;
  const tags = recipeEffectTags(ingredients);

  for (const claim of CLAIM_WORDS) {
    if (tags.has(claim.tag)) continue;
    if (claim.pattern.test(blob)) {
      return `Do not write ${claim.label} — no ingredient in this recipe earns that effect.`;
    }
  }

  if (/experience the (?:cooling|refreshing|revitalizing) effect/i.test(en)) {
    return 'Do not write spa filler such as "Experience the cooling effect of…".';
  }
  if (/\b(glycerin|glycerine|glicerina)\b/i.test(blob)) {
    return 'Do not name glycerin — it is the silent soap base.';
  }
  if (/\bla mango\b/i.test(es)) {
    return 'Spanish gender: el mango, never "la mango".';
  }

  const unlisted = unlistedNamedFamilies(blob, ingredients);
  if (unlisted.length) {
    return `Do not name ${unlisted[0].copy[0]} — it is not in this recipe.`;
  }

  return null;
}

export function benefitPromptIngredientLines(ingredients: FeelIngredient[]): string {
  return ingredients
    .slice(0, 12)
    .map((item) => {
      const described = describeIngredientSkinFeel(item.name, item.category);
      const bits = [item.name];
      if (item.inci?.trim()) bits.push(`[INCI: ${item.inci.trim()}]`);
      if (item.category) bits.push(`(${item.category})`);
      bits.push(`— ${described.feel}`);
      if (described.tags.length) bits.push(`[effects: ${described.tags.filter((tag) => tag !== 'color-only').join(', ') || 'color only'}]`);
      return `- ${bits.join(' ')}`;
    })
    .join('\n');
}
