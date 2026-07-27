#!/usr/bin/env node
/**
 * Avery Word-template geometry scraper (denilsonsa gist approach, US site).
 *
 * For each Avery template code:
 *   1. Fetch avery.com/templates/{code}
 *   2. Extract signed S3 .doc URL embedded in the page
 *   3. Download + parse table geometry via scripts/avery-docx-parse.py (Word COM)
 *   4. Merge verified geometry into src/data/averyTemplates.json
 *
 * Usage:
 *   npm run avery:scrape:docx
 *   node scripts/scrape-avery-docx.mjs --limit 20
 *   node scripts/scrape-avery-docx.mjs --codes 5160,8293,22807
 *
 * Requires: Python 3, pywin32, python-docx, Microsoft Word (Windows).
 */
import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  statSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = resolve(__dirname, 'avery-docs');
const DATASET = resolve(__dirname, '../src/data/averyTemplates.json');
const PY = resolve(__dirname, 'avery-docx-parse.py');
const RAW = resolve(__dirname, 'avery-raw.json');

const PAGE_W = 8.5;
const PAGE_H = 11;

const round3 = (n) => Math.round(n * 1000) / 1000;

if (process.env.NODE_TLS_REJECT_UNAUTHORIZED == null && process.platform === 'win32') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function extractS3Urls(html) {
  const normalized = html.replace(/\\u0026/g, '&');
  const urls = [];
  const re =
    /https:\/\/s3\.amazonaws\.com\/avery\.dpp\.projects\.s3uspdownloadables\/US_en\/Downloadables\/(?:docx|doc)\/[^"\s]+/g;
  for (const m of normalized.matchAll(re)) urls.push(m[0].replace(/\\+$/, ''));
  return [...new Set(urls)];
}

async function fetchTemplatePage(code) {
  const res = await fetch(`https://www.avery.com/templates/${code}`, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
    },
  });
  if (!res.ok) return null;
  return res.text();
}

async function downloadDoc(code, html) {
  const urls = extractS3Urls(html);
  const pick = urls.find((u) => u.includes('/docx/')) || urls.find((u) => u.includes('/doc/'));
  if (!pick) return null;

  mkdirSync(CACHE_DIR, { recursive: true });
  const ext = pick.includes('/docx/') ? 'docx' : 'doc';
  const out = resolve(CACHE_DIR, `${code}.${ext}`);

  if (existsSync(out) && statSync(out).size > 1000) return out;

  const res = await fetch(pick);
  if (!res.ok) return null;
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 1000 || buf[0] === 0x3c) return null;
  writeFileSync(out, buf);
  return out;
}

function parseDocGeometry(docPath) {
  const result = spawnSync('python', [PY, docPath], {
    encoding: 'utf8',
    timeout: 120000,
  });
  if (result.status !== 0) {
    console.warn(`  parse failed: ${(result.stderr || result.stdout || '').trim()}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout.trim());
  } catch {
    return null;
  }
}

function classifyShape(w, h) {
  if (Math.abs(w - h) < 0.08) return 'circle';
  if (Math.abs(w - h) < 0.02) return 'square';
  return 'rectangle';
}

function buildTemplate(code, geom) {
  const shape = classifyShape(geom.labelWidthIn, geom.labelHeightIn);
  return {
    id: String(code),
    name: `Avery ${code} · ${geom.labelWidthIn}" x ${geom.labelHeightIn}"`,
    brand: 'Avery',
    averyCode: String(code),
    shape,
    labelWidthIn: round3(geom.labelWidthIn),
    labelHeightIn: round3(geom.labelHeightIn),
    pageWidthIn: PAGE_W,
    pageHeightIn: PAGE_H,
    columns: geom.columns,
    rows: geom.rows,
    marginTopIn: round3(geom.marginTopIn),
    marginLeftIn: round3(geom.marginLeftIn),
    gutterXIn: round3(geom.gutterXIn),
    gutterYIn: round3(geom.gutterYIn),
    cornerRadiusIn: 0,
    perSheet: geom.columns * geom.rows,
    rotateForPrint: false,
    contexts: ['front', 'back', 'side'],
    geometrySource: 'avery-docx-verified',
  };
}

function loadSkuList(args) {
  const codesArg = args.find((a) => a.startsWith('--codes='));
  if (codesArg) return codesArg.slice(8).split(',').map((s) => s.trim()).filter(Boolean);

  if (!existsSync(RAW)) {
    console.error('Missing scripts/avery-raw.json — run npm run avery:scrape first.');
    process.exit(1);
  }
  const raw = JSON.parse(readFileSync(RAW, 'utf8'));
  const skus = (raw.labels?.contentlets ?? [])
    .map((x) => String(x.sku ?? '').trim())
    .filter((s) => s && s !== 'null' && s !== 'undefined');
  return [...new Set(skus)].sort();
}

async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find((a) => a.startsWith('--limit'));
  const limit = limitArg ? Number(limitArg.split('=')[1] ?? args[args.indexOf(limitArg) + 1]) : Infinity;

  let codes = loadSkuList(args);
  if (Number.isFinite(limit)) codes = codes.slice(0, limit);

  console.log(`Parsing Word templates for ${codes.length} Avery codes…`);
  mkdirSync(CACHE_DIR, { recursive: true });

  const verified = [];
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    process.stdout.write(`[${i + 1}/${codes.length}] ${code} … `);
    try {
      const html = await fetchTemplatePage(code);
      if (!html) {
        console.log('no page');
        fail++;
        await sleep(150);
        continue;
      }
      const docPath = await downloadDoc(code, html);
      if (!docPath) {
        console.log('no doc');
        fail++;
        await sleep(150);
        continue;
      }
      const geom = parseDocGeometry(docPath);
      if (!geom) {
        console.log('parse error');
        fail++;
        await sleep(200);
        continue;
      }
      verified.push(buildTemplate(code, geom));
      console.log(`OK ${geom.columns}x${geom.rows} ${geom.labelWidthIn}x${geom.labelHeightIn}"`);
      ok++;
    } catch (e) {
      console.log(`err ${e.message}`);
      fail++;
    }
    await sleep(250);
  }

  const existing = existsSync(DATASET)
    ? JSON.parse(readFileSync(DATASET, 'utf8'))
    : { templates: [] };
  const byCode = new Map(existing.templates.map((t) => [t.averyCode ?? t.id, t]));
  for (const tpl of verified) byCode.set(tpl.averyCode, tpl);

  const templates = [...byCode.values()];
  writeFileSync(
    DATASET,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        note: 'Merged curated + REST catalog + Word-template verified geometry (avery-docx-verified).',
        count: templates.length,
        templates,
      },
      null,
      2,
    ) + '\n',
  );

  writeFileSync(
    resolve(__dirname, 'avery-docx-log.json'),
    JSON.stringify({ ok, fail, verified: verified.length, at: new Date().toISOString() }, null, 2) + '\n',
  );

  console.log(`\nDone: ${ok} verified, ${fail} skipped/failed. Dataset -> ${DATASET} (${templates.length} total)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
