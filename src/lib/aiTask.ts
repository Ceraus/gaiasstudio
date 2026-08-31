// ---------------------------------------------------------------------------
// Minimal AI task plumbing — single-flight, thinking state, optional cache.
// Used by screens that call localAi helpers; not a framework.
// ---------------------------------------------------------------------------

export interface AiTaskState<T> {
  loading: boolean;
  result: T | null;
  error: string | null;
}

type CacheEntry<T> = { at: number; value: T };

const inflight = new Map<string, Promise<unknown>>();
const cache = new Map<string, CacheEntry<unknown>>();

/** Default TTL for cached AI results (5 minutes). */
const DEFAULT_CACHE_MS = 5 * 60 * 1000;

function stableKey(prefix: string, input: unknown): string {
  return `${prefix}:${JSON.stringify(input)}`;
}

export interface RunAiTaskOptions {
  /** Skip cache read; still writes on success. */
  bypassCache?: boolean;
  cacheMs?: number;
}

/**
 * Runs an AI task with single-flight deduping and optional result caching.
 * Returns `{ ok, data?, error? }` — never throws.
 */
export async function runAiTask<T>(
  taskId: string,
  input: unknown,
  fn: () => Promise<T>,
  options: RunAiTaskOptions = {},
): Promise<{ ok: true; data: T; fromCache?: boolean } | { ok: false; error: string }> {
  const key = stableKey(taskId, input);
  const ttl = options.cacheMs ?? DEFAULT_CACHE_MS;

  if (!options.bypassCache) {
    const hit = cache.get(key) as CacheEntry<T> | undefined;
    if (hit && Date.now() - hit.at < ttl) {
      return { ok: true, data: hit.value, fromCache: true };
    }
  }

  const existing = inflight.get(key) as Promise<T> | undefined;
  if (existing) {
    try {
      const data = await existing;
      return { ok: true, data };
    } catch (err) {
      return { ok: false, error: String((err as Error)?.message ?? err) };
    }
  }

  const work = (async () => {
    try {
      const data = await fn();
      cache.set(key, { at: Date.now(), value: data });
      return data;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, work);

  try {
    const data = await work;
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: String((err as Error)?.message ?? err) };
  }
}

/** Clears cached results for one task type, or everything when taskId omitted. */
export function clearAiTaskCache(taskId?: string): void {
  if (!taskId) {
    cache.clear();
    return;
  }
  const prefix = `${taskId}:`;
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}

/** Cancels in-flight work only (cache untouched). Mostly for future UI hooks. */
export function cancelInflightAiTasks(taskId?: string): void {
  if (!taskId) {
    inflight.clear();
    return;
  }
  const prefix = `${taskId}:`;
  for (const k of inflight.keys()) {
    if (k.startsWith(prefix)) inflight.delete(k);
  }
}
