import { describe, expect, it } from 'vitest';
import type { Ingredient } from '@/types';
import { pickRecipeHeroIngredient } from './recipeHero';

function ing(patch: Partial<Ingredient> & Pick<Ingredient, 'id' | 'name'>): Ingredient {
  return {
    benefit: '',
    isSoapBase: false,
    active: true,
    createdAt: 0,
    updatedAt: 0,
    ...patch,
  };
}

describe('pickRecipeHeroIngredient', () => {
  const glycerin = ing({
    id: 'base',
    name: 'Glycerin Base (Clear)',
    isSoapBase: true,
    category: 'base',
    iconKey: 'glycerin-base-clear',
  });
  const mint = ing({
    id: 'mint',
    name: 'Mint',
    category: 'botanical',
    iconKey: 'mint',
  });
  const lavender = ing({
    id: 'lav',
    name: 'Lavender Herb',
    category: 'botanical',
    iconKey: 'lavender-herb',
  });

  it('uses the single non-base ingredient (mint, not glycerin)', () => {
    expect(pickRecipeHeroIngredient([glycerin, mint])?.id).toBe('mint');
  });

  it('uses the first extra when none are generated', () => {
    expect(pickRecipeHeroIngredient([glycerin, lavender, mint])?.id).toBe('lav');
  });

  it('prefers a Comfy-generated extra so a refresh updates the hero', () => {
    const generatedMint = { ...mint, iconKey: 'asset_abc' };
    expect(pickRecipeHeroIngredient([glycerin, lavender, generatedMint])?.iconKey).toBe('asset_abc');
  });

  it('falls back to the soap base when the recipe has no extras', () => {
    expect(pickRecipeHeroIngredient([glycerin])?.id).toBe('base');
  });
});
