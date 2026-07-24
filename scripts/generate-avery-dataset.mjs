#!/usr/bin/env node
/**
 * Generates src/data/averyTemplates.json.
 *
 * Two sources are merged:
 *   1. Authentic Avery rectangle / address templates (exact margins + gutters).
 *      Label size is derived from the sheet math and verified against Avery's
 *      published dimensions (e.g. 6871 -> 2.375 x 1.25, 5160 -> 2.625 x 1.0).
 *   2. A curated, mathematically-centered set of round / oval / square templates
 *      that cover the shapes a boutique soap / sticker maker actually needs.
 *
 * Every template stores a fully explicit geometry so the print engine never has
 * to guess:  page size, label size, columns, rows, top/left margin and gutters.
 *
 * Run:  npm run avery:generate
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../src/data/averyTemplates.json');

const PAGE_W = 8.5;
const PAGE_H = 11;

const round3 = (n) => Math.round(n * 1000) / 1000;

/* ------------------------------------------------------------------ *
 * 1. Authentic Avery rectangle / address sheets.
 *    Columns: top, bottom, left, right, rows, cols, hGutter, vGutter
 *    (matches Avery's published Word/PDF template geometry).
 * ------------------------------------------------------------------ */
const RECT_ROWS = [
  ['5160', 0.5, 0.5, 0.188, 0.188, 10, 3, 0.125, 0, 'Address'],
  ['5161', 0.5, 0.5, 0.156, 0.156, 10, 2, 0.188, 0, 'Address'],
  ['5162', 0.833, 0.833, 0.156, 0.156, 7, 2, 0.188, 0, 'Address'],
  ['5163', 0.5, 0.5, 0.17, 0.17, 5, 2, 0.16, 0, 'Shipping'],
  ['5164', 0.5, 0.5, 0.156, 0.156, 3, 2, 0.188, 0, 'Shipping'],
  ['5167', 0.5, 0.5, 0.3, 0.3, 20, 4, 0.3, 0, 'Return address'],
  ['5168', 0.5, 0.5, 0.5, 0.5, 2, 2, 0.5, 0, 'Shipping'],
  ['5261', 0.5, 0.5, 0.156, 0.156, 10, 2, 0.188, 0, 'Address'],
  ['5262', 0.833, 0.833, 0.156, 0.156, 7, 2, 0.188, 0, 'Address'],
  ['5263', 0.5, 0.5, 0.17, 0.17, 5, 2, 0.16, 0, 'Shipping'],
  ['5264', 0.5, 0.5, 0.156, 0.156, 3, 2, 0.188, 0, 'Shipping'],
  ['5267', 0.5, 0.5, 0.3, 0.3, 20, 4, 0.3, 0, 'Return address'],
  ['5660', 0.5, 0.5, 0.062, 0.062, 10, 3, 0.063, 0, 'Clear address'],
  ['5664', 0.5, 0.5, 0.083, 0.083, 3, 2, 0.084, 0, 'Shipping'],
  ['6870', 0.625, 0.625, 0.375, 0.375, 10, 3, 0.5, 0.25, 'Print-to-edge address'],
  ['6871', 1.125, 1.125, 0.375, 0.375, 6, 3, 0.313, 0.25, 'Print-to-edge address'],
  ['6873', 1.125, 1.125, 0.375, 0.375, 4, 2, 0.25, 0.25, 'Print-to-edge'],
  ['6874', 0.625, 0.625, 0.375, 0.375, 3, 2, 0.25, 0.375, 'Print-to-edge'],
  ['6876', 0.625, 0.625, 0.375, 0.375, 2, 1, 0, 0.25, 'Print-to-edge'],
  ['6878', 0.625, 0.625, 0.375, 0.375, 2, 2, 0.25, 0.25, 'Print-to-edge'],
  ['6879', 1.125, 1.125, 0.375, 0.375, 6, 2, 0.25, 0.25, 'Print-to-edge'],
  ['8160', 0.5, 0.5, 0.188, 0.188, 10, 3, 0.125, 0, 'Address (inkjet)'],
  ['8163', 0.5, 0.5, 0.17, 0.17, 5, 2, 0.16, 0, 'Shipping (inkjet)'],
  ['8167', 0.5, 0.5, 0.3, 0.3, 20, 4, 0.3, 0, 'Return address (inkjet)'],
  ['8168', 0.5, 0.5, 0.5, 0.5, 2, 2, 0.5, 0, 'Shipping (inkjet)'],
];

/* ------------------------------------------------------------------ *
 * 2. Curated shape templates. We choose columns/rows/gutters that fit a
 *    US-Letter sheet, then center the block automatically. This guarantees
 *    a printable, non-overlapping grid for every entry.
 *    [id, displayName, shape, w, h, cols, rows, gutterX, gutterY, avery?]
 * ------------------------------------------------------------------ */
const SHAPE_SPECS = [
  // Circles / rounds ------------------------------------------------
  ['round-0-75', 'Round 0.75"', 'circle', 0.75, 0.75, 8, 11, 0.2, 0.2, '5793'],
  ['round-1', 'Round 1"', 'circle', 1, 1, 6, 8, 0.25, 0.25, '22877'],
  ['round-1-25', 'Round 1.25"', 'circle', 1.25, 1.25, 5, 7, 0.2, 0.2, ''],
  ['round-1-5', 'Round 1.5"', 'circle', 1.5, 1.5, 4, 5, 0.3, 0.35, '22830'],
  ['round-1-67', 'Round 1-2/3"', 'circle', 1.67, 1.67, 4, 5, 0.15, 0.2, '22877'],
  ['round-2', 'Round 2"', 'circle', 2, 2, 3, 4, 0.5, 0.5, '22807'],
  ['round-2-5', 'Round 2.5"', 'circle', 2.5, 2.5, 3, 3, 0.25, 0.4, '22817'],
  ['round-3', 'Round 3"', 'circle', 3, 3, 2, 3, 0.35, 0.35, '22830'],
  ['round-4', 'Round 4"', 'circle', 4, 4, 2, 2, 0.25, 0.4, ''],
  // Ovals -----------------------------------------------------------
  ['oval-1-5x1', 'Oval 1.5" x 1"', 'oval', 1.5, 1, 4, 8, 0.2, 0.2, ''],
  ['oval-2x1-33', 'Oval 2" x 1.33"', 'oval', 2, 1.33, 3, 6, 0.3, 0.25, ''],
  ['oval-2-5x1-5', 'Oval 2.5" x 1.5"', 'oval', 2.5, 1.5, 3, 6, 0.2, 0.2, ''],
  ['oval-3-33x2', 'Oval 3-1/3" x 2"', 'oval', 3.33, 2, 2, 4, 0.2, 0.3, '22573'],
  ['oval-4x3', 'Oval 4" x 3"', 'oval', 4, 3, 2, 3, 0.2, 0.4, ''],
  // Squares ---------------------------------------------------------
  ['square-1', 'Square 1"', 'square', 1, 1, 6, 8, 0.25, 0.25, '22805'],
  ['square-1-5', 'Square 1.5"', 'square', 1.5, 1.5, 4, 5, 0.3, 0.35, ''],
  ['square-2', 'Square 2"', 'square', 2, 2, 3, 4, 0.4, 0.5, '22806'],
  ['square-2-5', 'Square 2.5"', 'square', 2.5, 2.5, 3, 3, 0.25, 0.4, '22816'],
  ['square-3', 'Square 3"', 'square', 3, 3, 2, 3, 0.35, 0.35, ''],
  ['square-4', 'Square 4"', 'square', 4, 4, 2, 2, 0.25, 0.4, ''],
  // Rounded-rectangle stickers -------------------------------------
  ['rrect-2x3', 'Rounded 3" x 2"', 'rounded-rectangle', 3, 2, 2, 4, 0.3, 0.4, ''],
  ['rrect-3x4', 'Rounded 4" x 3"', 'rounded-rectangle', 4, 3, 2, 3, 0.2, 0.4, ''],
  ['rrect-2x2-5', 'Rounded 2.5" x 2"', 'rounded-rectangle', 2.5, 2, 3, 4, 0.2, 0.35, ''],
];

function centeredTemplate(spec) {
  const [id, name, shape, w, h, cols, rows, gx, gy, avery] = spec;
  const usedW = cols * w + (cols - 1) * gx;
  const usedH = rows * h + (rows - 1) * gy;
  const marginLeft = (PAGE_W - usedW) / 2;
  const marginTop = (PAGE_H - usedH) / 2;
  if (marginLeft < 0.05 || marginTop < 0.05) {
    throw new Error(`Template ${id} does not fit the page (mL=${marginLeft}, mT=${marginTop})`);
  }
  return {
    id,
    name,
    brand: avery ? 'Avery' : 'Generic',
    averyCode: avery || null,
    shape,
    labelWidthIn: round3(w),
    labelHeightIn: round3(h),
    pageWidthIn: PAGE_W,
    pageHeightIn: PAGE_H,
    columns: cols,
    rows,
    marginTopIn: round3(marginTop),
    marginLeftIn: round3(marginLeft),
    gutterXIn: round3(gx),
    gutterYIn: round3(gy),
    cornerRadiusIn: shape === 'rounded-rectangle' ? 0.25 : 0,
    perSheet: cols * rows,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
  };
}

function rectTemplate(row) {
  const [code, top, bottom, left, right, rows, cols, hg, vg, kind] = row;
  const w = (PAGE_W - left - right - (cols - 1) * hg) / cols;
  const h = (PAGE_H - top - bottom - (rows - 1) * vg) / rows;
  return {
    id: code,
    name: `Avery ${code} · ${round3(w)}" x ${round3(h)}" (${kind})`,
    brand: 'Avery',
    averyCode: code,
    shape: 'rectangle',
    labelWidthIn: round3(w),
    labelHeightIn: round3(h),
    pageWidthIn: PAGE_W,
    pageHeightIn: PAGE_H,
    columns: cols,
    rows,
    marginTopIn: round3(top),
    marginLeftIn: round3(left),
    gutterXIn: round3(hg),
    gutterYIn: round3(vg),
    cornerRadiusIn: 0,
    perSheet: cols * rows,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
  };
}

// Wrap-around "ribbon" side label. Designed 9" x 1.2" but printed rotated 90°
// so its footprint on the portrait sheet is 1.2" wide x 9" tall.
const RIBBON = {
  id: 'ribbon-9x1-2',
  name: 'Wrap Ribbon 9" x 1.2" (side)',
  brand: 'Custom',
  averyCode: null,
  shape: 'rectangle',
  labelWidthIn: 9,
  labelHeightIn: 1.2,
  pageWidthIn: PAGE_W,
  pageHeightIn: PAGE_H,
  columns: 5,
  rows: 1,
  // Footprint after rotation is 1.2 wide. 5 columns => 6.0", centered.
  marginTopIn: round3((PAGE_H - 9) / 2),
  marginLeftIn: round3((PAGE_W - (5 * 1.2 + 4 * 0.1)) / 2),
  gutterXIn: 0.1,
  gutterYIn: 0,
  cornerRadiusIn: 0,
  perSheet: 5,
  rotateForPrint: true,
  contexts: ['side'],
};

const templates = [
  ...SHAPE_SPECS.map(centeredTemplate),
  ...RECT_ROWS.map(rectTemplate),
  RIBBON,
];

// Sort: circle, oval, square, rounded-rectangle, rectangle; then by size.
const order = { circle: 0, oval: 1, square: 2, 'rounded-rectangle': 3, rectangle: 4 };
templates.sort((a, b) => {
  if (order[a.shape] !== order[b.shape]) return order[a.shape] - order[b.shape];
  return a.labelWidthIn * a.labelHeightIn - b.labelWidthIn * b.labelHeightIn;
});

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      note: 'Geometry is explicit and print-ready. Regenerate with `npm run avery:generate`. Merge live-scraped data with `npm run avery:scrape`.',
      count: templates.length,
      templates,
    },
    null,
    2,
  ) + '\n',
);

console.log(`Wrote ${templates.length} templates -> ${OUT}`);
for (const t of templates) {
  console.log(
    `  ${t.shape.padEnd(18)} ${t.name.padEnd(42)} ${t.columns}x${t.rows} = ${t.perSheet}/sheet`,
  );
}
