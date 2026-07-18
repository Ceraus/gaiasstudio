import { BrowserWindow } from "electron";
import fs from "node:fs";
import path from "node:path";
import type { AveryTemplate } from "../shared/contract";

const AVERY_HOST = "https://www.avery.nl";
const AVERY_API = `${AVERY_HOST}/api/search/v1/blank_label/listing?from=0&size=9999`;

function shapeFromCategory(raw: string | undefined): AveryTemplate["shape"] {
  const s = (raw || "").toLowerCase();
  if (s.includes("round") || s.includes("circle")) return "circle";
  if (s.includes("oval")) return "oval";
  if (s.includes("square")) return "square";
  if (s.includes("rectangle") || s.includes("address") || s.includes("shipping")) return "rectangle";
  return "other";
}

/**
 * Best-effort live refresh of the Avery catalog.
 *
 * Avery's storefront sits behind Cloudflare bot-management, so a raw HTTP
 * request from Node (curl, fetch, axios, etc.) is almost always challenged
 * with a 403 "Just a moment..." interstitial. To have a realistic chance of
 * getting past that, we load the real avery.nl site in a hidden, fully
 * scriptable Chromium BrowserWindow first (letting any Cloudflare JS
 * challenge and cookies resolve exactly as they would for a human visitor),
 * then issue the API request from *inside* that page's own JS context via
 * `webContents.executeJavaScript`, using the same-origin fetch + cookies.
 *
 * If Cloudflare still blocks the request (e.g. an interactive Turnstile
 * challenge that requires a human click), this throws and the caller should
 * keep using the bundled `resources/avery_templates_offline.json` fallback.
 * This is expected to fail in headless/CI environments without network
 * egress to avery.nl; it is designed to be run from the packaged desktop app
 * on a normal end-user machine with normal internet access.
 */
export async function scrapeAveryTemplates(): Promise<AveryTemplate[]> {
  const win = new BrowserWindow({
    show: false,
    webPreferences: { sandbox: true, nodeIntegration: false, contextIsolation: true },
  });

  try {
    await win.loadURL(`${AVERY_HOST}/templates`, {
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36",
    });

    // Give any Cloudflare challenge script a moment to resolve and set cookies.
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const rawJson: string = await win.webContents.executeJavaScript(`
      fetch(${JSON.stringify(AVERY_API)}, { headers: { Accept: "application/json" } })
        .then((r) => { if (!r.ok) throw new Error("HTTP " + r.status); return r.text(); })
    `);

    const parsed = JSON.parse(rawJson);
    const hits = parsed?.hits?.hits ?? parsed?.results ?? parsed?.items ?? [];

    const templates: AveryTemplate[] = hits
      .map((hit: any): AveryTemplate | null => {
        const sku = String(hit.sku ?? hit.templateCode ?? hit.id ?? "").trim();
        const widthIn = Number(hit.width_in ?? hit.widthInches ?? hit.width);
        const heightIn = Number(hit.height_in ?? hit.heightInches ?? hit.height);
        if (!sku || !widthIn || !heightIn) return null;
        return {
          sku,
          brand: "Avery",
          name: hit.name ?? hit.title ?? `Avery ${sku}`,
          shape: shapeFromCategory(hit.shape ?? hit.category ?? hit.name),
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
        };
      })
      .filter((t: AveryTemplate | null): t is AveryTemplate => t !== null);

    return templates;
  } finally {
    win.destroy();
  }
}

export function mergeAndPersist(offlineFilePath: string, fresh: AveryTemplate[]): { count: number } {
  const existing = JSON.parse(fs.readFileSync(offlineFilePath, "utf-8"));
  const bySku = new Map<string, AveryTemplate>(existing.templates.map((t: AveryTemplate) => [t.sku, t]));
  for (const t of fresh) bySku.set(t.sku, t);
  const merged = {
    generatedAt: new Date().toISOString(),
    source: "live-scrape-merged",
    count: bySku.size,
    templates: Array.from(bySku.values()),
  };
  fs.mkdirSync(path.dirname(offlineFilePath), { recursive: true });
  fs.writeFileSync(offlineFilePath, JSON.stringify(merged, null, 2));
  return { count: bySku.size };
}
