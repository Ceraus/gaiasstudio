type LanFetchInit = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
};

type LanFetchResult = {
  ok: boolean;
  status: number;
  contentType?: string;
  base64?: string;
  error?: string;
};

type ElectronLanApi = {
  fetchLan?: (url: string, init?: LanFetchInit) => Promise<LanFetchResult>;
};

function electronLan(): ElectronLanApi | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronAPI?: ElectronLanApi }).electronAPI ?? null;
}

function bytesFromBase64(base64: string): Uint8Array {
  const bin = atob(base64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function toResponse(result: LanFetchResult): Response {
  const bytes = bytesFromBase64(result.base64 ?? '');
  return new Response(new Blob([bytes as any]), {
    status: result.status || (result.ok ? 200 : 502),
    headers: { 'Content-Type': result.contentType || 'application/octet-stream' },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function browserFetch(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? 5000;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init?.headers) {
    const raw = new Headers(init.headers);
    raw.forEach((value, key) => { headers[key] = value; });
  }
  return fetch(url, {
    credentials: 'omit',
    ...init,
    headers,
    signal: init?.signal ?? AbortSignal.timeout(timeoutMs),
  });
}

async function electronFetch(
  api: ElectronLanApi,
  url: string,
  init?: RequestInit & { timeoutMs?: number },
): Promise<LanFetchResult> {
  const timeoutMs = init?.timeoutMs ?? 5000;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (init?.headers) {
    const raw = new Headers(init.headers);
    raw.forEach((value, key) => { headers[key] = value; });
  }
  const body = typeof init?.body === 'string' ? init.body : undefined;
  return api.fetchLan!(url, {
    method: init?.method,
    headers,
    body,
    timeoutMs,
  });
}

/**
 * Fetch a LAN/Tailscale URL.
 * Desktop: main-process first (skips CORS), then one retry, then browser fetch.
 * Browser: fetch with a timeout, then one retry.
 */
export async function lanFetch(
  url: string,
  init?: RequestInit & { timeoutMs?: number; retries?: number },
): Promise<Response> {
  const api = electronLan();
  let lastError: unknown;
  const tries = Math.max(1, (init?.retries ?? 1) + 1);

  if (api?.fetchLan) {
    for (let attempt = 0; attempt < tries; attempt++) {
      const result = await electronFetch(api, url, init);
      if (result.ok || (result.status ?? 0) > 0) return toResponse(result);
      lastError = new Error(result.error || 'Could not reach the local service.');
      if (attempt < tries - 1) await sleep(220);
    }
    try {
      return await browserFetch(url, init);
    } catch (browserErr) {
      throw lastError || browserErr;
    }
  }

  for (let attempt = 0; attempt < tries; attempt++) {
    try {
      return await browserFetch(url, init);
    } catch (err) {
      lastError = err;
      if (attempt < tries - 1) await sleep(220);
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Could not reach the local service.');
}

export function friendlyLanError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|Load failed|CORS|blocked by CORS/i.test(raw)) {
    return 'Unreachable — start ComfyUI with --enable-cors-header, or use the desktop app.';
  }
  if (/abort|timeout/i.test(raw)) return 'Timed out waiting for ComfyUI.';
  return raw.replace(/^Error:\s*/i, '');
}
