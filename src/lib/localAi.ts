// ---------------------------------------------------------------------------
// Local AI client — talks to a locally-running Ollama server ONLY.
//
// Scope (deliberately narrow):
//   - Copywriting assist for the recipe "benefit statement" — a creative
//     marketing tagline the user can accept/edit/reject. Never authoritative.
//
// This module NEVER calls out to the network/cloud. It only ever talks to
// the base URL the user configured in Settings (defaults to Ollama's local
// address, http://localhost:11434). If that server isn't running, every
// function here fails softly and returns a typed result — nothing throws
// past this module, and nothing here ever blocks the UI.
//
// Explicitly out of scope for anything built on top of this client:
//   - COGS/pricing math, INCI ingredient lists, allergen warnings, and
//     directions/"external use only" copy must stay user-authored. This
//     module must never be pointed at those fields.
// ---------------------------------------------------------------------------

const DEFAULT_TIMEOUT_MS = 15_000;
const STATUS_TIMEOUT_MS = 6_000;

export type LocalAiState = 'connected' | 'model-missing' | 'unreachable';

export interface LocalAiStatus {
  state: LocalAiState;
  /** Model tags reported by Ollama's /api/tags, when reachable. */
  models: string[];
  /** Human-readable detail for the "not found"/"unreachable" states. */
  message?: string;
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
 * Pings the configured Ollama server and checks whether the configured model
 * is pulled. Never throws — always resolves to a status object so callers
 * can render connected/model-missing/unreachable states.
 */
export async function checkLocalAiStatus(
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
  baseUrl: string;
  model: string;
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
 * Asks the local Ollama model for a short benefit-statement suggestion.
 * Always resolves (never throws) — failures come back as { ok: false, error }.
 */
export async function suggestBenefitStatement(
  input: SuggestBenefitInput,
): Promise<SuggestBenefitResult> {
  const url = `${normalizeBaseUrl(input.baseUrl)}/api/generate`;
  const prompt = buildBenefitPrompt(input);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: input.model,
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
      return { ok: false, error: `Model "${input.model}" isn't pulled yet in Ollama.` };
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
