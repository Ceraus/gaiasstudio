#!/usr/bin/env node
/**
 * Avery catalog importer for Gaia Label Studio (single-user / Rosa's desktop).
 *
 * Avery's old search API is Cloudflare-gated, but their site exposes two open
 * REST feeds that return the full blank-label catalog when fetched like a browser:
 *
 *   GET https://www.avery.com/rest/blank/default/labels   → 239 SKUs w/ dimensions
 *   GET https://www.avery.com/rest/labels                  → 584 template codes + sizes
 *
 * Usage:
 *   npm run avery:scrape                         # live REST fetch + merge
 *   node scripts/scrape-avery.mjs --browser        # Puppeteer fallback (real Chrome)
 *   node scripts/scrape-avery.mjs --from-file scripts/avery-raw.json
 *
 * Bookmarklet (while on avery.com): paste contents of scripts/avery-bookmarklet.txt
 * into a bookmark, click it, save avery-catalog.json, then --from-file.
 *
 * Curated / print-verified templates in averyTemplates.json are never overwritten;
 * scrape only adds missing Avery codes.
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_OUT = resolve(__dirname, 'avery-raw.json');
const DATASET = resolve(__dirname, '../src/data/averyTemplates.json');

const REST_BLANK = 'https://www.avery.com/rest/blank/default/labels';
const REST_LABELS = 'https://www.avery.com/rest/labels';

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.avery.com/templates',
};

const PAGE_W = 8.5;
const PAGE_H = 11;

const round3 = (n) => Math.round(n * 1000) / 1000;

const SHAPE_MAP = {
  round: 'circle',
  circle: 'circle',
  oval: 'oval',
  square: 'square',
  rectangle: 'rectangle',
  'rounded-rectangle': 'rounded-rectangle',
};

function classifyShape(raw) {
  const s = String(raw ?? '').toLowerCase();
  if (SHAPE_MAP[s]) return SHAPE_MAP[s];
  if (s.includes('round') || s.includes('circle')) return 'circle';
  if (s.includes('oval')) return 'oval';
  if (s.includes('square')) return 'square';
  return 'rectangle';
}

/** @param {string} token e.g. "2-5/8", "1-1/2", "2" */
function parseFractionToken(token) {
  const t = String(token).replace(/"/g, '').trim();
  const mixed = t.match(/^(\d+)-(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Parse Avery size strings like `2" diameter` or `1" x 2-5/8"`. */
function parseSizeString(size) {
  const s = String(size ?? '').trim();
  const diam = s.match(/^([\d\-\/\.\" ]+)"?\s*diameter/i);
  if (diam) {
    const d = parseFractionToken(diam[1]);
    if (d == null) return null;
    return { w: d, h: d, shape: 'circle' };
  }
  const rect = s.match(/^([\d\-\/\.\" ]+)\s*[x×]\s*([\d\-\/\.\" ]+)/i);
  if (rect) {
    const w = parseFractionToken(rect[1]);
    const h = parseFractionToken(rect[2]);
    if (w == null || h == null) return null;
    return { w, h, shape: Math.abs(w - h) < 0.01 ? 'square' : 'rectangle' };
  }
  return null;
}

function factorPairs(n) {
  const pairs = [];
  for (let cols = 1; cols <= n; cols++) {
    if (n % cols === 0) pairs.push([cols, n / cols]);
  }
  return pairs;
}

/** Best-effort grid when Avery REST omits margins (centered layout). */
function inferGrid(w, h, perSheet) {
  let best = null;
  let bestScore = -Infinity;
  const gutterCandidates = [0, 0.0625, 0.125, 0.188, 0.25, 0.3, 0.375, 0.5];

  for (const [cols, rows] of factorPairs(perSheet)) {
    for (const gx of gutterCandidates) {
      for (const gy of gutterCandidates) {
        const usedW = cols * w + (cols - 1) * gx;
        const usedH = rows * h + (rows - 1) * gy;
        if (usedW > PAGE_W + 0.001 || usedH > PAGE_H + 0.001) continue;
        const mL = (PAGE_W - usedW) / 2;
        const mT = (PAGE_H - usedH) / 2;
        if (mL < 0.04 || mT < 0.04) continue;
        const score = mL + mT - Math.abs(cols - rows) * 0.05;
        if (score > bestScore) {
          bestScore = score;
          best = { cols, rows, gx, gy, mL, mT };
        }
      }
    }
  }
  return best;
}

function buildTemplate({ code, name, shape, w, h, grid, inferred = true }) {
  if (!code || !grid || !w || !h) return null;
  const { cols, rows, gx, gy, mL, mT } = grid;
  return {
    id: String(code),
    name: name || `Avery ${code} · ${round3(w)}" x ${round3(h)}"`,
    brand: 'Avery',
    averyCode: String(code),
    shape,
    labelWidthIn: round3(w),
    labelHeightIn: round3(h),
    pageWidthIn: PAGE_W,
    pageHeightIn: PAGE_H,
    columns: cols,
    rows,
    marginTopIn: round3(mT),
    marginLeftIn: round3(mL),
    gutterXIn: round3(gx),
    gutterYIn: round3(gy),
    cornerRadiusIn: shape === 'rounded-rectangle' ? 0.25 : 0,
    perSheet: cols * rows,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
    geometrySource: inferred ? 'avery-rest-inferred' : 'avery-rest',
  };
}

function fromBlankItem(item) {
  const code = item.diyProductNumber || item.productNumber;
  const shape = classifyShape(item.shape);
  let w = Number(item.width);
  let h = Number(item.height);
  if (shape === 'circle') {
    w = h = Math.max(w, h);
  }
  const perSheet = Number(item.labelsPerSheet);
  if (!code || !w || !h || !perSheet) return null;
  const grid = inferGrid(w, h, perSheet);
  if (!grid) return null;
  return buildTemplate({
    code,
    name: item.productDisplayName
      ? `${item.productDisplayName} (${code})`
      : `Avery ${code} · ${round3(w)}" x ${round3(h)}"`,
    shape,
    w,
    h,
    grid,
    inferred: true,
  });
}

function fromLabelSku(item, blankByCode) {
  const code = String(item.sku ?? '').trim();
  if (!code) return null;
  const blank = blankByCode.get(code);
  if (blank) return fromBlankItem({ ...blank, diyProductNumber: code });

  const parsed = parseSizeString(item.size);
  if (!parsed) return null;

  // Guess labels-per-sheet from common Avery layouts for searchable SKUs.
  const commonCounts = [4, 6, 8, 10, 12, 14, 18, 20, 24, 30, 40, 60, 80];
  let grid = null;
  for (const n of commonCounts) {
    grid = inferGrid(parsed.w, parsed.h, n);
    if (grid) break;
  }
  if (!grid) return null;

  return buildTemplate({
    code,
    name: `Avery ${code} · ${item.size ?? `${round3(parsed.w)}" x ${round3(parsed.h)}"`}`,
    shape: parsed.shape,
    w: parsed.w,
    h: parsed.h,
    grid,
    inferred: true,
  });
}

/** @returns {object[]} */
function mapCatalogToTemplates(catalog) {
  const blankItems = catalog.blank?.contentlets ?? catalog.contentlets ?? [];
  const labelItems = catalog.labels?.contentlets ?? [];

  const blankByCode = new Map();
  for (const item of blankItems) {
    if (item.diyProductNumber) blankByCode.set(String(item.diyProductNumber), item);
    if (item.productNumber) blankByCode.set(String(item.productNumber), item);
  }

  const byCode = new Map();
  for (const item of blankItems) {
    const tpl = fromBlankItem(item);
    if (tpl) byCode.set(tpl.averyCode, tpl);
  }
  for (const item of labelItems) {
    const code = String(item.sku ?? '').trim();
    if (!code || byCode.has(code)) continue;
    const tpl = fromLabelSku(item, blankByCode);
    if (tpl) byCode.set(tpl.averyCode, tpl);
  }

  return [...byCode.values()];
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 300);
    throw new Error(`HTTP ${res.status} for ${url}\n${body}`);
  }
  return res.json();
}

async function fetchCatalogLive() {
  console.log('Fetching Avery REST catalog …');
  const [blank, labels] = await Promise.all([fetchJson(REST_BLANK), fetchJson(REST_LABELS)]);
  return { blank, labels, fetchedAt: new Date().toISOString() };
}

async function fetchCatalogViaBrowser() {
  const browserScript = resolve(__dirname, 'scrape-avery-browser.mjs');
  if (!existsSync(browserScript)) {
    throw new Error('Browser helper missing: scripts/scrape-avery-browser.mjs');
  }
  console.log('Launching Chrome via Puppeteer to fetch Avery REST …');
  const result = spawnSync(process.execPath, [browserScript], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout);
    throw new Error('Browser scrape failed');
  }
  if (!existsSync(RAW_OUT)) throw new Error(`Expected ${RAW_OUT} from browser scrape`);
  return JSON.parse(readFileSync(RAW_OUT, 'utf8'));
}

function loadFromFile(path) {
  if (!existsSync(path)) {
    console.error(`File not found: ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, 'utf8'));
}

function mergeIntoDataset(scraped) {
  const existing = existsSync(DATASET)
    ? JSON.parse(readFileSync(DATASET, 'utf8'))
    : { templates: [] };

  const byCode = new Map(existing.templates.map((t) => [t.averyCode ?? t.id, t]));
  let added = 0;
  for (const tpl of scraped) {
    const key = tpl.averyCode ?? tpl.id;
    if (!byCode.has(key)) {
      byCode.set(key, tpl);
      added++;
    }
  }

  const templates = [...byCode.values()];
  writeFileSync(
    DATASET,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: 'Curated templates + Avery REST catalog (inferred geometry for scraped codes). Regenerate curated set with npm run avery:generate.',
        count: templates.length,
        templates,
      },
      null,
      2,
    ) + '\n',
  );
  return { total: templates.length, added };
}

async function main() {
  const args = process.argv.slice(2);
  const fromFileArg = args.indexOf('--from-file');
  const fromFile = fromFileArg >= 0 ? args[fromFileArg + 1] : null;
  const useBrowser = args.includes('--browser');

  let catalog;
  if (fromFile) {
    const path = resolve(process.cwd(), fromFile);
    console.log(`Loading cached Avery catalog from ${path} …`);
    catalog = loadFromFile(path);
  } else if (useBrowser) {
    catalog = await fetchCatalogViaBrowser();
  } else {
    try {
      catalog = await fetchCatalogLive();
      writeFileSync(RAW_OUT, JSON.stringify(catalog, null, 2));
      console.log(`Saved raw catalog -> ${RAW_OUT}`);
    } catch (err) {
      console.warn(String(err.message || err));
      console.warn('Retrying with real Chrome (--browser) …');
      catalog = await fetchCatalogViaBrowser();
    }
  }

  const blankCount = catalog.blank?.contentlets?.length ?? catalog.contentlets?.length ?? 0;
  const labelCount = catalog.labels?.contentlets?.length ?? 0;
  console.log(`Catalog: ${blankCount} blank-label SKUs, ${labelCount} template codes.`);

  const scraped = mapCatalogToTemplates(catalog);
  console.log(`Mapped ${scraped.length} templates with usable geometry.`);

  const { total, added } = mergeIntoDataset(scraped);
  console.log(`Merged dataset: ${total} total (+${added} new) -> ${DATASET}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
