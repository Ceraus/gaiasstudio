import { describe, expect, it } from 'vitest';
import type { AveryDataset, AveryTemplate } from '@/types';
import dataset from '@/data/averyTemplates.json';
import { EDITOR_PPI } from '@/lib/units';
import {
  AVERY_SHEET_BLEED_IN,
  AVERY_SHEET_SAFE_IN,
  AVERY_SMALL_SAFE_IN,
  AVERY_TINY_SAFE_IN,
  isPrintToTheEdge,
  isRollTemplate,
  guideHitsFromBBox,
  printGuideLayoutPx,
  resolvePrintGuides,
  safetyRingRadiusPx,
} from '@/lib/printGuides';

const catalog = dataset as AveryDataset;

function circleSku(over: Partial<AveryTemplate> = {}): AveryTemplate {
  return {
    id: '22562',
    name: 'Avery 22562 · 2-1/2" diameter',
    brand: 'Avery',
    averyCode: '22562',
    shape: 'circle',
    labelWidthIn: 2.5,
    labelHeightIn: 2.5,
    pageWidthIn: 8.5,
    pageHeightIn: 11,
    columns: 3,
    rows: 3,
    marginTopIn: 1.25,
    marginLeftIn: 0.5,
    gutterXIn: 0,
    gutterYIn: 0.5,
    cornerRadiusIn: 0,
    perSheet: 9,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
    ...over,
  };
}

function byId(id: string): AveryTemplate {
  const found = catalog.templates.find((t) => t.id === id);
  if (!found) throw new Error(`Missing catalog template ${id}`);
  return found;
}

describe('Avery print guides', () => {
  it('uses Design & Print 1/8" bleed and safety for 22562-style PTE rounds', () => {
    expect(resolvePrintGuides(circleSku())).toMatchObject({
      bleedIn: AVERY_SHEET_BLEED_IN,
      safeIn: AVERY_SHEET_SAFE_IN,
      printToTheEdge: true,
    });
  });

  it('honors per-template bleed and safety', () => {
    expect(
      resolvePrintGuides(circleSku({ bleedIn: 0.0625, safeIn: 0.1 })),
    ).toMatchObject({ bleedIn: 0.0625, safeIn: 0.1 });
  });

  it('places 22562 rings on a 2.75" artboard around a 2.5" cut', () => {
    const layout = printGuideLayoutPx(circleSku());
    expect(layout.canvasW / EDITOR_PPI).toBeCloseTo(2.75);
    expect(layout.canvasH / EDITOR_PPI).toBeCloseTo(2.75);
    expect(layout.cut.w / EDITOR_PPI).toBeCloseTo(2.5);
    expect(layout.cut.h / EDITOR_PPI).toBeCloseTo(2.5);
    expect(layout.cut.x / EDITOR_PPI).toBeCloseTo(0.125);
    expect(layout.safe.w / EDITOR_PPI).toBeCloseTo(2.25);
    expect(layout.safe.x / EDITOR_PPI).toBeCloseTo(0.25);
    expect(layout.bleed.x).toBe(0);
    expect(layout.bleed.w).toBe(layout.canvasW);
    expect(safetyRingRadiusPx(layout.cut.w, layout.cut.h, layout.safePx)).toBeCloseTo(
      Math.min(layout.safe.w, layout.safe.h) / 2,
    );
  });

  it('does not let settings-style 0.0625 leak in — only template fields count', () => {
    const guides = resolvePrintGuides(circleSku());
    expect(guides.bleedIn).toBe(0.125);
    expect(guides.safeIn).toBe(0.125);
  });
});

describe('catalog SKU fixtures', () => {
  it('22562 2.5" circle is sheet PTE 0.125 / 0.125 on a 2.75" artboard', () => {
    const t = byId('22562');
    expect(t.shape).toBe('circle');
    expect(t.labelWidthIn).toBe(2.5);
    const guides = resolvePrintGuides(t);
    expect(guides).toMatchObject({
      bleedIn: 0.125,
      safeIn: 0.125,
      printToTheEdge: true,
    });
    const layout = printGuideLayoutPx(t);
    expect(layout.canvasW / EDITOR_PPI).toBeCloseTo(2.75);
    expect(layout.canvasH / EDITOR_PPI).toBeCloseTo(2.75);
  });

  it('22807 2" circle is sheet PTE', () => {
    const t = byId('22807');
    expect(t.shape).toBe('circle');
    expect(resolvePrintGuides(t)).toMatchObject({
      bleedIn: 0.125,
      safeIn: 0.125,
      printToTheEdge: true,
    });
  });

  it('small non-PTE color-coding circle has no fake bleed and a tight safety', () => {
    const t = byId('5641');
    expect(t.shape).toBe('circle');
    expect(t.labelWidthIn).toBeLessThan(0.5);
    const guides = resolvePrintGuides(t);
    expect(guides.bleedIn).toBe(0);
    expect(guides.safeIn).toBe(AVERY_TINY_SAFE_IN);
    expect(guides.printToTheEdge).toBe(false);
    const layout = printGuideLayoutPx(t);
    expect(layout.canvasW / EDITOR_PPI).toBeCloseTo(t.labelWidthIn);
  });

  it('5160 address rectangle is not PTE — no large fake bleed', () => {
    const t = byId('5160');
    expect(t.shape).toBe('rectangle');
    expect(t.name).toMatch(/address/i);
    expect(resolvePrintGuides(t)).toMatchObject({
      bleedIn: 0,
      safeIn: AVERY_SHEET_SAFE_IN,
      printToTheEdge: false,
    });
  });

  it('6870 named print-to-edge address keeps 1/8" bleed', () => {
    const t = byId('6870');
    expect(t.name).toMatch(/print-to-edge/i);
    const guides = resolvePrintGuides(t);
    expect(guides.bleedIn).toBe(0.125);
    expect(guides.printToTheEdge).toBe(true);
    expect(guides.safeIn).toBe(AVERY_SMALL_SAFE_IN);
  });

  it('8257 is PTE addressing even though the catalog name omits it', () => {
    const t = byId('8257');
    expect(t.name).not.toMatch(/print[- ]?to[- ]?(the[- ]?)?edge/i);
    expect(resolvePrintGuides(t)).toMatchObject({
      bleedIn: 0.125,
      printToTheEdge: true,
    });
  });

  it('named PTE oval keeps sheet bleed', () => {
    const t = byId('94054');
    expect(t.shape).toBe('oval');
    expect(t.name).toMatch(/print to the edge/i);
    expect(resolvePrintGuides(t).bleedIn).toBe(0.125);
  });

  it('named PTE square keeps sheet bleed', () => {
    const t = byId('22805');
    expect(t.shape).toBe('square');
    expect(resolvePrintGuides(t)).toMatchObject({
      bleedIn: 0.125,
      printToTheEdge: true,
    });
  });

  it('generic rounded-rectangle sticker is treated as PTE', () => {
    const t = byId('rrect-2x3');
    expect(t.shape).toBe('rounded-rectangle');
    expect(t.brand).toBe('Generic');
    expect(resolvePrintGuides(t)).toMatchObject({
      bleedIn: 0.125,
      safeIn: 0.125,
      printToTheEdge: true,
    });
  });

  it('wrap ribbon has no bleed (no room / not Avery PTE)', () => {
    const t = byId('ribbon-9x1-2');
    expect(t.rotateForPrint).toBe(true);
    expect(isPrintToTheEdge(t)).toBe(false);
    expect(resolvePrintGuides(t).bleedIn).toBe(0);
    expect(resolvePrintGuides(t).safeIn).toBe(0.125);
  });

  it('roll stock uses 1/16" bleed and safety', () => {
    const roll = circleSku({
      id: 'roll-demo',
      name: 'WePrint roll 2" circle',
      pageWidthIn: 2.25,
      pageHeightIn: 36,
      columns: 1,
      rows: 1,
      perSheet: 1,
    });
    expect(isRollTemplate(roll)).toBe(true);
    expect(resolvePrintGuides(roll)).toMatchObject({
      bleedIn: 0.0625,
      safeIn: 0.0625,
      printToTheEdge: true,
    });
  });
});

describe('every catalog template', () => {
  it('scans the bundled Avery catalog', () => {
    expect(catalog.templates.length).toBe(catalog.count);
    expect(catalog.templates.length).toBe(694);

    const pte = catalog.templates.filter((t) => resolvePrintGuides(t).printToTheEdge);
    const namedPte = catalog.templates.filter((t) =>
      /print[\s-]*to[\s-]*(the[\s-]*)?edge/i.test(t.name),
    );
    const safeBuckets = { tiny: 0, small: 0, sheet: 0, other: 0 };
    for (const t of catalog.templates) {
      const safe = resolvePrintGuides(t).safeIn;
      if (safe === AVERY_TINY_SAFE_IN) safeBuckets.tiny++;
      else if (safe === AVERY_SMALL_SAFE_IN) safeBuckets.small++;
      else if (safe === AVERY_SHEET_SAFE_IN) safeBuckets.sheet++;
      else safeBuckets.other++;
    }
    expect(namedPte.length).toBe(52);
    expect(pte.length).toBeGreaterThan(namedPte.length);
    expect(pte.length).toBeLessThan(catalog.templates.length);
    expect(safeBuckets.other).toBe(0);
    // Pin the resolver's catalog split so a rule change is obvious.
    expect({
      pte: pte.length,
      nonPte: catalog.templates.length - pte.length,
      ...safeBuckets,
    }).toEqual({
      pte: 266,
      nonPte: 428,
      tiny: 20,
      small: 171,
      sheet: 503,
      other: 0,
    });
  });

  it('never returns negative or larger-than-half-label safety', () => {
    expect(catalog.templates.some((t) => t.bleedIn != null || t.safeIn != null)).toBe(
      false,
    );

    for (const template of catalog.templates) {
      const guides = resolvePrintGuides(template);
      const minDim = Math.min(template.labelWidthIn, template.labelHeightIn);
      expect(guides.bleedIn, template.id).toBeGreaterThanOrEqual(0);
      expect(guides.safeIn, template.id).toBeGreaterThanOrEqual(0);
      expect(guides.safeIn, template.id).toBeLessThan(minDim / 2);
      const layout = printGuideLayoutPx(template);
      expect(layout.safe.w, template.id).toBeGreaterThanOrEqual(0);
      expect(layout.safe.h, template.id).toBeGreaterThanOrEqual(0);
      expect(layout.canvasW).toBeCloseTo(
        (template.labelWidthIn + guides.bleedIn * 2) * EDITOR_PPI,
      );
    }
  });

  it('named print-to-the-edge SKUs always get a sheet bleed ring', () => {
    const named = catalog.templates.filter((t) =>
      /print[\s-]*to[\s-]*(the[\s-]*)?edge/i.test(t.name),
    );
    expect(named.length).toBeGreaterThan(20);
    for (const template of named) {
      expect(isPrintToTheEdge(template), template.id).toBe(true);
      expect(resolvePrintGuides(template).bleedIn, template.id).toBe(0.125);
    }
  });

  it('classic address SKUs do not get a fake 1/8" bleed', () => {
    for (const id of ['5160', '5163', '8160', '5261']) {
      expect(resolvePrintGuides(byId(id)).bleedIn, id).toBe(0);
    }
  });
});

describe('guideHitsFromBBox', () => {
  const layout = printGuideLayoutPx(circleSku());
  const cx = layout.canvasW / 2;
  const cy = layout.canvasH / 2;

  function box(left: number, top: number, size = 40) {
    return { left, top, width: size, height: size };
  }

  it('ignores a centered box well inside the safety ellipse', () => {
    expect(guideHitsFromBBox(box(cx - 20, cy - 20), layout, 'circle')).toEqual({
      bleed: false,
      safety: false,
    });
  });

  it('flags safety when a box leaves the inner ellipse but not the bleed', () => {
    // Top of the box sits just outside the safety ring (safe.y = 37.5 at 150 ppi).
    const hits = guideHitsFromBBox(box(cx - 20, layout.safe.y - 8), layout, 'circle');
    expect(hits.safety).toBe(true);
    expect(hits.bleed).toBe(false);
  });

  it('flags bleed when a box reaches the outer ellipse', () => {
    const hits = guideHitsFromBBox(box(cx - 20, 0), layout, 'circle');
    expect(hits.bleed).toBe(true);
    expect(hits.safety).toBe(true);
  });

  it('uses rect edges for square / rectangle SKUs', () => {
    const rect = printGuideLayoutPx(circleSku({ shape: 'square' }));
    const inner = box(rect.safe.x + 4, rect.safe.y + 4, 30);
    expect(guideHitsFromBBox(inner, rect, 'square')).toEqual({
      bleed: false,
      safety: false,
    });
    expect(guideHitsFromBBox(box(rect.safe.x - 1, rect.safe.y + 4, 30), rect, 'square')).toEqual({
      bleed: false,
      safety: true,
    });
    expect(guideHitsFromBBox(box(0, rect.safe.y + 4, 30), rect, 'square').bleed).toBe(true);
  });
});
