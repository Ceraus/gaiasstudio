import { describe, expect, it } from 'vitest';
import {
  AFFIRMATION_CATEGORIES,
  BUILTIN_AFFIRMATIONS,
  BUILTIN_AFFIRMATION_SOURCE_COUNT,
  affirmationText,
  affirmationsByCategory,
  buildAffirmationCyclePool,
  customToAffirmation,
} from './affirmations';
import { AFFIRMATION_IMAGE_BY_ID, getAffirmationImageUrl } from './affirmationImages';

const PRODUCT_COPY = /\b(label|labels|recipe|recipes|product|inci|etsy|listing|avery)\b/i;
const FIRST_PERSON =
  /\b(i|i'm|i’d|i’ll|i’ve|my|me|myself|may i|here i am)\b|^(one |this |presence |peace |rest |fear |boundaries |bravery |kindness |gentleness |progress |joy |silence |solitude |community |wonder |hope |love |care |softness |meaning |doing |showing |taking |work |creativity |beauty |color|simple |small |quiet |good |unfinished |feelings |doubt |courage |naming |healing |gratitude |inspiration )/i;

describe('affirmation catalog', () => {
  it('matches the imported MIT source set: unique IDs, unique English, no empty copy', () => {
    expect(BUILTIN_AFFIRMATION_SOURCE_COUNT).toBe(460);
    expect(BUILTIN_AFFIRMATIONS.length).toBe(BUILTIN_AFFIRMATION_SOURCE_COUNT);
    expect(BUILTIN_AFFIRMATIONS.every((row) => row.en.trim() && row.es.trim())).toBe(true);
    expect(new Set(BUILTIN_AFFIRMATIONS.map((row) => row.id)).size).toBe(BUILTIN_AFFIRMATIONS.length);
    expect(new Set(BUILTIN_AFFIRMATIONS.map((row) => row.en.trim().toLowerCase())).size).toBe(
      BUILTIN_AFFIRMATIONS.length,
    );
  });

  it('covers every category', () => {
    for (const category of AFFIRMATION_CATEGORIES) {
      expect(affirmationsByCategory(category).length).toBeGreaterThanOrEqual(10);
    }
    expect(BUILTIN_AFFIRMATIONS.every((row) => row.category && AFFIRMATION_CATEGORIES.includes(row.category))).toBe(
      true,
    );
  });

  it('is self-care copy, not recipe or label product text', () => {
    for (const row of BUILTIN_AFFIRMATIONS) {
      expect(PRODUCT_COPY.test(row.en), row.en).toBe(false);
      expect(PRODUCT_COPY.test(row.es), row.es).toBe(false);
    }
  });

  it('spot-checks first-person / affirmation tone', () => {
    const sample = BUILTIN_AFFIRMATIONS.filter((_, i) => i % 7 === 0);
    const matching = sample.filter((row) => FIRST_PERSON.test(row.en));
    expect(matching.length / sample.length).toBeGreaterThan(0.85);
  });

  it('picks Spanish when the UI language is es', () => {
    const first = BUILTIN_AFFIRMATIONS[0];
    expect(affirmationText(first, 'es-US')).toBe(first.es);
    expect(affirmationText(first, 'en')).toBe(first.en);
  });

  it('maps every catalog id to its own high-res image URL', () => {
    expect(Object.keys(AFFIRMATION_IMAGE_BY_ID)).toHaveLength(BUILTIN_AFFIRMATIONS.length);
    for (const row of BUILTIN_AFFIRMATIONS) {
      expect(AFFIRMATION_IMAGE_BY_ID[row.id], row.id).toBeTruthy();
      expect(getAffirmationImageUrl(row.id)).toMatch(/^https:\/\/(images\.unsplash\.com|cdn\.pixabay\.com)\//);
    }
    expect(new Set(Object.values(AFFIRMATION_IMAGE_BY_ID)).size).toBe(BUILTIN_AFFIRMATIONS.length);
  });

  it('hash-picks a scene for custom affirmations without a catalog row', () => {
    const url = getAffirmationImageUrl('custom-user-line');
    expect(url).toMatch(/^https:\/\/(images\.unsplash\.com|cdn\.pixabay\.com)\//);
  });

  it('puts favorites and customs in the cycle pool without duplicating the 460', () => {
    const custom = customToAffirmation({
      id: 'custom-1',
      textEn: 'I wrote this one.',
      textEs: 'Yo escribí esta.',
    });
    const favBuiltin = BUILTIN_AFFIRMATIONS[3];
    const pool = buildAffirmationCyclePool(
      [custom],
      [
        { source: 'custom', refId: 'custom-1' },
        { source: 'builtin', refId: favBuiltin.id },
      ],
    );
    expect(pool[0]).toEqual(custom);
    expect(pool[1]).toEqual(favBuiltin);
    expect(pool).toHaveLength(BUILTIN_AFFIRMATIONS.length + 1);
    expect(pool.filter((row) => row.id === custom.id)).toHaveLength(1);
    expect(pool.filter((row) => row.id === favBuiltin.id)).toHaveLength(1);
    expect(pool.some((row) => row.en === BUILTIN_AFFIRMATIONS[0].en)).toBe(true);
  });
});
