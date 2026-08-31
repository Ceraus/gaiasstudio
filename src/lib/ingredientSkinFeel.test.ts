import { describe, expect, it } from 'vitest';
import {
  benefitCopyViolatesEffects,
  benefitPromptIngredientLines,
  describeIngredientSkinFeel,
  ingredientsForBenefitCopy,
  isColorOnlyIngredient,
  isSilentBenefitIngredient,
  recipeEffectTags,
  stripUnlistedIngredientMentions,
} from '@/lib/ingredientSkinFeel';
import { mixBenefitsForIngredients, nameBenefitFamilies, recipeMentionsCitrus, BENEFIT_MIX_JOINER } from '@/lib/benefitMix';
import { isOfflineMixBenefitValue } from '@/lib/benefitI18n';
import {
  benefitDraftsTooSimilar,
  benefitRestatesRecipeTitle,
  buildBilingualBenefitPrompt,
  stripRecipeTitleFromBenefit,
} from '@/lib/localAi';
import type { TFunction } from 'i18next';

describe('ingredient skin-feel atlas', () => {
  it('keeps glycerin out of benefit copy', () => {
    expect(isSilentBenefitIngredient('Glycerin Base (Clear)', 'base')).toBe(true);
    expect(ingredientsForBenefitCopy([
      { name: 'Glycerin Base (Clear)', category: 'base' },
      { name: 'Mango Fragrance Oil', category: 'fragrance' },
    ]).map((item) => item.name)).toEqual(['Mango Fragrance Oil']);
    expect(benefitCopyViolatesEffects(
      'Leaves skin velvety soft thanks to glycerin and mango.',
      'Deja la piel suave gracias a la glicerina.',
      [{ name: 'Mango Fragrance Oil', category: 'fragrance' }],
    )).toMatch(/glycerin/i);
  });

  it('treats mango as tropical fruit, never citrus or cooling', () => {
    const mango = describeIngredientSkinFeel('Mango Fragrance Oil', 'fragrance');
    expect(mango.tags).toContain('tropical');
    expect(mango.tags).not.toContain('citrus');
    expect(mango.tags).not.toContain('cooling');
    expect(mango.feel.toLowerCase()).toMatch(/never (minty|citrus)|not citrus/);
  });

  it('treats mango butter as creamy moisture, not citrus', () => {
    const butter = describeIngredientSkinFeel('Mango Butter', 'butter');
    expect(butter.tags).toContain('emollient');
    expect(butter.tags).not.toContain('citrus');
    expect(butter.tags).not.toContain('cooling');
  });

  it('treats watermelon as juicy melon, not mint-cool', () => {
    const melon = describeIngredientSkinFeel('Watermelon Fragrance Oil', 'fragrance');
    expect(melon.tags).toContain('melon');
    expect(melon.tags).not.toContain('cooling');
    expect(melon.tags).not.toContain('citrus');
  });

  it('allows citrus only for true citrus names', () => {
    expect(describeIngredientSkinFeel('Lemon Peel Powder', 'citrus').tags).toContain('citrus');
    expect(describeIngredientSkinFeel('Sweet Orange Oil', 'essential-oil').tags).toContain('citrus');
    expect(describeIngredientSkinFeel('Grapefruit Mango FO', 'fragrance').tags).toContain('citrus');
    expect(describeIngredientSkinFeel('Grapefruit Mango FO', 'fragrance').tags).toContain('tropical');
  });

  it('does not treat dye names as fruit or citrus', () => {
    expect(isColorOnlyIngredient('Lemon Yellow Soap Colorant', 'colorant')).toBe(true);
    expect(describeIngredientSkinFeel('Lemon Yellow Soap Colorant', 'colorant').tags).toEqual(['color-only']);
    expect(describeIngredientSkinFeel('Lime Green Mica', 'colorant').tags).not.toContain('citrus');
    expect(recipeMentionsCitrus([
      { name: 'Lemon Yellow Soap Colorant', category: 'colorant' },
      { name: 'Mango Fragrance Oil', category: 'fragrance' },
    ])).toBe(false);
  });

  it('allows cooling only for mint / eucalyptus / camphor families', () => {
    expect(describeIngredientSkinFeel('Peppermint EO', 'essential-oil').tags).toContain('cooling');
    expect(describeIngredientSkinFeel('Aloe Vera', 'botanical').tags).toContain('soothe');
    expect(describeIngredientSkinFeel('Aloe Vera', 'botanical').tags).not.toContain('cooling');
    expect(describeIngredientSkinFeel('Cucumber Melon Fragrance Oil', 'fragrance').tags).not.toContain('cooling');
  });

  it('rejects copy that borrows citrus or mint', () => {
    const mangoWatermelon = [
      { name: 'Mango Fragrance Oil', category: 'fragrance' },
      { name: 'Watermelon Fragrance Oil', category: 'fragrance' },
    ];
    expect(benefitCopyViolatesEffects(
      'Juicy mango and watermelon with an uplifting citrus scent.',
      'Mango y sandía con aroma cítrico.',
      mangoWatermelon,
    )).toMatch(/citrus/i);
    expect(benefitCopyViolatesEffects(
      'Experience the cooling effect of mango.',
      'Siente el mango.',
      mangoWatermelon,
    )).toMatch(/cooling|spa filler/i);
    expect(benefitCopyViolatesEffects(
      'Juicy watermelon and sun-ripe mango leave skin softly hydrated.',
      'La sandía y el mango dejan la piel hidratada.',
      mangoWatermelon,
    )).toBeNull();
  });

  it('unlocks moisturizing families for tropical fruit, not brightening-citrus', () => {
    const families = nameBenefitFamilies('Tropical Mango Fragrance Oil', 'fragrance');
    expect(families).toContain('Moisturizing');
    expect(families).not.toContain('Brightening');
  });

  it('treats near-duplicate benefit drafts as too similar', () => {
    expect(benefitDraftsTooSimilar(
      { en: 'Mango and watermelon moisturize and nourish skin, leaving it feeling soft and silky.' },
      [{ en: 'Mango and watermelon moisturize and nourish skin, leaving it silky soft and conditioned.' }],
    )).toBe(true);
    expect(benefitDraftsTooSimilar(
      { en: 'After the rinse, juicy watermelon and ripe mango leave skin comfortably hydrated.' },
      [{ en: 'Mango and watermelon moisturize and nourish skin, leaving it feeling soft and silky.' }],
    )).toBe(false);
  });

  it('does not pick citrus phrases for a mango-only mix', () => {
    const mix = mixBenefitsForIngredients([
      { name: 'Mango Butter', category: 'butter' },
      { name: 'Shea Butter', category: 'butter' },
    ]);
    expect(mix.phrases.join(' ').toLowerCase()).not.toMatch(/citrus|zesty|lemon/);
    expect(recipeEffectTags([
      { name: 'Mango Butter', category: 'butter' },
    ]).has('citrus')).toBe(false);
  });

  it('picks a 2–3 phrase offline mix-max for typical soap ingredients', () => {
    const mix = mixBenefitsForIngredients([
      { name: 'Shea Butter', category: 'butter' },
      { name: 'Lavender Essential Oil', category: 'essential-oil' },
      { name: 'Kaolin Clay', category: 'clay' },
    ]);
    expect(mix.phrases.length).toBeGreaterThanOrEqual(2);
    expect(mix.phrases.length).toBeLessThanOrEqual(3);
    expect(mix.families.length).toBeGreaterThan(0);
  });

  it('recognizes offline mix lines so AI-first can replace them', () => {
    const ingredients = [
      { name: 'Shea Butter', category: 'butter' },
      { name: 'Lavender Essential Oil', category: 'essential-oil' },
    ];
    const mix = mixBenefitsForIngredients(ingredients);
    const t = ((key: string, fallback?: string) => (typeof fallback === 'string' ? fallback : key)) as TFunction;
    expect(isOfflineMixBenefitValue(mix.phrases.join(BENEFIT_MIX_JOINER), ingredients, t)).toBe(true);
    expect(isOfflineMixBenefitValue('Silky shea leaves skin feeling conditioned.', ingredients, t)).toBe(false);
  });

  it('does not inject the recipe title into benefit prompts or copy', () => {
    const prompt = buildBilingualBenefitPrompt({
      recipeName: 'Moonlit Cedar Ceremony',
      ingredients: [
        { name: 'Lavender Essential Oil', category: 'essential-oil' },
        { name: 'Peppermint Essential Oil', category: 'essential-oil' },
      ],
    });
    expect(prompt).not.toMatch(/Product name:/i);
    expect(prompt).not.toContain('Moonlit Cedar Ceremony');
    expect(prompt).toMatch(/do not restate the recipe title/i);

    const titled = 'With its creamy texture, Lavender and Mint leave skin feeling refreshed and calm after the rinse.';
    expect(benefitRestatesRecipeTitle(titled, 'Lavender and Mint')).toBe(true);
    expect(stripRecipeTitleFromBenefit(titled, 'Lavender and Mint')).toBe(
      'With its creamy texture, leave skin feeling refreshed and calm after the rinse.',
    );
    expect(stripRecipeTitleFromBenefit(
      'A creamy lather with lavender and mint oils leaves skin refreshed.',
      'Lavender and Mint',
    )).toBe('A creamy lather with lavender and mint oils leaves skin refreshed.');
  });

  it('gives the model only this recipe\'s ingredients — no leftover catalog or title', () => {
    const ingredients = [
      { name: 'Glycerin Base (Clear)', category: 'base', inci: 'Glycerin, Sodium Cocoate, Aqua' },
      { name: 'Coconut Flakes', category: 'botanical', inci: 'Cocos Nucifera (Coconut) Endosperm' },
    ];
    const featured = ingredientsForBenefitCopy(ingredients);
    const prompt = buildBilingualBenefitPrompt({
      recipeName: 'lavendar',
      ingredients,
    });

    expect(prompt).not.toContain('lavendar');
    expect(prompt).not.toMatch(/full studio catalog/i);
    expect(prompt).not.toMatch(/Ingredient-type → benefit families/);
    expect(prompt).toMatch(/do not default to aloe vera/i);
    expect(prompt).toMatch(/ONLY ingredients in this recipe/i);

    const featuredBlock = prompt.split('The ONLY ingredients in this recipe')[1] ?? '';
    expect(featuredBlock).toContain('Coconut Flakes');
    expect(featuredBlock).toContain('Cocos Nucifera');
    expect(featuredBlock).not.toMatch(/aloe/i);
    expect(featuredBlock).not.toContain('Glycerin Base (Clear)');
    expect(benefitPromptIngredientLines(featured)).toMatch(/Coconut Flakes/);
    expect(benefitPromptIngredientLines(featured)).not.toMatch(/Glycerin Base/);

    expect(mixBenefitsForIngredients(featured).phrases.join(' ').toLowerCase()).not.toMatch(
      /aloe|lavender|honey|shea|milk proteins|silk amino/,
    );

    expect(benefitCopyViolatesEffects(
      'Skin nourished by coconut flakes and aloe vera after the rinse.',
      'Piel nutrida por hojuelas de coco y sábila.',
      ingredients,
    )).toMatch(/aloe/i);

    expect(stripUnlistedIngredientMentions(
      'Skin nourished by coconut flakes and aloe vera after the rinse.',
      ingredients,
    )).toBe('Skin nourished by coconut flakes after the rinse.');

    expect(benefitCopyViolatesEffects(
      'Coconut flakes nourish skin and leave a comfortable rinse feel.',
      'Las hojuelas de coco nutren la piel y dejan una sensación cómoda al enjuagar.',
      ingredients,
    )).toBeNull();
  });
});
