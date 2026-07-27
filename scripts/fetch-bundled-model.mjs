// Downloads the bundled local-AI model into resources/models/ if it isn't
// already there. Not run automatically on `npm install` — run manually once
// before `npm run dist:win`, or any time resources/models/ is empty.
//
// Model: Qwen2.5-0.5B-Instruct Q4_K_M (~700 MB) — lightweight fallback when
// Ollama (e.g. over Tailscale HTTPS) is unreachable. Apache-2.0 license.
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Superseded model files — removed so extraResources doesn't ship them. */
const OBSOLETE_MODELS = ['Qwen3-4B-Instruct-2507-Q4_K_M.gguf'];
const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen2.5-0.5b-instruct-q4_k_m.gguf';
const EXPECTED_MIN_BYTES = 350 * 1024 * 1024; // ~700 MB quantized

const outDir = path.join(__dirname, '..', 'resources', 'models');
const outPath = path.join(outDir, MODEL_FILENAME);

async function main() {
  for (const old of OBSOLETE_MODELS) {
    const oldPath = path.join(outDir, old);
    if (existsSync(oldPath)) {
      unlinkSync(oldPath);
      console.log(`[fetch-bundled-model] Removed obsolete model: ${old}`);
    }
  }

  if (existsSync(outPath) && statSync(outPath).size > EXPECTED_MIN_BYTES) {
    console.log(`[fetch-bundled-model] Already present: ${outPath}`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  console.log(`[fetch-bundled-model] Downloading ${MODEL_URL}`);
  console.log('[fetch-bundled-model] (~700 MB — this can take a few minutes)');
  const res = await fetch(MODEL_URL, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`Download failed: HTTP ${res.status}`);
  }

  await pipeline(res.body, createWriteStream(outPath));

  const size = statSync(outPath).size;
  if (size < EXPECTED_MIN_BYTES) {
    throw new Error(`Downloaded file looks too small (${size} bytes) — download may have failed.`);
  }
  console.log(`[fetch-bundled-model] Saved ${outPath} (${(size / 1024 / 1024).toFixed(1)} MiB)`);
}

main().catch((err) => {
  console.error('[fetch-bundled-model] Failed:', err);
  process.exitCode = 1;
});
