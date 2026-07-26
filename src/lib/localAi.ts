// ---------------------------------------------------------------------------
// Local AI client — bundled offline model only, never cloud:
//
//   A model shipped inside the desktop app (Qwen3-4B-Instruct, Apache-2.0),
//   run in-process by the Electron main process via node-llama-cpp
//   (see electron/bundledAi.cjs). Zero setup — works via window.electronAPI.
//
// Scope (deliberately narrow):
//   - Copywriting assist for the recipe "benefit statement" — a creative
//     marketing tagline the user can accept/edit/reject. Never authoritative.
//   - Supplier product-page extraction for the price importer — pulls
//     { productName, price, size, unit } out of messy page text with a
//     grammar-enforced JSON response. The user always confirms before saving.
//
// Every exported function fails softly and returns a typed result — nothing
// throws past this module, and nothing here ever blocks the UI.
// ---------------------------------------------------------------------------

export type LocalAiState = 'connected' | 'unreachable' | 'loading';

export interface LocalAiStatus {
  state: LocalAiState;
  message?: string;
}

/** Shape of the bundled-AI IPC bridge exposed by electron/preload.cjs. */
interface BundledAiApi {
  bundledAiStatus(): Promise<{ state: LocalAiState; message?: string }>;
  bundledAiGenerate(prompt: string): Promise<{ ok: boolean; text?: string; error?: string }>;
  bundledAiExtract?(pageText: string): Promise<{
    ok: boolean;
    result?: { productName: string; price: number; size: number; unit: string };
    error?: string;
  }>;
}

function getBundledAiApi(): BundledAiApi | null {
  const api = (globalThis as unknown as { electronAPI?: Partial<BundledAiApi> }).electronAPI;
  if (api && typeof api.bundledAiStatus === 'function' && typeof api.bundledAiGenerate === 'function') {
    return api as BundledAiApi;
  }
  return null;
}

/** Checks whether the bundled in-app model is ready. Never throws. */
export async function checkBundledAiStatus(): Promise<LocalAiStatus> {
  const api = getBundledAiApi();
  if (!api) {
    return {
      state: 'unreachable',
      message: 'Built-in AI is only available in the desktop app.',
    };
  }
  try {
    const result = await api.bundledAiStatus();
    return { state: result.state, message: result.message };
  } catch {
    return { state: 'unreachable', message: 'Could not reach the built-in model.' };
  }
}

export interface LocalAiSettingsSlice {
  localAiEnabled?: boolean;
}

/** Checks bundled local AI (respects Settings toggle). Never throws. */
export async function checkLocalAiStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  if (!settings.localAiEnabled) {
    return { state: 'unreachable', message: 'Local AI is turned off in Settings.' };
  }
  return checkBundledAiStatus();
}

export interface SuggestBenefitInput {
  recipeName: string;
  ingredients: Array<{ name: string; category?: string; benefit?: string }>;
}

export interface SuggestBenefitResult {
  ok: boolean;
  suggestion?: string;
  error?: string;
}

const MAX_SUGGESTION_LENGTH = 140;

function buildBenefitPrompt(input: SuggestBenefitInput): string {
  const ingredientLines = input.ingredients
    .slice(0, 12)
    .map((i) => {
      const bits = [i.name];
      if (i.category) bits.push(`(${i.category})`);
      if (i.benefit) bits.push(`— known for: ${i.benefit}`);
      return `- ${bits.join(' ')}`;
    })
    .join('\n');

  return [
    'You are a copywriter helping a small handmade-soap maker draft a short marketing tagline for a product label.',
    `Product name: ${input.recipeName || '(untitled recipe)'}`,
    'Selected ingredients:',
    ingredientLines || '(none selected)',
    '',
    'Write exactly ONE short, warm, inviting benefit statement (a tagline) for this product, under 120 characters.',
    'Rules:',
    '- Marketing language only — no medical, health, or therapeutic claims.',
    '- Do not mention prices, costs, or ingredient percentages.',
    '- Do not include INCI/scientific ingredient names.',
    '- Do not include warnings, directions, or "for external use" style text.',
    '- Output ONLY the tagline text itself — no quotes, no labels, no explanation.',
  ].join('\n');
}

function sanitizeSuggestion(raw: string): string {
  let text = raw.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^(tagline|benefit statement|benefit)\s*:\s*/i, '');
  if (text.length > MAX_SUGGESTION_LENGTH) {
    text = `${text.slice(0, MAX_SUGGESTION_LENGTH - 1).trimEnd()}…`;
  }
  return text;
}

/** Asks the bundled local model for a benefit-statement suggestion. Never throws. */
export async function suggestBenefitStatement(
  input: SuggestBenefitInput,
): Promise<SuggestBenefitResult> {
  const prompt = buildBenefitPrompt(input);
  const api = getBundledAiApi();
  if (!api) {
    return { ok: false, error: 'Built-in AI is only available in the desktop app.' };
  }

  let result: { ok: boolean; text?: string; error?: string };
  try {
    result = await api.bundledAiGenerate(prompt);
  } catch {
    return { ok: false, error: 'The built-in model failed to respond.' };
  }

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The built-in model returned an empty response.' };
  }

  const suggestion = sanitizeSuggestion(result.text);
  if (!suggestion) {
    return { ok: false, error: 'The built-in model returned an empty response.' };
  }

  return { ok: true, suggestion };
}

// ---------------------------------------------------------------------------
// Supplier product-page extraction (the price importer's offline AI tier)
// ---------------------------------------------------------------------------

export interface LocalExtractionResult {
  productName?: string;
  /** Total price in USD. */
  price?: number;
  /** Container size, paired with `unit`. */
  size?: number;
  unit?: 'oz' | 'lbs' | 'ml' | 'g';
}

/** True when the desktop bridge exposes the extraction endpoint. */
export function isLocalExtractionAvailable(): boolean {
  return typeof getBundledAiApi()?.bundledAiExtract === 'function';
}

/**
 * Asks the bundled local model to extract product info from supplier page
 * text. Returns null when the bundled AI is unavailable, disabled, or found
 * nothing usable — callers fall through to their next tier. Never throws.
 */
export async function extractSupplierProduct(
  pageText: string,
  settings: LocalAiSettingsSlice,
): Promise<LocalExtractionResult | null> {
  if (!settings.localAiEnabled) return null;
  const api = getBundledAiApi();
  if (!api?.bundledAiExtract) return null;

  try {
    const res = await api.bundledAiExtract(pageText);
    if (!res.ok || !res.result) return null;

    // The grammar guarantees the shape; sentinel values mean "not found".
    const { productName, price, size, unit } = res.result;
    const out: LocalExtractionResult = {};
    if (productName?.trim()) out.productName = productName.trim().slice(0, 120);
    if (price > 0) out.price = price;
    if (size > 0 && (unit === 'oz' || unit === 'lbs' || unit === 'ml' || unit === 'g')) {
      out.size = size;
      out.unit = unit;
    }
    return out.price !== undefined || out.size !== undefined ? out : null;
  } catch {
    return null;
  }
}
