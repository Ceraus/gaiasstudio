/** Built-in look chips. Empty by design — users add their own via "+ Add look". */
export const STOCK_LOOKS: { query: string; labelKey: string; label: string }[] = [];

export const STOCK_CUSTOM_LOOKS_KEY = 'gaia:stock-custom-looks';
export const STOCK_HIDDEN_LOOKS_KEY = 'gaia:stock-hidden-looks';
export const STOCK_RECENT_KEY = 'gaia:stock-recent-queries';

export interface CustomStockLook {
  query: string;
  label: string;
}

export interface StockSuggestItem {
  query: string;
  label: string;
  altLabel?: string;
  kind: 'look' | 'custom' | 'ingredient' | 'recent' | 'web';
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota / private-mode
  }
}

export function loadCustomStockLooks(): CustomStockLook[] {
  const rows = readJson<unknown>(STOCK_CUSTOM_LOOKS_KEY, []);
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is CustomStockLook =>
    !!row && typeof row === 'object'
    && typeof (row as CustomStockLook).query === 'string'
    && typeof (row as CustomStockLook).label === 'string'
    && (row as CustomStockLook).query.trim().length > 0,
  );
}

export function saveCustomStockLooks(looks: CustomStockLook[]): void {
  writeJson(STOCK_CUSTOM_LOOKS_KEY, looks);
}

export function addCustomStockLook(query: string, label = query): CustomStockLook[] {
  const nextQuery = query.trim();
  if (!nextQuery) return loadCustomStockLooks();
  const looks = loadCustomStockLooks().filter((look) => look.query.toLowerCase() !== nextQuery.toLowerCase());
  const next = [{ query: nextQuery, label: label.trim() || nextQuery }, ...looks];
  saveCustomStockLooks(next);
  return next;
}

export function removeCustomStockLook(query: string): CustomStockLook[] {
  const next = loadCustomStockLooks().filter((look) => look.query.toLowerCase() !== query.trim().toLowerCase());
  saveCustomStockLooks(next);
  return next;
}

export function loadHiddenStockLooks(): string[] {
  const rows = readJson<unknown>(STOCK_HIDDEN_LOOKS_KEY, []);
  return Array.isArray(rows) ? rows.filter((row): row is string => typeof row === 'string') : [];
}

export function hideStockLook(query: string): string[] {
  const next = [...new Set([...loadHiddenStockLooks(), query.trim().toLowerCase()])];
  writeJson(STOCK_HIDDEN_LOOKS_KEY, next);
  return next;
}

export function unhideStockLook(query: string): string[] {
  const target = query.trim().toLowerCase();
  const next = loadHiddenStockLooks().filter((item) => item !== target);
  writeJson(STOCK_HIDDEN_LOOKS_KEY, next);
  return next;
}

export function rememberStockQuery(query: string): string[] {
  const q = query.trim();
  if (!q) return loadRecentStockQueries();
  const next = [q, ...loadRecentStockQueries().filter((item) => item.toLowerCase() !== q.toLowerCase())].slice(0, 8);
  writeJson(STOCK_RECENT_KEY, next);
  return next;
}

export function loadRecentStockQueries(): string[] {
  const rows = readJson<unknown>(STOCK_RECENT_KEY, []);
  return Array.isArray(rows) ? rows.filter((row): row is string => typeof row === 'string' && row.trim().length > 0) : [];
}

export function foldStockTerm(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function suggestStockTerms(input: string, pool: StockSuggestItem[], limit = 8): StockSuggestItem[] {
  const q = foldStockTerm(input.trim());
  const seen = new Set<string>();
  const hits: StockSuggestItem[] = [];
  const consider = (item: StockSuggestItem) => {
    const key = foldStockTerm(item.query.trim());
    if (!key || seen.has(key)) return false;
    seen.add(key);
    hits.push(item);
    return hits.length >= limit;
  };
  if (!q) {
    for (const item of pool) {
      if (item.kind === 'recent' && consider(item)) break;
    }
    return hits;
  }
  for (const item of pool) {
    const haystack = foldStockTerm([item.query, item.label, item.altLabel ?? ''].join(' '));
    if (!haystack.includes(q)) continue;
    if (consider(item)) break;
  }
  return hits;
}
