// ---------------------------------------------------------------------------
// Local AI client — Ollama first (Tailscale / LAN / HTTPS), bundled fallback.
//
// Scope (deliberately narrow):
//   - Copywriting assist for recipe benefit statements
//   - Supplier page / paste text extraction for inventory import
//
// Every exported function fails softly — nothing throws past this module.
// ---------------------------------------------------------------------------

export type LocalAiState = 'connected' | 'unreachable' | 'loading';

export interface LocalAiStatus {
  state: LocalAiState;
  message?: string;
  /** Which tier is currently serving requests, when known. */
  backend?: 'ollama' | 'bundled';
}

/** Shape of the bundled-AI IPC bridge exposed by electron/preload.cjs. */
interface BundledAiApi {
  bundledAiStatus(): Promise<{ state: LocalAiState; message?: string }>;
  bundledAiGenerate(prompt: string): Promise<{ ok: boolean; text?: string; error?: string }>;
}

export interface LocalAiSettingsSlice {
  localAiEnabled?: boolean;
  /** @deprecated Ignored — hybrid mode tries Ollama when URL is set, then bundled. */
  localAiBackend?: 'bundled' | 'ollama';
  ollamaUrl?: string;
  ollamaModel?: string;
  language?: 'en' | 'es';
}

export interface LocalAiTestResult {
  ollama: LocalAiStatus;
  bundled: LocalAiStatus;
  /** Which tier would handle requests right now. */
  effective: 'ollama' | 'bundled' | 'none';
}

const OLLAMA_UNREACHABLE_HINT =
  'Could not reach Ollama. Ensure your device is connected to Tailscale, the Ollama PC is awake, and the URL uses HTTPS (e.g. https://machine.tailnet.ts.net).';

const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b';

function getBundledAiApi(): BundledAiApi | null {
  const api = (globalThis as unknown as { electronAPI?: Partial<BundledAiApi> }).electronAPI;
  if (api && typeof api.bundledAiStatus === 'function' && typeof api.bundledAiGenerate === 'function') {
    return api as BundledAiApi;
  }
  return null;
}

function isOllamaUrlConfigured(settings: LocalAiSettingsSlice): boolean {
  return !!settings.ollamaUrl?.trim();
}

function normalizeOllamaUrl(raw?: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/$/, '');
}

function ollamaModelName(settings: LocalAiSettingsSlice): string {
  return settings.ollamaModel?.trim() || DEFAULT_OLLAMA_MODEL;
}

/** Appends JSON-only instruction when the bundled model lacks Ollama's format flag. */
function withJsonInstruction(prompt: string): string {
  if (/reply with only valid json/i.test(prompt)) return prompt;
  return `${prompt}\n\nReply with ONLY valid JSON. No markdown, no commentary.`;
}

async function bundledGenerate(prompt: string): Promise<{ ok: boolean; text?: string; error?: string }> {
  const api = getBundledAiApi();
  if (!api) {
    return { ok: false, error: 'Built-in AI is only available in the desktop app.' };
  }
  try {
    return await api.bundledAiGenerate(prompt);
  } catch {
    return { ok: false, error: 'The built-in model failed to respond.' };
  }
}

async function ollamaGenerate(
  baseUrl: string,
  model: string,
  prompt: string,
  options?: { format?: 'json' },
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!baseUrl) {
    return { ok: false, error: 'Ollama URL is not configured.' };
  }
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        ...(options?.format === 'json' ? { format: 'json' } : {}),
      }),
    });
    if (!res.ok) {
      return { ok: false, error: `Ollama HTTP ${res.status}` };
    }
    const data = (await res.json()) as { response?: string };
    const text = data.response?.trim();
    if (!text) return { ok: false, error: 'Ollama returned an empty response.' };
    return { ok: true, text };
  } catch {
    return { ok: false, error: OLLAMA_UNREACHABLE_HINT };
  }
}

/**
 * Tries Ollama when a URL is configured; falls back to the bundled ~700MB model.
 * Never throws.
 */
async function hybridGenerate(
  settings: LocalAiSettingsSlice,
  prompt: string,
  options?: { format?: 'json' },
): Promise<{ ok: boolean; text?: string; error?: string; usedBackend?: 'ollama' | 'bundled' }> {
  let ollamaError: string | undefined;

  if (isOllamaUrlConfigured(settings)) {
    const ollamaResult = await ollamaGenerate(
      normalizeOllamaUrl(settings.ollamaUrl),
      ollamaModelName(settings),
      prompt,
      options,
    );
    if (ollamaResult.ok && ollamaResult.text) {
      return { ...ollamaResult, usedBackend: 'ollama' };
    }
    ollamaError = ollamaResult.error;
  }

  const bundledPrompt = options?.format === 'json' ? withJsonInstruction(prompt) : prompt;
  const bundledResult = await bundledGenerate(bundledPrompt);
  if (bundledResult.ok && bundledResult.text) {
    return { ...bundledResult, usedBackend: 'bundled' };
  }

  const bundledError = bundledResult.error ?? 'The built-in model failed to respond.';
  if (ollamaError) {
    return {
      ok: false,
      error: `${ollamaError} Fallback: ${bundledError}`,
    };
  }
  return { ok: false, error: bundledError };
}

/** Checks whether the bundled in-app model is ready. Never throws. */
export async function checkBundledAiStatus(): Promise<LocalAiStatus> {
  const api = getBundledAiApi();
  if (!api) {
    return {
      state: 'unreachable',
      message: 'Built-in AI is only available in the desktop app.',
      backend: 'bundled',
    };
  }
  try {
    const result = await api.bundledAiStatus();
    return { state: result.state, message: result.message, backend: 'bundled' };
  } catch {
    return { state: 'unreachable', message: 'Could not reach the built-in model.', backend: 'bundled' };
  }
}

/** Checks Ollama at the configured URL. Never throws. */
export async function checkOllamaStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  const base = normalizeOllamaUrl(settings.ollamaUrl);
  if (!base) {
    return { state: 'unreachable', message: 'Ollama URL is not configured.', backend: 'ollama' };
  }
  const model = ollamaModelName(settings);
  try {
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) {
      return { state: 'unreachable', message: `Ollama at ${base} returned HTTP ${res.status}.`, backend: 'ollama' };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const names = (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
    if (!hasModel && names.length > 0) {
      return {
        state: 'connected',
        message: `Connected to ${base}. Model "${model}" not listed — try: ${names.slice(0, 3).join(', ')}`,
        backend: 'ollama',
      };
    }
    return { state: 'connected', message: `Ollama ready at ${base} (${model}).`, backend: 'ollama' };
  } catch {
    return { state: 'unreachable', message: OLLAMA_UNREACHABLE_HINT, backend: 'ollama' };
  }
}

/** Tests Ollama and bundled tiers independently for Settings UI. Never throws. */
export async function testLocalAiConnection(settings: LocalAiSettingsSlice): Promise<LocalAiTestResult> {
  const ollama = isOllamaUrlConfigured(settings)
    ? await checkOllamaStatus(settings)
    : { state: 'unreachable' as const, message: 'Ollama URL not set.', backend: 'ollama' as const };
  const bundled = await checkBundledAiStatus();

  let effective: LocalAiTestResult['effective'] = 'none';
  if (ollama.state === 'connected') effective = 'ollama';
  else if (bundled.state === 'connected') effective = 'bundled';

  return { ollama, bundled, effective };
}

/** Checks local AI (Ollama first, bundled fallback). Never throws. */
export async function checkLocalAiStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  if (!settings.localAiEnabled) {
    return { state: 'unreachable', message: 'Local AI is turned off in Settings.' };
  }

  if (isOllamaUrlConfigured(settings)) {
    const ollama = await checkOllamaStatus(settings);
    if (ollama.state === 'connected') return ollama;
  }

  const bundled = await checkBundledAiStatus();
  if (bundled.state === 'connected') {
    if (isOllamaUrlConfigured(settings)) {
      return {
        state: 'connected',
        backend: 'bundled',
        message: bundled.message ?? 'Using bundled fallback model.',
      };
    }
    return bundled;
  }

  if (isOllamaUrlConfigured(settings)) {
    const ollama = await checkOllamaStatus(settings);
    return ollama;
  }

  return bundled;
}

export interface SuggestBenefitInput {
  recipeName: string;
  ingredients: Array<{ name: string; category?: string; benefit?: string }>;
  language?: 'en' | 'es';
}

export interface SuggestBenefitResult {
  ok: boolean;
  suggestion?: string;
  error?: string;
}

const MAX_SUGGESTION_LENGTH = 140;

function buildBenefitPrompt(input: SuggestBenefitInput): string {
  const lang = input.language ?? 'es';
  const ingredientLines = input.ingredients
    .slice(0, 12)
    .map((i) => {
      const bits = [i.name];
      if (i.category) bits.push(`(${i.category})`);
      if (i.benefit) bits.push(`— ${i.benefit}`);
      return `- ${bits.join(' ')}`;
    })
    .join('\n');

  return [
    lang === 'es'
      ? 'Eres redactor para una marca artesanal de jabones. Escribe UNA frase corta de beneficio (tagline) para la etiqueta.'
      : 'You are a copywriter helping a small handmade-soap maker draft a short marketing tagline for a product label.',
    lang === 'es' ? `Nombre del producto: ${input.recipeName || '(sin nombre)'}` : `Product name: ${input.recipeName || '(untitled recipe)'}`,
    lang === 'es' ? 'Ingredientes seleccionados:' : 'Selected ingredients:',
    ingredientLines || (lang === 'es' ? '(ninguno)' : '(none selected)'),
    '',
    lang === 'es'
      ? 'Reglas: solo lenguaje sensorial/marketing — SIN reclamos médicos ni de salud. Sin INCI. Sin precios. Máximo 120 caracteres. Responde SOLO con el tagline en español.'
      : 'Write exactly ONE short, warm, inviting benefit statement (a tagline), under 120 characters. Marketing language only — no medical or health claims. Output ONLY the tagline text.',
  ].join('\n');
}

function sanitizeSuggestion(raw: string): string {
  let text = raw.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^(tagline|benefit statement|benefit|beneficio)\s*:\s*/i, '');
  if (text.length > MAX_SUGGESTION_LENGTH) {
    text = `${text.slice(0, MAX_SUGGESTION_LENGTH - 1).trimEnd()}…`;
  }
  return text;
}

/** Asks local AI for a benefit-statement suggestion. Never throws. */
export async function suggestBenefitStatement(
  input: SuggestBenefitInput,
  settings: LocalAiSettingsSlice = {},
): Promise<SuggestBenefitResult> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const prompt = buildBenefitPrompt({ ...input, language: input.language ?? settings.language ?? 'es' });
  const result = await hybridGenerate(settings, prompt);

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }

  const suggestion = sanitizeSuggestion(result.text);
  if (!suggestion) {
    return { ok: false, error: 'The model returned an empty response.' };
  }

  return { ok: true, suggestion };
}

export interface SupplierProductExtraction {
  price?: number;
  size?: number;
  unit?: 'oz' | 'lbs' | 'ml' | 'g';
  productName?: string;
}

export interface SupplierTextExtraction {
  productName: string;
  price: number;
  size: number;
  unit: 'oz' | 'lbs' | 'ml' | 'g';
}

export interface SupplierTextExtractionResult {
  ok: boolean;
  data?: Partial<SupplierTextExtraction>;
  error?: string;
  /** True when JSON parsing was fuzzy — user should review fields before saving. */
  parseWarning?: boolean;
}

const SUPPLIER_UNITS = new Set(['oz', 'lbs', 'ml', 'g']);

function parseSupplierJson(raw: string): Partial<SupplierTextExtraction> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as Record<string, unknown>;
    const out: Partial<SupplierTextExtraction> = {};
    if (typeof parsed.productName === 'string' && parsed.productName.trim()) {
      out.productName = parsed.productName.trim().slice(0, 120);
    }
    const price = typeof parsed.price === 'number' ? parsed.price : parseFloat(String(parsed.price ?? ''));
    if (Number.isFinite(price) && price > 0) out.price = price;
    const size = typeof parsed.size === 'number' ? parsed.size : parseFloat(String(parsed.size ?? ''));
    if (Number.isFinite(size) && size > 0) out.size = size;
    const unit = String(parsed.unit ?? '').toLowerCase();
    if (SUPPLIER_UNITS.has(unit)) out.unit = unit as SupplierTextExtraction['unit'];
    return out;
  } catch {
    return null;
  }
}

function buildSupplierPastePrompt(text: string): string {
  return [
    'You extract supplier product pricing from pasted Temu or Amazon product text.',
    'Reply with ONLY valid JSON matching this schema (no markdown, no commentary):',
    '{"productName":"string","price":number,"size":number,"unit":"oz"|"lbs"|"ml"|"g"}',
    'Rules:',
    '- price = total USD paid for ONE container/item',
    '- size + unit = container amount (convert fl oz to oz, liters to ml, kg to g)',
    '- productName = short clean title without seller fluff',
    '',
    'PASTED TEXT:',
    text.slice(0, 12000),
  ].join('\n');
}

/** Uses hybrid AI (Ollama → bundled) to extract Temu/Amazon paste text. Never throws. */
export async function extractSupplierTextWithOllama(
  text: string,
  settings: LocalAiSettingsSlice,
): Promise<SupplierTextExtractionResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, error: 'Paste some product text first.' };
  }
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }

  const result = await hybridGenerate(settings, buildSupplierPastePrompt(trimmed), { format: 'json' });

  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }

  const parsed = parseSupplierJson(result.text);
  if (!parsed) {
    return {
      ok: false,
      error: 'Could not read the AI response. Try pasting less text, or fill the fields manually.',
      parseWarning: true,
    };
  }

  return {
    ok: true,
    data: parsed,
    parseWarning: !parsed.productName || !parsed.price || !parsed.size || !parsed.unit,
  };
}

/** Uses local AI to read supplier page text. Never throws. */
export async function extractSupplierProduct(
  pageText: string,
  settings: LocalAiSettingsSlice,
): Promise<SupplierProductExtraction | null> {
  if (!settings.localAiEnabled) return null;

  const prompt = [
    'Extract supplier product pricing from the page text below.',
    'Reply with ONLY valid JSON (no markdown):',
    '{"price": number|null, "size": number|null, "unit": "oz"|"lbs"|"ml"|"g"|null, "productName": string|null}',
    'price = total USD for one container; size + unit = container amount.',
    'Use null for anything not found.',
    '',
    pageText.slice(0, 12000),
  ].join('\n');

  try {
    const result = await hybridGenerate(settings, prompt, { format: 'json' });
    if (!result.ok || !result.text) return null;
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as SupplierProductExtraction;
    const out: SupplierProductExtraction = {};
    if (typeof parsed.price === 'number' && parsed.price > 0) out.price = parsed.price;
    if (typeof parsed.size === 'number' && parsed.size > 0) out.size = parsed.size;
    if (parsed.unit === 'oz' || parsed.unit === 'lbs' || parsed.unit === 'ml' || parsed.unit === 'g') {
      out.unit = parsed.unit;
    }
    if (typeof parsed.productName === 'string' && parsed.productName.trim()) {
      out.productName = parsed.productName.trim().slice(0, 120);
    }
    if (out.price !== undefined || out.size !== undefined) return out;
    return null;
  } catch {
    return null;
  }
}

/** Suggest a random remix recipe name + benefit via local AI. Never throws. */
export async function suggestRemixRecipe(
  ingredientNames: string[],
  settings: LocalAiSettingsSlice,
): Promise<{ name?: string; benefit?: string } | null> {
  if (!settings.localAiEnabled || ingredientNames.length === 0) return null;
  const lang = settings.language ?? 'es';
  const prompt = [
    lang === 'es'
      ? 'Inventa un jabón artesanal de glicerina con estos ingredientes:'
      : 'Invent a handmade glycerin soap using these ingredients:',
    ingredientNames.join(', '),
    lang === 'es'
      ? 'Responde SOLO JSON: {"name":"Nombre creativo","benefit":"Tagline sensorial corto en español sin reclamos de salud"}'
      : 'Reply ONLY JSON: {"name":"Creative name","benefit":"Short sensory tagline without health claims"}',
  ].join('\n');
  try {
    const result = await hybridGenerate(settings, prompt, { format: 'json' });
    if (!result.ok || !result.text) return null;
    const match = result.text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]) as { name?: string; benefit?: string };
    return {
      name: typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 48) : undefined,
      benefit: typeof parsed.benefit === 'string' ? sanitizeSuggestion(parsed.benefit) : undefined,
    };
  } catch {
    return null;
  }
}
