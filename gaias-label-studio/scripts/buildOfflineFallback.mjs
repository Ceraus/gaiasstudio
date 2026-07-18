#!/usr/bin/env node
/**
 * Generates resources/avery_templates_offline.json.
 *
 * This is the bundled fallback catalog used the very first time the app runs,
 * before (or in case) the live scraper (scrapeAvery.mjs) can reach Avery's
 * template API. Label sizes and labels-per-sheet below are taken from Avery's
 * published product/template pages. Avery does NOT publish raw margin/pitch
 * geometry publicly for every SKU, so for families where the exact pitch is
 * not independently documented (marked `verifiedGeometry: false`) we derive a
 * centered, symmetric grid from the known label size + labels-per-sheet using
 * a standard gutter. Families with officially documented, widely-reproduced
 * geometry (the 5160 address-label family and 6871) use exact figures and are
 * marked `verifiedGeometry: true`.
 *
 * Run: node scripts/buildOfflineFallback.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "..", "resources", "avery_templates_offline.json");

const SHEET_W = 8.5;
const SHEET_H = 11;

/** Centers a `cols` x `rows` grid of `w` x `h` labels on a Letter sheet using `gutter` inches between labels. */
function centeredGrid(w, h, cols, rows, gutterX = 0.75, gutterY = 0.5) {
  const pitchXIn = round4(w + gutterX);
  const pitchYIn = round4(h + gutterY);
  const contentW = (cols - 1) * pitchXIn + w;
  const contentH = (rows - 1) * pitchYIn + h;
  const marginLeftIn = round4((SHEET_W - contentW) / 2);
  const marginTopIn = round4((SHEET_H - contentH) / 2);
  return { pitchXIn, pitchYIn, marginLeftIn, marginTopIn };
}

function round4(n) {
  return Math.round(n * 10000) / 10000;
}

function tmpl({
  sku,
  name,
  shape,
  widthIn,
  heightIn,
  cornerRadiusIn = 0,
  columns,
  rows,
  gutterX,
  gutterY,
  bleedIn = 0.0625,
  category,
  overrides,
  verifiedGeometry = false,
}) {
  const geo = overrides ?? centeredGrid(widthIn, heightIn, columns, rows, gutterX, gutterY);
  return {
    sku,
    brand: "Avery",
    name,
    shape,
    sheetSize: "Letter (8.5 x 11 in)",
    widthIn,
    heightIn,
    cornerRadiusIn,
    columns,
    rows,
    marginLeftIn: geo.marginLeftIn,
    marginTopIn: geo.marginTopIn,
    pitchXIn: geo.pitchXIn,
    pitchYIn: geo.pitchYIn,
    bleedIn,
    category,
    verifiedGeometry,
  };
}

const templates = [
  // ---------------------------------------------------------------------
  // CIRCLES
  // ---------------------------------------------------------------------
  tmpl({ sku: "22807", name: "Glossy White Round Labels 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "22817", name: "Print-to-the-Edge Round Labels 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "22825", name: "Glossy Clear Round Labels 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "22612", name: "Round Labels 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "22877", name: "Round Labels 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "5907", name: "Glitter Round Stickers 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "94501", name: "Presta Round Labels 2\"", shape: "circle", widthIn: 2, heightIn: 2, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "8293", name: "High-Visibility Round Labels 1-1/2\"", shape: "circle", widthIn: 1.5, heightIn: 1.5, columns: 4, rows: 5, gutterX: 0.35, gutterY: 0.2, category: "Round Stickers" }),
  tmpl({ sku: "94506", name: "Presta Round Labels 1-1/2\"", shape: "circle", widthIn: 1.5, heightIn: 1.5, columns: 4, rows: 5, gutterX: 0.35, gutterY: 0.2, category: "Round Stickers" }),
  tmpl({ sku: "22808", name: "Print-to-the-Edge Round Labels 2-1/2\" (Kraft)", shape: "circle", widthIn: 2.5, heightIn: 2.5, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.3, category: "Round Stickers" }),
  tmpl({ sku: "22562", name: "Round Labels 2-1/2\"", shape: "circle", widthIn: 2.5, heightIn: 2.5, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.3, category: "Round Stickers" }),
  tmpl({ sku: "41462", name: "Print-to-the-Edge Round Labels 2-1/2\"", shape: "circle", widthIn: 2.5, heightIn: 2.5, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.3, category: "Round Stickers" }),
  tmpl({ sku: "22830", name: "Round Labels 2-1/2\"", shape: "circle", widthIn: 2.5, heightIn: 2.5, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.3, category: "Round Stickers" }),
  tmpl({ sku: "5293", name: "Neon Round Labels 1-2/3\"", shape: "circle", widthIn: 1.6667, heightIn: 1.6667, columns: 4, rows: 6, gutterX: 0.15, gutterY: 0.1, category: "Round Stickers" }),
  tmpl({ sku: "94508", name: "Presta Round Labels 1-2/3\"", shape: "circle", widthIn: 1.6667, heightIn: 1.6667, columns: 4, rows: 5, gutterX: 0.15, gutterY: 0.1, category: "Round Stickers" }),
  tmpl({ sku: "5410", name: "Print or Write Round Labels 1\"", shape: "circle", widthIn: 1, heightIn: 1, columns: 4, rows: 3, gutterX: 0.35, gutterY: 0.5, category: "Round Stickers" }),
  tmpl({ sku: "94500", name: "Presta Round Labels 1\"", shape: "circle", widthIn: 1, heightIn: 1, columns: 6, rows: 8, gutterX: 0.1, gutterY: 0.05, category: "Round Stickers" }),
  tmpl({ sku: "6450", name: "Round Labels 1\" (63/sheet)", shape: "circle", widthIn: 1, heightIn: 1, columns: 7, rows: 9, gutterX: 0.05, gutterY: 0.02, category: "Round Stickers" }),
  tmpl({ sku: "94509", name: "Presta Round Labels 1-3/4\"", shape: "circle", widthIn: 1.75, heightIn: 1.75, columns: 4, rows: 5, gutterX: 0.2, gutterY: 0.15, category: "Round Stickers" }),
  tmpl({ sku: "94513", name: "Presta Round Labels 3\"", shape: "circle", widthIn: 3, heightIn: 3, columns: 2, rows: 3, gutterX: 0.5, gutterY: 0.3, category: "Round Stickers" }),
  tmpl({ sku: "94514", name: "Presta Round Labels 3-1/2\"", shape: "circle", widthIn: 3.5, heightIn: 3.5, columns: 2, rows: 2, gutterX: 0.4, gutterY: 0.4, category: "Round Stickers" }),
  tmpl({ sku: "4221", name: "3/4\" Round Labels (White)", shape: "circle", widthIn: 0.75, heightIn: 0.75, columns: 8, rows: 10, gutterX: 0.05, gutterY: 0.02, category: "Round Stickers" }),
  tmpl({ sku: "4222", name: "3/4\" Round Labels (Clear)", shape: "circle", widthIn: 0.75, heightIn: 0.75, columns: 8, rows: 10, gutterX: 0.05, gutterY: 0.02, category: "Round Stickers" }),
  tmpl({ sku: "4220", name: "3/4\" Round Labels (Kraft)", shape: "circle", widthIn: 0.75, heightIn: 0.75, columns: 8, rows: 10, gutterX: 0.05, gutterY: 0.02, category: "Round Stickers" }),

  // ---------------------------------------------------------------------
  // OVALS
  // ---------------------------------------------------------------------
  tmpl({ sku: "22804", name: "Print-to-the-Edge Oval Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22814", name: "Print-to-the-Edge Oval Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22854", name: "Glossy Clear Oval Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22206", name: "Print-to-the-Edge Oval Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22564", name: "Oval Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "6583", name: "Oval Multipurpose Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "94051", name: "Presta Oval Labels 1.5x2.5\"", shape: "oval", widthIn: 1.5, heightIn: 2.5, columns: 3, rows: 6, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22820", name: "Print-to-the-Edge Oval Labels 2x3-1/3\"", shape: "oval", widthIn: 2, heightIn: 3.3333, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22829", name: "Textured Oval Labels 2x3-1/3\"", shape: "oval", widthIn: 2, heightIn: 3.3333, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "22927", name: "Print-to-the-Edge Oval Labels 2x3-1/3\"", shape: "oval", widthIn: 2, heightIn: 3.3333, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "94053", name: "Presta Oval Labels 1x2\"", shape: "oval", widthIn: 1, heightIn: 2, columns: 4, rows: 6, gutterX: 0.25, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "94054", name: "Presta Oval Labels 1-1/8x2-1/4\"", shape: "oval", widthIn: 1.125, heightIn: 2.25, columns: 3, rows: 7, gutterX: 0.3, gutterY: 0.1, category: "Oval Stickers" }),
  tmpl({ sku: "8216", name: "Oval Gifting Seals 1-1/8x2-1/4\"", shape: "oval", widthIn: 1.125, heightIn: 2.25, columns: 3, rows: 7, gutterX: 0.3, gutterY: 0.1, category: "Oval Stickers" }),

  // ---------------------------------------------------------------------
  // SQUARES
  // ---------------------------------------------------------------------
  tmpl({ sku: "22805", name: "Square Labels 1.5x1.5\"", shape: "square", widthIn: 1.5, heightIn: 1.5, cornerRadiusIn: 0.0625, columns: 4, rows: 6, gutterX: 0.35, gutterY: 0.1, category: "Square Stickers" }),
  tmpl({ sku: "22806", name: "Square Labels 2x2\" (Matte)", shape: "square", widthIn: 2, heightIn: 2, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Square Stickers" }),
  tmpl({ sku: "22816", name: "Print-to-the-Edge Square Labels 2x2\"", shape: "square", widthIn: 2, heightIn: 2, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Square Stickers" }),
  tmpl({ sku: "22853", name: "Glossy Clear Square Labels 2x2\"", shape: "square", widthIn: 2, heightIn: 2, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Square Stickers" }),
  tmpl({ sku: "22846", name: "Kraft Square Labels 2x2\"", shape: "square", widthIn: 2, heightIn: 2, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Square Stickers" }),
  tmpl({ sku: "5908", name: "Glitter Square Stickers 2x2\"", shape: "square", widthIn: 2, heightIn: 2, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Square Stickers" }),
  tmpl({ sku: "94107", name: "Presta Square Labels 2x2\"", shape: "square", widthIn: 2, heightIn: 2, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.75, gutterY: 0.5, category: "Square Stickers" }),
  tmpl({ sku: "94104", name: "Presta Square Labels 2.5x2.5\"", shape: "square", widthIn: 2.5, heightIn: 2.5, cornerRadiusIn: 0.0625, columns: 3, rows: 3, gutterX: 0.375, gutterY: 0.25, category: "Square Stickers" }),
  tmpl({ sku: "94105", name: "Presta Square Labels 2-1/8x2-1/8\"", shape: "square", widthIn: 2.125, heightIn: 2.125, cornerRadiusIn: 0.0625, columns: 3, rows: 4, gutterX: 0.5, gutterY: 0.3, category: "Square Stickers" }),
  tmpl({ sku: "94101", name: "Square Labels 3x3\"", shape: "square", widthIn: 3, heightIn: 3, cornerRadiusIn: 0.0625, columns: 2, rows: 3, gutterX: 0.5, gutterY: 0.3, category: "Square Stickers" }),
  tmpl({ sku: "5659", name: "Sure Feed Square Labels 3x3\"", shape: "square", widthIn: 3, heightIn: 3, cornerRadiusIn: 0.0625, columns: 2, rows: 3, gutterX: 0.5, gutterY: 0.3, category: "Square Stickers" }),

  // ---------------------------------------------------------------------
  // RECTANGLES — the 5160 family uses Avery's own well-documented exact geometry
  // ---------------------------------------------------------------------
  tmpl({ sku: "5160", name: "Address Labels 1x2-5/8\"", shape: "rectangle", widthIn: 1, heightIn: 2.625, cornerRadiusIn: 0.0625, columns: 3, rows: 10, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.1875, marginTopIn: 0.5, pitchXIn: 2.75, pitchYIn: 1 } }),
  tmpl({ sku: "5161", name: "Address Labels 1x4\"", shape: "rectangle", widthIn: 1, heightIn: 4, cornerRadiusIn: 0.0625, columns: 2, rows: 10, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.15625, marginTopIn: 0.5, pitchXIn: 4.1875, pitchYIn: 1 } }),
  tmpl({ sku: "5162", name: "Address Labels 1-1/3x4\"", shape: "rectangle", widthIn: 1.3333, heightIn: 4, cornerRadiusIn: 0.0625, columns: 2, rows: 7, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.15625, marginTopIn: 0.5, pitchXIn: 4.1875, pitchYIn: 1.3333 } }),
  tmpl({ sku: "5163", name: "Shipping Labels 2x4\"", shape: "rectangle", widthIn: 2, heightIn: 4, cornerRadiusIn: 0.0625, columns: 2, rows: 5, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.15625, marginTopIn: 0.5, pitchXIn: 4.1875, pitchYIn: 2 } }),
  tmpl({ sku: "5164", name: "Shipping Labels 3-1/3x4\"", shape: "rectangle", widthIn: 3.3333, heightIn: 4, cornerRadiusIn: 0.0625, columns: 2, rows: 3, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.15625, marginTopIn: 0.5, pitchXIn: 4.1875, pitchYIn: 3.3333 } }),
  tmpl({ sku: "5165", name: "Full Sheet Shipping Label 8.5x11\"", shape: "rectangle", widthIn: 8.5, heightIn: 11, columns: 1, rows: 1, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0, marginTopIn: 0, pitchXIn: 8.5, pitchYIn: 11 } }),
  tmpl({ sku: "5167", name: "Return Address Labels 1/2x1-3/4\"", shape: "rectangle", widthIn: 0.5, heightIn: 1.75, columns: 4, rows: 20, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.28125, marginTopIn: 0.5, pitchXIn: 1.96875, pitchYIn: 0.5 } }),
  tmpl({ sku: "6871", name: "Print-to-the-Edge Address Labels 1-1/4x2-3/8\"", shape: "rectangle", widthIn: 1.25, heightIn: 2.375, cornerRadiusIn: 0.03125, columns: 3, rows: 8, category: "Rectangle Labels", verifiedGeometry: true, overrides: { marginLeftIn: 0.5625, marginTopIn: 0.5, pitchXIn: 2.6875, pitchYIn: 1.25 } }),
  tmpl({ sku: "22890", name: "Glossy White Labels 2x3\"", shape: "rectangle", widthIn: 2, heightIn: 3, cornerRadiusIn: 0.0625, columns: 3, rows: 3, gutterX: 0.4, gutterY: 0.3, category: "Rectangle Labels" }),

  // ---------------------------------------------------------------------
  // CUSTOM / NON-AVERY UTILITY TEMPLATE (used for the Side/Ribbon-wrap context)
  // ---------------------------------------------------------------------
  {
    sku: "CUSTOM-SIDE-9X1.2",
    brand: "Avery",
    name: "Custom Side Wrap Label 9 x 1.2\"",
    shape: "rectangle",
    sheetSize: "Letter (8.5 x 11 in)",
    widthIn: 9,
    heightIn: 1.2,
    cornerRadiusIn: 0,
    columns: 1,
    rows: 1,
    marginLeftIn: 0,
    marginTopIn: 0,
    pitchXIn: 9,
    pitchYIn: 1.2,
    bleedIn: 0.0625,
    category: "Custom Wraps",
    verifiedGeometry: false,
    note: "Oversized wrap label — print unrotated on a landscape / oversized sheet or tile across multiple Letter pages at export time.",
  },
];

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(
  OUT_FILE,
  JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      source: "bundled-fallback",
      count: templates.length,
      templates,
    },
    null,
    2
  )
);

console.log(`Wrote ${templates.length} templates to ${OUT_FILE}`);
