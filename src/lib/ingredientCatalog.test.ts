import { describe, expect, it } from 'vitest';
import {
  catalogEntryKey,
  countDistinctSpanishCatalogNames,
  getOfflineIngredientIconStats,
  ingredientIconFileSlug,
  ingredientBlendComplexity,
  isCompositeCatalogIngredient,
  OFFLINE_INGREDIENT_CATALOG,
  rankByQuery,
  searchOfflineIngredientCatalog,
  slugifyIngredientIconKey,
} from './ingredientCatalog';
import { canonicalizeIngredientName } from './ingredientResolution';
import { getIngredientBilingualNames } from './ingredientI18n';

describe('offline ingredient catalog', () => {
  it('is a hidden autocomplete/icon backlog, not inventory rows', () => {
    expect(OFFLINE_INGREDIENT_CATALOG.length).toBeGreaterThan(500);
    expect(OFFLINE_INGREDIENT_CATALOG.length).toBeLessThan(8000);
    expect(OFFLINE_INGREDIENT_CATALOG.some((row) => row.source === 'seed')).toBe(true);
    expect(OFFLINE_INGREDIENT_CATALOG.some((row) => row.source === 'cosing')).toBe(true);
    expect(OFFLINE_INGREDIENT_CATALOG.every((row) => !('id' in row) && !('active' in row))).toBe(true);
  });

  it('reports how many bundled names have generated PNGs', () => {
    const stats = getOfflineIngredientIconStats();
    expect(stats.names).toBe(OFFLINE_INGREDIENT_CATALOG.length);
    expect(stats.icons).toBeGreaterThan(0);
    expect(stats.icons).toBeLessThanOrEqual(stats.names);
  });

  it('dedupes by canonical common name', () => {
    const keys = OFFLINE_INGREDIENT_CATALOG.map((row) => canonicalizeIngredientName(row.name));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('matches common names, INCI, and aliases like live suggestions', () => {
    const shea = searchOfflineIngredientCatalog('shea');
    expect(shea.some((row) => /shea butter/i.test(row.name))).toBe(true);

    const lavender = searchOfflineIngredientCatalog('lavender eo');
    expect(lavender.some((row) => /lavender/i.test(row.name))).toBe(true);

    const cocoa = searchOfflineIngredientCatalog('theobroma cacao');
    expect(cocoa.some((row) => /cocoa butter/i.test(row.name))).toBe(true);
  });

  it('matches Spanish common names and returns both language labels', () => {
    const karite = searchOfflineIngredientCatalog('manteca de karité');
    const shea = karite.find((row) => /shea butter/i.test(row.name));
    expect(shea).toBeTruthy();
    expect(shea?.nameEs).toMatch(/karité/i);

    const cacao = searchOfflineIngredientCatalog('manteca de cacao');
    expect(cacao.some((row) => /cocoa butter/i.test(row.name))).toBe(true);
  });

  it('keeps real Spanish names on seed/i18n rows instead of a CosIng dump', () => {
    const withNameEs = OFFLINE_INGREDIENT_CATALOG.filter((row) => row.nameEs);
    const cosingWithNameEs = withNameEs.filter((row) => row.source === 'cosing').length;
    expect(withNameEs.length).toBe(634);
    expect(cosingWithNameEs).toBe(0);
    expect(countDistinctSpanishCatalogNames()).toBe(withNameEs.length);
  });

  it('does not duplicate snapshot hits already in the local library', () => {
    const all = searchOfflineIngredientCatalog('cocoa butter');
    expect(all.length).toBeGreaterThan(0);
    const excluded = searchOfflineIngredientCatalog('cocoa butter', {
      excludeKeys: all.flatMap((row) => [
        catalogEntryKey(row),
        canonicalizeIngredientName(row.name),
      ]),
    });
    expect(excluded.some((row) => /cocoa butter/i.test(row.name))).toBe(false);
  });

  it('keeps curated seed names and iconKeys after CosIng merge', () => {
    const cocoa = OFFLINE_INGREDIENT_CATALOG.find((row) => row.name === 'Cocoa Butter');
    expect(cocoa?.source).toBe('seed');
    expect(cocoa?.iconKey).toBe('cocoa-butter');
    expect(cocoa?.nameEs).toMatch(/cacao/i);
  });

  it('reports bundled backlog stats without using Dexie inventory', () => {
    const stats = getOfflineIngredientIconStats();
    expect(stats.names).toBe(OFFLINE_INGREDIENT_CATALOG.length);
    expect(stats.icons).toBeGreaterThan(0);
    expect(stats.icons).toBeLessThanOrEqual(stats.names);
    expect(stats.stored && stats.included && stats.available).toBe(true);
  });

  it('slugs cocoa butter to the bundled PNG filename', () => {
    expect(slugifyIngredientIconKey('Cocoa Butter')).toBe('cocoa-butter');
    const cocoa = OFFLINE_INGREDIENT_CATALOG.find((row) => row.name === 'Cocoa Butter');
    expect(cocoa?.iconKey).toBe('cocoa-butter');
  });

  it('lists peppermint and spearmint for a short mint query with PNG slugs', () => {
    const mint = searchOfflineIngredientCatalog('mint', { limit: 24 });
    const names = mint.map((row) => row.name);
    expect(names.some((name) => /peppermint/i.test(name))).toBe(true);
    expect(names.some((name) => /spearmint/i.test(name))).toBe(true);
    expect(names.some((name) => /mica/i.test(name))).toBe(false);
    expect(names[0]).toMatch(/peppermint|spearmint/i);
    const peppermint = mint.find((row) => row.name === 'Peppermint EO');
    expect(peppermint).toBeTruthy();
    expect(slugifyIngredientIconKey(peppermint!.iconKey || peppermint!.name)).toBe('peppermint-eo');
    expect(ingredientIconFileSlug('Peppermint EO', 'peppermint-eo')).toBe('peppermint-eo');
    expect(ingredientIconFileSlug('Spearmint EO')).toBe('spearmint-eo');
    expect(slugifyIngredientIconKey('Peppermint EO')).toBe('peppermint-eo');
    expect(slugifyIngredientIconKey('Spearmint EO')).toBe('spearmint-eo');
  });

  it('shortens Windows-illegal CosIng slugs without colliding', () => {
    const long = OFFLINE_INGREDIENT_CATALOG.filter((row) => (row.iconKey?.length ?? 0) > 240);
    expect(long.length).toBeGreaterThan(0);
    const fitted = long.map((row) => slugifyIngredientIconKey(row.iconKey || row.name));
    expect(fitted.every((slug) => slug.length <= 240)).toBe(true);
    expect(new Set(fitted).size).toBe(fitted.length);
  });

  it('falls back CosIng ES labels to INCI instead of inventing Spanish', () => {
    const cosing = OFFLINE_INGREDIENT_CATALOG.find((row) =>
      row.source === 'cosing' && !row.nameEs && row.inci,
    );
    expect(cosing).toBeTruthy();
    const names = getIngredientBilingualNames(cosing!);
    expect(canonicalizeIngredientName(names.es)).toBe(canonicalizeIngredientName(cosing!.inci!));
  });

  it('hides CosIng composite ferment-extract blends from catalog search', () => {
    const ferment = 'Saccharomyces/(Clove/Lavender) Flower/(Anise/Brassica Napus/Coriander/Fennel/Hypericum Perforatum/Nigella Sativa/Parsley) Fruit/(Cymbopogon Citratus/Fraxinus Excelsior/Laurus Nobilis/Marrubium Vulgare/Sage/Stachys Officinalis) Leaf/(Ginger/Valeriana Officinalis) Root/(Cinnamomum Zeylanicum/Stachys Officinalis) Stem/Honey Ferment Extract';
    expect(isCompositeCatalogIngredient(ferment)).toBe(true);
    expect(isCompositeCatalogIngredient('Odontioda Lavender Lace Flower Extract')).toBe(false);
    expect(isCompositeCatalogIngredient('Lavender EO')).toBe(false);
    expect(isCompositeCatalogIngredient('Sea Kelp Bioferment', 'Macrocystis Pyrifera Ferment')).toBe(false);

    const lavender = searchOfflineIngredientCatalog('laven', { limit: 24 });
    expect(lavender.some((row) => /ferment extract/i.test(row.name) && row.name.includes('/'))).toBe(false);
    expect(lavender.some((row) => /lavender/i.test(row.name))).toBe(true);
  });

  it('ranks simple singles before blends for a lavender prefix query', () => {
    expect(ingredientBlendComplexity('Lavender EO')).toBeLessThan(ingredientBlendComplexity('Lavender & Cedar FO'));
    expect(ingredientBlendComplexity('Lavender Buds')).toBeLessThan(ingredientBlendComplexity('Lavender Mint Fragrance Oil'));

    const names = searchOfflineIngredientCatalog('lavend', { limit: 24 }).map((row) => row.name);
    const blendIdx = names.findIndex((name) => /lavender\s*&\s*cedar/i.test(name));
    expect(blendIdx).toBeGreaterThan(0);
    for (const simple of ['Lavender EO', 'Lavender Buds', 'Lavender Herb', 'Lavender Fragrance Oil']) {
      const idx = names.indexOf(simple);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(blendIdx);
    }
    expect(names[0]).not.toMatch(/[&+]| \/ /);

    const ranked = rankByQuery(
      [
        { name: 'Lavender & Cedar FO' },
        { name: 'Lavender Fragrance Oil' },
        { name: 'Lavender EO' },
        { name: 'Lavender Buds' },
      ],
      'lavend',
    ).map((row) => row.name);
    expect(ranked[0]).toBe('Lavender EO');
    expect(ranked.indexOf('Lavender & Cedar FO')).toBe(ranked.length - 1);
  });
});
