// Downloads the bundled local-AI model into resources/models/ if it isn't
// already there. Not run automatically on `npm install` (it's a ~490MB
// download) — run it manually once before `npm run dist:win`, or any time
// resources/models/ is empty after a fresh clone.
//
// Model: Qwen2.5-0.5B-Instruct, Q4_K_M GGUF quantization, Apache-2.0 license.
// Chosen as the smallest instruction-tuned model that still produces
// coherent short marketing taglines for the "Suggest" copywriting assist.
import { createWriteStream, existsSync, mkdirSync, statSync } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_URL =
  'https://huggingface.co/Qwen/Qwen2.5-0.5B-Instruct-GGUF/resolve/main/qwen2.5-0.5b-instruct-q4_k_m.gguf';
const MODEL_FILENAME = 'qwen2.5-0.5b-instruct-q4_k_m.gguf';
const EXPECTED_MIN_BYTES = 400 * 1024 * 1024; // sanity floor; real file is ~468 MiB

const outDir = path.join(__dirname, '..', 'resources', 'models');
const outPath = path.join(outDir, MODEL_FILENAME);

async function main() {
  if (existsSync(outPath) && statSync(outPath).size > EXPECTED_MIN_BYTES) {
    console.log(`[fetch-bundled-model] Already present: ${outPath}`);
    return;
  }

  mkdirSync(outDir, { recursive: true });
  console.log(`[fetch-bundled-model] Downloading ${MODEL_URL}`);
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
