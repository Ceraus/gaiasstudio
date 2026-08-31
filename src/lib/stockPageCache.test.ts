import { afterEach, describe, expect, it } from 'vitest';
import type { StockSearchResult } from './stock';
import {
  getCachedStockPage,
  pruneStockPageCache,
  resetStockPageCache,
  setCachedStockPage,
  stockPageCacheKey,
} from './stockPageCache';

function page(n: number): StockSearchResult {
  return { photos: [], warnings: [], page: n, totalPages: 10 };
}

afterEach(() => {
  resetStockPageCache();
});

describe('stockPageCache', () => {
  it('stores a page by query and drops far-away pages', () => {
    expect(stockPageCacheKey(' Lavender ', 2)).toBe('lavender::2');
    setCachedStockPage('Lavender', page(1));
    setCachedStockPage('Lavender', page(2));
    setCachedStockPage('Lavender', page(4));
    pruneStockPageCache('Lavender', 2);
    expect(getCachedStockPage('lavender', 1)?.page).toBe(1);
    expect(getCachedStockPage('Lavender', 2)?.page).toBe(2);
    expect(getCachedStockPage('Lavender', 4)).toBeNull();
  });
});
