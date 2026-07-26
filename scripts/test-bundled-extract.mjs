// Standalone sanity test for the bundled-AI supplier-page extraction.
//
// Mirrors electron/bundledAi.cjs's extractBundledAi() — same model file, same
// JSON schema, same grammar-constrained prompt — but runs under plain Node so
// it can be exercised without launching Electron:
//
//   npm run ai:fetch-model        # once (~2.4 GB)
//   node scripts/test-bundled-extract.mjs
//
// Prints the parsed JSON for two synthetic supplier pages and exits non-zero
// if the model misses the price/size, so it doubles as a regression check
// after swapping models or bumping node-llama-cpp.
import path from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL_PATH = path.join(
  __dirname, '..', 'resources', 'models', 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf',
);

// Keep in sync with EXTRACT_SCHEMA in electron/bundledAi.cjs.
const EXTRACT_SCHEMA = {
  type: 'object',
  properties: {
    productName: { type: 'string' },
    price: { type: 'number' },
    size: { type: 'number' },
    unit: { type: 'string', enum: ['oz', 'lbs', 'ml', 'g', 'none'] },
  },
  required: ['productName', 'price', 'size', 'unit'],
};

// Keep in sync with the prompt in electron/bundledAi.cjs.
function buildPrompt(pageText) {
  return (
    'You are a shopping assistant. From the following supplier product page text, extract:\n' +
    '- productName: the short product title ("" if not found)\n' +
    '- price: the TOTAL price in US dollars of one container (0 if not found)\n' +
    '- size: the container size as a number (0 if not found)\n' +
    '- unit: the size unit, exactly one of "oz", "lbs", "ml", "g", or "none" if not found.\n' +
    '  Convert: kg → g (multiply by 1000), liters → ml (multiply by 1000), fl oz → oz, pounds → lbs.\n' +
    'If several sizes are offered, pick the one matching the shown price.\n\n' +
    `PAGE TEXT:\n${String(pageText || '').slice(0, 10_000)}`
  );
}

/** Messy, realistic page-text samples (the tiers before AI failed on these). */
const SAMPLES = [
  {
    name: 'EO bottle (ml, sale price noise)',
    text: `PAGE TITLE: Lavender Essential Oil | Rosa's Soap Supply
      Home / Essential Oils / Lavender Free shipping on orders over $59!
      Lavender Essential Oil (Bulgarian) ★★★★★ 4.8 (231 reviews)
      Was $18.99 Now $13.49 Add to cart Size: 30 ml amber glass bottle with
      euro dropper. 100% pure lavandula angustifolia. Customers also bought:
      Tea Tree Oil $8.99, Sweet Orange $6.49. Sign up and save 10%!`,
    expect: { priceMin: 13, priceMax: 13.99, size: 30, unit: 'ml' },
  },
  {
    name: 'Shea butter (pound tub)',
    text: `PAGE TITLE: Raw Unrefined Shea Butter — Bulk Tub
      Ivory shea butter, unrefined, imported from Ghana. Perfect for melt &
      pour soap. Price: $24.00 per 5 lb tub (approx. 2.27 kg). In stock.
      Ships in 2 days. Reviews (58). Related: cocoa butter 1 lb $9.50.`,
    expect: { priceMin: 24, priceMax: 24, size: 5, unit: 'lbs' },
  },
];

async function main() {
  if (!existsSync(MODEL_PATH)) {
    console.error(`Model not found at ${MODEL_PATH} — run \`npm run ai:fetch-model\` first.`);
    process.exit(2);
  }

  console.log('[test] Loading node-llama-cpp + model (first load takes a moment)…');
  const t0 = Date.now();
  const { getLlama, LlamaChatSession } = await import('node-llama-cpp');
  const llama = await getLlama();
  const model = await llama.loadModel({ modelPath: MODEL_PATH });
  console.log(`[test] Model loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const grammar = await llama.createGrammarForJsonSchema(EXTRACT_SCHEMA);
  let failures = 0;

  for (const sample of SAMPLES) {
    console.log(`\n[test] Sample: ${sample.name}`);
    const t1 = Date.now();
    // Fresh context per extraction — mirrors bundledAi.cjs exactly.
    const context = await model.createContext({ contextSize: 4096 });
    try {
      const session = new LlamaChatSession({ contextSequence: context.getSequence() });
      const raw = await session.prompt(buildPrompt(sample.text), {
        grammar,
        maxTokens: 256,
        temperature: 0,
      });
      const parsed = grammar.parse(raw);
      const secs = ((Date.now() - t1) / 1000).toFixed(1);
      console.log(`[test] → ${JSON.stringify(parsed)} (${secs}s)`);

      const { priceMin, priceMax, size, unit } = sample.expect;
      const ok =
        parsed.price >= priceMin && parsed.price <= priceMax &&
        parsed.size === size && parsed.unit === unit;
      if (!ok) {
        failures++;
        console.error(`[test] ✗ expected price ${priceMin}–${priceMax}, size ${size} ${unit}`);
      } else {
        console.log('[test] ✓ price/size/unit all correct');
      }
    } finally {
      await context.dispose();
    }
  }

  console.log(failures === 0 ? '\n[test] All extractions correct.' : `\n[test] ${failures} failure(s).`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('[test] Failed:', err);
  process.exit(1);
});
