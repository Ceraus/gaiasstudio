import { unloadOllamaModels, type LocalAiSettingsSlice } from '@/lib/localAi';
import { withAiActivity } from '@/lib/aiActivity';
import { assetsRepo } from '@/db/repositories';
import { friendlyLanError, lanFetch } from '@/lib/lanFetch';

const GENERATE_TIMEOUT_MS = 30_000;
const POLL_MS = 250;
const ICON_SIZE = 256;
const ICON_STEPS = 8;
const LAST_GOOD_KEY = 'gaia:comfy-last-good';
const PROBE_PATHS = ['/system_stats', '/queue', '/history'] as const;
const LOCAL_FALLBACKS = ['http://127.0.0.1:8188', 'http://localhost:8188'] as const;

let lastGoodUrl: string | null = null;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function normalizeComfyBaseUrl(raw: string | undefined | null): string {
  const trimmed = (raw ?? '').trim().replace(/\/$/, '');
  if (!trimmed) return 'http://127.0.0.1:8188';
  if (!/^https?:\/\//i.test(trimmed)) return `http://${trimmed}`.replace(/\/$/, '');
  return trimmed;
}

function readLastGood(): string | null {
  try {
    const stored = sessionStorage.getItem(LAST_GOOD_KEY);
    return stored ? normalizeComfyBaseUrl(stored) : null;
  } catch {
    return null;
  }
}

function writeLastGood(url: string): void {
  const normalized = normalizeComfyBaseUrl(url);
  lastGoodUrl = normalized;
  try { sessionStorage.setItem(LAST_GOOD_KEY, normalized); } catch { /* ignore */ }
}

export function getLastGoodComfyUrl(): string | null {
  return lastGoodUrl ?? readLastGood();
}

export function invalidateComfyBase(url?: string): void {
  const current = lastGoodUrl ?? readLastGood();
  if (url && current && normalizeComfyBaseUrl(url) !== current) return;
  lastGoodUrl = null;
  try { sessionStorage.removeItem(LAST_GOOD_KEY); } catch { /* ignore */ }
}

/** If Ollama is on a Tailscale host, ComfyUI is often on the same machine at :8188. */
export function comfyUrlFromOllama(ollamaUrl?: string): string | null {
  const raw = (ollamaUrl ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    if (!parsed.hostname || parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost') return null;
    return `http://${parsed.hostname}:8188`;
  } catch {
    return null;
  }
}

/** Preferred URL, last known-good, Ollama host, then localhost — unique, in that hunt order. */
export function comfyUrlCandidates(settings: LocalAiSettingsSlice): string[] {
  const preferred = normalizeComfyBaseUrl(settings.comfyUiUrl);
  const lastGood = lastGoodUrl ?? readLastGood();
  const fromOllama = comfyUrlFromOllama(settings.ollamaUrl);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const url of [lastGood, preferred, fromOllama, ...LOCAL_FALLBACKS]) {
    if (!url) continue;
    const normalized = normalizeComfyBaseUrl(url);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

type IconKind = 'fruit' | 'object';

interface IconSubject {
  text: string;
  kind: IconKind;
}

function hasPhrase(haystack: string, phrase: string): boolean {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${escaped}(?:$|[^a-z0-9])`).test(haystack);
}

/** Grocery-produce subjects: the edible fruit, never the vine/tree/plant. */
const FRUIT_SUBJECTS: Array<[string, string]> = [
  ['passion fruit', 'a halved passion fruit: wrinkled purple rind, golden pulp, and seeds'],
  ['dragon fruit', 'a sliced dragon fruit: pink skin and white flesh dotted with black seeds'],
  ['prickly pear', 'a magenta prickly-pear cactus fruit, oval and ripe — not the cactus pads'],
  ['star fruit', 'a yellow starfruit cut into a five-point star slice'],
  ['starfruit', 'a yellow starfruit cut into a five-point star slice'],
  ['sea buckthorn', 'a handful of bright orange sea-buckthorn berries — not the shrub'],
  ['black currant', 'a cluster of shiny black currant berries'],
  ['red currant', 'a cluster of translucent red currant berries'],
  ['blood orange', 'a blood-orange half: orange rind and deep red flesh'],
  ['key lime', 'a small bright-green key lime, whole, with one wedge beside it'],
  ['watermelon', 'a watermelon wedge: green striped rind, bright pink flesh, black seeds'],
  ['cantaloupe', 'an orange cantaloupe wedge with a beige netted rind'],
  ['honeydew', 'a pale-green honeydew melon wedge'],
  ['strawberry', 'one red strawberry fruit with yellow seeds and a green leafy cap'],
  ['blueberry', 'a few round dusty-blue blueberries'],
  ['raspberry', 'a red raspberry fruit, hollow and bumpy'],
  ['blackberry', 'a glossy dark blackberry fruit'],
  ['cranberry', 'a few shiny red cranberries'],
  ['pomegranate', 'a cut pomegranate showing ruby arils inside a red rind'],
  ['grapefruit', 'a pink grapefruit half with visible segments'],
  ['pineapple', 'a pineapple fruit with golden flesh and a spiky green crown — the fruit, not the plant'],
  ['tangerine', 'a small orange tangerine, peeled back to show the fruit'],
  ['mandarin', 'a small loose-skin mandarin orange fruit'],
  ['clementine', 'a small bright-orange clementine fruit'],
  ['bergamot', 'a yellow-green bergamot citrus fruit, slightly pear-shaped'],
  ['rosehip', 'bright red oval rose-hip fruits — the hips, not the rose bush'],
  ['rose hip', 'bright red oval rose-hip fruits — the hips, not the rose bush'],
  ['cucumber', 'a green cucumber fruit, one diagonal slice showing pale seeds'],
  ['avocado', 'a halved avocado fruit: green flesh and a large brown pit'],
  ['coconut', 'a brown coconut fruit cracked open to show thick white meat'],
  ['mango', 'a ripe mango fruit, yellow-orange skin, one cheek sliced to show orange flesh'],
  ['peach', 'a fuzzy orange-pink peach fruit with a cleft'],
  ['apricot', 'a small orange apricot fruit with a visible seam'],
  ['nectarine', 'a smooth orange-red nectarine fruit'],
  ['papaya', 'a halved papaya fruit: orange flesh and black seeds'],
  ['banana', 'a yellow banana fruit, slightly curved'],
  ['cherry', 'a pair of glossy red cherries with short stems — the fruit, not blossoms'],
  ['apple', 'a red apple fruit, one wedge cut to show pale flesh'],
  ['pear', 'a green-yellow pear fruit'],
  ['plum', 'a purple plum fruit with a dusty bloom'],
  ['olive', 'a few green and black olive fruits — not an olive tree'],
  ['lemon', 'a bright yellow lemon fruit and one round lemon slice'],
  ['orange', 'a whole orange fruit and one cross-section slice'],
  ['lime', 'a bright green lime fruit and one round lime slice'],
  ['grape', 'a small bunch of purple grapes — the fruit, not grape leaves'],
  ['guava', 'a halved guava fruit: pale flesh and a seed center'],
  ['kiwi', 'a sliced kiwi fruit: brown fuzzy skin, green flesh, black seeds'],
  ['fig', 'a halved fig fruit: purple skin and pink seeded interior'],
  ['date', 'a few wrinkled brown date fruits'],
  ['lychee', 'a peeled lychee fruit: rough red shell beside translucent white flesh'],
  ['melon', 'a juicy melon wedge with orange flesh and a green rind'],
  ['pumpkin', 'a small orange pumpkin fruit — the squash, not the vine'],
  ['tomato', 'a ripe red tomato fruit'],
  ['acai', 'a handful of dark purple acai berries'],
  ['goji', 'a few bright red goji berries'],
  ['yuzu', 'a bumpy yellow yuzu citrus fruit'],
  ['pomelo', 'a large pale-green pomelo citrus fruit, one wedge cut'],
];

/** Leaves, flowers, jars — only when the name is not a fruit. */
const OBJECT_SUBJECTS: Array<[string, string]> = [
  ['cherry blossom', 'pink cherry-blossom flowers, not cherry fruit'],
  ['lemongrass', 'a tied bundle of pale-green lemongrass stalks'],
  ['lemon myrtle', 'glossy green lemon-myrtle leaves'],
  ['plantain herb', 'broad oval plantain-herb leaves'],
  ['plantain leaf', 'broad oval plantain-herb leaves'],
  ['peppermint', 'a sprig of peppermint leaves'],
  ['spearmint', 'a sprig of spearmint leaves'],
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
  ['mint', 'a sprig of fresh green mint leaves'],
  ['oat', 'golden rolled oat flakes'],
  ['clay', 'a bowl of colored clay'],
  ['rose', 'a pink rose blossom'],
];

function resolveIconSubject(ingredientName: string): IconSubject {
  const raw = ingredientName.trim() || 'ingredient';
  const key = raw.toLowerCase();

  const objects = [...OBJECT_SUBJECTS].sort((a, b) => b[0].length - a[0].length);
  for (const [needle, text] of objects) {
    if (hasPhrase(key, needle)) return { text, kind: 'object' };
  }

  const fruits = [...FRUIT_SUBJECTS].sort((a, b) => b[0].length - a[0].length);
  for (const [needle, text] of fruits) {
    if (hasPhrase(key, needle)) return { text: `${text}. Show the fruit only — no plant, vine, tree, or leaves`, kind: 'fruit' };
  }

  return {
    text: `the recognizable object of ${raw} itself — if that is a fruit, draw the fruit, never a plant`,
    kind: 'object',
  };
}

function iconPrompt(subject: IconSubject): string {
  const { text, kind } = subject;
  if (kind === 'fruit') {
    return [
      `Simple flat grocery-sticker icon of ${text}, centered.`,
      'Draw the edible fruit. Do not draw a plant, vine, tree, bush, garden, or foliage.',
      'Solid colors, clean shapes, no letters.',
      'No text, no typography, no words, no initials, no monogram, no logo letters.',
      'White background.',
    ].join(' ');
  }
  return [
    `Simple flat illustration of ${text}, centered.`,
    'Pictorial symbol of that object only.',
    'Solid colors, clean shapes, no outlines of letters.',
    'No text, no typography, no words, no initials, no monogram, no logo letters.',
    'White background.',
  ].join(' ');
}

/** Compact Flux-friendly graph: small latent, few steps, CFG 1. */
function getWorkflow(ingredientName: string) {
  const subject = resolveIconSubject(ingredientName);
  const prompt = iconPrompt(subject);
  const negative = subject.kind === 'fruit'
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
      inputs: {
        text: negative,
        clip: ['4', 1],
      },
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

async function fetchJson(
  url: string,
  init?: RequestInit & { timeoutMs?: number; retries?: number },
): Promise<Response> {
  const { signal: _signal, ...rest } = init ?? {};
  return lanFetch(url, { ...rest, timeoutMs: init?.timeoutMs ?? 8000 });
}

/** Any HTTP reply means the host is up — only network failures count as down. */
export function isComfyHttpAlive(status: number): boolean {
  return status > 0 && status < 500;
}

async function probeBase(baseUrl: string): Promise<{ ok: boolean; message: string }> {
  let lastErr = '';
  for (const path of PROBE_PATHS) {
    try {
      const res = await fetchJson(`${baseUrl}${path}`, { timeoutMs: 1800, retries: 0 });
      if (isComfyHttpAlive(res.status)) {
        writeLastGood(baseUrl);
        return { ok: true, message: baseUrl };
      }
      lastErr = `ComfyUI HTTP ${res.status}`;
    } catch (error) {
      return { ok: false, message: friendlyLanError(error) };
    }
  }
  return { ok: false, message: lastErr || 'Could not reach ComfyUI.' };
}

async function shrinkToDataUrl(blob: Blob, size = 128): Promise<string> {
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.drawImage(bitmap, 0, 0, size, size);
    bitmap.close();
    return canvas.toDataURL('image/png');
  } catch {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }
}

export async function pingComfyUi(settings: LocalAiSettingsSlice): Promise<{
  ok: boolean;
  message: string;
  baseUrl?: string;
}> {
  if (!settings.comfyUiEnabled) return { ok: false, message: 'ComfyUI is disabled.' };
  const results = await Promise.all(
    comfyUrlCandidates(settings).map(async (baseUrl) => ({ baseUrl, ...(await probeBase(baseUrl)) })),
  );
  const ok = results.find((result) => result.ok);
  if (ok) return { ok: true, message: ok.baseUrl, baseUrl: ok.baseUrl };
  const lastFail = results.find((result) => result.message)?.message ?? '';
  if (/timeout|unreachable|timed out|could not reach/i.test(lastFail)) {
    return {
      ok: false,
      message: 'ComfyUI did not respond. Start it on the AI PC (port 8188) and check Tailscale.',
    };
  }
  return { ok: false, message: lastFail || 'Could not reach ComfyUI.' };
}

async function waitForImage(baseUrl: string, promptId: string, deadline: number): Promise<string> {
  while (Date.now() < deadline) {
    try {
      const historyRes = await fetchJson(`${baseUrl}/history/${promptId}`, { timeoutMs: 3000 });
      if (historyRes.ok) {
        const history = (await historyRes.json()) as Record<string, {
          status?: { status_str?: string; completed?: boolean };
          outputs?: Record<string, { images?: Array<{ filename?: string }> }>;
        }>;
        const entry = history[promptId];
        if (entry?.status?.status_str === 'error') {
          throw new Error('ComfyUI job failed.');
        }
        const filename = entry?.outputs?.['9']?.images?.[0]?.filename;
        if (filename) return filename;
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'ComfyUI job failed.') throw error;
      // Dropped poll — keep waiting; Tailscale blips are normal.
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(POLL_MS, remaining));
  }
  throw new Error(`ComfyUI timed out after ${Math.round(GENERATE_TIMEOUT_MS / 1000)}s.`);
}

async function submitPrompt(
  settings: LocalAiSettingsSlice,
  ingredientName: string,
): Promise<{ baseUrl: string; promptId: string }> {
  const body = JSON.stringify({ prompt: getWorkflow(ingredientName) });
  let lastErr = 'Failed to submit ComfyUI job.';
  for (const baseUrl of comfyUrlCandidates(settings)) {
    try {
      const submitRes = await fetchJson(`${baseUrl}/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        timeoutMs: 12_000,
      });
      if (!submitRes.ok) {
        lastErr = `Failed to submit ComfyUI job (${submitRes.status})`;
        continue;
      }
      const submitData = (await submitRes.json()) as { prompt_id?: string };
      if (!submitData.prompt_id) {
        lastErr = 'ComfyUI did not return a prompt id.';
        continue;
      }
      writeLastGood(baseUrl);
      return { baseUrl, promptId: submitData.prompt_id };
    } catch (error) {
      lastErr = friendlyLanError(error);
    }
  }
  throw new Error(lastErr);
}

export type GenerateIngredientIconResult =
  | { status: 'ok'; iconKey: string }
  | { status: 'disabled' }
  | { status: 'network'; error?: unknown }
  | { status: 'failed'; error?: unknown };

/** True when ComfyUI is unreachable, offline, or the request died on the network. */
export function isComfyNetworkFailure(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  if (/job failed|prompt id|HTTP \d{3}/i.test(msg)) return false;
  return /timeout|timed out|unreachable|could not reach|failed to fetch|network|offline|connection|ERR_CONNECTION|Load failed|did not respond|local service/i.test(msg);
}

export async function generateIngredientIconResult(
  settings: LocalAiSettingsSlice,
  ingredientName: string,
): Promise<GenerateIngredientIconResult> {
  if (!settings.comfyUiEnabled) return { status: 'disabled' };
  return withAiActivity('comfy', async () => {
    let lastErr: unknown;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const iconKey = await generateIngredientIconOnce(settings, ingredientName);
        return { status: 'ok' as const, iconKey };
      } catch (err) {
        lastErr = err;
        invalidateComfyBase();
        if (attempt === 0) await sleep(500);
      }
    }
    console.error('Failed to generate ingredient icon:', lastErr);
    if (isComfyNetworkFailure(lastErr)) return { status: 'network', error: lastErr };
    return { status: 'failed', error: lastErr };
  });
}

export async function generateIngredientIcon(
  settings: LocalAiSettingsSlice,
  ingredientName: string,
): Promise<string | null> {
  const result = await generateIngredientIconResult(settings, ingredientName);
  return result.status === 'ok' ? result.iconKey : null;
}

async function generateIngredientIconOnce(
  settings: LocalAiSettingsSlice,
  ingredientName: string,
): Promise<string> {
  const deadline = Date.now() + GENERATE_TIMEOUT_MS;
  await unloadOllamaModels(settings);
  const { baseUrl, promptId } = await submitPrompt(settings, ingredientName);
  const filename = await waitForImage(baseUrl, promptId, deadline);

  let imgRes: Response | null = null;
  let downloadErr = 'Failed to download image from ComfyUI';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetchJson(
        `${baseUrl}/view?filename=${encodeURIComponent(filename)}&type=output&subfolder=`,
        { timeoutMs: 8000 },
      );
      if (res.ok) {
        imgRes = res;
        break;
      }
      downloadErr = `Failed to download image from ComfyUI (${res.status})`;
    } catch (error) {
      downloadErr = friendlyLanError(error);
    }
    if (attempt === 0) await sleep(300);
  }
  if (!imgRes) throw new Error(downloadErr);

  const dataUrl = await shrinkToDataUrl(await imgRes.blob());
  const asset = await assetsRepo.create({
    name: `AI: ${ingredientName}`,
    kind: 'icon',
    dataUrl,
    width: 128,
    height: 128,
    fileSize: Math.round((dataUrl.length * 3) / 4),
  });
  return `asset_${asset.id}`;
}
