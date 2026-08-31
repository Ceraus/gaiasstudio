import { afterEach, describe, expect, it } from 'vitest';
import type { StockPhoto } from './stock';
import {
  STOCK_FAVORITES_KEY,
  isStockFavorite,
  loadStockFavorites,
  resetStockFavorites,
  stockFavoriteKey,
  toggleStockFavorite,
} from './stockFavorites';

function sample(id: string): StockPhoto {
  return {
    id,
    thumb: `https://images.example/${id}-thumb.jpg`,
    full: `https://images.example/${id}.jpg`,
    source: 'unsplash',
    photographerName: 'Ada',
    photographerUrl: 'https://unsplash.com/@ada',
    sourceUrl: 'https://unsplash.com',
    credit: `Photo by Ada on Unsplash`,
  };
}

const memory = new Map<string, string>();

const fakeStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};

Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true });

afterEach(() => {
  memory.clear();
  resetStockFavorites();
});

describe('stockFavorites', () => {
  it('stores a photo as a link without needing an import', () => {
    const photo = sample('marble-1');
    const next = toggleStockFavorite(photo);
    expect(next).toHaveLength(1);
    expect(isStockFavorite(photo, next)).toBe(true);
    expect(loadStockFavorites()[0]?.full).toBe(photo.full);
    expect(stockFavoriteKey(photo)).toBe('unsplash:marble-1');
  });

  it('toggles off and ignores junk stored under the same key', () => {
    toggleStockFavorite(sample('a'));
    expect(toggleStockFavorite(sample('a'))).toHaveLength(0);

    resetStockFavorites();
    memory.set(STOCK_FAVORITES_KEY, JSON.stringify([{ id: 1 }, sample('ok')]));
    expect(loadStockFavorites().map((p) => p.id)).toEqual(['ok']);
  });
});
