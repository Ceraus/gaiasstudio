export type GoogleTranslateLang = 'en' | 'es';
export type GoogleTranslateVia = 'official' | 'gtx';

export interface GoogleTranslateResult {
  ok: boolean;
  texts?: string[];
  error?: string;
  via?: GoogleTranslateVia;
}

const OFFICIAL_URL = 'https://translation.googleapis.com/language/translate/v2';
const GTX_URL = 'https://translate.googleapis.com/translate_a/single';
const GTX_URL_BUDGET = 1600;
const GTX_CONCURRENCY = 6;

function envTranslateKey(): string {
  try {
    const key = import.meta.env.VITE_GOOGLE_TRANSLATE_KEY;
    return typeof key === 'string' ? key.trim() : '';
  } catch {
    return '';
  }
}

/** Official Cloud Translation key only — Gemini / AI Studio keys are a different API. */
export function resolveGoogleTranslateApiKey(explicit?: string): string {
  return explicit?.trim() || envTranslateKey();
}

export function parseOfficialTranslateResponse(data: unknown, expected: number): string[] | null {
  if (!data || typeof data !== 'object') return null;
  const translations = (data as { data?: { translations?: Array<{ translatedText?: string }> } })
    .data?.translations;
  if (!Array.isArray(translations) || translations.length !== expected) return null;
  return translations.map((row) => String(row?.translatedText ?? ''));
}

/** Unofficial gtx payload: [[["translated","source",...], ...], ...] */
export function parseGtxTranslateResponse(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const parts: string[] = [];
  for (const chunk of data[0] as unknown[]) {
    if (Array.isArray(chunk) && typeof chunk[0] === 'string') parts.push(chunk[0]);
  }
  return parts.length ? parts.join('') : null;
}

function gtxRequestUrl(source: GoogleTranslateLang, target: GoogleTranslateLang, q: string): string {
  return `${GTX_URL}?client=gtx&sl=${source}&tl=${target}&dt=t&q=${encodeURIComponent(q)}`;
}

async function fetchJson(url: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(url, init);
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { ok: res.ok, status: res.status, data };
}

async function translateOfficial(
  texts: string[],
  source: GoogleTranslateLang,
  target: GoogleTranslateLang,
  apiKey: string,
): Promise<GoogleTranslateResult> {
  try {
    const { ok, status, data } = await fetchJson(`${OFFICIAL_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: texts, source, target, format: 'text' }),
    });
    if (!ok) return { ok: false, error: `Google Translate HTTP ${status}` };
    const parsed = parseOfficialTranslateResponse(data, texts.length);
    if (!parsed) return { ok: false, error: 'Could not read Google Translate response.' };
    return { ok: true, texts: parsed, via: 'official' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google Translate failed.' };
  }
}

async function fetchGtxText(
  text: string,
  source: GoogleTranslateLang,
  target: GoogleTranslateLang,
): Promise<string | null> {
  const url = gtxRequestUrl(source, target, text);
  if (url.length <= GTX_URL_BUDGET) {
    const { ok, data } = await fetchJson(url);
    if (!ok) return null;
    return parseGtxTranslateResponse(data);
  }
  if (text.includes('\n')) {
    const lines: string[] = [];
    for (const line of text.split('\n')) {
      const translated = await fetchGtxText(line, source, target);
      if (translated == null) return null;
      lines.push(translated);
    }
    return lines.join('\n');
  }
  const mid = Math.max(1, Math.floor(text.length / 2));
  const space = text.lastIndexOf(' ', mid);
  const splitAt = space > 20 ? space : mid;
  const a = await fetchGtxText(text.slice(0, splitAt), source, target);
  const b = await fetchGtxText(text.slice(splitAt), source, target);
  if (a == null || b == null) return null;
  return a + b;
}

async function translateGtx(
  texts: string[],
  source: GoogleTranslateLang,
  target: GoogleTranslateLang,
): Promise<GoogleTranslateResult> {
  try {
    const out: string[] = new Array(texts.length);
    for (let start = 0; start < texts.length; start += GTX_CONCURRENCY) {
      const slice = texts.slice(start, start + GTX_CONCURRENCY);
      const batch = await Promise.all(slice.map((text) => fetchGtxText(text, source, target)));
      for (let i = 0; i < batch.length; i++) {
        if (batch[i] == null) return { ok: false, error: 'Google Translate fallback failed.' };
        out[start + i] = batch[i] as string;
      }
    }
    return { ok: true, texts: out, via: 'gtx' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Google Translate failed.' };
  }
}

/** Translate EN↔ES. Uses Cloud Translation when a key is present, otherwise gtx. Never throws. */
export async function translateTextsWithGoogle(
  texts: string[],
  source: GoogleTranslateLang,
  target: GoogleTranslateLang,
  options?: { apiKey?: string },
): Promise<GoogleTranslateResult> {
  if (!texts.length) return { ok: true, texts: [], via: 'gtx' };
  if (source === target) return { ok: true, texts: [...texts], via: 'gtx' };
  const apiKey = resolveGoogleTranslateApiKey(options?.apiKey);
  if (apiKey) return translateOfficial(texts, source, target, apiKey);
  return translateGtx(texts, source, target);
}
