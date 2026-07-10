import { appConfig } from "../config/appConfig";
import { errorFromResponse, normalizeApiError, type ApiError } from "./apiErrors";

export type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | Record<string, unknown> | unknown[] | null;
  query?: Record<string, string | number | boolean | undefined | null>;
  timeoutMs?: number;
  retryCount?: number;
  skipAuth?: boolean;
};

type RequestInterceptor = (request: RequestInit) => RequestInit | Promise<RequestInit>;
type ResponseInterceptor = (response: Response) => Response | Promise<Response>;
type AuthTokenProvider = () => string | null | Promise<string | null>;

export class ApiClient {
  private authTokenProvider?: AuthTokenProvider;
  private readonly requestInterceptors: RequestInterceptor[] = [];
  private readonly responseInterceptors: ResponseInterceptor[] = [];

  constructor(private readonly baseUrl = appConfig.apiBaseUrl) {}

  setAuthTokenProvider(provider: AuthTokenProvider) {
    this.authTokenProvider = provider;
  }

  addRequestInterceptor(interceptor: RequestInterceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor: ResponseInterceptor) {
    this.responseInterceptors.push(interceptor);
  }

  get<T>(path: string, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: "GET" });
  }

  post<T>(path: string, body?: ApiRequestOptions["body"], options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: "POST", body });
  }

  patch<T>(path: string, body?: ApiRequestOptions["body"], options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: "PATCH", body });
  }

  delete<T>(path: string, options?: ApiRequestOptions) {
    return this.request<T>(path, { ...options, method: "DELETE" });
  }

  async request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    const retries = options.retryCount ?? appConfig.apiRetryCount;
    let lastError: ApiError | null = null;

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await this.fetchOnce(path, options);
        if (response.status === 204) return undefined as T;
        return (await response.json()) as T;
      } catch (error) {
        lastError = normalizeApiError(error);
        if (lastError.kind === "auth") {
          window.dispatchEvent(new CustomEvent("cvg:auth-unauthorized"));
        }
        if (!shouldRetry(lastError, attempt, retries)) throw lastError;
        await delay(250 * 2 ** attempt);
      }
    }

    throw lastError ?? normalizeApiError(new Error("The API request failed."));
  }

  private async fetchOnce(path: string, options: ApiRequestOptions) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), options.timeoutMs ?? appConfig.apiTimeoutMs);
    const headers = await this.headers(options);
    const init = await this.applyRequestInterceptors({
      ...options,
      body: serializeBody(options.body),
      headers,
      signal: controller.signal
    });

    try {
      let response = await fetch(this.url(path, options.query), init);
      for (const interceptor of this.responseInterceptors) response = await interceptor(response);
      if (!response.ok) throw await errorFromResponse(response);
      return response;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private async headers(options: ApiRequestOptions) {
    const headers = new Headers(options.headers);
    if (options.body && !(options.body instanceof FormData) && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    headers.set("accept", "application/json");

    if (!options.skipAuth && this.authTokenProvider) {
      const token = await this.authTokenProvider();
      if (token) headers.set("authorization", `Bearer ${token}`);
    }

    return headers;
  }

  private async applyRequestInterceptors(init: RequestInit) {
    let request = init;
    for (const interceptor of this.requestInterceptors) request = await interceptor(request);
    return request;
  }

  private url(path: string, query?: ApiRequestOptions["query"]) {
    if (/^https?:\/\//.test(path)) return withQuery(path, query);
    const route = path.startsWith("/") ? path : `/${path}`;
    if (!this.baseUrl) return withQuery(route, query);
    return withQuery(`${this.baseUrl}${route}`, query);
  }
}

export const apiClient = new ApiClient();

function serializeBody(body: ApiRequestOptions["body"]) {
  if (!body) return undefined;
  if (body instanceof Blob || body instanceof FormData || body instanceof URLSearchParams) return body;
  if (typeof body === "string") return body;
  return JSON.stringify(body);
}

function shouldRetry(error: ApiError, attempt: number, retries: number) {
  if (attempt >= retries) return false;
  return error.kind === "network" || error.kind === "timeout" || error.kind === "server";
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function withQuery(url: string, query?: ApiRequestOptions["query"]) {
  if (!query) return url;
  const [path, existingQuery = ""] = url.split("?");
  const search = new URLSearchParams(existingQuery);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
