import type { AveryTemplate, LabelShape } from '@/types';
import { describeSize } from '@/lib/units';
import { SUGGESTED_FAVORITE_IDS } from '@/lib/templateFavorites';

export type SizeCategory = 'small' | 'medium' | 'large';

export const SIZE_CATEGORY_ORDER: SizeCategory[] = ['small', 'medium', 'large'];

export const SETUP_SHAPES: LabelShape[] = [
  'circle',
  'oval',
  'square',
  'rectangle',
  'rounded-rectangle',
];

const SIZE_CATEGORY_LABEL_KEYS: Record<SizeCategory, string> = {
  small: 'template.smallLabels',
  medium: 'template.mediumLabels',
  large: 'template.largeLabels',
};

const SIZE_CATEGORY_HINT_KEYS: Record<SizeCategory, string> = {
  small: 'template.smallHint',
  medium: 'template.mediumHint',
  large: 'template.largeHint',
};

export function maxDim(tpl: AveryTemplate): number {
  return Math.max(tpl.labelWidthIn, tpl.labelHeightIn);
}

export function getSizeCategory(tpl: AveryTemplate): SizeCategory {
  const d = maxDim(tpl);
  if (d < 2) return 'small';
  if (d <= 3.5) return 'medium';
  return 'large';
}

export function sizeKey(tpl: AveryTemplate): string {
  const w = tpl.labelWidthIn;
  const h = tpl.labelHeightIn;
  return `${tpl.shape}|${w}|${h}`;
}

function representativeScore(tpl: AveryTemplate): number {
  let score = 0;
  if ((SUGGESTED_FAVORITE_IDS as readonly string[]).includes(tpl.id)) score += 100;
  if (tpl.geometrySource === 'avery-docx-verified') score += 50;
  if (/^(round|ribbon|oval|square)-/.test(tpl.id)) score += 40;
  if (tpl.averyCode) score += 10;
  return score;
}

/** One card per unique width×height within a shape — avoids 600+ near-duplicates. */
export function dedupeBySize(templates: AveryTemplate[]): AveryTemplate[] {
  const groups = new Map<string, AveryTemplate[]>();
  for (const tpl of templates) {
    const key = sizeKey(tpl);
    const list = groups.get(key) ?? [];
    list.push(tpl);
    groups.set(key, list);
  }
  return [...groups.values()].map((group) =>
    [...group].sort((a, b) => representativeScore(b) - representativeScore(a))[0],
  );
}

export function countAlternateSkus(tpl: AveryTemplate, all: AveryTemplate[]): number {
  const key = sizeKey(tpl);
  return all.filter((t) => sizeKey(t) === key).length - 1;
}

/** Wrap-around bar soap / address-style strips. */
export function isRibbonLabel(tpl: AveryTemplate): boolean {
  const w = Math.max(tpl.labelWidthIn, tpl.labelHeightIn);
  const h = Math.min(tpl.labelWidthIn, tpl.labelHeightIn);
  return h > 0 && w / h >= 2.5;
}

export type RectangleHeightBand =
  | 'ribbon'
  | 'under-0.75'
  | '1in'
  | '1.5in'
  | '2in'
  | '3in'
  | 'over-3';

const RECT_BAND_ORDER: RectangleHeightBand[] = [
  'ribbon',
  'under-0.75',
  '1in',
  '1.5in',
  '2in',
  '3in',
  'over-3',
];

export const RECT_BAND_LABEL_KEYS: Record<RectangleHeightBand, string> = {
  ribbon: 'template.favoritesRibbonLabels',
  'under-0.75': 'template.favoritesHeightUnder075',
  '1in': 'template.favoritesHeight1in',
  '1.5in': 'template.favoritesHeight15in',
  '2in': 'template.favoritesHeight2in',
  '3in': 'template.favoritesHeight3in',
  'over-3': 'template.favoritesHeightOver3',
};

export function rectangleHeightBand(tpl: AveryTemplate): RectangleHeightBand {
  if (isRibbonLabel(tpl)) return 'ribbon';
  const short = Math.min(tpl.labelWidthIn, tpl.labelHeightIn);
  if (short < 0.75) return 'under-0.75';
  if (short < 1) return '1in';
  if (short < 1.5) return '1.5in';
  if (short < 2) return '2in';
  if (short < 3) return '3in';
  return 'over-3';
}

export type CatalogSection = {
  id: string;
  shape: LabelShape;
  sizeCategory: SizeCategory;
  labelKey: string;
  hintKey: string;
  subLabelKey?: string;
  templates: AveryTemplate[];
};

function sortTemplates(a: AveryTemplate, b: AveryTemplate): number {
  const da = maxDim(a) - maxDim(b);
  if (da !== 0) return da;
  return a.labelWidthIn * a.labelHeightIn - b.labelWidthIn * b.labelHeightIn;
}

/** Shape → size bucket → (optional rectangle height band) for the setup wizard. */
export function buildCatalogSections(
  templates: AveryTemplate[],
  shape: LabelShape,
): CatalogSection[] {
  const deduped = dedupeBySize(templates.filter((t) => t.shape === shape));
  const sections: CatalogSection[] = [];

  for (const sizeCategory of SIZE_CATEGORY_ORDER) {
    const inBucket = deduped.filter((t) => getSizeCategory(t) === sizeCategory);
    if (inBucket.length === 0) continue;

    if (shape === 'rectangle' && inBucket.length > 6) {
      const byBand = new Map<RectangleHeightBand, AveryTemplate[]>();
      for (const tpl of inBucket) {
        const band = rectangleHeightBand(tpl);
        const list = byBand.get(band) ?? [];
        list.push(tpl);
        byBand.set(band, list);
      }
      for (const band of RECT_BAND_ORDER) {
        const bandTemplates = byBand.get(band);
        if (!bandTemplates?.length) continue;
        sections.push({
          id: `${shape}:${sizeCategory}:${band}`,
          shape,
          sizeCategory,
          labelKey: SIZE_CATEGORY_LABEL_KEYS[sizeCategory],
          hintKey: SIZE_CATEGORY_HINT_KEYS[sizeCategory],
          subLabelKey: RECT_BAND_LABEL_KEYS[band],
          templates: bandTemplates.sort(sortTemplates),
        });
      }
    } else {
      sections.push({
        id: `${shape}:${sizeCategory}`,
        shape,
        sizeCategory,
        labelKey: SIZE_CATEGORY_LABEL_KEYS[sizeCategory],
        hintKey: SIZE_CATEGORY_HINT_KEYS[sizeCategory],
        templates: inBucket.sort(sortTemplates),
      });
    }
  }

  return sections;
}

export function countUniqueSizesByShape(templates: AveryTemplate[]): Record<LabelShape, number> {
  const counts = Object.fromEntries(SETUP_SHAPES.map((s) => [s, 0])) as Record<LabelShape, number>;
  const seen = new Set<string>();
  for (const tpl of templates) {
    const key = sizeKey(tpl);
    if (seen.has(key)) continue;
    seen.add(key);
    counts[tpl.shape] += 1;
  }
  return counts;
}

/** Everyday soap/beauty sizes sit in this per-sheet window. */
export const EVERYDAY_PER_SHEET_MIN = 6;
export const EVERYDAY_PER_SHEET_MAX = 12;

export function isLowCountSheet(tpl: AveryTemplate): boolean {
  return tpl.perSheet < EVERYDAY_PER_SHEET_MIN;
}

export function isHighCountSheet(tpl: AveryTemplate): boolean {
  return tpl.perSheet > EVERYDAY_PER_SHEET_MAX;
}

export function splitCatalogByPerSheet(templates: AveryTemplate[]): {
  everyday: AveryTemplate[];
  lowCount: AveryTemplate[];
  highCount: AveryTemplate[];
} {
  const everyday: AveryTemplate[] = [];
  const lowCount: AveryTemplate[] = [];
  const highCount: AveryTemplate[] = [];
  for (const tpl of templates) {
    if (isLowCountSheet(tpl)) lowCount.push(tpl);
    else if (isHighCountSheet(tpl)) highCount.push(tpl);
    else everyday.push(tpl);
  }
  return { everyday, lowCount, highCount };
}

const SHAPE_SEARCH_ALIASES: Record<LabelShape, readonly string[]> = {
  circle: ['circle', 'round', 'circular'],
  oval: ['oval', 'ellipse'],
  square: ['square'],
  rectangle: ['rectangle', 'rect'],
  'rounded-rectangle': ['rounded-rectangle', 'rounded rectangle', 'rounded'],
};

/** Fold quotes, inch marks, and × so "2.25 round" matches `2.25" round`. */
export function normalizeTemplateQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[“”″''′]/g, '"')
    .replace(/[×✕]/g, 'x')
    .replace(/["]/g, ' ')
    .replace(/\binch(?:es)?\b/g, ' ')
    .replace(/[^a-z0-9.x]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function templateMatchesQuery(tpl: AveryTemplate, query: string): boolean {
  const q = normalizeTemplateQuery(query);
  if (!q) return true;
  const haystack = normalizeTemplateQuery(
    [
      tpl.name,
      tpl.id,
      tpl.averyCode ?? '',
      tpl.brand,
      tpl.shape,
      describeSize(tpl),
      String(tpl.labelWidthIn),
      String(tpl.labelHeightIn),
      `${tpl.labelWidthIn}x${tpl.labelHeightIn}`,
      `${tpl.labelWidthIn} x ${tpl.labelHeightIn}`,
      `${tpl.labelWidthIn}"`,
      `${tpl.labelHeightIn}"`,
      ...(SHAPE_SEARCH_ALIASES[tpl.shape] ?? []),
    ].join(' '),
  );
  return q.split(' ').every((token) => haystack.includes(token));
}

export function searchDedupedCatalog(
  templates: AveryTemplate[],
  query: string,
): AveryTemplate[] {
  const q = query.trim();
  if (!q) return [];
  return dedupeBySize(templates).filter((tpl) => templateMatchesQuery(tpl, q));
}

/** How many rows the live search dropdown shows. */
export const TEMPLATE_SUGGEST_LIMIT = 8;

/**
 * Avery-number queries open after 1 character (`94` → 94510).
 * Name / size queries wait for 2 so a lone letter does not flood the list.
 */
export function isAveryNumberQuery(query: string): boolean {
  return /^(?:avery\s*)?\d+[a-z]{0,2}$/i.test(query.trim());
}

export function isTemplateSuggestQuery(query: string): boolean {
  const raw = query.trim();
  if (!raw) return false;
  if (isAveryNumberQuery(raw)) return raw.replace(/\D/g, '').length >= 1;
  return normalizeTemplateQuery(raw).length >= 2;
}

/** Digits typed for an Avery code, ignoring an optional "Avery" prefix. */
export function averyQueryDigits(query: string): string {
  return query.trim().replace(/^(?:avery\s*)/i, '').replace(/\D/g, '');
}

function averyCodeDigits(tpl: AveryTemplate): string {
  return (tpl.averyCode ?? tpl.id).replace(/\D/g, '');
}

interface TemplateSuggestRank {
  tpl: AveryTemplate;
  tier: number;
  leftover: number;
  favorite: number;
  everyday: number;
  code: string;
  name: string;
}

function rankTemplateSuggestion(
  tpl: AveryTemplate,
  query: string,
  favoriteIds: Set<string>,
): TemplateSuggestRank {
  const qNorm = normalizeTemplateQuery(query);
  const qDigits = averyQueryDigits(query);
  const numeric = isAveryNumberQuery(query);
  const code = (tpl.averyCode ?? '').toLowerCase();
  const idNorm = normalizeTemplateQuery(tpl.id);
  const codeDigits = averyCodeDigits(tpl);
  const size = normalizeTemplateQuery(describeSize(tpl));
  const name = normalizeTemplateQuery(tpl.name);

  let tier = 5;
  let leftover = 99;

  if (numeric && qDigits) {
    if (codeDigits === qDigits || code === qNorm || idNorm === qNorm) {
      tier = 0;
      leftover = 0;
    } else if (codeDigits.startsWith(qDigits) || code.startsWith(qNorm) || idNorm.startsWith(qNorm)) {
      tier = 1;
      leftover = Math.max(0, codeDigits.length - qDigits.length);
    } else if (codeDigits.includes(qDigits) || code.includes(qNorm)) {
      tier = 2;
      leftover = codeDigits.length;
    }
  }

  if (tier > 3) {
    if (size === qNorm) {
      tier = 3;
      leftover = 0;
    } else if (size.startsWith(qNorm)) {
      tier = 3;
      leftover = Math.max(0, size.length - qNorm.length);
    }
  }

  if (tier > 4 && (name.startsWith(qNorm) || idNorm.startsWith(qNorm))) {
    tier = 4;
    leftover = Math.max(0, name.length - qNorm.length);
  }

  return {
    tpl,
    tier,
    leftover,
    favorite: favoriteIds.has(tpl.id) ? 0 : 1,
    everyday: isLowCountSheet(tpl) || isHighCountSheet(tpl) ? 1 : 0,
    code: code || tpl.id.toLowerCase(),
    name: tpl.name,
  };
}

/**
 * Live autocomplete rows from the full Avery catalog.
 *
 * Rank (low tier wins):
 * 1. Exact Avery code / template id
 * 2. Avery code prefix (`94` → 94090, 94510)
 * 3. Avery code contains the typed digits
 * 4. `describeSize` exact or prefix (`2.25` → 2.25" round)
 * 5. Name / other `templateMatchesQuery` hits
 *
 * Within a tier: favorites, then shorter leftover after a prefix,
 * everyday 6–12/sheet, then Avery code, then name.
 */
export function suggestTemplates(
  templates: AveryTemplate[],
  query: string,
  options?: { favoriteIds?: Iterable<string>; limit?: number },
): AveryTemplate[] {
  if (!isTemplateSuggestQuery(query)) return [];
  const favoriteIds = new Set(options?.favoriteIds ?? []);
  const limit = options?.limit ?? TEMPLATE_SUGGEST_LIMIT;
  const ranked = templates
    .filter((tpl) => templateMatchesQuery(tpl, query))
    .map((tpl) => rankTemplateSuggestion(tpl, query, favoriteIds));
  ranked.sort((a, b) =>
    a.tier - b.tier
    || a.favorite - b.favorite
    || a.leftover - b.leftover
    || a.everyday - b.everyday
    || a.code.localeCompare(b.code)
    || a.name.localeCompare(b.name),
  );
  return ranked.slice(0, limit).map((row) => row.tpl);
}
