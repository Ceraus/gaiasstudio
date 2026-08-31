import { foldStockTerm, suggestStockTerms, type StockSuggestItem } from '@/lib/stockLooks';

export type StockSuggestLang = 'en' | 'es';

function electronFetchUrl(): ((url: string) => Promise<{ ok: boolean; status: number; text: string }>) | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as {
    electronAPI?: { fetchUrl?: (url: string) => Promise<{ ok: boolean; status: number; text: string }> };
  }).electronAPI?.fetchUrl;
}

export function googleSuggestUrl(query: string, lang: StockSuggestLang, callback?: string): string {
  const url = new URL('https://suggestqueries.google.com/complete/search');
  url.searchParams.set('client', callback ? 'chrome' : 'firefox');
  url.searchParams.set('q', query);
  url.searchParams.set('hl', lang);
  if (callback) url.searchParams.set('callback', callback);
  return url.toString();
}

export function parseSuggestPayload(raw: unknown): string[] {
  let data = raw;
  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text.startsWith('[') && !text.startsWith('{')) return [];
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      return [];
    }
  }
  if (Array.isArray(data)) {
    const second = data[1];
    if (Array.isArray(second)) {
      return second.flatMap((item) => {
        if (typeof item === 'string' && item.trim()) return [item.trim()];
        if (Array.isArray(item) && typeof item[0] === 'string' && item[0].trim()) return [item[0].trim()];
        return [];
      });
    }
    if (data.every((item) => item && typeof item === 'object' && typeof (item as { word?: unknown }).word === 'string')) {
      return data.map((item) => String((item as { word: string }).word).trim()).filter(Boolean);
    }
  }
  return [];
}

export function mergeStockSuggestions(
  query: string,
  local: StockSuggestItem[],
  web: string[],
  limit = 10,
): StockSuggestItem[] {
  const locals = suggestStockTerms(query, local, query.trim() ? 3 : limit);
  const seen = new Set(locals.map((item) => foldStockTerm(item.query)));
  if (!query.trim()) return locals.slice(0, limit);
  const webItems: StockSuggestItem[] = [];
  for (const term of web) {
    const next = term.trim();
    const key = foldStockTerm(next);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    webItems.push({ query: next, label: next, kind: 'web' });
    if (locals.length + webItems.length >= limit) break;
  }
  return [...locals, ...webItems];
}

export function splitSuggestHighlight(label: string, query: string): { head: string; tail: string } {
  const q = foldStockTerm(query.trim());
  if (!q) return { head: '', tail: label };
  const folded = foldStockTerm(label);
  if (!folded.startsWith(q)) return { head: '', tail: label };
  let consumed = 0;
  let index = 0;
  while (index < label.length && consumed < q.length) {
    consumed += foldStockTerm(label[index] ?? '').length;
    index += 1;
  }
  return { head: label.slice(0, index), tail: label.slice(index) };
}

function fetchGoogleSuggestJsonp(
  query: string,
  lang: StockSuggestLang,
  signal?: AbortSignal,
): Promise<string[]> {
  if (typeof document === 'undefined') return Promise.resolve([]);
  return new Promise((resolve) => {
    const id = `gaiaStockSuggest_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    let settled = false;
    const finish = (rows: string[]) => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      window.clearTimeout(timer);
      delete (window as unknown as Record<string, unknown>)[id];
      script.remove();
      resolve(rows);
    };
    const onAbort = () => finish([]);
    signal?.addEventListener('abort', onAbort);
    (window as unknown as Record<string, unknown>)[id] = (payload: unknown) => {
      finish(parseSuggestPayload(payload));
    };
    script.onerror = () => finish([]);
    script.src = googleSuggestUrl(query, lang, id);
    document.head.appendChild(script);
    const timer = window.setTimeout(() => finish([]), 4000);
  });
}

async function readSuggestions(query: string, lang: StockSuggestLang, signal?: AbortSignal): Promise<string[]> {
  const fromElectron = electronFetchUrl();
  if (fromElectron) {
    try {
      const res = await fromElectron(googleSuggestUrl(query, lang));
      const rows = parseSuggestPayload(res.text);
      if (rows.length) return rows;
    } catch {
      // fall through to the page
    }
  }

  const jsonp = await fetchGoogleSuggestJsonp(query, lang, signal);
  if (jsonp.length) return jsonp;

  if (typeof fetch === 'function') {
    try {
      const res = await fetch(`https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=10`, { signal });
      if (res.ok) return parseSuggestPayload(await res.text());
    } catch {
      // offline / blocked
    }
  }
  return [];
}

export async function fetchWebStockSuggestions(
  query: string,
  lang: StockSuggestLang,
  signal?: AbortSignal,
): Promise<string[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const other: StockSuggestLang = lang === 'es' ? 'en' : 'es';
  const [primary, secondary] = await Promise.all([
    readSuggestions(q, lang, signal),
    readSuggestions(q, other, signal),
  ]);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const term of [...primary, ...secondary]) {
    const key = foldStockTerm(term);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
    if (out.length >= 10) break;
  }
  return out;
}
