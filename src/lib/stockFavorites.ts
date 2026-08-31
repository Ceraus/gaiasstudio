import type { StockPhoto } from '@/lib/stock';

export const STOCK_FAVORITES_KEY = 'gaia:stock-favorites';

let cache: StockPhoto[] | null = null;

export function stockFavoriteKey(photo: Pick<StockPhoto, 'id' | 'source'>): string {
  return `${photo.source}:${photo.id}`;
}

function isStockFavoriteRecord(value: unknown): value is StockPhoto {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<StockPhoto>;
  return (
    typeof photo.id === 'string'
    && typeof photo.thumb === 'string'
    && typeof photo.full === 'string'
    && (photo.source === 'unsplash' || photo.source === 'pixabay')
    && typeof photo.photographerName === 'string'
    && typeof photo.credit === 'string'
  );
}

function readFromStorage(): StockPhoto[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(STOCK_FAVORITES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isStockFavoriteRecord);
  } catch {
    return [];
  }
}

export function loadStockFavorites(): StockPhoto[] {
  if (!cache) cache = readFromStorage();
  return cache;
}

export function saveStockFavorites(photos: StockPhoto[]): void {
  cache = photos;
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STOCK_FAVORITES_KEY, JSON.stringify(photos));
  } catch {
    // quota / private-mode — in-memory list still works this session
  }
}

export function isStockFavorite(
  photo: Pick<StockPhoto, 'id' | 'source'>,
  list = loadStockFavorites(),
): boolean {
  const key = stockFavoriteKey(photo);
  return list.some((entry) => stockFavoriteKey(entry) === key);
}

/** Saves or removes a stock photo as a link — no image is imported. */
export function toggleStockFavorite(photo: StockPhoto): StockPhoto[] {
  const list = loadStockFavorites();
  const key = stockFavoriteKey(photo);
  const next = isStockFavorite(photo, list)
    ? list.filter((entry) => stockFavoriteKey(entry) !== key)
    : [photo, ...list];
  saveStockFavorites(next);
  return next;
}

export function resetStockFavorites(): void {
  cache = null;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(STOCK_FAVORITES_KEY);
  } catch {
    // ignore
  }
}
