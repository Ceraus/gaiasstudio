/**
 * Generate bundled ingredient PNGs via the existing ComfyUI connection.
 *
 * Default: iterate src/data/offlineIngredientCatalog.json, skip files that
 * already exist, write public/assets/icons/ingredients/{slug}.png.
 *
 *   node scripts/generateComfyIcons.mjs
 *   node scripts/generateComfyIcons.mjs --ollama   (legacy one-shot via Ollama)
 *
 * Does not fail the catalog feature if Comfy is down.
 */
import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUTPUT_DIR = path.join(root, 'public/assets/icons/ingredients');
const CATALOG_FILE = path.join(root, 'src/data/offlineIngredientCatalog.json');
const SLUGS_FILE = path.join(root, 'src/data/bundledIngredientIconSlugs.json');
const PROGRESS_FILE = path.join(root, '.tmp-comfy-icons-progress.json');
const WORKFLOW_FILE = path.join(root, 'comfy_workflow_api.json');

const COMFY_CANDIDATES = [
  process.env.COMFYUI_URL,
  'http://100.90.140.100:8188',
  'http://127.0.0.1:8188',
  'http://localhost:8188',
].filter(Boolean).map((url) => url.replace(/\/$/, ''));

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434/api/generate';
const OLLAMA_MODEL = 'llama3.1:8b';
const ICON_SIZE = 256;
const ICON_STEPS = 8;
const POLL_MS = 500;
const JOB_TIMEOUT_MS = 90_000;
const BETWEEN_JOBS_MS = 400;
const PER_ITEM_RETRIES = 2;
const PING_RETRIES = 3;
const MAX_CONSECUTIVE_FAILURES = 8;

const FRUIT_SUBJECTS = [
  ['passion fruit', 'a halved passion fruit: wrinkled purple rind, golden pulp, and seeds'],
  ['dragon fruit', 'a sliced dragon fruit: pink skin and white flesh dotted with black seeds'],
  ['sea buckthorn', 'a handful of bright orange sea-buckthorn berries — not the shrub'],
  ['watermelon', 'a watermelon wedge: green striped rind, bright pink flesh, black seeds'],
  ['strawberry', 'one red strawberry fruit with yellow seeds and a green leafy cap'],
  ['blueberry', 'a few round dusty-blue blueberries'],
  ['raspberry', 'a red raspberry fruit, hollow and bumpy'],
  ['pomegranate', 'a cut pomegranate showing ruby arils inside a red rind'],
  ['grapefruit', 'a pink grapefruit half with visible segments'],
  ['pineapple', 'a pineapple fruit with golden flesh and a spiky green crown'],
  ['avocado', 'a halved avocado fruit: green flesh and a large brown pit'],
  ['coconut', 'a brown coconut fruit cracked open to show thick white meat'],
  ['mango', 'a ripe mango fruit, one cheek sliced to show orange flesh'],
  ['peach', 'a fuzzy orange-pink peach fruit'],
  ['apricot', 'a small orange apricot fruit'],
  ['olive', 'a few green and black olive fruits'],
  ['lemon', 'a bright yellow lemon fruit and one round lemon slice'],
  ['orange', 'a whole orange fruit and one cross-section slice'],
  ['lime', 'a bright green lime fruit and one round lime slice'],
  ['grape', 'a small bunch of purple grapes'],
  ['apple', 'a red apple fruit, one wedge cut to show pale flesh'],
  ['rosehip', 'bright red oval rose-hip fruits'],
  ['rose hip', 'bright red oval rose-hip fruits'],
  ['cucumber', 'a green cucumber fruit, one diagonal slice'],
  ['cherry', 'a pair of glossy red cherries with short stems'],
];

const OBJECT_SUBJECTS = [
  ['peppermint', 'a sprig of peppermint leaves'],
  ['lavender', 'a purple lavender flower spike'],
  ['oatmeal', 'a small pile of rolled oat flakes'],
  ['honey', 'a honey dipper with a golden honey drop'],
  ['glycerin base', 'a translucent glycerin soap cube'],
  ['glycerin', 'a clear glycerin soap block'],
  ['shea', 'a jar of creamy shea butter'],
  ['charcoal', 'a black charcoal chunk'],
  ['vanilla', 'dark brown vanilla beans'],
  ['cinnamon', 'rolled cinnamon sticks'],
  ['coffee', 'roasted coffee beans'],
  ['clay', 'a bowl of colored clay'],
  ['rose', 'a pink rose blossom'],
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_SLUG_LEN = 240;

function shortHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

function fitWindowsSlug(slug) {
  if (slug.length <= MAX_SLUG_LEN) return slug;
  return `${slug.slice(0, MAX_SLUG_LEN - 9)}-${shortHash(slug)}`;
}

function slugify(value) {
  const slug = String(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return fitWindowsSlug(slug);
}

function hasPhrase(haystack, phrase) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(haystack);
}

function resolveSubject(ingredientName) {
  const raw = ingredientName.trim() || 'ingredient';
  const key = raw.toLowerCase();
  for (const [needle, text] of [...OBJECT_SUBJECTS].sort((a, b) => b[0].length - a[0].length)) {
    if (hasPhrase(key, needle)) return { text, fruit: false };
  }
  for (const [needle, text] of [...FRUIT_SUBJECTS].sort((a, b) => b[0].length - a[0].length)) {
    if (hasPhrase(key, needle)) return { text: `${text}. Show the fruit only — no plant, vine, tree, or leaves`, fruit: true };
  }
  return {
    text: `the recognizable object of ${raw} itself — if that is a fruit, draw the fruit, never a plant`,
    fruit: false,
  };
}

function iconPrompt(subject) {
  if (subject.fruit) {
    return [
      `Simple flat grocery-sticker icon of ${subject.text}, centered.`,
      'Draw the edible fruit. Do not draw a plant, vine, tree, bush, garden, or foliage.',
      'Solid colors, clean shapes, no letters.',
      'No text, no typography, no words, no initials, no monogram, no logo letters.',
      'White background.',
    ].join(' ');
  }
  return [
    `Simple flat illustration of ${subject.text}, centered.`,
    'Pictorial symbol of that object only.',
    'Solid colors, clean shapes, no outlines of letters.',
    'No text, no typography, no words, no initials, no monogram, no logo letters.',
    'White background.',
  ].join(' ');
}

function getWorkflow(ingredientName) {
  const subject = resolveSubject(ingredientName);
  const prompt = iconPrompt(subject);
  const negative = subject.fruit
    ? 'plant, vine, foliage, leaves, leaf, tree, bush, stem, garden, botanic, seedling, grass, herb sprig, text, letters, typography, monogram, watermark, logo initials, words, 3d, photo, shadow, gradient'
    : 'text, letters, typography, monogram, watermark, logo initials, words, 3d, photo, shadow, gradient';
  return {
    '3': {
      inputs: {
        seed: Math.floor(Math.random() * 1_000_000_000),
        steps: ICON_STEPS,
        cfg: 1,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1,
        model: ['4', 0],
        positive: ['6', 0],
        negative: ['7', 0],
        latent_image: ['5', 0],
      },
      class_type: 'KSampler',
    },
    '4': {
      inputs: { ckpt_name: 'flux2_klein_4b.safetensors' },
      class_type: 'CheckpointLoaderSimple',
    },
    '5': {
      inputs: { width: ICON_SIZE, height: ICON_SIZE, batch_size: 1 },
      class_type: 'EmptyLatentImage',
    },
    '6': {
      inputs: { text: prompt, clip: ['4', 1] },
      class_type: 'CLIPTextEncode',
    },
    '7': {
      inputs: { text: negative, clip: ['4', 1] },
      class_type: 'CLIPTextEncode',
    },
    '8': {
      inputs: { samples: ['3', 0], vae: ['4', 2] },
      class_type: 'VAEDecode',
    },
    '9': {
      inputs: { filename_prefix: 'gaias_ingredient', images: ['8', 0] },
      class_type: 'SaveImage',
    },
  };
}

async function fetchWithTimeout(url, init = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function pingComfy(baseUrl) {
  for (const pathName of ['/system_stats', '/queue', '/history']) {
    try {
      const res = await fetchWithTimeout(`${baseUrl}${pathName}`, {}, 2500);
      if (res.status > 0 && res.status < 500) return true;
    } catch {
      return false;
    }
  }
  return false;
}

async function findComfyBase() {
  for (let attempt = 1; attempt <= PING_RETRIES; attempt++) {
    for (const baseUrl of [...new Set(COMFY_CANDIDATES)]) {
      const ok = await pingComfy(baseUrl);
      if (ok) {
        console.log(`✅ ComfyUI reachable at ${baseUrl}`);
        return baseUrl;
      }
    }
    console.warn(`ComfyUI not reachable (attempt ${attempt}/${PING_RETRIES})`);
    if (attempt < PING_RETRIES) await sleep(1500 * attempt);
  }
  return null;
}

async function submitJob(baseUrl, ingredientName) {
  let workflow = getWorkflow(ingredientName);
  try {
    const raw = await fs.readFile(WORKFLOW_FILE, 'utf8');
    const disk = JSON.parse(raw);
    if (disk['4']?.inputs?.ckpt_name) {
      workflow['4'].inputs.ckpt_name = disk['4'].inputs.ckpt_name;
    }
  } catch {
    // bundled compact workflow is enough
  }
  const response = await fetchWithTimeout(`${baseUrl}/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: workflow }),
  }, 12_000);
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`ComfyUI submit ${response.status}: ${errText.slice(0, 200)}`);
  }
  const data = await response.json();
  if (!data.prompt_id) throw new Error('ComfyUI did not return a prompt id');
  return data.prompt_id;
}

async function waitForImage(baseUrl, promptId) {
  const deadline = Date.now() + JOB_TIMEOUT_MS;
  while (Date.now() < deadline) {
    try {
      const response = await fetchWithTimeout(`${baseUrl}/history/${promptId}`, {}, 8000);
      if (response.ok) {
        const history = await response.json();
        const entry = history[promptId];
        if (entry?.status?.status_str === 'error') throw new Error('ComfyUI job failed');
        const filename = entry?.outputs?.['9']?.images?.[0]?.filename;
        if (filename) return filename;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'ComfyUI job failed') throw error;
    }
    await sleep(POLL_MS);
  }
  throw new Error(`ComfyUI timed out after ${JOB_TIMEOUT_MS / 1000}s`);
}

function toFsPath(filePath) {
  if (process.platform !== 'win32') return filePath;
  const resolved = path.resolve(filePath);
  if (resolved.startsWith('\\\\?\\')) return resolved;
  if (resolved.startsWith('\\\\')) return `\\\\?\\UNC\\${resolved.slice(2)}`;
  return `\\\\?\\${resolved}`;
}

function pngPath(slug) {
  return path.join(OUTPUT_DIR, `${slug}.png`);
}

function pngExists(slug) {
  return fsSync.existsSync(toFsPath(pngPath(slug)));
}

async function downloadImage(baseUrl, filename, outPath) {
  const response = await fetchWithTimeout(
    `${baseUrl}/view?filename=${encodeURIComponent(filename)}&type=output&subfolder=`,
    {},
    10_000,
  );
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(toFsPath(outPath), buffer);
}

async function listPngSlugs() {
  try {
    const files = await fs.readdir(OUTPUT_DIR);
    return files.filter((file) => file.toLowerCase().endsWith('.png'))
      .map((file) => file.replace(/\.png$/i, ''))
      .sort();
  } catch {
    return [];
  }
}

async function writeSlugsJson() {
  const slugs = await listPngSlugs();
  await writeJsonAtomic(SLUGS_FILE, slugs);
  return slugs.length;
}

async function writeJsonAtomic(filePath, value) {
  const tmp = `${filePath}.tmp`;
  await fs.writeFile(tmp, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rm(filePath, { force: true });
  await fs.rename(tmp, filePath);
}

async function writeProgress(progress) {
  await writeJsonAtomic(PROGRESS_FILE, progress);
}

async function generateOne(baseUrl, name, slug) {
  const outPath = pngPath(slug);
  let lastErr;
  for (let attempt = 1; attempt <= PER_ITEM_RETRIES; attempt++) {
    try {
      const promptId = await submitJob(baseUrl, name);
      const filename = await waitForImage(baseUrl, promptId);
      await downloadImage(baseUrl, filename, outPath);
      return;
    } catch (error) {
      lastErr = error;
      if (attempt < PER_ITEM_RETRIES) await sleep(600 * attempt);
    }
  }
  throw lastErr ?? new Error('Unknown ComfyUI failure');
}

async function getIngredientFromOllama() {
  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt: 'You are an expert soap maker. Generate EXACTLY ONE raw ingredient used in cold-process botanical soap. Return ONLY the name.',
      stream: false,
      keep_alive: 0,
    }),
  });
  if (!response.ok) throw new Error(`Ollama failed: ${response.statusText}`);
  const data = await response.json();
  return String(data.response || '').trim().replace(/['"]/g, '');
}

function loadCatalogTargets() {
  const catalog = JSON.parse(fsSync.readFileSync(CATALOG_FILE, 'utf8'));
  return catalog.map((row) => ({
    name: row.name,
    slug: slugify(row.iconKey || row.name),
  })).filter((row) => row.slug);
}

async function runCatalog(baseUrl) {
  const targets = loadCatalogTargets();
  const existing = new Set(await listPngSlugs());
  const missing = targets.filter((row) => !existing.has(row.slug));
  const progress = {
    startedAt: new Date().toISOString(),
    total: targets.length,
    alreadyHad: existing.size,
    missing: missing.length,
    generated: [],
    failed: [],
    skipped: [...existing],
    aborted: false,
    finishedAt: null,
  };
  await writeProgress(progress);
  console.log(`Catalog icons: ${targets.length} total, ${existing.size} exist, ${missing.length} to generate`);

  if (!missing.length) {
    progress.finishedAt = new Date().toISOString();
    await writeProgress(progress);
    await writeSlugsJson();
    console.log('Nothing to generate.');
    return progress;
  }

  let consecutiveFails = 0;
  for (let i = 0; i < missing.length; i++) {
    const item = missing[i];
    if (pngExists(item.slug)) {
      progress.skipped.push(item.slug);
      continue;
    }
    try {
      await generateOne(baseUrl, item.name, item.slug);
      progress.generated.push(item.slug);
      consecutiveFails = 0;
      console.log(`🎨 [${progress.generated.length}/${missing.length}] ${item.name} → ${item.slug}.png`);
      if (progress.generated.length % 5 === 0) {
        await writeSlugsJson();
        await writeProgress(progress);
      }
    } catch (error) {
      consecutiveFails += 1;
      progress.failed.push({ slug: item.slug, name: item.name, error: String(error?.message || error) });
      console.warn(`❌ ${item.name}: ${error?.message || error}`);
      await writeProgress(progress);
      if (consecutiveFails >= MAX_CONSECUTIVE_FAILURES) {
        console.warn(`Logged ${MAX_CONSECUTIVE_FAILURES} consecutive failures — continuing with remaining slugs.`);
        consecutiveFails = 0;
      }
    }
    await sleep(BETWEEN_JOBS_MS);
  }

  progress.finishedAt = new Date().toISOString();
  await writeSlugsJson();
  await writeProgress(progress);
  console.log(`Done. generated=${progress.generated.length} failed=${progress.failed.length} aborted=${progress.aborted}`);
  return progress;
}

async function main() {
  const ollamaMode = process.argv.includes('--ollama');
  const baseUrl = await findComfyBase();
  if (!baseUrl) {
    const progress = {
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      aborted: true,
      generated: [],
      failed: [{ slug: '*', name: '*', error: 'ComfyUI unreachable' }],
    };
    await writeProgress(progress).catch(() => {});
    console.warn('ComfyUI is down — skipping icon generation. Catalog/autocomplete still work with SVG fallbacks.');
    process.exit(0);
  }

  if (ollamaMode) {
    const ingredient = await getIngredientFromOllama();
    const slug = slugify(ingredient);
    await generateOne(baseUrl, ingredient, slug);
    await writeSlugsJson();
    console.log(`🎉 ${slug}.png`);
    return;
  }

  await runCatalog(baseUrl);
}

main().catch((error) => {
  console.error(error);
  process.exit(0);
});
