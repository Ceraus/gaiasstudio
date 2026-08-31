import { useSyncExternalStore } from 'react';

export type AiEngine = 'ollama' | 'comfy';

const counts: Record<AiEngine, number> = { ollama: 0, comfy: 0 };
const listeners = new Set<() => void>();

let snapshot = { ollama: false, comfy: false };

function emit() {
  const next = { ollama: counts.ollama > 0, comfy: counts.comfy > 0 };
  if (next.ollama === snapshot.ollama && next.comfy === snapshot.comfy) return;
  snapshot = next;
  listeners.forEach((fn) => fn());
}

export function beginAiActivity(engine: AiEngine): void {
  counts[engine] += 1;
  emit();
}

export function endAiActivity(engine: AiEngine): void {
  counts[engine] = Math.max(0, counts[engine] - 1);
  emit();
}

/** Marks an engine busy until `fn` settles. Safe to nest. */
export async function withAiActivity<T>(engine: AiEngine, fn: () => Promise<T>): Promise<T> {
  beginAiActivity(engine);
  try {
    return await fn();
  } finally {
    endAiActivity(engine);
  }
}

export function getAiActivity(): { ollama: boolean; comfy: boolean } {
  return snapshot;
}

export function subscribeAiActivity(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useAiActivity(): { ollama: boolean; comfy: boolean } {
  return useSyncExternalStore(subscribeAiActivity, getAiActivity, getAiActivity);
}
