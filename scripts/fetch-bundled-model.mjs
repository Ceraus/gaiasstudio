// Downloads the bundled local-AI model into resources/models/ if it isn't
// already there. Not run automatically on `npm install` (it's a ~2.4GB
// download) — run it manually once before `npm run dist:win`, or any time
// resources/models/ is empty after a fresh clone.
//
// Model: Qwen3-4B-Instruct-2507 (the non-thinking instruct variant),
// Q4_K_M GGUF quantization, Apache-2.0 license.
//
// Why this model: one 4B-class model handles BOTH bundled-AI jobs —
// coherent short marketing taglines for the "Suggest" assist AND reliable
// JSON extraction of price/size from supplier product pages (backed by a
// grammar in electron/bundledAi.cjs). It runs comfortably CPU-only on the
// target hardware (8-core desktop, 64GB RAM), and it's genuinely bilingual
// (EN/ES) so Spanish benefit suggestions work too.
import { createWriteStream, existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** Superseded model files — removed so extraResources doesn't ship them too. */
const OBSOLETE_MODELS = ['qwen2.5-0.5b-instruct-q4_k_m.gguf'];
const MODEL_URL =
  'https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q4_K_M.gguf';
const MODEL_FILENAME = 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf';
const EXPECTED_MIN_BYTES = 2.2 * 1024 * 1024 * 1024; // sanity floor; real file is ~2.33 GiB

const outDir = path.join(__dirname, '..', 'resources', 'models');
const outPath = path.join(outDir, MODEL_FILENAME);

async function main() {
  // Drop superseded models so the packaged app doesn't ship 3 GB of weights.
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
  console.log('[fetch-bundled-model] (~2.4 GB — this can take a while)');
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
