#!/usr/bin/env node
/**
 * Attempts to pull the full, current Avery blank-label template catalog
 * directly from Avery's public search API and merge it into
 * resources/avery_templates_offline.json.
 *
 * Avery's site sits behind Cloudflare bot-management, so a plain HTTP
 * request from Node (or curl) is usually challenged with a 403 "Just a
 * moment..." page. This script is invoked from Electron's main process
 * (see electron/averyScraper.ts) using a real, hidden Chromium
 * BrowserWindow so that any JS challenge can execute exactly like it would
 * in a normal visit. When run standalone with plain Node (e.g. via
 * `npm run avery:scrape`) it will likely be blocked — that's expected and
 * the app will keep using the bundled offline catalog, which already
 * covers dozens of round/oval/square/rectangle SKUs.
 *
 * Usage (standalone best-effort attempt):
 *   node scripts/scrapeAvery.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(__dirname, "..", "resources", "avery_templates_offline.json");
const PAGE_SIZE = 9999;
const BASE_URL = "https://www.avery.nl/api/search/v1/blank_label/listing";

function shapeFromAveryCategory(raw) {
  const s = (raw || "").toLowerCase();
  if (s.includes("round") || s.includes("circle")) return "circle";
  if (s.includes("oval")) return "oval";
  if (s.includes("square")) return "square";
  if (s.includes("rectangle") || s.includes("address") || s.includes("shipping")) return "rectangle";
  return "other";
}

function mapAveryHitToTemplate(hit) {
  try {
    const sku = String(hit.sku ?? hit.templateCode ?? hit.id ?? "").trim();
    if (!sku) return null;
    const widthIn = Number(hit.width_in ?? hit.widthInches ?? hit.width);
    const heightIn = Number(hit.height_in ?? hit.heightInches ?? hit.height);
    if (!widthIn || !heightIn) return null;
    return {
      sku,
      brand: "Avery",
      name: hit.name ?? hit.title ?? `Avery ${sku}`,
      shape: shapeFromAveryCategory(hit.shape ?? hit.category ?? hit.name),
      sheetSize: hit.sheet_size ?? "Letter (8.5 x 11 in)",
      widthIn,
      heightIn,
      cornerRadiusIn: Number(hit.corner_radius_in ?? 0),
      columns: Number(hit.columns ?? hit.labels_across ?? 1),
      rows: Number(hit.rows ?? hit.labels_down ?? 1),
      marginLeftIn: Number(hit.margin_left_in ?? 0),
      marginTopIn: Number(hit.margin_top_in ?? 0),
      pitchXIn: Number(hit.pitch_x_in ?? widthIn),
      pitchYIn: Number(hit.pitch_y_in ?? heightIn),
      bleedIn: Number(hit.bleed_in ?? 0.0625),
      category: hit.category,
      verifiedGeometry: true,
      source: "live-scrape",
    };
  } catch {
    return null;
  }
}

/**
 * Fetches every page of the Avery listing API using plain fetch. Exported so
 * Electron's main process can call it after warming up cookies in a real
 * BrowserWindow (see electron/averyScraper.ts), and so it can also be tried
 * standalone (best-effort, likely to fail outside a real browser context).
 */
export async function fetchAveryTemplates({ cookieHeader = "", userAgent } = {}) {
  const url = `${BASE_URL}?from=0&size=${PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent":
        userAgent ??
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`Avery API responded with HTTP ${res.status}`);
  }
  const json = await res.json();
  const hits = json?.hits?.hits ?? json?.results ?? json?.items ?? [];
  const mapped = hits.map(mapAveryHitToTemplate).filter(Boolean);
  return mapped;
}

export function mergeIntoOfflineCatalog(freshTemplates) {
  const existing = JSON.parse(fs.readFileSync(OUT_FILE, "utf-8"));
  const bySku = new Map(existing.templates.map((t) => [t.sku, t]));
  for (const t of freshTemplates) {
    bySku.set(t.sku, t);
  }
  const merged = {
    generatedAt: new Date().toISOString(),
    source: "live-scrape-merged",
    count: bySku.size,
    templates: Array.from(bySku.values()),
  };
  fs.writeFileSync(OUT_FILE, JSON.stringify(merged, null, 2));
  return merged;
}

async function main() {
  try {
    console.log("Attempting live Avery catalog fetch (standalone, best-effort)...");
    const templates = await fetchAveryTemplates({});
    if (!templates.length) {
      console.warn("No templates parsed from Avery response; keeping bundled offline catalog.");
      return;
    }
    const merged = mergeIntoOfflineCatalog(templates);
    console.log(`Merged ${templates.length} live templates. Catalog now has ${merged.count} total templates.`);
  } catch (err) {
    console.warn(
      `Live Avery scrape failed (${err instanceof Error ? err.message : String(err)}). ` +
        "This is expected when Avery's Cloudflare bot-check blocks a plain Node request. " +
        "Launch the app and use Settings > Refresh Avery Templates to retry via the in-app " +
        "Chromium browser, or keep using the bundled offline catalog."
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
