#!/usr/bin/env node
/**
 * Import exact Avery sheet geometry from @burnmark-io/sheet-templates.
 *
 * The upstream registry is generated from the long-maintained gLabels template
 * database and is MIT licensed. Hand-curated entries win; gLabels only upgrades
 * or adds products that still appear in Avery's current US REST catalog.
 * Discontinued historic codes are not imported.
 *
 * Usage:
 *   npm run avery:import:glabels
 *   node scripts/import-glabels-avery.mjs --from-file path/to/templates.json
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET = resolve(__dirname, '../src/data/averyTemplates.json');
const AVERY_RAW = resolve(__dirname, 'avery-raw.json');
const UPSTREAM =
  'https://raw.githubusercontent.com/burnmark-io/sheet-templates/main/src/templates.json';
const MM_PER_IN = 25.4;

const round4 = (value) => Math.round(value * 10_000) / 10_000;
const mmToIn = (value) => round4(Number(value) / MM_PER_IN);
const gutterIn = (pitchMm, labelIn, count) => {
  if (count <= 1) return 0;
  const gutter = mmToIn(pitchMm) - labelIn;
  // Some gLabels entries differ by a few hundredths of a millimetre because
  // their original point measurements were rounded. Treat that as zero gap.
  return Math.abs(gutter) < 0.01 ? 0 : round4(gutter);
};

function shapeOf(template) {
  if (template.labelShape === 'round') return 'circle';
  if (template.labelShape === 'ellipse') return 'oval';
  if (Math.abs(template.labelWidthMm - template.labelHeightMm) < 0.01) return 'square';
  return template.cornerRadiusMm > 0 ? 'rounded-rectangle' : 'rectangle';
}

function convert(template) {
  const layout = template.layouts?.[0];
  if (!layout) return null;

  const labelWidthIn = mmToIn(template.labelWidthMm);
  const labelHeightIn = mmToIn(template.labelHeightMm);
  const columns = Number(layout.columns);
  const rows = Number(layout.rows);
  if (
    !template.part ||
    !Number.isFinite(labelWidthIn) ||
    !Number.isFinite(labelHeightIn) ||
    !Number.isInteger(columns) ||
    !Number.isInteger(rows) ||
    columns < 1 ||
    rows < 1
  ) {
    return null;
  }

  return {
    id: String(template.part),
    name: template.name,
    brand: 'Avery',
    averyCode: String(template.part),
    shape: shapeOf(template),
    labelWidthIn,
    labelHeightIn,
    pageWidthIn: mmToIn(template.paperWidthMm),
    pageHeightIn: mmToIn(template.paperHeightMm),
    columns,
    rows,
    marginTopIn: mmToIn(layout.originYMm),
    marginLeftIn: mmToIn(layout.originXMm),
    gutterXIn: gutterIn(layout.pitchXMm, labelWidthIn, columns),
    gutterYIn: gutterIn(layout.pitchYMm, labelHeightIn, rows),
    cornerRadiusIn: mmToIn(template.cornerRadiusMm ?? 0),
    perSheet: columns * rows,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
    geometrySource: 'glabels-mit',
  };
}

function isCuratedAlias(template) {
  return (
    /^(round|oval|square|rrect|ribbon)-/i.test(String(template.id)) ||
    template.brand !== 'Avery'
  );
}

function collectLiveCodes(raw) {
  const liveCodes = new Set();
  for (const item of raw.labels?.contentlets ?? []) {
    if (item.sku) liveCodes.add(String(item.sku).toLowerCase());
  }
  for (const item of raw.blank?.contentlets ?? []) {
    if (item.diyProductNumber) {
      liveCodes.add(String(item.diyProductNumber).toLowerCase());
    }
    if (item.productNumber) liveCodes.add(String(item.productNumber).toLowerCase());
  }
  return liveCodes;
}

function isLiveAveryProduct(template, liveCodes) {
  if (isCuratedAlias(template)) return true;
  const candidates = [template.id, template.averyCode]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase());
  return candidates.some((code) => liveCodes.has(code));
}

function validate(template) {
  const usedWidth =
    template.marginLeftIn +
    template.columns * template.labelWidthIn +
    (template.columns - 1) * template.gutterXIn;
  const usedHeight =
    template.marginTopIn +
    template.rows * template.labelHeightIn +
    (template.rows - 1) * template.gutterYIn;
  return (
    template.pageWidthIn > 0 &&
    template.pageHeightIn > 0 &&
    template.labelWidthIn > 0 &&
    template.labelHeightIn > 0 &&
    template.marginLeftIn >= 0 &&
    template.marginTopIn >= 0 &&
    template.gutterXIn >= -0.001 &&
    template.gutterYIn >= -0.001 &&
    usedWidth <= template.pageWidthIn + 0.02 &&
    usedHeight <= template.pageHeightIn + 0.02
  );
}

async function loadRegistry() {
  const args = process.argv.slice(2);
  const fromFileAt = args.indexOf('--from-file');
  if (fromFileAt >= 0) {
    const path = args[fromFileAt + 1];
    if (!path) throw new Error('--from-file requires a path');
    return JSON.parse(readFileSync(resolve(process.cwd(), path), 'utf8'));
  }

  const response = await fetch(UPSTREAM, {
    headers: { Accept: 'application/json', 'User-Agent': 'Gaia-Label-Studio/3' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${UPSTREAM}`);
  return response.json();
}

async function main() {
  const registry = await loadRegistry();
  const sourceTemplates = registry
    .filter((template) => /^avery$/i.test(template.brand))
    .map(convert)
    .filter(Boolean);
  const valid = sourceTemplates.filter(validate);
  const rejected = sourceTemplates.length - valid.length;

  const dataset = JSON.parse(readFileSync(DATASET, 'utf8'));
  let templates = [...dataset.templates];
  let liveCodes = new Set();
  try {
    liveCodes = collectLiveCodes(JSON.parse(readFileSync(AVERY_RAW, 'utf8')));
  } catch {
    // The import also works without a cached Avery REST response.
  }
  if (liveCodes.size) {
    templates = templates.filter((template) => isLiveAveryProduct(template, liveCodes));
  }
  const indexById = new Map(
    templates.map((template, index) => [String(template.id).toLowerCase(), index]),
  );

  let added = 0;
  let upgraded = 0;
  let preserved = 0;
  let skippedDiscontinued = 0;
  for (const template of valid) {
    const key = template.id.toLowerCase();
    const existingIndex = indexById.get(key);
    if (existingIndex === undefined) {
      if (liveCodes.size && !isLiveAveryProduct(template, liveCodes)) {
        skippedDiscontinued++;
        continue;
      }
      indexById.set(key, templates.length);
      templates.push(template);
      added++;
      continue;
    }

    const existing = templates[existingIndex];
    if (
      !liveCodes.has(key) &&
      (existing.geometrySource === 'avery-rest-inferred' ||
        existing.geometrySource === 'avery-docx-verified')
    ) {
      templates[existingIndex] = template;
      upgraded++;
    } else {
      preserved++;
    }
  }

  const shapeOrder = {
    circle: 0,
    oval: 1,
    square: 2,
    'rounded-rectangle': 3,
    rectangle: 4,
  };
  templates.sort((a, b) => {
    const shapeDiff = (shapeOrder[a.shape] ?? 9) - (shapeOrder[b.shape] ?? 9);
    if (shapeDiff) return shapeDiff;
    const areaDiff =
      a.labelWidthIn * a.labelHeightIn - b.labelWidthIn * b.labelHeightIn;
    if (Math.abs(areaDiff) > 0.0001) return areaDiff;
    return String(a.averyCode ?? a.id).localeCompare(String(b.averyCode ?? b.id), undefined, {
      numeric: true,
    });
  });

  writeFileSync(
    DATASET,
    `${JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note:
          'Current Avery US catalog + official DOCX geometry + MIT-licensed gLabels geometry for live SKUs. See THIRD_PARTY_LICENSES.md.',
        count: templates.length,
        templates,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `Avery gLabels import: ${valid.length} valid, ${added} added, ${upgraded} entries upgraded, ${preserved} curated/gLabels preserved, ${skippedDiscontinued} discontinued skipped, ${rejected} rejected.`,
  );
  console.log(`Dataset: ${templates.length} templates -> ${DATASET}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
