// ---------------------------------------------------------------------------
// Local AI client — bundled in-app model OR optional Ollama over the network.
//
// Scope (deliberately narrow):
//   - Copywriting assist for recipe benefit statements
//   - Supplier page extraction for inventory import
//
// Every exported function fails softly — nothing throws past this module.
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
}

export interface LocalAiSettingsSlice {
  localAiEnabled?: boolean;
  localAiBackend?: 'bundled' | 'ollama';
  ollamaUrl?: string;
  ollamaModel?: string;
  language?: 'en' | 'es';
}

function getBundledAiApi(): BundledAiApi | null {
  const api = (globalThis as unknown as { electronAPI?: Partial<BundledAiApi> }).electronAPI;
  if (api && typeof api.bundledAiStatus === 'function' && typeof api.bundledAiGenerate === 'function') {
    return api as BundledAiApi;
  }
  return null;
}

function normalizeOllamaUrl(raw?: string): string {
  const trimmed = (raw ?? 'http://localhost:11434').trim();
  return trimmed.replace(/\/$/, '');
}

async function ollamaGenerate(
  baseUrl: string,
  model: string,
  prompt: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  try {
    const res = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
    });
    if (!res.ok) {
      return { ok: false, error: `Ollama HTTP ${res.status}` };
    }
    const data = (await res.json()) as { response?: string };
    const text = data.response?.trim();
    if (!text) return { ok: false, error: 'Ollama returned an empty response.' };
    return { ok: true, text };
  } catch {
    return { ok: false, error: 'Could not reach Ollama. Check the URL and that OLLAMA_HOST allows this origin.' };
  }
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

/** Checks Ollama at the configured URL. Never throws. */
export async function checkOllamaStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  const base = normalizeOllamaUrl(settings.ollamaUrl);
  const model = settings.ollamaModel?.trim() || 'llama3.2';
  try {
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) {
      return { state: 'unreachable', message: `Ollama at ${base} returned HTTP ${res.status}.` };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const names = (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
    const hasModel = names.some((n) => n === model || n.startsWith(`${model}:`));
    if (!hasModel && names.length > 0) {
      return {
        state: 'connected',
        message: `Connected to ${base}. Model "${model}" not listed — try: ${names.slice(0, 3).join(', ')}`,
      };
    }
    return { state: 'connected', message: `Ollama ready at ${base} (${model}).` };
  } catch {
    return {
      state: 'unreachable',
      message: `Could not reach Ollama at ${base}. For LAN access set OLLAMA_HOST=0.0.0.0 on the server.`,
    };
  }
}

/** Checks local AI (respects Settings toggle and backend choice). Never throws. */
export async function checkLocalAiStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  if (!settings.localAiEnabled) {
    return { state: 'unreachable', message: 'Local AI is turned off in Settings.' };
  }
  if (settings.localAiBackend === 'ollama') {
    return checkOllamaStatus(settings);
  }
  return checkBundledAiStatus();
}

async function generateWithBackend(
  settings: LocalAiSettingsSlice,
  prompt: string,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (settings.localAiBackend === 'ollama') {
    return ollamaGenerate(
      normalizeOllamaUrl(settings.ollamaUrl),
      settings.ollamaModel?.trim() || 'llama3.2',
      prompt,
    );
  }
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
  const result = await generateWithBackend(settings, prompt);

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
    const result = await generateWithBackend(settings, prompt);
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
    const result = await generateWithBackend(settings, prompt);
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
