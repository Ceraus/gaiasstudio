import { describe, expect, it } from 'vitest';
import type { AveryDataset } from '@/types';
import dataset from '@/data/averyTemplates.json';
import {
  isAveryNumberQuery,
  isHighCountSheet,
  isLowCountSheet,
  isTemplateSuggestQuery,
  splitCatalogByPerSheet,
  suggestTemplates,
  templateMatchesQuery,
} from './templateCatalogGroups';

const catalog = dataset as AveryDataset;

describe('catalog per-sheet split', () => {
  it('splits the live Avery catalog into under-6, 6–12, and over-12', () => {
    const { everyday, lowCount, highCount } = splitCatalogByPerSheet(catalog.templates);
    expect(everyday.length + lowCount.length + highCount.length).toBe(catalog.templates.length);
    expect(catalog.templates.length).toBe(catalog.count);
    expect(everyday.every((t) => t.perSheet >= 6 && t.perSheet <= 12)).toBe(true);
    expect(lowCount.every((t) => t.perSheet < 6)).toBe(true);
    expect(highCount.every((t) => t.perSheet > 12)).toBe(true);
    expect(lowCount.length).toBeGreaterThan(0);
    expect(highCount.length).toBeGreaterThan(0);
    expect(everyday.length).toBeGreaterThan(0);
  });

  it('moves many-up rectangles like 5224/5228/5232/5418 out of the everyday set', () => {
    for (const id of ['5224', '5228', '5232', '5418']) {
      const tpl = catalog.templates.find((t) => t.id === id);
      expect(tpl, id).toBeTruthy();
      expect(isHighCountSheet(tpl!)).toBe(true);
    }
  });

  it('keeps Avery 94090 (12 per sheet) in the everyday set', () => {
    const tpl = catalog.templates.find((t) => t.id === '94090');
    expect(tpl).toBeTruthy();
    expect(tpl!.perSheet).toBe(12);
    expect(isHighCountSheet(tpl!)).toBe(false);
    expect(isLowCountSheet(tpl!)).toBe(false);
  });

  it('moves 4-up and full-sheet SKUs into the fewer-per-sheet set', () => {
    const fourUp = catalog.templates.find((t) => t.perSheet === 4);
    expect(fourUp).toBeTruthy();
    expect(isLowCountSheet(fourUp!)).toBe(true);
    const { lowCount } = splitCatalogByPerSheet(catalog.templates);
    expect(lowCount.some((t) => t.id === fourUp!.id)).toBe(true);
  });
});

describe('templateMatchesQuery', () => {
  const round = catalog.templates.find((t) => t.id === '94510');

  it('matches display name, Avery code, and size tokens without requiring inch marks', () => {
    expect(round).toBeTruthy();
    expect(templateMatchesQuery(round!, '')).toBe(true);
    expect(templateMatchesQuery(round!, '2.25 round')).toBe(true);
    expect(templateMatchesQuery(round!, '2.25"')).toBe(true);
    expect(templateMatchesQuery(round!, '94510')).toBe(true);
    expect(templateMatchesQuery(round!, 'Avery 94510')).toBe(true);
    expect(templateMatchesQuery(round!, 'round')).toBe(true);
    expect(templateMatchesQuery(round!, 'oval')).toBe(false);
  });
});

describe('suggestTemplates', () => {
  it('opens Avery-number queries at 1 character and names at 2', () => {
    expect(isAveryNumberQuery('94')).toBe(true);
    expect(isAveryNumberQuery('Avery 94510')).toBe(true);
    expect(isAveryNumberQuery('2.25')).toBe(false);
    expect(isTemplateSuggestQuery('')).toBe(false);
    expect(isTemplateSuggestQuery('9')).toBe(true);
    expect(isTemplateSuggestQuery('r')).toBe(false);
    expect(isTemplateSuggestQuery('ro')).toBe(true);
    expect(isTemplateSuggestQuery('2.25')).toBe(true);
  });

  it('resolves Avery prefixes from the full catalog and ranks exact codes first', () => {
    const prefix = suggestTemplates(catalog.templates, '94', { favoriteIds: ['94510'] });
    expect(prefix.length).toBeGreaterThan(0);
    expect(prefix.length).toBeLessThanOrEqual(8);
    expect(prefix[0]?.averyCode).toBe('94510');
    expect(prefix.every((tpl) => (tpl.averyCode ?? '').startsWith('94'))).toBe(true);

    const exact = suggestTemplates(catalog.templates, '94510');
    expect(exact[0]?.id).toBe('94510');
  });

  it('still matches folded size names like the list filter', () => {
    const sized = suggestTemplates(catalog.templates, '2.25 round');
    expect(sized.some((tpl) => tpl.id === '94510')).toBe(true);
  });
});
