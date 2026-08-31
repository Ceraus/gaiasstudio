import type { AppSettings, Ingredient, PendingComfyIcon } from '@/types';
import { db } from '@/db/db';
import { ingredientsRepo, settingsRepo } from '@/db/repositories';
import { uid } from '@/lib/id';
import { generateIngredientIconResult } from '@/lib/comfyUiApi';
import { getComfyUiHeartbeat, subscribeComfyUiHeartbeat } from '@/lib/comfyUiHeartbeat';

let bound = false;
let processing = false;
let wasOnline = false;

function isKnownOffline(): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  return getComfyUiHeartbeat().status?.state === 'unreachable';
}

export async function enqueuePendingComfyIcon(ingredientId: string, name: string): Promise<PendingComfyIcon> {
  bindPendingComfyIconQueue();
  const existing = await db.pendingComfyIcons.where('ingredientId').equals(ingredientId).first();
  if (existing) {
    if (existing.name !== name) {
      await db.pendingComfyIcons.update(existing.id, { name });
      return { ...existing, name };
    }
    return existing;
  }
  const job: PendingComfyIcon = {
    id: uid(),
    ingredientId,
    name,
    createdAt: Date.now(),
  };
  await db.pendingComfyIcons.add(job);
  return job;
}

export async function processPendingComfyIcons(settings?: AppSettings): Promise<void> {
  if (processing) return;
  const resolved = settings ?? await settingsRepo.get();
  if (!resolved.comfyUiEnabled) return;
  if (isKnownOffline()) return;

  processing = true;
  try {
    const jobs = await db.pendingComfyIcons.orderBy('createdAt').toArray();
    for (const job of jobs) {
      const ingredient = await db.ingredients.get(job.ingredientId);
      if (!ingredient) {
        await db.pendingComfyIcons.delete(job.id);
        continue;
      }
      if (ingredient.iconKey?.startsWith('asset_')) {
        await db.pendingComfyIcons.delete(job.id);
        continue;
      }
      const result = await generateIngredientIconResult(resolved, job.name || ingredient.name);
      if (result.status === 'ok') {
        await ingredientsRepo.update(job.ingredientId, { iconKey: result.iconKey });
        await db.pendingComfyIcons.delete(job.id);
        continue;
      }
      if (result.status === 'network' || result.status === 'disabled') {
        break;
      }
      await db.pendingComfyIcons.delete(job.id);
    }
  } finally {
    processing = false;
  }
}

/** Generate a Comfy icon now, or persist the job if Comfy is offline / the request dies on the network. */
export async function requestCustomIngredientIcon(
  ingredient: Ingredient,
  settings: AppSettings,
): Promise<string | null> {
  if (!settings.comfyUiEnabled) return null;
  if (ingredient.iconKey?.startsWith('asset_')) return ingredient.iconKey;

  if (isKnownOffline()) {
    await enqueuePendingComfyIcon(ingredient.id, ingredient.name);
    return null;
  }

  const result = await generateIngredientIconResult(settings, ingredient.name);
  if (result.status === 'ok') {
    await ingredientsRepo.update(ingredient.id, { iconKey: result.iconKey });
    return result.iconKey;
  }
  if (result.status === 'network') {
    await enqueuePendingComfyIcon(ingredient.id, ingredient.name);
  }
  return null;
}

export function bindPendingComfyIconQueue(): () => void {
  if (bound) return () => {};
  bound = true;
  wasOnline = getComfyUiHeartbeat().online;
  if (wasOnline) void processPendingComfyIcons();
  const unsub = subscribeComfyUiHeartbeat(() => {
    const online = getComfyUiHeartbeat().online;
    if (online && !wasOnline) void processPendingComfyIcons();
    wasOnline = online;
  });
  return () => {
    unsub();
    bound = false;
  };
}
