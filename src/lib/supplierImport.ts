// ---------------------------------------------------------------------------
// Supplier URL importer — "Paste supplier link to auto-fill pricing."
//
// Pipeline (all local-first, AI only as a fallback):
//   1. Fetch the product page.
//        • Electron: main-process fetch via the gaia:fetch-url IPC (no CORS).
//        • Browser:  direct fetch — many shops block this with CORS, in which
//          case we throw a friendly error and the manual fields remain.
//   2. Lightweight local scrape (no network): JSON-LD Product schema,
//      OpenGraph/meta price tags, then price/size regexes over page text.
//   3. If the local scrape is incomplete AND a Google AI Studio key is stored
//      in Settings, ask Gemini to extract { price, size, unit } from the page
//      text (strict JSON response schema).
//
// The caller shows the detected values for confirmation before anything is
// written to the database — the importer never silently overwrites pricing.
// ---------------------------------------------------------------------------

export interface SupplierParseResult {
  /** Total price of the container in USD. */
  price?: number;
  /** Container size (paired with `unit`). */
  size?: number;
  unit?: 'oz' | 'lbs' | 'ml' | 'g';
  /** Product title, when detected — helps the user confirm the right page. */
  productName?: string;
  /** Which stage produced the result. */
  source: 'structured' | 'heuristic' | 'ai';
}

/** Preload-bridge surface used by this module (present only inside Electron). */
interface ElectronFetchApi {
  fetchUrl?: (url: string) => Promise<{ ok: boolean; status: number; text: string }>;
}

function electronApi(): ElectronFetchApi | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronAPI?: ElectronFetchApi }).electronAPI ?? null;
}

// ---------------------------------------------------------------------------
// 1. Fetch
// ---------------------------------------------------------------------------

export async function fetchSupplierPage(url: string): Promise<string> {
  const parsed = new URL(url); // throws on garbage input
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http(s) links are supported.');
  }

  const api = electronApi();
  if (api?.fetchUrl) {
    const res = await api.fetchUrl(url);
    if (!res.ok) throw new Error(`The supplier page answered with HTTP ${res.status}.`);
    return res.text;
  }

  // Browser fallback — subject to the shop's CORS policy.
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (!res.ok) throw new Error(`The supplier page answered with HTTP ${res.status}.`);
    return await res.text();
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error(
        'This shop blocks browser access (CORS). Use the desktop app, or type the price and size manually below.',
      );
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// 2. Local scrape
// ---------------------------------------------------------------------------

const UNIT_PATTERN =
  '(fl\\.?\\s*oz|ounces?|oz|pounds?|lbs?|lb|milliliters?|millilitres?|ml|liters?|litres?|l|kilograms?|kg|grams?|gr|g)';

/** Normalizes a raw unit word to the app's units, converting kg/l to g/ml. */
function normalizeUnit(rawUnit: string, rawSize: number): { size: number; unit: 'oz' | 'lbs' | 'ml' | 'g' } | null {
  const u = rawUnit.toLowerCase().replace(/[.\s]/g, '');
  if (u === 'floz' || u === 'oz' || u.startsWith('ounce')) return { size: rawSize, unit: 'oz' };
  if (u === 'lb' || u === 'lbs' || u.startsWith('pound')) return { size: rawSize, unit: 'lbs' };
  if (u === 'ml' || u.startsWith('milli')) return { size: rawSize, unit: 'ml' };
  if (u === 'l' || u.startsWith('liter') || u.startsWith('litre')) return { size: rawSize * 1000, unit: 'ml' };
  if (u === 'kg' || u.startsWith('kilo')) return { size: rawSize * 1000, unit: 'g' };
  if (u === 'g' || u === 'gr' || u.startsWith('gram')) return { size: rawSize, unit: 'g' };
  return null;
}

/** First plausible "<number> <unit>" in a string (e.g. "Lavender EO — 10 ml"). */
function findSize(text: string): { size: number; unit: 'oz' | 'lbs' | 'ml' | 'g' } | null {
  const re = new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${UNIT_PATTERN}\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const size = parseFloat(m[1].replace(',', '.'));
    if (!size || size <= 0 || size > 100000) continue;
    const normalized = normalizeUnit(m[2], size);
    if (normalized) return normalized;
  }
  return null;
}

/** Reads price values out of parsed JSON-LD (Product / Offer graphs). */
function priceFromJsonLd(node: unknown): { price?: number; name?: string } {
  const out: { price?: number; name?: string } = {};
  const visit = (n: unknown) => {
    if (out.price !== undefined || !n) return;
    if (Array.isArray(n)) {
      n.forEach(visit);
      return;
    }
    if (typeof n !== 'object') return;
    const obj = n as Record<string, unknown>;
    const type = String(obj['@type'] ?? '');
    if (/product/i.test(type) && typeof obj.name === 'string' && !out.name) out.name = obj.name;
    const rawPrice = obj.price ?? obj.lowPrice ?? obj.highPrice;
    if (rawPrice !== undefined) {
      const p = parseFloat(String(rawPrice).replace(/[^0-9.]/g, ''));
      if (p > 0) out.price = p;
    }
    // Recurse into offers / @graph / itemListElement …
    for (const v of Object.values(obj)) {
      if (typeof v === 'object' && v !== null) visit(v);
    }
  };
  visit(node);
  return out;
}

/**
 * Extracts { price, size, unit, productName } from raw product-page HTML using
 * DOM parsing + heuristics only (no network, no AI).
 */
export function parseSupplierHtml(html: string): SupplierParseResult {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const result: SupplierParseResult = { source: 'structured' };

  // -- Product title (used both for display and as the best size source) -----
  const title =
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ??
    doc.querySelector('h1')?.textContent ??
    doc.title;
  if (title?.trim()) result.productName = title.trim().slice(0, 120);

  // -- Structured data: JSON-LD Product schema --------------------------------
  for (const script of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      const found = priceFromJsonLd(JSON.parse(script.textContent ?? 'null'));
      if (found.price !== undefined && result.price === undefined) result.price = found.price;
      if (found.name && !result.productName) result.productName = found.name.slice(0, 120);
    } catch {
      /* malformed JSON-LD — ignore */
    }
  }

  // -- Meta price tags (OpenGraph / schema.org microdata) ---------------------
  if (result.price === undefined) {
    const metaPrice =
      doc.querySelector('meta[property="og:price:amount"]')?.getAttribute('content') ??
      doc.querySelector('meta[property="product:price:amount"]')?.getAttribute('content') ??
      doc.querySelector('[itemprop="price"]')?.getAttribute('content') ??
      doc.querySelector('[itemprop="price"]')?.textContent;
    const p = metaPrice ? parseFloat(metaPrice.replace(/[^0-9.]/g, '')) : NaN;
    if (p > 0) result.price = p;
  }

  // -- Regex fallbacks over visible text --------------------------------------
  const bodyText = (doc.body?.textContent ?? '').replace(/\s+/g, ' ').slice(0, 60000);
  if (result.price === undefined) {
    // First plausible dollar amount ($0.50 … $500) — supplier bottles/jars land here.
    const m = /\$\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)/.exec(bodyText);
    if (m) {
      const p = parseFloat(m[1].replace(/,/g, ''));
      if (p >= 0.5 && p <= 500) {
        result.price = p;
        result.source = 'heuristic';
      }
    }
  }

  // Size: the product title is by far the most reliable spot ("Shea Butter 16 oz"),
  // then fall back to scanning the page text.
  const sized = (result.productName && findSize(result.productName)) || findSize(bodyText);
  if (sized) {
    result.size = sized.size;
    result.unit = sized.unit;
  }

  return result;
}

// ---------------------------------------------------------------------------
// 3. Gemini fallback (uses the Google AI Studio key stored in Settings)
// ---------------------------------------------------------------------------

/** Tried in order so the importer keeps working across Gemini API generations. */
const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

interface GeminiExtraction {
  price?: number;
  size?: number;
  unit?: string;
  productName?: string;
}

export async function extractWithGemini(
  apiKey: string,
  url: string,
  pageText: string,
): Promise<SupplierParseResult | null> {
  const prompt =
    `You are a shopping assistant. From this supplier product page text, extract:\n` +
    `- price: the TOTAL price in USD of one container (number only)\n` +
    `- size: the container size (number only)\n` +
    `- unit: the size unit, one of exactly: "oz", "lbs", "ml", "g" (convert kg to g, liters to ml, fl oz to oz)\n` +
    `- productName: the short product title\n` +
    `Use null for anything not present. Page URL: ${url}\n\nPAGE TEXT:\n${pageText.slice(0, 14000)}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          price: { type: 'NUMBER', nullable: true },
          size: { type: 'NUMBER', nullable: true },
          unit: { type: 'STRING', nullable: true },
          productName: { type: 'STRING', nullable: true },
        },
      },
    },
  };

  for (const model of GEMINI_MODELS) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) continue; // try the next model (404 = model retired, 429 = quota)
      const data = (await res.json()) as {
        candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      };
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) continue;
      const parsed = JSON.parse(text) as GeminiExtraction;

      const out: SupplierParseResult = { source: 'ai' };
      if (typeof parsed.price === 'number' && parsed.price > 0) out.price = parsed.price;
      if (typeof parsed.size === 'number' && parsed.size > 0 && parsed.unit) {
        const normalized = normalizeUnit(parsed.unit, parsed.size);
        if (normalized) {
          out.size = normalized.size;
          out.unit = normalized.unit;
        }
      }
      if (typeof parsed.productName === 'string' && parsed.productName.trim()) {
        out.productName = parsed.productName.trim().slice(0, 120);
      }
      if (out.price !== undefined || out.size !== undefined) return out;
    } catch {
      /* network / parse failure — try the next model */
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// 4. Orchestrator
// ---------------------------------------------------------------------------

/**
 * Fetches a supplier product page and extracts { price, size, unit }.
 * Local structured/heuristic scraping runs first; Gemini fills the gaps when
 * an API key is provided. Throws with a user-readable message when nothing
 * could be detected (the manual fields are the fallback).
 */
export async function importFromSupplierUrl(
  url: string,
  googleAiApiKey?: string,
): Promise<SupplierParseResult> {
  const html = await fetchSupplierPage(url);
  const local = parseSupplierHtml(html);

  if (local.price !== undefined && local.size !== undefined) return local;

  if (googleAiApiKey?.trim()) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    // Drop script/style noise so the model sees mostly product copy.
    doc.querySelectorAll('script,style,noscript,svg').forEach((el) => el.remove());
    const pageText = (doc.body?.textContent ?? '').replace(/\s+/g, ' ');
    const ai = await extractWithGemini(googleAiApiKey.trim(), url, pageText);
    if (ai) {
      // Merge: keep whatever the local scrape already found, let AI fill gaps.
      return {
        source: ai.source,
        price: local.price ?? ai.price,
        size: local.size ?? ai.size,
        unit: local.unit ?? ai.unit,
        productName: local.productName ?? ai.productName,
      };
    }
  }

  if (local.price !== undefined || local.size !== undefined) return local;
  throw new Error(
    'No price or container size found on that page. Type them manually below — it only takes a second.',
  );
}
