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

export function searchDedupedCatalog(
  templates: AveryTemplate[],
  query: string,
): AveryTemplate[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const deduped = dedupeBySize(templates);
  return deduped.filter((tpl) => {
    const dimStr = `${tpl.labelWidthIn}x${tpl.labelHeightIn}`;
    const sizeStr = describeSize(tpl).toLowerCase();
    return (
      tpl.name.toLowerCase().includes(q) ||
      (tpl.averyCode ?? '').toLowerCase().includes(q) ||
      sizeStr.includes(q) ||
      dimStr.includes(q) ||
      tpl.id.toLowerCase().includes(q)
    );
  });
}
