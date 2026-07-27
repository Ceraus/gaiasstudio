// Gaia's Label Studio — bundled local AI (main process).
//
// Lightweight ~700MB fallback when Ollama (e.g. over Tailscale HTTPS) is
// unreachable. Runs a small instruction-tuned GGUF model in-process via
// node-llama-cpp so copywriting assist works out of the box in the desktop app.
// Model: Qwen2.5-0.5B-Instruct (Apache-2.0), quantized to Q4_K_M,
// shipped as an extraResource (see package.json's `build.extraResources`).
//
// node-llama-cpp is an ESM-only native-addon package; this file stays
// CommonJS (like the rest of electron/) and uses dynamic import() to load it.
//
// Scope: narrow copywriting-assist prompt only, invoked from
// src/lib/localAi.ts. Never used for COGS/pricing or INCI/compliance text.
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const MODEL_FILENAME = 'qwen2.5-0.5b-instruct-q4_k_m.gguf';
const MAX_TOKENS = 60;
const GENERATE_TIMEOUT_MS = 30_000;

/** Resolves the model file location for both packaged and dev runs. */
function resolveModelPath() {
  const packagedPath = path.join(process.resourcesPath || '', 'models', MODEL_FILENAME);
  if (app.isPackaged && fs.existsSync(packagedPath)) return packagedPath;
  const devPath = path.join(__dirname, '..', 'resources', 'models', MODEL_FILENAME);
  if (fs.existsSync(devPath)) return devPath;
  return packagedPath; // report this path in errors even if missing, for a clearer message
}

/** @type {Promise<{ session: import('node-llama-cpp').LlamaChatSession }> | null} */
let sessionPromise = null;
let lastLoadError = null;

/** Lazily loads the model once, then reuses the same chat session for every call. */
function getSession() {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    const modelPath = resolveModelPath();
    if (!fs.existsSync(modelPath)) {
      throw new Error(`Bundled model file not found at "${modelPath}".`);
    }

    const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
    const llama = await getLlama();
    const model = await llama.loadModel({ modelPath });
    const context = await model.createContext();
    const session = new LlamaChatSession({ contextSequence: context.getSequence() });
    return { session };
  })();

  sessionPromise.catch((err) => {
    lastLoadError = err;
    sessionPromise = null; // allow a retry (e.g. after the user frees up RAM) on the next call
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
  if (!sessionPromise) {
    // Not yet loaded — that's fine, it loads lazily on first "Suggest" click.
    return { state: 'connected' };
  }
  try {
    await sessionPromise;
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
    const timeout = new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('timeout')), GENERATE_TIMEOUT_MS),
    );
    ({ session } = await Promise.race([getSession(), timeout]));
  } catch (err) {
    const detail = String(err?.message || err);
    if (detail === 'timeout') {
      return { ok: false, error: 'The built-in model timed out while loading. Try again in a moment.' };
    }
    return { ok: false, error: `The built-in model could not be loaded (${detail}).` };
  }

  try {
    const text = await Promise.race([
      session.prompt(prompt, { maxTokens: MAX_TOKENS, temperature: 0.7 }),
      new Promise((_resolve, reject) => setTimeout(() => reject(new Error('timeout')), GENERATE_TIMEOUT_MS)),
    ]);
    return { ok: true, text: String(text || '').trim() };
  } catch (err) {
    const detail = String(err?.message || err);
    if (detail === 'timeout') {
      return { ok: false, error: 'The built-in model timed out. Try again.' };
    }
    return { ok: false, error: `The built-in model failed to respond (${detail}).` };
  }
}

module.exports = { getBundledAiStatus, generateBundledAi };
