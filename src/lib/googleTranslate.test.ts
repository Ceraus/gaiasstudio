import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  parseGtxTranslateResponse,
  parseOfficialTranslateResponse,
  translateTextsWithGoogle,
} from './googleTranslate';
import { translateLabelTexts } from './localAi';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('parseOfficialTranslateResponse', () => {
  it('reads Cloud Translation v2 payloads', () => {
    expect(parseOfficialTranslateResponse({
      data: { translations: [{ translatedText: 'Hola' }, { translatedText: 'Mundo' }] },
    }, 2)).toEqual(['Hola', 'Mundo']);
  });

  it('rejects a length mismatch', () => {
    expect(parseOfficialTranslateResponse({
      data: { translations: [{ translatedText: 'Hola' }] },
    }, 2)).toBeNull();
  });
});

describe('parseGtxTranslateResponse', () => {
  it('joins gtx sentence chunks', () => {
    expect(parseGtxTranslateResponse([
      [['Hola', 'Hello', null, null, 10], [' mundo', ' world', null, null, 10]],
    ])).toBe('Hola mundo');
  });

  it('returns null for junk', () => {
    expect(parseGtxTranslateResponse({ error: true })).toBeNull();
  });
});

describe('translateTextsWithGoogle', () => {
  it('uses the official API when a key is present', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { translations: [{ translatedText: 'Hola' }] } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await translateTextsWithGoogle(['Hello'], 'en', 'es', { apiKey: 'test-key' });
    expect(result).toEqual({ ok: true, texts: ['Hola'], via: 'official' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('https://translation.googleapis.com/language/translate/v2');
    expect(url).toContain('key=test-key');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      q: ['Hello'],
      source: 'en',
      target: 'es',
      format: 'text',
    });
  });

  it('uses the gtx fallback without a key', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[['Hola', 'Hello', null, null, 10]]],
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await translateTextsWithGoogle(['Hello'], 'en', 'es');
    expect(result.ok).toBe(true);
    expect(result.via).toBe('gtx');
    expect(result.texts).toEqual(['Hola']);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain('https://translate.googleapis.com/translate_a/single');
    expect(url).toContain('client=gtx');
    expect(url).toContain('sl=en');
    expect(url).toContain('tl=es');
    expect(url).toContain('q=Hello');
  });

  it('fails softly when fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
    const result = await translateTextsWithGoogle(['Hello'], 'en', 'es', { apiKey: 'test-key' });
    expect(result.ok).toBe(false);
    expect(result.texts).toBeUndefined();
    expect(result.error).toMatch(/offline/i);
  });
});

describe('translateLabelTexts Google leftovers', () => {
  it('keeps exact and passthrough lines and only sends unknown leftovers', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[['Deja la piel con un tacto cremoso.', 'Leaves skin feeling creamy.', null, null, 10]]],
    });
    vi.stubGlobal('fetch', fetchMock);

    const inci = 'Butyrospermum Parkii (Shea) Butter';
    const result = await translateLabelTexts(
      ['INGREDIENTS', inci, 'Leaves skin feeling creamy.'],
      'es',
      { localAiEnabled: false },
    );

    expect(result.ok).toBe(true);
    expect(result.texts?.[0]).toBe('INGREDIENTES');
    expect(result.texts?.[1]).toBe(inci);
    expect(result.texts?.[2]).toMatch(/tacto cremoso/i);
    expect(result.source).toBe('mixed');

    const asked = fetchMock.mock.calls.map((call) => {
      const url = String(call[0]);
      const init = call[1] as RequestInit | undefined;
      return `${url}\n${init?.body ?? ''}`;
    }).join('\n');
    expect(asked).toContain('Leaves');
    expect(asked).not.toContain('INGREDIENTS');
    expect(asked).not.toContain('Butyrospermum');
  });

  it('re-applies the source capitalization when Google returns lowercase', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [[['bienvenido a miami', 'Welcome to Miami', null, null, 10]]],
    });
    vi.stubGlobal('fetch', fetchMock);

    const title = await translateLabelTexts(['Welcome To Miami!'], 'es', { localAiEnabled: false });
    expect(title.ok).toBe(true);
    expect(title.texts?.[0]).toBe('Bienvenido A Miami');

    const sentence = await translateLabelTexts(['Welcome to Miami'], 'es', { localAiEnabled: false });
    expect(sentence.texts?.[0]).toBe('Bienvenido a Miami');

    const upper = await translateLabelTexts(['WELCOME TO MIAMI?'], 'es', { localAiEnabled: false });
    expect(upper.texts?.[0]).toBe('BIENVENIDO A MIAMI');
  });
});
