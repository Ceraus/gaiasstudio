import { describe, expect, it } from 'vitest';
import { getIngredientBilingualNames, ingredientMatchesQuery } from './ingredientI18n';

function canonicalizeSafe(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

describe('ingredient i18n bilingual names', () => {
  it('returns English and Spanish common names for seed ingredients', () => {
    const shea = getIngredientBilingualNames({ name: 'Shea Butter', inci: 'Butyrospermum Parkii (Shea) Butter' });
    expect(shea.en).toBe('Shea Butter');
    expect(shea.es).toMatch(/karité/i);
    expect(shea.distinctSpanish).toBe(true);
  });

  it('matches library search on either language or INCI', () => {
    const shea = { name: 'Shea Butter', inci: 'Butyrospermum Parkii (Shea) Butter', benefit: 'Nourishing' };
    expect(ingredientMatchesQuery(shea, 'shea')).toBe(true);
    expect(ingredientMatchesQuery(shea, 'karité')).toBe(true);
    expect(ingredientMatchesQuery(shea, 'butyrospermum')).toBe(true);
  });

  it('repeats INCI in the ES column when no common-name translation exists', () => {
    const row = {
      name: 'Abies Alba Leaf Oil',
      inci: 'ABIES ALBA LEAF OIL',
    };
    const names = getIngredientBilingualNames(row);
    expect(names.en).toBe('Abies Alba Leaf Oil');
    expect(canonicalizeSafe(names.es)).toBe(canonicalizeSafe(row.inci));
  });
});
