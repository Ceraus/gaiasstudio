import { afterEach, describe, expect, it } from 'vitest';
import {
  STOCK_LOOKS,
  addCustomStockLook,
  hideStockLook,
  rememberStockQuery,
  removeCustomStockLook,
  suggestStockTerms,
  unhideStockLook,
} from './stockLooks';

const memory = new Map<string, string>();
const fakeStorage = {
  getItem: (key: string) => memory.get(key) ?? null,
  setItem: (key: string, value: string) => { memory.set(key, value); },
  removeItem: (key: string) => { memory.delete(key); },
};
Object.defineProperty(globalThis, 'localStorage', { value: fakeStorage, configurable: true });

afterEach(() => {
  memory.clear();
});

describe('stockLooks', () => {
  it('has no predefined look chips', () => {
    expect(STOCK_LOOKS).toEqual([]);
  });

  it('adds and removes custom looks', () => {
    addCustomStockLook('dried lavender', 'Lavanda');
    expect(removeCustomStockLook('dried lavender')).toHaveLength(0);
  });

  it('suggests English and Spanish labels', () => {
    const hits = suggestStockTerms('mármol', [
      { query: 'marble stone', label: 'Marble', altLabel: 'Mármol', kind: 'look' },
      { query: 'linen texture', label: 'Linen', altLabel: 'Lino', kind: 'look' },
    ]);
    expect(hits.map((hit) => hit.query)).toEqual(['marble stone']);
    expect(suggestStockTerms('marmol', [
      { query: 'marble stone', label: 'Marble', altLabel: 'Mármol', kind: 'look' },
    ]).map((hit) => hit.query)).toEqual(['marble stone']);
  });

  it('remembers recent queries and hidden looks', () => {
    expect(rememberStockQuery('mango')).toEqual(['mango']);
    expect(hideStockLook('linen texture')).toContain('linen texture');
    expect(unhideStockLook('linen texture')).not.toContain('linen texture');
  });

  it('shows recent terms when the query is empty', () => {
    const hits = suggestStockTerms('', [
      { query: 'mango', label: 'mango', kind: 'recent' },
      { query: 'marble stone', label: 'Marble', kind: 'look' },
    ]);
    expect(hits.map((hit) => hit.query)).toEqual(['mango']);
  });
});
