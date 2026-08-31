#!/usr/bin/env node
/**
 * Verify labels-per-sheet against Avery's current template pages.
 *
 * Avery's REST feed can map one classic template number to several custom
 * products with different sheet densities. The public template page is the
 * authority for the classic code. When a count differs, retain the exact label
 * size/shape and rebuild a centered, non-overlapping grid for that count.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATASET = resolve(__dirname, '../src/data/averyTemplates.json');
const RAW = resolve(__dirname, 'avery-raw.json');
const GUTTERS = [0, 0.0625, 0.125, 0.1875, 0.25, 0.3, 0.375, 0.5];
const round4 = (value) => Math.round(value * 10_000) / 10_000;

function extractLabelsPerSheet(html) {
  const normalized = html
    .replace(/\\u0026/g, '&')
    .replace(/\\u003c/g, '<')
    .replace(/\\u003e/g, '>');
  const counts = [
    ...normalized.matchAll(/(\d{1,3})\s*(?:labels?\s*)?per\s*sheet/gi),
  ]
    .map((match) => Number(match[1]))
    .filter((count) => Number.isInteger(count) && count > 0);
  return counts[0] ?? null;
}

function factorPairs(count) {
  const pairs = [];
  for (let columns = 1; columns <= count; columns++) {
    if (count % columns === 0) pairs.push([columns, count / columns]);
  }
  return pairs;
}

function inferGrid(template, count) {
  let best = null;
  let bestScore = -Infinity;
  for (const [columns, rows] of factorPairs(count)) {
    for (const gutterXIn of GUTTERS) {
      for (const gutterYIn of GUTTERS) {
        const usedWidth =
          columns * template.labelWidthIn + (columns - 1) * gutterXIn;
        const usedHeight =
          rows * template.labelHeightIn + (rows - 1) * gutterYIn;
        if (
          usedWidth > template.pageWidthIn + 0.001 ||
          usedHeight > template.pageHeightIn + 0.001
        ) {
          continue;
        }
        const marginLeftIn = (template.pageWidthIn - usedWidth) / 2;
        const marginTopIn = (template.pageHeightIn - usedHeight) / 2;
        const pageRatio = template.pageWidthIn / template.pageHeightIn;
        const blockRatio = usedWidth / usedHeight;
        const score =
          -Math.abs(Math.log(blockRatio / pageRatio)) +
          (gutterXIn + gutterYIn === 0 ? 0.02 : 0);
        if (score > bestScore) {
          bestScore = score;
          best = {
            columns,
            rows,
            marginLeftIn: round4(marginLeftIn),
            marginTopIn: round4(marginTopIn),
            gutterXIn,
            gutterYIn,
            perSheet: count,
          };
        }
      }
    }
  }
  return best;
}

async function fetchCount(code) {
  try {
    const response = await fetch(`https://www.avery.com/templates/${code}`, {
      headers: {
        Accept: 'text/html',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125 Safari/537.36',
      },
    });
    if (!response.ok) return { code, count: null };
    return { code, count: extractLabelsPerSheet(await response.text()) };
  } catch {
    return { code, count: null };
  }
}

async function mapLimit(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index]);
    }
  }
  await Promise.all(Array.from({ length: limit }, run));
  return results;
}

async function main() {
  const dataset = JSON.parse(readFileSync(DATASET, 'utf8'));
  const raw = JSON.parse(readFileSync(RAW, 'utf8'));
  const codes = [
    ...new Set(
      (raw.labels?.contentlets ?? [])
        .map((item) => String(item.sku ?? '').trim())
        .filter(Boolean),
    ),
  ];

  console.log(`Checking ${codes.length} Avery template pages…`);
  const pageCounts = await mapLimit(codes, 8, fetchCount);
  const byId = new Map(dataset.templates.map((template) => [template.id, template]));
  let confirmed = 0;
  let corrected = 0;
  let unavailable = 0;

  for (const { code, count } of pageCounts) {
    const template = byId.get(code);
    if (!template || !count) {
      unavailable++;
      continue;
    }
    if (template.perSheet === count) {
      confirmed++;
      continue;
    }

    const compatible = dataset.templates.find(
      (candidate) =>
        candidate.id !== code &&
        String(candidate.averyCode) === code &&
        candidate.perSheet === count,
    );
    const grid = compatible
      ? {
          columns: compatible.columns,
          rows: compatible.rows,
          marginLeftIn: compatible.marginLeftIn,
          marginTopIn: compatible.marginTopIn,
          gutterXIn: compatible.gutterXIn,
          gutterYIn: compatible.gutterYIn,
          perSheet: compatible.perSheet,
        }
      : inferGrid(template, count);
    if (!grid) {
      unavailable++;
      continue;
    }
    byId.set(code, {
      ...template,
      ...grid,
      geometrySource: compatible
        ? 'curated-compatible'
        : 'avery-page-count-inferred',
    });
    corrected++;
  }

  const templates = [...byId.values()];
  writeFileSync(
    DATASET,
    `${JSON.stringify(
      {
        ...dataset,
        generatedAt: new Date().toISOString(),
        note:
          'Avery live pages + REST catalog + official DOCX geometry + MIT-licensed gLabels geometry. See THIRD_PARTY_LICENSES.md.',
        count: templates.length,
        templates,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `Avery page verification: ${confirmed} confirmed, ${corrected} corrected, ${unavailable} unavailable/unmapped.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
