import { searchStockDetailed, type StockPhoto, type StockSearchResult } from '@/lib/stock';
import type { AppSettings } from '@/types';

const cache = new Map<string, StockSearchResult>();
const inflight = new Map<string, Promise<StockSearchResult>>();

export function stockPageCacheKey(query: string, page: number): string {
  return `${query.trim().toLowerCase()}::${page}`;
}

export function getCachedStockPage(query: string, page: number): StockSearchResult | null {
  return cache.get(stockPageCacheKey(query, page)) ?? null;
}

export function setCachedStockPage(query: string, result: StockSearchResult): void {
  cache.set(stockPageCacheKey(query, result.page), result);
}

/** Keep the current page, the previous page, and the designated next page. */
export function pruneStockPageCache(query: string, currentPage: number): void {
  const prefix = `${query.trim().toLowerCase()}::`;
  for (const key of [...cache.keys()]) {
    if (!key.startsWith(prefix)) {
      cache.delete(key);
      continue;
    }
    const page = Number(key.slice(prefix.length));
    if (page < currentPage - 1 || page > currentPage + 1) cache.delete(key);
  }
}

export function warmStockThumbs(photos: StockPhoto[]): void {
  if (typeof Image === 'undefined') return;
  for (const photo of photos) {
    const img = new Image();
    img.referrerPolicy = 'no-referrer-when-downgrade';
    img.src = photo.thumb;
  }
}

export async function prefetchStockPage(
  query: string,
  page: number,
  settings: AppSettings,
): Promise<StockSearchResult | null> {
  const q = query.trim();
  if (!q || page < 1) return null;
  const cached = getCachedStockPage(q, page);
  if (cached) {
    warmStockThumbs(cached.photos);
    return cached;
  }
  const key = stockPageCacheKey(q, page);
  const pending = inflight.get(key);
  if (pending) return pending;
  const request = searchStockDetailed(q, settings, { page })
    .then((result) => {
      setCachedStockPage(q, result);
      warmStockThumbs(result.photos);
      return result;
    })
    .finally(() => { inflight.delete(key); });
  inflight.set(key, request);
  return request;
}

export function resetStockPageCache(): void {
  cache.clear();
  inflight.clear();
}
