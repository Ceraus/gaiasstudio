// Gaia's Label Studio — bundled local AI (main process).
//
// Runs an instruction-tuned GGUF model in-process via node-llama-cpp so the
// AI assists work out of the box, with zero separate installs and zero cloud
// calls. Model: Qwen3-4B-Instruct-2507 (Apache-2.0), quantized to Q4_K_M
// (~2.4 GB), shipped as an extraResource (see package.json `extraResources`;
// `npm run ai:fetch-model` downloads it before packaging).
//
// Two jobs share one loaded model:
//   1. generateBundledAi(prompt)  — the "Suggest" copywriting assist
//      (short benefit taglines). Uses one persistent chat session.
//   2. extractBundledAi(pageText) — the supplier-link price importer's local
//      AI tier. Uses a FRESH context per call (no chat history bleed) and a
//      JSON-schema grammar so the output is ALWAYS valid, parseable JSON.
//
// node-llama-cpp is an ESM-only native-addon package; this file stays
// CommonJS (like the rest of electron/) and uses dynamic import() to load it.
//
// Scope: copywriting assist + product-page extraction only. Never used for
// INCI/compliance text.
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const MODEL_FILENAME = 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf';
const MAX_TAGLINE_TOKENS = 60;
// A 4B model needs a moment to load from disk and, on CPU-only machines
// (Rosa's OptiPlex), page extraction can legitimately take tens of seconds.
const LOAD_TIMEOUT_MS = 120_000;
const GENERATE_TIMEOUT_MS = 60_000;
const EXTRACT_TIMEOUT_MS = 240_000;
/** Enough for trimmed page text (~10k chars ≈ 3k tokens) + the JSON answer. */
const EXTRACT_CONTEXT_SIZE = 4096;

/** Resolves the model file location for both packaged and dev runs. */
function resolveModelPath() {
  const packagedPath = path.join(process.resourcesPath || '', 'models', MODEL_FILENAME);
  if (app.isPackaged && fs.existsSync(packagedPath)) return packagedPath;
  const devPath = path.join(__dirname, '..', 'resources', 'models', MODEL_FILENAME);
  if (fs.existsSync(devPath)) return devPath;
  return packagedPath; // report this path in errors even if missing, for a clearer message
}

/** @type {Promise<{ llama: any, model: any }> | null} */
let modelPromise = null;
/** @type {Promise<{ session: any }> | null} */
let sessionPromise = null;

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_resolve, reject) => setTimeout(() => reject(new Error(label)), ms)),
  ]);
}

/** Lazily loads the runtime + model once; shared by both the chat session and extraction. */
function getModel() {
  if (modelPromise) return modelPromise;

  modelPromise = (async () => {
    const modelPath = resolveModelPath();
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Bundled model file not found at "${modelPath}".`);
    }
    const { getLlama } = await import('node-llama-cpp');
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath });
    return { llama, model };
  })();

  modelPromise.catch(() => {
    modelPromise = null; // allow a retry (e.g. after the user frees up RAM) on the next call
  });

  return modelPromise;
}

/** Persistent chat session for the short copywriting prompts. */
function getSession() {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const { model } = await getModel();
    const { LlamaChatSession } = await import('node-llama-cpp');
    const context = await model.createContext();
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });
    return { session };
  })();

  sessionPromise.catch(() => {
    sessionPromise = null;
  });

  return sessionPromise;
}

/**
 * Reports whether the bundled model is ready, currently loading, or
 * unavailable (e.g. the resource file is missing from this build).
 * @returns {Promise<{ state: 'connected'|'loading'|'unreachable', message?: string }>}
 */
async function getBundledAiStatus() {
  const modelPath = resolveModelPath();
  if (!fs.existsSync(modelPath)) {
    return {
      state: 'unreachable',
      message: `Built-in model file is missing from this build (expected at "${modelPath}").`,
    };
  }
  if (!sessionPromise && !modelPromise) {
    // Not yet loaded — that's fine, it loads lazily on first use.
    return { state: 'connected' };
  }
  try {
    await (sessionPromise ?? modelPromise);
    return { state: 'connected' };
  } catch (err) {
    return { state: 'unreachable', message: String(err?.message || err) };
  }
}

/**
 * Generates a short completion for the given prompt using the bundled model.
 * Always resolves (never throws) — failures come back as { ok: false, error }.
 * @param {string} prompt
 * @returns {Promise<{ ok: boolean, text?: string, error?: string }>}
 */
async function generateBundledAi(prompt) {
  let session;
  try {
    ({ session } = await withTimeout(getSession(), LOAD_TIMEOUT_MS, 'timeout'));
  } catch (err) {
    const detail = String(err?.message || err);
    if (detail === 'timeout') {
      return { ok: false, error: 'The built-in model timed out while loading. Try again in a moment.' };
    }
    return { ok: false, error: `The built-in model could not be loaded (${detail}).` };
  }

  try {
    const text = await withTimeout(
      session.prompt(prompt, { maxTokens: MAX_TAGLINE_TOKENS, temperature: 0.7 }),
      GENERATE_TIMEOUT_MS,
      'timeout',
    );
    return { ok: true, text: String(text || '').trim() };
  } catch (err) {
    const detail = String(err?.message || err);
    if (detail === 'timeout') {
      return { ok: false, error: 'The built-in model timed out. Try again.' };
    }
    return { ok: false, error: `The built-in model failed to respond (${detail}).` };
  }
}

/**
 * JSON schema for the supplier-page extraction. Every field is REQUIRED with
 * sentinel "not found" values (0 / "none" / "") instead of nullables — the
 * grammar then guarantees a complete, parseable object on every run, and the
 * caller maps sentinels back to undefined.
 */
const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    price: { type: 'number' },                          // total price in USD; 0 = not found
    size: { type: 'number' },                           // container size; 0 = not found
    unit: { type: 'string', enum: ['oz', 'lbs', 'ml', 'g', 'none'] },
  },
  required: ['productName', 'price', 'size', 'unit'],
};

/**
 * Extracts { productName, price, size, unit } from supplier product-page text
 * using the bundled model with a grammar-enforced JSON response. Runs in a
 * fresh context each time so the copywriting chat history never leaks in.
 *
 * Always resolves — failures come back as { ok: false, error }.
 * @param {string} pageText
 * @returns {Promise<{ ok: boolean, result?: { productName: string, price: number, size: number, unit: string }, error?: string }>}
 */
async function extractBundledAi(pageText) {
  let llama;
  let model;
  try {
    ({ llama, model } = await withTimeout(getModel(), LOAD_TIMEOUT_MS, 'timeout'));
  } catch (err) {
    const detail = String(err?.message || err);
    if (detail === 'timeout') {
      return { ok: false, error: 'The built-in model timed out while loading. Try again in a moment.' };
    }
    return { ok: false, error: `The built-in model could not be loaded (${detail}).` };
  }

  /** @type {any} */
  let context = null;
  try {
    const { LlamaChatSession } = await import('node-llama-cpp');
    const grammar = await llama.createGrammarForJsonSchema(EXTRACT_SCHEMA);
    context = await model.createContext({ contextSize: EXTRACT_CONTEXT_SIZE });
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });

    // Leave room in the context window for the instructions + JSON answer.
    const trimmed = String(pageText || '').slice(0, 10_000);
    const prompt =
      'You are a shopping assistant. From the following supplier product page text, extract:\n' +
      '- productName: the short product title ("" if not found)\n' +
      '- price: the TOTAL price in US dollars of one container (0 if not found)\n' +
      '- size: the container size as a number (0 if not found)\n' +
      '- unit: the size unit, exactly one of "oz", "lbs", "ml", "g", or "none" if not found.\n' +
      '  Convert: kg → g (multiply by 1000), liters → ml (multiply by 1000), fl oz → oz, pounds → lbs.\n' +
      'If several sizes are offered, pick the one matching the shown price.\n\n' +
      `PAGE TEXT:\n${trimmed}`;

    const raw = await withTimeout(
      session.prompt(prompt, { grammar, maxTokens: 256, temperature: 0 }),
      EXTRACT_TIMEOUT_MS,
      'timeout',
    );
    const parsed = grammar.parse(raw);
    return { ok: true, result: parsed };
  } catch (err) {
    const detail = String(err?.message || err);
    if (detail === 'timeout') {
      return { ok: false, error: 'The built-in model took too long reading that page. You can type the price manually.' };
    }
    return { ok: false, error: `The built-in model failed to read the page (${detail}).` };
  } finally {
    // Free the KV cache immediately — extraction is a one-shot operation.
    if (context) {
      try { await context.dispose(); } catch { /* already disposed */ }
    }
  }
}

module.exports = { getBundledAiStatus, generateBundledAi, extractBundledAi };
