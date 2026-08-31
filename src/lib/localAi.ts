// ---------------------------------------------------------------------------
// Local AI client — optional external Ollama (Tailscale / LAN / HTTPS).
// No in-process GGUF / node-llama-cpp. Google Translate is separate.
//
// Scope (deliberately narrow):
//   - Copywriting assist for recipe benefit statements
//   - Supplier page / paste text extraction for inventory import
//
// Every exported function fails softly — nothing throws past this module.
// ---------------------------------------------------------------------------

import { withAiActivity } from '@/lib/aiActivity';
import { mixBenefitsForIngredients } from '@/lib/benefitMix';
import {
  benefitCopyViolatesEffects,
  benefitPromptIngredientLines,
  buildEffectContract,
  ingredientsForBenefitCopy,
  stripUnlistedIngredientMentions,
} from '@/lib/ingredientSkinFeel';
import { formatNetWeightAmount } from '@/lib/netWeight';
import {
  translateLabelTextsOffline,
  type BilingualPair,
} from '@/lib/offlineLabelTranslate';
import { translateTextsWithGoogle } from '@/lib/googleTranslate';
import { preserveTranslationCase } from '@/lib/preserveTranslationCase';

export type LocalAiState = 'connected' | 'unreachable' | 'loading';

export interface LocalAiStatus {
  state: LocalAiState;
  message?: string;
  /** Which server is currently serving requests, when known. */
  backend?: 'ollama';
}

export type OllamaTaskKind = 'text' | 'json' | 'vision';

/** Ollama `format` — plain JSON mode or a JSON-schema object (structured outputs). */
export type OllamaFormat = 'json' | Record<string, unknown>;

export interface LocalAiSettingsSlice {
  localAiEnabled?: boolean;
  comfyUiEnabled?: boolean;
  comfyUiUrl?: string;
  /** @deprecated Ignored — local AI is Ollama-only when a URL is configured. */
  localAiBackend?: 'bundled' | 'ollama';
  ollamaUrl?: string;
  ollamaModel?: string;
  ollamaModelText?: string;
  ollamaModelJson?: string;
  ollamaModelVision?: string;
  language?: 'en' | 'es';
  googleTranslateApiKey?: string;
}

export interface LocalAiTestResult {
  ollama: LocalAiStatus;
  /** Which server would handle requests right now. */
  effective: 'ollama' | 'none';
}

const OLLAMA_UNREACHABLE_HINT =
  'Could not reach Ollama. Ensure your device is connected to Tailscale, the Ollama PC is awake, and the URL uses HTTPS (e.g. https://machine.tailnet.ts.net).';

const DEFAULT_OLLAMA_MODEL = 'llama3.1:8b';
const DEFAULT_OLLAMA_COPY_MODEL = 'qwen2.5:7b-instruct';
const DEFAULT_OLLAMA_VISION = 'llama3.2-vision';
const COPY_MODEL_PREFERENCE = [
  'qwen2.5:7b-instruct',
  'qwen2.5:7b',
  'llama3.1:8b',
  'llama3.2:3b',
  'llama3.2',
  'gemma2:9b',
  'mistral:7b',
];
const OLLAMA_GENERATE_TIMEOUT_MS = 90_000;
const AI_GENERATE_MAX_ATTEMPTS = 3;
/** Keep the model warm for back-to-back drafts; ComfyUI unloads it first. */
const OLLAMA_KEEP_ALIVE = '2m';
const OLLAMA_NUM_CTX = 2048;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Soft label length — preview shows full text; UI may warn above this. */
export const LABEL_BENEFIT_SOFT_LIMIT = 220;

function isRetryableAiError(error?: string): boolean {
  if (!error) return true;
  return (
    error.includes(OLLAMA_UNREACHABLE_HINT)
    || /empty response/i.test(error)
    || /failed to respond/i.test(error)
    || /HTTP 5\d\d/.test(error)
    || /HTTP 429/.test(error)
  );
}

/** JSON schema for supplier paste / page extraction. */
export const SUPPLIER_EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    price: { type: 'number' },
    size: { type: 'number' },
    unit: { type: 'string', enum: ['oz', 'lbs', 'ml', 'g', 'none'] },
  },
  required: ['productName', 'price', 'size', 'unit'],
} as const;

function isOllamaUrlConfigured(settings: LocalAiSettingsSlice): boolean {
  return !!settings.ollamaUrl?.trim();
}

function normalizeOllamaUrl(raw?: string): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/$/, '');
}


/** Resolves the Ollama model tag for a task kind, falling back to the legacy single model. */
export function ollamaModelForTask(settings: LocalAiSettingsSlice, kind: OllamaTaskKind): string {
  if (kind === 'text') {
    return settings.ollamaModelText?.trim() || settings.ollamaModel?.trim() || DEFAULT_OLLAMA_MODEL;
  }
  if (kind === 'json') {
    return settings.ollamaModelJson?.trim() || settings.ollamaModel?.trim() || DEFAULT_OLLAMA_MODEL;
  }
  return settings.ollamaModelVision?.trim() || DEFAULT_OLLAMA_VISION;
}

/** Lists model tags from a running Ollama server. Never throws. */
export async function fetchOllamaTags(baseUrl?: string): Promise<string[]> {
  const base = normalizeOllamaUrl(baseUrl);
  if (!base) return [];
  try {
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    return (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
  } catch {
    return [];
  }
}

/** True when the configured vision model appears in the server's tag list. */
export async function isOllamaVisionAvailable(settings: LocalAiSettingsSlice): Promise<boolean> {
  if (!isOllamaUrlConfigured(settings)) return false;
  const model = ollamaModelForTask(settings, 'vision');
  const tags = await fetchOllamaTags(settings.ollamaUrl);
  if (tags.length === 0) return false;
  return tags.some((n) => n === model || n.startsWith(`${model}:`));
}

type OllamaGenerateOptions = {
  format?: OllamaFormat;
  numPredict?: number;
  temperature?: number;
  seed?: number;
};

function isReasoningModel(model: string): boolean {
  return /gpt-oss|deepseek-r1|\br1\b|qwq|reasoning/i.test(model);
}

function isHeavyCopyModel(model: string): boolean {
  return isReasoningModel(model) || /:(1[4-9]|[2-9]\d|\d{3})b\b/i.test(model);
}

export function pickLightCopyModel(tags: string[]): string | null {
  for (const pref of COPY_MODEL_PREFERENCE) {
    const hit = tags.find((tag) => tag === pref || tag.startsWith(`${pref}:`));
    if (hit) return hit;
  }
  return null;
}

let copyModelCache: { key: string; model: string; at: number } | null = null;

/** Small instruct model for taglines — not gpt-oss. */
export async function resolveCopyModel(settings: LocalAiSettingsSlice): Promise<string> {
  const configured = settings.ollamaModelText?.trim() || settings.ollamaModel?.trim() || '';
  if (configured && !isHeavyCopyModel(configured)) return configured;

  const cacheKey = `${settings.ollamaUrl ?? ''}|${configured}`;
  if (copyModelCache && copyModelCache.key === cacheKey && Date.now() - copyModelCache.at < 300_000) {
    return copyModelCache.model;
  }

  const tags = await fetchOllamaTags(settings.ollamaUrl);
  const model = pickLightCopyModel(tags) || configured || DEFAULT_OLLAMA_COPY_MODEL;
  copyModelCache = { key: cacheKey, model, at: Date.now() };
  return model;
}

function ollamaRequestExtras(
  model: string,
  extras?: { numPredict?: number; temperature?: number; seed?: number },
): Record<string, unknown> {
  return {
    keep_alive: OLLAMA_KEEP_ALIVE,
    ...(isReasoningModel(model) ? { think: false } : {}),
    options: {
      num_ctx: OLLAMA_NUM_CTX,
      ...(extras?.numPredict ? { num_predict: extras.numPredict } : {}),
      ...(extras?.temperature != null ? { temperature: extras.temperature } : {}),
      ...(extras?.seed != null ? { seed: extras.seed } : {}),
    },
  };
}

/** Unloads Ollama so ComfyUI can take the GPU. Never throws. */
export async function unloadOllamaModels(settings: LocalAiSettingsSlice): Promise<void> {
  const base = normalizeOllamaUrl(settings.ollamaUrl);
  if (!base) return;
  const models = [...new Set([
    ollamaModelForTask(settings, 'text'),
    ollamaModelForTask(settings, 'json'),
  ])];
  await Promise.all(
    models.map(async (model) => {
      try {
        await fetch(`${base}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, keep_alive: 0 }),
          signal: AbortSignal.timeout(2500),
        });
      } catch {
        /* ignore — generate still proceeds */
      }
    }),
  );
}

async function ollamaGenerate(
  baseUrl: string,
  model: string,
  prompt: string,
  options?: OllamaGenerateOptions,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  if (!baseUrl) {
    return { ok: false, error: 'Ollama URL is not configured.' };
  }

  return withAiActivity('ollama', () => ollamaGenerateOnce(baseUrl, model, prompt, options));
}

async function ollamaGenerateOnce(
  baseUrl: string,
  model: string,
  prompt: string,
  options?: OllamaGenerateOptions,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const formatPayload =
    options?.format === 'json'
      ? { format: 'json' as const }
      : options?.format && typeof options.format === 'object'
        ? { format: options.format }
        : {};

  const attempt = async (body: Record<string, unknown>) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OLLAMA_GENERATE_TIMEOUT_MS);
    try {
      const res = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          ...ollamaRequestExtras(model, options),
          ...body,
        }),
        signal: controller.signal,
      });
      if (!res.ok) {
        return { ok: false as const, error: `Ollama HTTP ${res.status}` };
      }
      const data = (await res.json()) as { response?: string };
      const text = data.response?.trim();
      if (!text) return { ok: false as const, error: 'Ollama returned an empty response.' };
      return { ok: true as const, text };
    } finally {
      clearTimeout(timeout);
    }
  };

  try {
    if (Object.keys(formatPayload).length > 0) {
      const structured = await attempt(formatPayload);
      if (structured.ok) return structured;
      if (options?.format && typeof options.format === 'object') {
        const jsonFallback = await attempt({ format: 'json' });
        if (jsonFallback.ok) return jsonFallback;
      }
    }
    return await attempt({});
  } catch {
    return { ok: false, error: OLLAMA_UNREACHABLE_HINT };
  }
}

/**
 * Sends a prompt to the user's external Ollama server when a URL is set.
 * Never throws. Does not run in-process llama inference.
 */
async function hybridGenerate(
  settings: LocalAiSettingsSlice,
  prompt: string,
  options?: { format?: OllamaFormat; task?: OllamaTaskKind; numPredict?: number; temperature?: number; seed?: number },
): Promise<{ ok: boolean; text?: string; error?: string; usedBackend?: 'ollama' }> {
  const task = options?.task ?? (options?.format ? 'json' : 'text');

  if (!isOllamaUrlConfigured(settings)) {
    return { ok: false, error: 'Ollama URL is not configured.' };
  }

  const model =
    task === 'text' ? await resolveCopyModel(settings) : ollamaModelForTask(settings, task);
  let ollamaError: string | undefined;
  for (let attempt = 0; attempt < AI_GENERATE_MAX_ATTEMPTS; attempt++) {
    const ollamaResult = await ollamaGenerate(
      normalizeOllamaUrl(settings.ollamaUrl),
      model,
      prompt,
      {
        ...(options?.format ? { format: options.format } : {}),
        ...(options?.numPredict ? { numPredict: options.numPredict } : {}),
        ...(options?.temperature != null ? { temperature: options.temperature } : {}),
        ...(options?.seed != null ? { seed: options.seed } : {}),
      },
    );
    if (ollamaResult.ok && ollamaResult.text) {
      return { ...ollamaResult, usedBackend: 'ollama' };
    }
    ollamaError = ollamaResult.error;
    if (attempt < AI_GENERATE_MAX_ATTEMPTS - 1 && isRetryableAiError(ollamaError)) {
      await sleep(700 * (attempt + 1));
      continue;
    }
    break;
  }

  return { ok: false, error: ollamaError ?? 'Ollama failed to respond.' };
}

function modelTagInstalled(tags: string[], model: string): boolean {
  return tags.some((n) => n === model || n.startsWith(`${model}:`));
}

/** Checks Ollama at the configured URL. Never throws. */
export async function checkOllamaStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  const base = normalizeOllamaUrl(settings.ollamaUrl);
  if (!base) {
    return { state: 'unreachable', message: 'Ollama URL is not configured.', backend: 'ollama' };
  }
  const textModel = ollamaModelForTask(settings, 'text');
  const jsonModel = ollamaModelForTask(settings, 'json');
  try {
    const res = await fetch(`${base}/api/tags`);
    if (!res.ok) {
      return { state: 'unreachable', message: `Ollama at ${base} returned HTTP ${res.status}.`, backend: 'ollama' };
    }
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    const names = (data.models ?? []).map((m) => m.name ?? '').filter(Boolean);
    if (names.length === 0) {
      return { state: 'unreachable', message: `Ollama at ${base} returned no models.`, backend: 'ollama' };
    }
    if (!modelTagInstalled(names, textModel)) {
      return {
        state: 'unreachable',
        message: `Copywriting model "${textModel}" is not installed on Ollama.`,
        backend: 'ollama',
      };
    }
    if (jsonModel !== textModel && !modelTagInstalled(names, jsonModel)) {
      return {
        state: 'unreachable',
        message: `JSON model "${jsonModel}" is not installed on Ollama.`,
        backend: 'ollama',
      };
    }
    return { state: 'connected', message: `Ollama ready at ${base}.`, backend: 'ollama' };
  } catch {
    return { state: 'unreachable', message: OLLAMA_UNREACHABLE_HINT, backend: 'ollama' };
  }
}

/** Tests the configured Ollama server for Settings UI. Never throws. */
export async function testLocalAiConnection(settings: LocalAiSettingsSlice): Promise<LocalAiTestResult> {
  const ollama = isOllamaUrlConfigured(settings)
    ? await checkOllamaStatus(settings)
    : { state: 'unreachable' as const, message: 'Ollama URL not set.', backend: 'ollama' as const };

  return {
    ollama,
    effective: ollama.state === 'connected' ? 'ollama' : 'none',
  };
}

/** Checks whether external Ollama is reachable. Never throws. */
export async function checkLocalAiStatus(settings: LocalAiSettingsSlice): Promise<LocalAiStatus> {
  if (!settings.localAiEnabled) {
    return { state: 'unreachable', message: 'Local AI is turned off in Settings.' };
  }

  const test = await testLocalAiConnection(settings);
  if (test.effective === 'ollama') {
    return { ...test.ollama, state: 'connected' };
  }

  return {
    state: 'unreachable',
    message: test.ollama.message || 'Ollama is not available.',
  };
}

export interface SuggestBenefitInput {
  /** Used only to strip a restated title from drafts — never interpolated into benefit copy. */
  recipeName?: string;
  ingredients: Array<{ name: string; category?: string; benefit?: string; inci?: string }>;
  language?: 'en' | 'es';
  /** Rotate which studio phrases are offered so a redo is not a carbon copy. */
  variant?: number;
  /** Earlier drafts to avoid repeating. */
  avoid?: Array<{ en?: string; es?: string }>;
}

export interface SuggestBenefitResult {
  ok: boolean;
  suggestion?: string;
  suggestionEn?: string;
  suggestionEs?: string;
  error?: string;
}


const BENEFIT_ANGLES = [
  'Angle: start with how skin feels after the rinse, then name the ingredients. Do not open with the ingredient names.',
  'Angle: lead with juicy/creamy texture words, then the after-feel. Avoid the verb pair "moisturize and nourish".',
  'Angle: name the ingredients in reverse order from any prior draft. End on comfort or hydration, not "silky".',
  'Angle: write a second-person shopper line ("leaves your skin…") with a fresh verb (cushion, soften, refresh, comfort).',
  'Angle: tropical or seasonal character first, then one skin feel — no "soft and silky" close.',
  'Angle: one short promise about the wash, then the fruit names as a finish.',
];

const STOCK_CLICHES = [
  'moisturize and nourish',
  'moisturizes and nourishes',
  'nourish skin',
  'soft and silky',
  'silky soft',
  'leaving it feeling',
  'dejándola suave y sedosa',
  'hidratan y nutren',
];

function normalizeBenefitText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function benefitDraftsTooSimilar(
  next: { en?: string; es?: string },
  prior: Array<{ en?: string; es?: string }>,
): boolean {
  const nextEn = normalizeBenefitText(next.en ?? '');
  if (!nextEn) return false;
  const nextWords = nextEn.split(' ');
  const nextHead = nextWords.slice(0, 4).join(' ');
  return prior.some((draft) => {
    const prevEn = normalizeBenefitText(draft.en ?? '');
    if (!prevEn) return false;
    if (prevEn === nextEn) return true;
    const prevWords = prevEn.split(' ');
    if (nextHead && nextHead === prevWords.slice(0, 4).join(' ')) return true;
    const prevSet = new Set(prevWords);
    const overlap = nextWords.filter((word) => prevSet.has(word)).length;
    return overlap / Math.max(nextWords.length, prevWords.length) >= 0.68;
  });
}

const TITLE_STOPWORDS = new Set(['and', 'y', 'e', 'the', 'el', 'la', 'los', 'las', 'de', 'del', 'of', 'a']);
const TITLE_SUBJECT_VERBS =
  'leave|leaves|left|make|makes|help|helps|keep|keeps|give|gives|dejan|deja|hacen|hace';

function titleContentTokens(recipeName: string): string[] {
  return recipeName
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((token) => token && !TITLE_STOPWORDS.has(token));
}

function titlePhrasePattern(tokens: string[]): string {
  return tokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('(?:\\s+|&\\s*|\\s+(?:and|y|e)\\s+)');
}

function titleAsSubjectRegex(tokens: string[], flags: string): RegExp {
  return new RegExp(
    `(?:^|[,;:\\s])(?:${titlePhrasePattern(tokens)})\\s+(?=(?:${TITLE_SUBJECT_VERBS})\\b)`,
    flags,
  );
}

/** True when copy uses the recipe title as the sentence subject ("Lavender and Mint leave skin…"). */
export function benefitRestatesRecipeTitle(text: string, recipeName?: string): boolean {
  const tokens = titleContentTokens(recipeName ?? '');
  if (tokens.length < 2 || !text.trim()) return false;
  return titleAsSubjectRegex(tokens, 'i').test(text);
}

/**
 * Drop a restated recipe title when it is the grammatical subject.
 * Leaves individual ingredient mentions ("with lavender and mint oils") alone.
 */
export function stripRecipeTitleFromBenefit(text: string, recipeName?: string): string {
  const raw = text.trim();
  const tokens = titleContentTokens(recipeName ?? '');
  if (!raw || tokens.length < 2) return raw;
  let next = raw.replace(titleAsSubjectRegex(tokens, 'gi'), (match) => match.match(/^[,;:\s]+/)?.[0] ?? '');
  next = next.replace(/\s+/g, ' ').replace(/\s+,/g, ',').replace(/^[,;:\s]+/, '').trim();
  if (next && /^[a-z]/.test(next)) {
    next = next.charAt(0).toUpperCase() + next.slice(1);
  }
  return next;
}

function scrubBenefitPair(
  pair: { en: string; es: string },
  recipeName?: string,
  ingredients: SuggestBenefitInput['ingredients'] = [],
): { en: string; es: string } {
  return {
    en: stripRecipeTitleFromBenefit(stripUnlistedIngredientMentions(pair.en, ingredients), recipeName),
    es: stripRecipeTitleFromBenefit(stripUnlistedIngredientMentions(pair.es, ingredients), recipeName),
  };
}

/** Prompt for EN+ES benefit drafts. Recipe title is never interpolated. */
export function buildBilingualBenefitPrompt(input: SuggestBenefitInput, extraGuard = ''): string {
  const variant = input.variant ?? 0;
  const featured = ingredientsForBenefitCopy(input.ingredients);
  const mix = mixBenefitsForIngredients(featured, variant);
  const ingredientLines = benefitPromptIngredientLines(featured);
  const contract = buildEffectContract(featured);
  const angle = BENEFIT_ANGLES[Math.abs(variant) % BENEFIT_ANGLES.length];

  const phraseBlock = mix.phrases.length
    ? mix.phrases.map((phrase, index) => `${index + 1}. ${phrase}`).join('\n')
    : '(use moisturizing + conditioning)';

  const banned = [
    ...STOCK_CLICHES,
    ... (input.avoid ?? []).flatMap((draft) => {
      const words = normalizeBenefitText(draft.en ?? '').split(' ').filter((word) => word.length > 3);
      return words.length >= 3 ? [words.slice(0, 4).join(' ')] : [];
    }),
  ];

  return [
    'You write front-label benefit copy for Gaia\'s Essences handmade soap.',
    'Glycerin is the silent soap base. Never write glycerin, glycerine, glicerina, or "glycerin base".',
    'Write ONE shopper-facing benefit in English and the same idea in natural Spanish.',
    'Each line is 1–2 complete sentences (about 140–200 characters).',
    '',
    'Use only the cosmetic effect listed next to each RECIPE ingredient below.',
    'That list is this recipe only — not a leftover catalog, not inactive library names, not the product title.',
    'Do not mention botanicals, oils, butters, milks, clays, or bases that are not in the provided list.',
    'Do not default to aloe vera, shea, lavender, honey, or other stock catalog phrases.',
    'If an ingredient is not in the list, do not invent it or borrow an effect for it.',
    '',
    'The studio already has a mix-and-match benefit system (no AI): 2–3 phrases are combined from families earned by THESE ingredients.',
    'Use THAT mix as facts, but write a NEW sentence shape. Do not invent a different effect.',
    '',
    contract,
    '',
    `Families unlocked for this recipe: ${mix.families.join(', ') || 'Moisturizing, Conditioning'}`,
    'Picked phrases to weave (same as combining up to 3 chips in the benefit picker):',
    phraseBlock,
    '',
    `THIS DRAFT'S REQUIRED ANGLE (variant ${variant + 1}): ${angle}`,
    `Do not reuse these stock closings or openings: ${banned.join('; ')}.`,
    'Change the first four words, the main verb, and the last feel-word versus any prior draft.',
    '',
    'Match each named ingredient to THE feel listed for THAT ingredient. Do not borrow a feel from another item.',
    'Never write spa filler such as "Experience the cooling effect of…" or "Enjoy the revitalizing power of…".',
    'Never write telegram fragments such as "Mint cools. Olive Oil moisturizes."',
    'Describe texture and after-feel. You may name listed ingredients only; do not restate the recipe title.',
    'The product name already appears on the label — never use it as the sentence subject.',
    '',
    'Bad: "…with an uplifting citrus scent…" unless a true citrus ingredient is listed.',
    'Bad: "Experience the cooling effect of mango and watermelon…"',
    'Bad: "Mango and watermelon moisturize and nourish skin, leaving it feeling soft and silky." (overused stock line)',
    'Bad: "Lavender and Mint leave skin feeling refreshed…" (recipe title restated).',
    'Bad: "Nourished by coconut flakes and aloe vera" when aloe is not in the list.',
    'Good: "With its creamy texture, leave skin feeling refreshed and calm after the rinse."',
    'Good: "Coconut flakes nourish skin and leave a comfortable rinse feel."',
    '',
    'The ONLY ingredients in this recipe (name these if you name anything — omit glycerin):',
    ingredientLines || '(none selected)',
    ...(input.avoid?.length
      ? [
          '',
          'Write a clearly different sentence from these earlier drafts (same facts, new opening + verb + ending):',
          ...input.avoid.slice(-5).map((draft) => `- EN: ${draft.en ?? ''} / ES: ${draft.es ?? ''}`),
        ]
      : []),
    '',
    'Spanish rules:',
    '- Write natural Spanish, not a word-for-word gloss.',
    '- Use the correct gender for listed ingredient names only. Never invent extra botanicals to fill a sentence.',
    '',
    'Other rules:',
    '- You may name listed recipe ingredients only; do not open with or use the recipe title as the subject.',
    '- No medical, anti-aging, or disease claims. No percentages, INCI, emoji, or preamble.',
    extraGuard,
    '- Return JSON only: {"en":"...","es":"..."}',
  ].filter((line) => line !== '').join('\n');
}

/** Strip Llama-style chattiness and pull the actual label copy out of quotes if needed. */
function stripBenefitFiller(text: string): string {
  let out = text.trim().replace(/\s+/g, ' ');

  const quoted =
    out.match(/[“"]([^“"]{8,})[”"]/) ??
    out.match(/'([^']{8,})'/);
  if (quoted?.[1] && /(?:here(?:'s| is)|sure[,!]?|aquí tienes|descripción|description|benefit)/i.test(out)) {
    out = quoted[1].trim();
  }

  const prefixPatterns = [
    /^(?:sure[,!]?|certainly[,!]?|of course[,!]?|absolutely[,!]?|great[,!]?)\s+/i,
    /^(?:here(?:'s| is)|here are)\s+(?:the\s+)?(?:a\s+)?(?:product\s+)?(?:label\s+)?(?:benefit\s+)?(?:statement\s+)?(?:description\s+)?(?:for you\s*)?[:.\-–—]?\s*/i,
    /^(?:i(?:'ve| have)\s+(?:written|drafted|created))\s+(?:the\s+)?(?:following\s+)?(?:benefit\s+)?(?:statement\s+)?[:.\-–—]?\s*/i,
    /^(?:aquí(?: tienes| está| te dejo)?)\s+(?:la\s+)?(?:descripción\s+)?(?:del\s+)?(?:beneficio\s+)?(?:de\s+)?(?:la\s+)?(?:etiqueta\s+)?(?:del\s+producto\s+)?[:.\-–—]?\s*/i,
    /^(?:tagline|benefit statement|benefit|beneficio|description|descripción)\s*[:.\-–—]\s*/i,
  ];
  for (const pattern of prefixPatterns) {
    out = out.replace(pattern, '');
  }

  if (/^(?:here(?:'s| is)|aquí tienes)/i.test(out)) {
    const afterColon = out.split(/[:.\-–—]/).pop()?.trim();
    if (afterColon && afterColon.length >= 8) out = afterColon;
  }

  return out.trim();
}

function sanitizeSuggestion(raw: string): string {
  let text = stripBenefitFiller(raw);
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith('“') && text.endsWith('”'))) {
    text = text.slice(1, -1).trim();
  }
  if ((text.startsWith("'") && text.endsWith("'"))) {
    text = text.slice(1, -1).trim();
  }
  text = text.replace(/\s+/g, ' ').trim();
  text = text.replace(/^(tagline|benefit statement|benefit|beneficio)\s*:\s*/i, '');
  return text;
}

/** Asks local AI for EN + ES benefit statements in one call. Never throws. */
export async function suggestBenefitStatement(
  input: SuggestBenefitInput,
  settings: LocalAiSettingsSlice = {},
): Promise<SuggestBenefitResult> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }

  const generatePair = async (extraGuard = '') => {
    const result = await hybridGenerate(settings, buildBilingualBenefitPrompt(input, extraGuard), {
      format: 'json',
      task: 'text',
      numPredict: 420,
      temperature: 1.15,
      seed: Date.now() + Math.floor(Math.random() * 10_000) + (input.variant ?? 0) * 97,
    });
    if (!result.ok || !result.text) {
      return { ok: false as const, error: result.error ?? 'The model returned an empty response.' };
    }
    const parsed = parseBenefitPair(result.text);
    return { ok: true as const, en: parsed.en, es: parsed.es };
  };

  let pair = await generatePair();
  if (pair.ok) {
    const violation = benefitCopyViolatesEffects(pair.en, pair.es, input.ingredients);
    if (violation) {
      pair = await generatePair(`- Previous draft was rejected: ${violation} Name only ingredients from the provided recipe list. Do not write aloe vera unless it is in that list.`);
    } else if (
      STOCK_CLICHES.some((cliche) => `${pair.en} ${pair.es}`.toLowerCase().includes(cliche))
      || benefitDraftsTooSimilar(pair, input.avoid ?? [])
      || benefitRestatesRecipeTitle(pair.en, input.recipeName)
      || benefitRestatesRecipeTitle(pair.es, input.recipeName)
    ) {
      pair = await generatePair(
        '- Previous draft reused a stock line, matched an earlier draft, or restated the recipe title. New opening 4 words, new verb, and a new last feel-word. Do not write the product name. Do not write "moisturize and nourish" or "soft and silky".',
      );
    }
  }
  if (!pair.ok) {
    return { ok: false, error: pair.error };
  }
  if (!pair.en && !pair.es) {
    return { ok: false, error: 'Could not read the AI response.' };
  }

  const cleaned = scrubBenefitPair(pair, input.recipeName, input.ingredients);
  return {
    ok: true,
    suggestionEn: cleaned.en || undefined,
    suggestionEs: cleaned.es || undefined,
    suggestion: cleaned.en || cleaned.es,
  };
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

function mapExtractRecord(parsed: Record<string, unknown>): Partial<SupplierTextExtraction> {
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
}

function parseSupplierJson(raw: string): Partial<SupplierTextExtraction> | null {
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return mapExtractRecord(JSON.parse(match[0]) as Record<string, unknown>);
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

/** Uses external Ollama (when configured) for Temu/Amazon paste. Never throws. */
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

  const prompt = buildSupplierPastePrompt(trimmed);

  if (isOllamaUrlConfigured(settings)) {
    const ollamaResult = await ollamaGenerate(
      normalizeOllamaUrl(settings.ollamaUrl),
      ollamaModelForTask(settings, 'json'),
      prompt,
      { format: SUPPLIER_EXTRACT_SCHEMA },
    );
    if (ollamaResult.ok && ollamaResult.text) {
      let parsed: Partial<SupplierTextExtraction> | null = null;
      try {
        parsed = mapExtractRecord(JSON.parse(ollamaResult.text) as Record<string, unknown>);
      } catch {
        parsed = parseSupplierJson(ollamaResult.text);
      }
      if (parsed && Object.keys(parsed).length > 0) {
        return {
          ok: true,
          data: parsed,
          parseWarning: !parsed.productName || !parsed.price || !parsed.size || !parsed.unit,
        };
      }
    }
  }

  const result = await hybridGenerate(settings, prompt, {
    format: SUPPLIER_EXTRACT_SCHEMA,
    task: 'json',
  });

  if (!result.ok || !result.text) {
    return {
      ok: false,
      error: result.error ?? 'The model returned an empty response.',
    };
  }

  let parsed: Partial<SupplierTextExtraction> | null = null;
  try {
    parsed = mapExtractRecord(JSON.parse(result.text) as Record<string, unknown>);
  } catch {
    parsed = parseSupplierJson(result.text);
  }

  if (!parsed || Object.keys(parsed).length === 0) {
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
    const result = await hybridGenerate(settings, prompt, {
      format: SUPPLIER_EXTRACT_SCHEMA,
      task: 'json',
    });
    if (!result.ok || !result.text) return null;
    let parsed: SupplierProductExtraction;
    try {
      parsed = JSON.parse(result.text) as SupplierProductExtraction;
    } catch {
      const fallback = parseSupplierJson(result.text);
      if (!fallback) return null;
      parsed = fallback;
    }
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

export interface ParsedRecipeIngredient {
  name: string;
  amount?: number;
  unit?: 'g' | 'drops';
}

const RECIPE_INGREDIENT_LIST_SCHEMA = {
  type: 'object',
  properties: {
    ingredients: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          amount: { type: 'number' },
          unit: { type: 'string', enum: ['g', 'drops'] },
        },
        required: ['name'],
      },
    },
  },
  required: ['ingredients'],
} as const;

/** Parses an informal ingredient list locally. Every row still goes through deterministic resolution. */
export async function parseRecipeIngredientList(
  text: string,
  settings: LocalAiSettingsSlice,
): Promise<{ ok: boolean; ingredients?: ParsedRecipeIngredient[]; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Paste an ingredient list first.' };
  if (!settings.localAiEnabled) return { ok: false, error: 'Local AI is turned off in Settings.' };
  const prompt = [
    'Extract a handmade soap recipe ingredient list from English or Spanish text.',
    'Reply ONLY JSON: {"ingredients":[{"name":"common ingredient name","amount":number?,"unit":"g"|"drops"?}]}',
    'Rules:',
    '- Keep each distinct ingredient as one row.',
    '- Convert grams/gramos to g and drop/gotas to drops.',
    '- Do not invent missing amounts or ingredients.',
    '- Remove brands, package sizes, prices, and seller language from names.',
    '',
    trimmed.slice(0, 5000),
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, {
    format: RECIPE_INGREDIENT_LIST_SCHEMA,
    task: 'json',
  });
  if (!result.ok || !result.text) return { ok: false, error: result.error ?? 'Could not parse the list.' };
  const parsed = parseJsonObject<{ ingredients?: Array<Record<string, unknown>> }>(result.text);
  const ingredients = (parsed?.ingredients ?? [])
    .map((row): ParsedRecipeIngredient | null => {
      const name = typeof row.name === 'string' ? row.name.trim().slice(0, 120) : '';
      if (!name) return null;
      const amount = typeof row.amount === 'number' && Number.isFinite(row.amount) && row.amount > 0
        ? row.amount
        : undefined;
      const unit = row.unit === 'g' || row.unit === 'drops' ? row.unit : undefined;
      return { name, amount, unit };
    })
    .filter((row): row is ParsedRecipeIngredient => row !== null)
    .slice(0, 40);
  return ingredients.length
    ? { ok: true, ingredients }
    : { ok: false, error: 'No valid ingredients were found.' };
}

const INGREDIENT_MATCH_SCHEMA = {
  type: 'object',
  properties: {
    decision: { type: 'string', enum: ['same', 'different', 'uncertain'] },
    candidateId: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['decision', 'reason'],
} as const;

/** Local-AI second opinion for an ambiguous match; never authorizes a merge by itself. */
export async function compareIngredientCandidates(
  incoming: { name: string; inci?: string },
  candidates: Array<{ id: string; name: string; inci?: string }>,
  settings: LocalAiSettingsSlice,
): Promise<{
  ok: boolean;
  decision?: 'same' | 'different' | 'uncertain';
  candidateId?: string;
  reason?: string;
  error?: string;
}> {
  if (!settings.localAiEnabled || candidates.length === 0) {
    return { ok: false, error: 'Local AI is unavailable.' };
  }
  const allowedIds = new Set(candidates.map((candidate) => candidate.id));
  const prompt = [
    'Compare cosmetic/soap ingredient identities. This is duplicate detection, not safety or legal advice.',
    'Reply ONLY JSON: {"decision":"same"|"different"|"uncertain","candidateId":"existing id or empty","reason":"short reason"}',
    'Treat different forms (oil vs powder vs extract vs fragrance) as different ingredients.',
    `Incoming: ${JSON.stringify(incoming)}`,
    `Existing candidates: ${JSON.stringify(candidates.slice(0, 5))}`,
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, {
    format: INGREDIENT_MATCH_SCHEMA,
    task: 'json',
  });
  if (!result.ok || !result.text) return { ok: false, error: result.error ?? 'Comparison failed.' };
  const parsed = parseJsonObject<Record<string, unknown>>(result.text);
  if (!parsed) return { ok: false, error: 'The model returned invalid JSON.' };
  const decision = parsed.decision;
  if (decision !== 'same' && decision !== 'different' && decision !== 'uncertain') {
    return { ok: false, error: 'The model returned an invalid decision.' };
  }
  const candidateId = typeof parsed.candidateId === 'string' && allowedIds.has(parsed.candidateId)
    ? parsed.candidateId
    : undefined;
  if (decision === 'same' && !candidateId) {
    return { ok: false, error: 'The model selected an unknown ingredient.' };
  }
  return {
    ok: true,
    decision,
    candidateId,
    reason: typeof parsed.reason === 'string' ? parsed.reason.trim().slice(0, 240) : undefined,
  };
}

const INGREDIENT_ICON_SCHEMA = {
  type: 'object',
  properties: {
    iconKey: { type: 'string' },
    reason: { type: 'string' },
  },
  required: ['iconKey'],
} as const;

/** Pick a bundled icon for a newly typed ingredient. Never invents a new key. */
export async function matchIngredientIcon(
  name: string,
  candidates: string[],
  settings: LocalAiSettingsSlice,
): Promise<{ ok: boolean; iconKey?: string; error?: string }> {
  const allowed = [...new Set(candidates.map((key) => key.trim()).filter(Boolean))].slice(0, 40);
  if (!settings.localAiEnabled || !name.trim() || allowed.length === 0) {
    return { ok: false, error: 'Local AI is unavailable.' };
  }
  const allowedSet = new Set(allowed);
  const prompt = [
    'Match a handmade-soap ingredient to the closest existing icon label.',
    'Reply ONLY JSON: {"iconKey":"one key from the list","reason":"short reason"}',
    'Rules:',
    '- iconKey MUST be copied exactly from the candidate list.',
    '- Prefer the same plant, oil, butter, or color even if the wording differs.',
    '- If nothing is close enough, return iconKey as an empty string.',
    `Ingredient: ${JSON.stringify(name.trim().slice(0, 120))}`,
    `Candidate icon keys: ${JSON.stringify(allowed)}`,
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, {
    format: INGREDIENT_ICON_SCHEMA,
    task: 'json',
  });
  if (!result.ok || !result.text) return { ok: false, error: result.error ?? 'Icon match failed.' };
  const parsed = parseJsonObject<Record<string, unknown>>(result.text);
  const iconKey = typeof parsed?.iconKey === 'string' ? parsed.iconKey.trim() : '';
  if (!iconKey || !allowedSet.has(iconKey)) return { ok: true };
  return { ok: true, iconKey };
}

const REMIX_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    benefit: { type: 'string' },
  },
  required: ['name', 'benefit'],
} as const;

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
      ? 'Responde SOLO JSON con name y benefit (tagline sensorial corto en español sin reclamos de salud).'
      : 'Reply ONLY JSON with name and benefit (short sensory tagline without health claims).',
  ].join('\n');
  try {
    const result = await hybridGenerate(settings, prompt, { format: REMIX_SCHEMA, task: 'text' });
    if (!result.ok || !result.text) return null;
    let parsed: { name?: string; benefit?: string };
    try {
      parsed = JSON.parse(result.text) as { name?: string; benefit?: string };
    } catch {
      const match = result.text.match(/\{[\s\S]*\}/);
      if (!match) return null;
      parsed = JSON.parse(match[0]) as { name?: string; benefit?: string };
    }
    return {
      name: typeof parsed.name === 'string' ? parsed.name.trim().slice(0, 48) : undefined,
      benefit: typeof parsed.benefit === 'string' ? sanitizeSuggestion(parsed.benefit) : undefined,
    };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 2A — label copy, Etsy listings, order text, receipt OCR
// ---------------------------------------------------------------------------

const STYLE_NAME_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string' },
    subtitle: { type: 'string' },
  },
  required: ['name', 'subtitle'],
} as const;

function titleCasePhrase(value: string, maxWords: number): string {
  return value
    .replace(/[^a-zA-Z\s-]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, maxWords)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/** Name a custom background color in the same voice as built-in style cards. */
export async function suggestBackgroundStyleName(
  hex: string,
  existingNames: string[],
  settings: LocalAiSettingsSlice,
): Promise<{ name: string; subtitle: string } | null> {
  if (!settings.localAiEnabled && !settings.ollamaUrl) return null;
  const prompt = [
    'You name background colors for handmade glycerin soap label art.',
    `The color hex is ${hex}.`,
    'Reply ONLY JSON: {"name":"OneWord","subtitle":"Two Or Three Words"}',
    'Rules:',
    '- name: one evocative Title-Case word like Cream, Sage, Rose, Terracotta, Forest, Charcoal, Lavender, Amber, Ocean, Espresso, Burgundy, Sand, Navy, Copper, Plum, Caramel, Slate, Olive.',
    '- subtitle: a tactile material in Title Case, like Linen Weave, Cotton Fiber, Smooth Silk, Raw Clay, Pressed Moss, Activated Charcoal, Soft Velvet, Raw Beeswax, Sea Glass, Dark Wood Grain, Crushed Velvet, Fine Sand, Matte Canvas, Patinated Copper, Brushed Suede, Spun Silk, Polished Stone, Pressed Leaf.',
    '- Do not reuse an existing name.',
    `- Existing names: ${existingNames.join(', ') || 'none'}`,
    '- No sentences. Do not put the hex in the name.',
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, { format: STYLE_NAME_SCHEMA, task: 'json' });
  if (!result.ok || !result.text) return null;
  const parsed = parseJsonObject<Record<string, unknown>>(result.text);
  const name = titleCasePhrase(typeof parsed?.name === 'string' ? parsed.name : '', 2);
  const subtitle = titleCasePhrase(typeof parsed?.subtitle === 'string' ? parsed.subtitle : '', 4);
  if (!name || !subtitle) return null;
  return { name, subtitle };
}

function parseJsonObject<T>(raw: string): T | null {
  const cleaned = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      return null;
    }
  }
}

function readJsonString(parsed: Record<string, unknown>, keys: string[]): string {
  for (const key of keys) {
    const value = parsed[key];
    if (typeof value === 'string' && value.trim()) return sanitizeSuggestion(value);
  }
  return '';
}

function parseBenefitPair(raw: string): { en: string; es: string } {
  const parsed = parseJsonObject<Record<string, unknown>>(raw);
  if (!parsed) return { en: '', es: '' };
  return {
    en: readJsonString(parsed, ['en', 'english', 'en_US', 'benefitEn', 'benefit_en']),
    es: readJsonString(parsed, ['es', 'spanish', 'español', 'benefitEs', 'benefit_es']),
  };
}

export interface LabelCopyLangFields {
  name?: string;
  tagline?: string;
  description?: string;
  directions?: string;
  warnings_suggestion?: string;
}

export interface LabelCopyDraft {
  en: LabelCopyLangFields;
  es: LabelCopyLangFields;
}

export interface LabelCopyDraftResult {
  ok: boolean;
  data?: LabelCopyDraft;
  error?: string;
}

export interface DraftLabelCopyInput {
  recipeName: string;
  ingredients: Array<{ name: string; category?: string }>;
  netWeight?: string;
}

/** One structured call for bilingual label copy (preview-only). Never throws. */
export async function draftLabelCopy(
  input: DraftLabelCopyInput,
  settings: LocalAiSettingsSlice,
): Promise<LabelCopyDraftResult> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const prompt = [
    'You write marketing copy for handmade glycerin soap labels.',
    'Return JSON with "en" and "es" objects. Each object may include:',
    '- name: creative product name (optional if recipe name is fine)',
    '- tagline: short sensory benefit (no medical/health claims)',
    '- description: 1–2 sentence product blurb',
    '- directions: brief use instructions',
    '- warnings_suggestion: ADVISORY only — suggest external-use wording (not legal advice)',
    'Keep taglines under 80 chars. No INCI lists. No emoji.',
    '',
    `Recipe name: ${input.recipeName || '(unnamed)'}`,
    input.netWeight ? `Net weight: ${formatNetWeightAmount(input.netWeight)}` : '',
    `Ingredients: ${input.ingredients.map((i) => i.name).join(', ') || '(none listed)'}`,
  ]
    .filter(Boolean)
    .join('\n');

  const result = await hybridGenerate(settings, prompt, { format: 'json', task: 'text', numPredict: 420 });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }
  const parsed = parseJsonObject<LabelCopyDraft>(result.text);
  if (!parsed?.en && !parsed?.es) {
    return { ok: false, error: 'Could not read the AI response.' };
  }
  return { ok: true, data: parsed };
}

/** Translates a single recipe text field. Never throws. */
export async function translateRecipeText(
  text: string,
  fromLang: 'en' | 'es',
  toLang: 'en' | 'es',
  settings: LocalAiSettingsSlice,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Nothing to translate.' };
  if (fromLang === toLang) return { ok: true, text: trimmed };
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const prompt =
    fromLang === 'es'
      ? `Translate this handmade soap label text to English. Reply with ONLY the translation, no quotes:\n${trimmed}`
      : `Traduce este texto de etiqueta de jabón artesanal al español. Responde SOLO la traducción, sin comillas:\n${trimmed}`;
  const result = await hybridGenerate(settings, prompt, { task: 'text', numPredict: 160 });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'Translation failed.' };
  }
  return { ok: true, text: result.text.trim() };
}

/** Ollama fallback for ingredient common names. Never throws. */
export async function translateIngredientNameWithOllama(
  text: string,
  settings: LocalAiSettingsSlice,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Nothing to translate.' };
  const prompt =
    `Traduce este nombre de ingrediente de cosmética / jabón artesanal al español. ` +
    `Responde SOLO la traducción, sin comillas ni explicación:\n${trimmed}`;
  const result = await hybridGenerate(settings, prompt, { task: 'text', numPredict: 64 });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'Translation failed.' };
  }
  return { ok: true, text: result.text.trim() };
}

export type LabelTranslateSource = 'offline' | 'mixed' | 'google';

function keepOfflineExact(offline: { confidence: string }[], offlineTexts: string[], merged: string[]): void {
  offline.forEach((row, i) => {
    if (row.confidence === 'exact' || row.confidence === 'passthrough') {
      merged[i] = offlineTexts[i];
    }
  });
}

/** Translates every label text string. Glossary / stored recipe pairs first, then Google Translate. */
export async function translateLabelTexts(
  texts: string[],
  toLang: 'en' | 'es',
  settings: LocalAiSettingsSlice,
  options?: { pairs?: BilingualPair[] },
): Promise<{ ok: boolean; texts?: string[]; error?: string; source?: LabelTranslateSource }> {
  if (!texts.length) return { ok: true, texts: [], source: 'offline' };
  const pairs = options?.pairs ?? [];
  const offline = translateLabelTextsOffline(texts, toLang, pairs);
  const offlineTexts = offline.map((row) => row.text);

  const leftoverIdx = texts
    .map((_, i) => i)
    .filter((i) => offline[i].confidence === 'rewrite' || offline[i].confidence === 'unknown');

  if (leftoverIdx.length === 0) {
    return { ok: true, texts: offlineTexts, source: 'offline' };
  }

  const merged = [...offlineTexts];
  let usedGoogle = false;

  const leftover = leftoverIdx.map((i) => texts[i]);
  const fromLang = toLang === 'es' ? 'en' : 'es';
  const google = await translateTextsWithGoogle(leftover, fromLang, toLang, {
    apiKey: settings.googleTranslateApiKey,
  });
  if (google.ok && google.texts) {
    leftoverIdx.forEach((i, j) => {
      const next = google.texts?.[j]?.trim();
      if (next) {
        merged[i] = preserveTranslationCase(next, texts[i], toLang);
        usedGoogle = true;
      }
    });
  }
  keepOfflineExact(offline, offlineTexts, merged);

  const keptOffline = leftoverIdx.length < texts.length || leftoverIdx.some((i) => merged[i] === offlineTexts[i]);
  const source: LabelTranslateSource = usedGoogle && keptOffline
    ? 'mixed'
    : usedGoogle
      ? 'google'
      : 'offline';
  return { ok: true, texts: merged, source };
}

export interface EtsyListingDraft {
  title: string;
  description: string;
  tags: string[];
}

const ETSY_LISTING_SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    tags: { type: 'array', items: { type: 'string' } },
  },
  required: ['title', 'description', 'tags'],
} as const;

function clampEtsyListing(raw: EtsyListingDraft): EtsyListingDraft {
  const title = raw.title.trim().slice(0, 140);
  const tags = (raw.tags ?? [])
    .map((tag) => tag.trim().toLowerCase().slice(0, 20))
    .filter(Boolean)
    .slice(0, 13);
  return { title, description: raw.description.trim(), tags };
}

/** AI-drafted Etsy listing copy with Etsy limits enforced in code. Never throws. */
export async function draftEtsyListing(
  recipe: { name: string; benefit?: string; benefitEn?: string; benefitEs?: string; netWeight?: string; directions?: string; warnings?: string },
  ingredientNames: string[],
  settings: LocalAiSettingsSlice,
  businessName?: string,
): Promise<{ ok: boolean; data?: EtsyListingDraft; error?: string }> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const benefit = recipe.benefitEn || recipe.benefitEs || recipe.benefit || '';
  const prompt = [
    'Write an Etsy listing for handmade artisan soap.',
    'Reply ONLY JSON: { "title", "description", "tags" }.',
    'Rules: title ≤140 chars, SEO-friendly; description warm and informative;',
    'exactly ≤13 tags, each ≤20 chars, lowercase, no hashtags.',
    'No medical claims. Mention handmade/natural where appropriate.',
    businessName ? `Shop: ${businessName}` : '',
    `Product: ${recipe.name}`,
    benefit ? `Benefit: ${benefit}` : '',
    ingredientNames.length ? `Ingredients: ${ingredientNames.join(', ')}` : '',
    recipe.netWeight ? `Net weight: ${formatNetWeightAmount(recipe.netWeight)}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const result = await hybridGenerate(settings, prompt, { format: ETSY_LISTING_SCHEMA, task: 'json' });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }
  const parsed = parseJsonObject<EtsyListingDraft>(result.text);
  if (!parsed?.title) return { ok: false, error: 'Could not read the AI response.' };
  return { ok: true, data: clampEtsyListing(parsed) };
}

/** Draft a short bilingual affirmation. Never throws. Does not mention products. */
export async function suggestAffirmation(
  settings: LocalAiSettingsSlice,
  opts?: { category?: string; language?: 'en' | 'es' },
): Promise<{ ok: boolean; en?: string; es?: string; error?: string }> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const category = opts?.category?.trim() || 'calm presence';
  const prompt = [
    'Write one short first-person affirmation for a handmade soap maker.',
    'Warm, specific, 1–2 sentences. No product name. No medical claims. No hashtags.',
    `Theme: ${category}.`,
    'Reply with ONLY JSON: {"en":"...","es":"..."}',
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, {
    format: 'json',
    task: 'text',
    numPredict: 180,
    temperature: 1.05,
    seed: Date.now() + Math.floor(Math.random() * 10_000),
  });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }
  const parsed = parseJsonObject<{ en?: string; es?: string }>(result.text);
  const en = parsed?.en?.replace(/\s+/g, ' ').trim();
  const es = parsed?.es?.replace(/\s+/g, ' ').trim();
  if (!en && !es) {
    const fallback = result.text.replace(/[{}"']/g, '').replace(/\s+/g, ' ').trim();
    if (!fallback) return { ok: false, error: 'Could not read the AI response.' };
    return { ok: true, en: fallback, es: fallback };
  }
  return { ok: true, en: en || es, es: es || en };
}

/** Short social caption for Instagram/TikTok. Never throws. */
export async function draftSocialCaption(
  recipe: { name: string; benefit?: string; benefitEn?: string; benefitEs?: string },
  settings: LocalAiSettingsSlice,
  platform: 'instagram' | 'tiktok' = 'instagram',
): Promise<{ ok: boolean; caption?: string; error?: string }> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const lang = settings.language ?? 'es';
  const benefit = lang === 'es' ? recipe.benefitEs || recipe.benefit : recipe.benefitEn || recipe.benefit;
  const prompt = [
    lang === 'es'
      ? `Escribe un caption corto para ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} sobre este jabón artesanal.`
      : `Write a short ${platform} caption for this handmade soap.`,
    'Include 3–5 relevant hashtags at the end. No medical claims. Under 300 chars.',
    `Product: ${recipe.name}`,
    benefit ? `Benefit: ${benefit}` : '',
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, { task: 'text' });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }
  return { ok: true, caption: result.text.trim().slice(0, 500) };
}

export interface ParsedOrderItem {
  recipeName: string;
  quantity: number;
  unitPrice?: number;
}

export interface ParsedOrderText {
  clientName?: string;
  items: ParsedOrderItem[];
  notes?: string;
}

const ORDER_PARSE_SCHEMA = {
  type: 'object',
  properties: {
    clientName: { type: 'string' },
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          recipeName: { type: 'string' },
          quantity: { type: 'number' },
          unitPrice: { type: 'number' },
        },
        required: ['recipeName', 'quantity'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['items'],
} as const;

/** Extracts client + line items from free-text order notes. Never throws. */
export async function parseOrderText(
  text: string,
  settings: LocalAiSettingsSlice,
): Promise<{ ok: boolean; data?: ParsedOrderText; error?: string }> {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: 'Type or paste an order description first.' };
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const prompt = [
    'Extract a work order from informal sales text (English or Spanish).',
    'Reply ONLY JSON: { clientName?, items: [{ recipeName, quantity, unitPrice? }], notes? }',
    'recipeName = soap/recipe name as spoken; quantity = count sold;',
    'unitPrice = USD per item if mentioned, else omit.',
    '',
    trimmed.slice(0, 4000),
  ].join('\n');
  const result = await hybridGenerate(settings, prompt, { format: ORDER_PARSE_SCHEMA, task: 'json' });
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'The model returned an empty response.' };
  }
  const parsed = parseJsonObject<ParsedOrderText>(result.text);
  if (!parsed?.items?.length) {
    return { ok: false, error: 'Could not find any products in that text.' };
  }
  parsed.items = parsed.items
    .filter((i) => i.recipeName?.trim() && Number.isFinite(i.quantity) && i.quantity > 0)
    .map((i) => ({
      recipeName: i.recipeName.trim(),
      quantity: i.quantity,
      unitPrice: typeof i.unitPrice === 'number' && i.unitPrice >= 0 ? i.unitPrice : undefined,
    }));
  if (!parsed.items.length) {
    return { ok: false, error: 'Could not find any valid line items.' };
  }
  return { ok: true, data: parsed };
}

export interface ReceiptOcrLineItem {
  description: string;
  quantity: number;
  unitCost: number;
}

export interface ReceiptOcrResult {
  vendor?: string;
  date?: string;
  category?: string;
  lineItems: ReceiptOcrLineItem[];
  tax?: number;
  total?: number;
  notes?: string;
}

const RECEIPT_OCR_SCHEMA = {
  type: 'object',
  properties: {
    vendor: { type: 'string' },
    date: { type: 'string' },
    category: { type: 'string', enum: ['ingredients', 'packaging', 'shipping', 'equipment', 'other'] },
    lineItems: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          quantity: { type: 'number' },
          unitCost: { type: 'number' },
        },
        required: ['description', 'quantity', 'unitCost'],
      },
    },
    tax: { type: 'number' },
    total: { type: 'number' },
    notes: { type: 'string' },
  },
  required: ['lineItems'],
} as const;

async function ollamaVisionGenerate(
  settings: LocalAiSettingsSlice,
  prompt: string,
  imageBase64: string,
  format?: OllamaFormat,
): Promise<{ ok: boolean; text?: string; error?: string }> {
  const base = normalizeOllamaUrl(settings.ollamaUrl);
  if (!base) {
    return { ok: false, error: 'Ollama URL is not configured — vision requires your Ollama server.' };
  }
  const model = ollamaModelForTask(settings, 'vision');
  const image = imageBase64.replace(/^data:image\/\w+;base64,/, '');

  const formatPayload =
    format === 'json'
      ? { format: 'json' as const }
      : format && typeof format === 'object'
        ? { format }
        : {};

  return withAiActivity('ollama', async () => {
    try {
      const res = await fetch(`${base}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          images: [image],
          stream: false,
          ...ollamaRequestExtras(model, { numPredict: 400 }),
          ...formatPayload,
        }),
      });
      if (!res.ok) {
        return { ok: false, error: `Ollama vision HTTP ${res.status}` };
      }
      const data = (await res.json()) as { response?: string };
      const text = data.response?.trim();
      if (!text) return { ok: false, error: 'Vision model returned an empty response.' };
      return { ok: true, text };
    } catch {
      return { ok: false, error: OLLAMA_UNREACHABLE_HINT };
    }
  });
}

/** Reads a receipt photo via Ollama vision. Never throws. Requires vision model. */
export async function extractReceiptFromImage(
  imageBase64: string,
  settings: LocalAiSettingsSlice,
): Promise<{ ok: boolean; data?: ReceiptOcrResult; error?: string; totalMismatch?: boolean }> {
  if (!settings.localAiEnabled) {
    return { ok: false, error: 'Local AI is turned off in Settings.' };
  }
  const visionOk = await isOllamaVisionAvailable(settings);
  if (!visionOk) {
    return {
      ok: false,
      error: 'No vision model found on your Ollama server. Install llama3.2-vision (or similar) and set it in Settings → Local AI.',
    };
  }

  const prompt = [
    'You read supplier receipts for a soap-making business.',
    'Extract vendor name, date (YYYY-MM-DD if possible), expense category',
    '(ingredients|packaging|shipping|equipment|other), line items with description/qty/unitCost USD, tax, total.',
    'Reply ONLY valid JSON matching the schema.',
  ].join('\n');

  const result = await ollamaVisionGenerate(settings, prompt, imageBase64, RECEIPT_OCR_SCHEMA);
  if (!result.ok || !result.text) {
    return { ok: false, error: result.error ?? 'Could not read the receipt.' };
  }

  const parsed = parseJsonObject<ReceiptOcrResult>(result.text);
  if (!parsed?.lineItems?.length) {
    return { ok: false, error: 'No line items found on the receipt.' };
  }

  const lineItems = parsed.lineItems
    .filter((li) => li.description?.trim() && li.quantity > 0)
    .map((li) => ({
      description: li.description.trim().slice(0, 120),
      quantity: li.quantity,
      unitCost: Math.max(0, li.unitCost ?? 0),
    }));

  const subtotal = lineItems.reduce((s, li) => s + li.quantity * li.unitCost, 0);
  const tax = typeof parsed.tax === 'number' ? parsed.tax : 0;
  const total = typeof parsed.total === 'number' ? parsed.total : subtotal + tax;
  const totalMismatch = Math.abs(subtotal + tax - total) > 0.05;

  return {
    ok: true,
    data: {
      vendor: parsed.vendor?.trim(),
      date: parsed.date?.trim(),
      category: parsed.category,
      lineItems,
      tax: tax || undefined,
      total,
      notes: parsed.notes?.trim(),
    },
    totalMismatch,
  };
}

