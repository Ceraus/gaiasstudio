// ---------------------------------------------------------------------------
// Local AI client — two backends, both 100% offline/local, never cloud:
//
//   - "bundled": a small model shipped inside the app itself, run in-process
//     by the Electron main process via node-llama-cpp (see electron/main.cjs).
//     Zero setup — works out of the box. This module talks to it over the
//     existing IPC bridge (window.electronAPI), never the network.
//   - "ollama": the original advanced/external path for power users who want
//     a bigger/better model. Talks to a locally-running Ollama server that
//     the user installs and pulls a model into themselves (defaults to
//     http://localhost:11434).
//
// Scope (deliberately narrow, for both backends):
//   - Copywriting assist for the recipe "benefit statement" — a creative
//     marketing tagline the user can accept/edit/reject. Never authoritative.
//
// Every exported function here fails softly and returns a typed result —
// nothing throws past this module, and nothing here ever blocks the UI.
//
// Explicitly out of scope for anything built on top of this client:
//   - COGS/pricing math, INCI ingredient lists, allergen warnings, and
//     directions/"external use only" copy must stay user-authored. This
//     module must never be pointed at those fields.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;
const STATUS_TIMEOUT_MS = 6_000;

export type LocalAiBackend = 'bundled' | 'ollama';

export type LocalAiState = 'connected' | 'model-missing' | 'unreachable' | 'loading';

export interface LocalAiStatus {
  state: LocalAiState;
  /** Model tags reported by Ollama's /api/tags, when reachable. Empty for the bundled backend. */
  models: string[];
  /** Human-readable detail for the "not found"/"unreachable" states. */
  message?: string;
}

/** Shape of the bundled-AI IPC bridge exposed by electron/preload.cjs, when running in Electron. */
interface BundledAiApi {
  bundledAiStatus(): Promise<{ state: LocalAiState; message?: string }>;
  bundledAiGenerate(prompt: string): Promise<{ ok: boolean; text?: string; error?: string }>;
}

function getBundledAiApi(): BundledAiApi | null {
  const api = (globalThis as unknown as { electronAPI?: Partial<BundledAiApi> }).electronAPI;
  if (api && typeof api.bundledAiStatus === 'function' && typeof api.bundledAiGenerate === 'function') {
    return api as BundledAiApi;
  }
  return null;
}

/** Strips an Ollama tag's ":suffix" (e.g. "llama3.2:3b" -> "llama3.2") for loose matching. */
function baseName(model: string): string {
  return model.split(':')[0]?.trim().toLowerCase() ?? '';
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Checks whether the bundled in-app model is ready to use. Never throws —
 * always resolves to a status object so callers can render connected/
 * loading/unreachable states.
 */
export async function checkBundledAiStatus(): Promise<LocalAiStatus> {
  const api = getBundledAiApi();
  if (!api) {
    return {
      state: 'unreachable',
      models: [],
      message: 'The built-in model bridge is not available (are you running the desktop app?).',
    };
  }
  try {
    const result = await api.bundledAiStatus();
    return { state: result.state, models: [], message: result.message };
  } catch {
    return { state: 'unreachable', models: [], message: 'Could not reach the built-in model.' };
  }
}

/**
 * Pings the configured Ollama server and checks whether the configured model
 * is pulled. Never throws — always resolves to a status object so callers
 * can render connected/model-missing/unreachable states.
 */
export async function checkOllamaStatus(
  baseUrl: string,
  model: string,
): Promise<LocalAiStatus> {
  const url = `${normalizeBaseUrl(baseUrl)}/api/tags`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { method: 'GET' }, STATUS_TIMEOUT_MS);
  } catch {
    return { state: 'unreachable', models: [], message: 'Could not reach Ollama at this address.' };
  }

  if (!res.ok) {
    return { state: 'unreachable', models: [], message: `Ollama responded with an error (${res.status}).` };
  }

  let data: { models?: Array<{ name?: string; model?: string }> };
  try {
    data = await res.json();
  } catch {
    return { state: 'unreachable', models: [], message: 'Unexpected response from Ollama.' };
  }

  const models = (data.models ?? [])
    .map((m) => m.name ?? m.model ?? '')
    .filter((name): name is string => !!name);

  if (!models.length) {
    return { state: 'model-missing', models, message: 'Ollama is running but no models are pulled yet.' };
  }

  const wanted = baseName(model);
  const hasModel = models.some((m) => m === model || baseName(m) === wanted);

  if (!hasModel) {
    return { state: 'model-missing', models, message: `Model "${model}" isn't pulled yet.` };
  }

  return { state: 'connected', models };
}

export interface SuggestBenefitInput {
  /** Which backend to use. Defaults to "bundled" when omitted. */
  backend?: LocalAiBackend;
  /** Only used when backend is "ollama". */
  baseUrl?: string;
  /** Only used when backend is "ollama". */
  model?: string;
  recipeName: string;
  /** Selected ingredients, reduced to only the fields relevant to a marketing tagline. */
  ingredients: Array<{ name: string; category?: string; benefit?: string }>;
}

export interface SuggestBenefitResult {
  ok: boolean;
  /** The suggested tagline, present only when ok is true. */
  suggestion?: string;
  /** Human-readable error, present only when ok is false. */
  error?: string;
}

/** Hard cap so a runaway model can't hand back a paragraph instead of a tagline. */
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

/** Removes wrapping quotes/markdown and collapses whitespace from a model response. */
function sanitizeSuggestion(raw: string): string {
  let text = raw.trim();
  // Strip a single layer of wrapping quotes the model sometimes adds.
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
    text = text.slice(1, -1).trim();
  }
  // Collapse newlines/extra whitespace — this is a one-line tagline.
  text = text.replace(/\s+/g, ' ').trim();
  // Drop a leading "Tagline:" / "Benefit statement:" style prefix if present.
  text = text.replace(/^(tagline|benefit statement|benefit)\s*:\s*/i, '');
  if (text.length > MAX_SUGGESTION_LENGTH) {
    text = `${text.slice(0, MAX_SUGGESTION_LENGTH - 1).trimEnd()}…`;
  }
  return text;
}

/**
 * Asks the local AI model (bundled or Ollama, per `input.backend`) for a
 * short benefit-statement suggestion. Always resolves (never throws) —
 * failures come back as { ok: false, error }.
 */
export async function suggestBenefitStatement(
  input: SuggestBenefitInput,
): Promise<SuggestBenefitResult> {
  const prompt = buildBenefitPrompt(input);
  if ((input.backend ?? 'bundled') === 'bundled') {
    return suggestBenefitStatementBundled(prompt);
  }
  return suggestBenefitStatementOllama(input, prompt);
}

/** Bundled backend: runs in-process in the Electron main process via IPC. */
async function suggestBenefitStatementBundled(prompt: string): Promise<SuggestBenefitResult> {
  const api = getBundledAiApi();
  if (!api) {
    return { ok: false, error: 'The built-in model is only available in the desktop app.' };
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

/** Advanced/external backend: talks to a user-installed Ollama server. */
async function suggestBenefitStatementOllama(
  input: SuggestBenefitInput,
  prompt: string,
): Promise<SuggestBenefitResult> {
  const baseUrl = input.baseUrl || 'http://localhost:11434';
  const model = input.model || 'llama3.2:3b';
  const url = `${normalizeBaseUrl(baseUrl)}/api/generate`;

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: { temperature: 0.7 },
        }),
      },
      DEFAULT_TIMEOUT_MS,
    );
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, error: 'Local AI timed out. Is Ollama still running?' };
    }
    return { ok: false, error: 'Could not reach Ollama. Is it running?' };
  }

  if (!res.ok) {
    if (res.status === 404) {
      return { ok: false, error: `Model "${model}" isn't pulled yet in Ollama.` };
    }
    return { ok: false, error: `Ollama responded with an error (${res.status}).` };
  }

  let data: { response?: string };
  try {
    data = await res.json();
  } catch {
    return { ok: false, error: 'Unexpected response from Ollama.' };
  }

  const raw = data.response?.trim();
  if (!raw) {
    return { ok: false, error: 'Ollama returned an empty response.' };
  }

  const suggestion = sanitizeSuggestion(raw);
  if (!suggestion) {
    return { ok: false, error: 'Ollama returned an empty response.' };
  }

  return { ok: true, suggestion };
}
