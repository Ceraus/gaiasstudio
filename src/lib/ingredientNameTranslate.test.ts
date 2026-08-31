import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { translateTextsWithGoogle } from './googleTranslate';
import { translateIngredientNameWithOllama } from './localAi';
import {
  applyGlossarySpanishName,
  backfillMissingIngredientSpanishNames,
  clearIngredientSpanishBackfillAttempts,
  isRealSpanishIngredientName,
  lookupGlossarySpanishName,
  resolveIngredientSpanishName,
} from './ingredientNameTranslate';

vi.mock('./googleTranslate', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./googleTranslate')>();
  return {
    ...actual,
    translateTextsWithGoogle: vi.fn(),
  };
});

vi.mock('./localAi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./localAi')>();
  return {
    ...actual,
    translateIngredientNameWithOllama: vi.fn(),
  };
});

const googleMock = vi.mocked(translateTextsWithGoogle);
const ollamaMock = vi.mocked(translateIngredientNameWithOllama);

beforeEach(() => {
  clearIngredientSpanishBackfillAttempts();
  googleMock.mockReset();
  ollamaMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('isRealSpanishIngredientName', () => {
  it('rejects empty, identical EN, and INCI repeats', () => {
    expect(isRealSpanishIngredientName(undefined, 'Coconut Flakes')).toBe(false);
    expect(isRealSpanishIngredientName('Coconut Flakes', 'Coconut Flakes')).toBe(false);
    expect(isRealSpanishIngredientName('coconut flakes', 'Coconut Flakes')).toBe(false);
    expect(isRealSpanishIngredientName(
      'ABIES ALBA LEAF OIL',
      'Abies Alba Leaf Oil',
      'ABIES ALBA LEAF OIL',
    )).toBe(false);
  });

  it('accepts a distinct Spanish common name', () => {
    expect(isRealSpanishIngredientName(
      'Base de Glicerina (Transparente)',
      'Glycerin Base (Clear)',
    )).toBe(true);
  });
});

describe('lookupGlossarySpanishName', () => {
  it('returns the i18n Spanish name for Glycerin Base', () => {
    const es = lookupGlossarySpanishName('Glycerin Base (Clear)');
    expect(es).toMatch(/glicerina/i);
    expect(es).not.toMatch(/glycerin base/i);
  });

  it('has no glossary hit for Coconut Flakes', () => {
    expect(lookupGlossarySpanishName('Coconut Flakes')).toBeUndefined();
  });
});

describe('applyGlossarySpanishName', () => {
  it('keeps a stored Spanish name that already differs from EN', () => {
    expect(applyGlossarySpanishName({
      name: 'Glycerin Base (Clear)',
      nameEs: 'Base de Glicerina (Transparente)',
    })).toBe('Base de Glicerina (Transparente)');
  });

  it('does not invent EN or overwrite with the English name', () => {
    expect(applyGlossarySpanishName({
      name: 'Coconut Flakes',
      nameEs: 'Coconut Flakes',
    })).toBeUndefined();
  });
});

describe('resolveIngredientSpanishName', () => {
  it('does not overwrite a real stored Spanish name and skips the network', async () => {
    const result = await resolveIngredientSpanishName('Glycerin Base (Clear)', {}, {
      nameEs: 'Base de Glicerina (Transparente)',
    });
    expect(result).toEqual({
      text: 'Base de Glicerina (Transparente)',
      source: 'stored',
    });
    expect(googleMock).not.toHaveBeenCalled();
    expect(ollamaMock).not.toHaveBeenCalled();
  });

  it('uses the glossary before Google for known seed names', async () => {
    const result = await resolveIngredientSpanishName('Glycerin Base (Clear)', {});
    expect(result.source).toBe('glossary');
    expect(result.text).toMatch(/glicerina/i);
    expect(googleMock).not.toHaveBeenCalled();
  });

  it('translates via Google and preserves title case', async () => {
    googleMock.mockResolvedValue({
      ok: true,
      texts: ['hojuelas de coco'],
      via: 'gtx',
    });

    const result = await resolveIngredientSpanishName('Coconut Flakes', {});
    expect(result.source).toBe('google');
    expect(result.text).toBe('Hojuelas De Coco');
    expect(ollamaMock).not.toHaveBeenCalled();
  });

  it('falls back to Ollama when Google is unavailable', async () => {
    googleMock.mockResolvedValue({ ok: false, error: 'offline' });
    ollamaMock.mockResolvedValue({ ok: true, text: 'hojuelas de coco' });

    const result = await resolveIngredientSpanishName('Coconut Flakes', {
      ollamaUrl: 'http://localhost:11434',
    });
    expect(result.source).toBe('ollama');
    expect(result.text).toBe('Hojuelas De Coco');
  });
});

describe('backfillMissingIngredientSpanishNames', () => {
  it('fills Coconut Flakes via Google and leaves a real Glycerin ES alone', async () => {
    googleMock.mockResolvedValue({
      ok: true,
      texts: ['hojuelas de coco'],
      via: 'gtx',
    });

    const persisted: Record<string, string> = {};
    const rows = [
      { id: 'coco', name: 'Coconut Flakes', nameEs: 'Coconut Flakes' },
      { id: 'gly', name: 'Glycerin Base (Clear)', nameEs: 'Base de Glicerina (Transparente)' },
    ];

    const filled = await backfillMissingIngredientSpanishNames(
      rows,
      {},
      async (id, nameEs) => {
        persisted[id] = nameEs;
      },
    );

    expect(filled).toBe(1);
    expect(persisted.coco).toBe('Hojuelas De Coco');
    expect(persisted.gly).toBeUndefined();
    expect(googleMock).toHaveBeenCalledTimes(1);
    expect(googleMock.mock.calls[0][0]).toEqual(['Coconut Flakes']);
  });
});
