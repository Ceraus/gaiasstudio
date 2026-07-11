export const appConfig = {
  appName: "Clearplan Command",
  appUrl: normalizeBaseUrl(import.meta.env.VITE_APP_URL),
  apiBaseUrl: normalizeBaseUrl(
    import.meta.env.VITE_API_URL ?? import.meta.env.VITE_LARAVEL_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? (import.meta.env.DEV ? "" : "https://api.clearviewglobal.net")
  ),
  apiTimeoutMs: numberFromEnv(import.meta.env.VITE_API_TIMEOUT_MS, 15000),
  apiRetryCount: numberFromEnv(import.meta.env.VITE_API_RETRY_COUNT, 2),
  syncEndpoint: import.meta.env.VITE_SYNC_ENDPOINT || "/api/sync"
} as const;

function normalizeBaseUrl(value?: string) {
  if (!value) return "";
  return value.replace(/\/+$/, "");
}

function numberFromEnv(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
