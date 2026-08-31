import { describe, expect, it } from 'vitest';
import { STOCK_PER_PAGE, UNSPLASH_UTM_SOURCE, stockQueryForIngredient, stockTotalPages, withUnsplashUtm } from './stock';

describe('Unsplash attribution links', () => {
  it('adds utm_source and utm_medium without dropping existing query params', () => {
    const href = withUnsplashUtm('https://unsplash.com/@anniespratt?foo=1');
    const url = new URL(href);
    expect(url.searchParams.get('utm_source')).toBe(UNSPLASH_UTM_SOURCE);
    expect(url.searchParams.get('utm_medium')).toBe('referral');
    expect(url.searchParams.get('foo')).toBe('1');
    expect(url.pathname).toBe('/@anniespratt');
  });

  it('uses the registered app name as utm_source', () => {
    expect(UNSPLASH_UTM_SOURCE).toBe('gaia_studio');
    expect(UNSPLASH_UTM_SOURCE.toLowerCase()).not.toContain('unsplash');
  });
});

describe('stockQueryForIngredient', () => {
  it('strips process words so Unsplash can find the plant or material', () => {
    expect(stockQueryForIngredient('Lavender Essential Oil')).toBe('Lavender');
    expect(stockQueryForIngredient('Glycerin Base (Clear)')).toBe('Glycerin Base');
    expect(stockQueryForIngredient('Cocoa Butter')).toBe('Cocoa Butter');
  });
});

describe('stockTotalPages', () => {
  it('uses a page size that fills 2/4/5-column grids', () => {
    expect(STOCK_PER_PAGE % 2).toBe(0);
    expect(STOCK_PER_PAGE % 4).toBe(0);
    expect(STOCK_PER_PAGE % 5).toBe(0);
  });

  it('rounds up and never returns zero', () => {
    expect(stockTotalPages(0, 20)).toBe(1);
    expect(stockTotalPages(20, 20)).toBe(1);
    expect(stockTotalPages(21, 20)).toBe(2);
    expect(stockTotalPages(100, 20)).toBe(5);
  });
});
