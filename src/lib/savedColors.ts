export const SAVED_COLORS_KEY = 'gaia:saved-colors';
export const MAX_SAVED_COLORS = 24;

const HEX = /^#[0-9A-F]{6}$/;

const listeners = new Set<() => void>();
let cache: string[] | null = null;

export function normaliseSavedHex(hex: string): string {
  if (!hex) return '';
  const raw = hex.trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  const candidate = withHash.slice(0, 7).toUpperCase();
  return HEX.test(candidate) ? candidate : '';
}

function notify() {
  listeners.forEach((fn) => fn());
}

export function subscribeSavedColors(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

function readFromStorage(): string[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(SAVED_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return uniqueHexes(parsed);
  } catch {
    return [];
  }
}

function uniqueHexes(values: unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of values) {
    if (typeof item !== 'string') continue;
    const hex = normaliseSavedHex(item);
    if (!hex || seen.has(hex)) continue;
    seen.add(hex);
    out.push(hex);
    if (out.length >= MAX_SAVED_COLORS) break;
  }
  return out;
}

export function loadSavedColors(): string[] {
  if (!cache) cache = readFromStorage();
  return cache;
}

export function saveSavedColors(colors: string[]): void {
  cache = uniqueHexes(colors);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SAVED_COLORS_KEY, JSON.stringify(cache));
    }
  } catch {
    // quota / private-mode — in-memory list still works this session
  }
  notify();
}

export function addSavedColor(hex: string): string[] {
  const n = normaliseSavedHex(hex);
  if (!n) return loadSavedColors();
  saveSavedColors([n, ...loadSavedColors().filter((c) => c !== n)]);
  return loadSavedColors();
}

export function removeSavedColor(hex: string): string[] {
  const n = normaliseSavedHex(hex);
  saveSavedColors(loadSavedColors().filter((c) => c !== n));
  return loadSavedColors();
}

export function isSavedColor(hex: string): boolean {
  const n = normaliseSavedHex(hex);
  return n !== '' && loadSavedColors().includes(n);
}

/** First-run seed from leftover settings.brandColors — never overwrites saved list. */
export function seedSavedColors(colors: string[]): string[] {
  if (loadSavedColors().length > 0) return loadSavedColors();
  const valid = uniqueHexes(colors);
  if (valid.length) saveSavedColors(valid);
  return loadSavedColors();
}

export function resetSavedColors(): void {
  cache = null;
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(SAVED_COLORS_KEY);
  } catch {
    // ignore
  }
}
