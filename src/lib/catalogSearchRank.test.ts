import { describe, expect, it } from 'vitest';
import { rankByQuery } from './catalogSearchRank';
import { searchOfflineIngredientCatalog } from './ingredientCatalog';

describe('catalogSearchRank', () => {
  it('lists the simplest mango name first', () => {
    const ranked = rankByQuery(
      [
        { name: 'Mango Peach Fragrance Oil', nameEs: 'Aceite de Fragancia de Mango Peach' },
        { name: 'Tropical Mango FO' },
        { name: 'Mango Fragrance Oil', nameEs: 'Aceite de Fragancia de Mango' },
        { name: 'Mango Seed Powder', nameEs: 'Polvo de Mango Semilla' },
        { name: 'Mango Seed Oil', nameEs: 'Aceite de Semilla de Mango' },
        { name: 'Mango Butter', nameEs: 'Manteca de Mango' },
        { name: 'Mango (Mangifera Indica)' },
        { name: 'Mango', nameEs: 'Mango' },
      ],
      '  Mango  ',
    ).map((row) => row.name);

    expect(ranked[0]).toBe('Mango');
    expect(ranked[1]).toBe('Mango (Mangifera Indica)');
    expect(ranked[2]).toBe('Mango Butter');
    expect(ranked.indexOf('Mango Butter')).toBeLessThan(ranked.indexOf('Mango Seed Oil'));
    expect(ranked.indexOf('Mango Seed Oil')).toBeLessThan(ranked.indexOf('Mango Peach Fragrance Oil'));
    expect(ranked.indexOf('Mango Fragrance Oil')).toBeLessThan(ranked.indexOf('Mango Peach Fragrance Oil'));
    expect(ranked.indexOf('Mango Peach Fragrance Oil')).toBeLessThan(ranked.indexOf('Tropical Mango FO'));
  });

  it('ranks an exact Spanish common name first', () => {
    const ranked = rankByQuery(
      [
        { name: 'Mango Butter', nameEs: 'Manteca de Mango' },
        { name: 'Mango Seed Oil', nameEs: 'Mango' },
      ],
      'mango',
    ).map((row) => row.name);
    expect(ranked[0]).toBe('Mango Seed Oil');
  });

  it('keeps bundled mango catalog hits in simple-first order', () => {
    const names = searchOfflineIngredientCatalog('mango').map((row) => row.name);
    expect(names[0]).toBe('Mango Butter');
    expect(names.indexOf('Mango Butter')).toBeLessThan(names.indexOf('Mango Seed Oil'));
    expect(names.indexOf('Mango Seed Oil')).toBeLessThan(names.indexOf('Mango Seed Powder'));
    expect(names.indexOf('Mango Seed Powder')).toBeLessThan(names.indexOf('Mango Fragrance Oil'));
    expect(names.indexOf('Mango Fragrance Oil')).toBeLessThan(names.indexOf('Mango Peach Fragrance Oil'));
    expect(names.some((name) => /ferment/i.test(name) && name.includes('/'))).toBe(false);
  });
});
