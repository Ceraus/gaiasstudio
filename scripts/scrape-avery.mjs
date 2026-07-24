#!/usr/bin/env node
/**
 * Live Avery template scraper.
 *
 * NOTE: Avery's API sits behind Cloudflare, which blocks datacenter / CI IPs
 * (you'll get an HTTP 403 "Just a moment..." challenge). Run this on a normal
 * residential/desktop connection (or inside the Electron shell) where the
 * request succeeds. The bundled src/data/averyTemplates.json already contains a
 * comprehensive, print-verified set, so the app works fully without scraping —
 * this script just lets you pull Avery's complete blank-label catalog and merge
 * any extra shapes/sizes.
 *
 * Usage:  node scripts/scrape-avery.mjs
 * Output: writes scripts/avery-raw.json (raw response) and merges recognizable
 *         templates into src/data/averyTemplates.json (deduped by Avery code).
 */
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const RAW_OUT = resolve(__dirname, 'avery-raw.json');
const DATASET = resolve(__dirname, '../src/data/averyTemplates.json');

const ENDPOINT = 'https://www.avery.com/api/search/v1/blank_label/listing';
const PAGE_SIZE = 9999;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
  Accept: 'application/json, text/plain, */*',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://www.avery.com/templates',
};

const round3 = (n) => Math.round(n * 1000) / 1000;

function classifyShape(raw) {
  const s = String(raw ?? '').toLowerCase();
  if (s.includes('round') || s.includes('circle')) return 'circle';
  if (s.includes('oval')) return 'oval';
  if (s.includes('square')) return 'square';
  return 'rectangle';
}

/**
 * Best-effort mapping from an Avery listing item to our geometry model. Field
 * names vary across Avery's API versions, so we probe several common keys. If
 * the geometry can't be resolved the item is skipped (raw is still saved).
 */
function toTemplate(item) {
  const code = item.sku ?? item.productId ?? item.code ?? item.id;
  const across = Number(item.labelsAcross ?? item.across ?? item.columns);
  const down = Number(item.labelsDown ?? item.down ?? item.rows);
  const w = Number(item.labelWidth ?? item.width ?? item.dieCutWidth);
  const h = Number(item.labelHeight ?? item.height ?? item.dieCutHeight);
  const pageW = Number(item.sheetWidth ?? item.pageWidth ?? 8.5);
  const pageH = Number(item.sheetHeight ?? item.pageHeight ?? 11);
  if (!code || !across || !down || !w || !h) return null;

  const marginLeft = Number(item.marginLeft ?? item.leftMargin ?? (pageW - across * w) / 2);
  const marginTop = Number(item.marginTop ?? item.topMargin ?? (pageH - down * h) / 2);
  const gutterX = Number(
    item.horizontalPitch ? item.horizontalPitch - w : (item.horizontalGutter ?? 0),
  );
  const gutterY = Number(
    item.verticalPitch ? item.verticalPitch - h : (item.verticalGutter ?? 0),
  );
  const shape = classifyShape(item.shape ?? item.labelShape ?? item.category);

  return {
    id: String(code),
    name: `Avery ${code} · ${round3(w)}" x ${round3(h)}"`,
    brand: 'Avery',
    averyCode: String(code),
    shape,
    labelWidthIn: round3(w),
    labelHeightIn: round3(h),
    pageWidthIn: round3(pageW),
    pageHeightIn: round3(pageH),
    columns: across,
    rows: down,
    marginTopIn: round3(Math.max(0, marginTop)),
    marginLeftIn: round3(Math.max(0, marginLeft)),
    gutterXIn: round3(Math.max(0, gutterX)),
    gutterYIn: round3(Math.max(0, gutterY)),
    cornerRadiusIn: shape === 'rounded-rectangle' ? 0.25 : 0,
    perSheet: across * down,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
  };
}

async function main() {
  const url = `${ENDPOINT}?from=0&size=${PAGE_SIZE}`;
  console.log(`Fetching ${url} …`);
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) {
    console.error(`Request failed: HTTP ${res.status}. Avery is likely Cloudflare-gating this IP.`);
    console.error('Run this from a normal desktop/residential network, then re-run.');
    process.exit(1);
  }
  const data = await res.json();
  writeFileSync(RAW_OUT, JSON.stringify(data, null, 2));
  console.log(`Saved raw response -> ${RAW_OUT}`);

  const items = data.results ?? data.hits ?? data.items ?? data.data ?? [];
  const scraped = items.map(toTemplate).filter(Boolean);
  console.log(`Mapped ${scraped.length} of ${items.length} listing items.`);

  const existing = existsSync(DATASET)
    ? JSON.parse(readFileSync(DATASET, 'utf8'))
    : { templates: [] };
  const byCode = new Map(existing.templates.map((t) => [t.averyCode ?? t.id, t]));
  for (const tpl of scraped) byCode.set(tpl.averyCode, tpl);

  const templates = [...byCode.values()];
  writeFileSync(
    DATASET,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: 'Merged from live Avery scrape + curated set.',
        count: templates.length,
        templates,
      },
      null,
      2,
    ) + '\n',
  );
  console.log(`Merged dataset now has ${templates.length} templates -> ${DATASET}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
