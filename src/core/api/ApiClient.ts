/**
 * apiClient.ts — Singleton fetch-based API conductor.
 *
 * Request pipeline (per call):
 *   1. Example data gateway — if `account.useExampleData === true`, skip the network call
 *      and return taxonomy-compliant seed data immediately.
 *   2. Auth injection — attach `Authorization: Bearer <token>` from the current
 *      session unless `skipAuth` is set.
 *   3. Native `fetch` — standard browser fetch to the Laravel backend.
 *
 * No external HTTP library required.
 */

import { appConfig } from '../config/appConfig'
import { readReduxState } from '@/store/storeRef'
import { resolveMockPayload } from './mockGateway'
import { ApiError, errorFromResponse, normalizeApiError } from './apiErrors'

// ── Request options ───────────────────────────────────────────────────────────

export interface ApiRequestOptions {
  /** Additional URL query-string parameters. */
  query?: Record<string, string | number | boolean | undefined>
  /** Per-request timeout in milliseconds. */
  timeoutMs?: number
  /** Retry count for network errors. */
  retryCount?: number
  /** Skip injecting the Bearer token header. */
  skipAuth?: boolean
  /** Extra headers to merge in. */
  headers?: Record<string, string>
  /** Signal for request cancellation. */
  signal?: AbortSignal
}

// ── Typed wrapper ─────────────────────────────────────────────────────────────

class ApiClient {
  async get<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.dispatch<T>(path, 'GET', undefined, options)
  }

  async post<T = unknown>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
    return this.dispatch<T>(path, 'POST', body, options)
  }

  async put<T = unknown>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
    return this.dispatch<T>(path, 'PUT', body, options)
  }

  async patch<T = unknown>(path: string, body?: unknown, options: ApiRequestOptions = {}): Promise<T> {
    return this.dispatch<T>(path, 'PATCH', body, options)
  }

  async delete<T = unknown>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.dispatch<T>(path, 'DELETE', undefined, options)
  }

  private async dispatch<T>(
    path: string,
    method: string,
    body: unknown,
    options: ApiRequestOptions,
  ): Promise<T> {
    const { query, timeoutMs, skipAuth, headers: extraHeaders, signal } = options
    const url = buildUrl(path, query)

    // ── 1. Example data gateway ───────────────────────────────────────────────
    const state = readReduxState()
    if (state?.account?.useExampleData) {
      const payload = resolveMockPayload({ method, url, data: body })
      return payload as T
    }

    // ── 2. Build request headers ─────────────────────────────────────────────
    const isFormData = body instanceof FormData
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(extraHeaders ?? {}),
    }

    if (!skipAuth) {
      const token = getSessionToken()
      if (token) headers['Authorization'] = `Bearer ${token}`
    }

    // ── 3. Timeout via AbortController ───────────────────────────────────────
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    let controller: AbortController | undefined

    if (!signal) {
      controller = new AbortController()
      const ms = timeoutMs ?? appConfig.apiTimeoutMs
      timeoutId = setTimeout(() => controller!.abort(), ms)
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : isFormData ? (body as FormData) : JSON.stringify(body),
        signal: signal ?? controller?.signal,
        credentials: 'include',
      })

      if (timeoutId) clearTimeout(timeoutId)

      // Emit global event for auth failures so AuthContext can react.
      if (response.status === 401 || response.status === 403) {
        window.dispatchEvent(new CustomEvent('cvg:auth-unauthorized'))
      }

      if (!response.ok) {
        throw await errorFromResponse(response)
      }

      const contentType = response.headers.get('content-type') ?? ''
      if (!contentType.includes('application/json')) {
        return undefined as unknown as T
      }

      return (await response.json()) as T
    } catch (err) {
      if (timeoutId) clearTimeout(timeoutId)
      if (err instanceof ApiError) throw err
      throw normalizeApiError(err)
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildUrl(path: string, query?: ApiRequestOptions['query']): string {
  const base = path.startsWith('http')
    ? path
    : `${appConfig.apiBaseUrl}${path.startsWith('/') ? path : `/${path}`}`

  if (!query) return base

  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join('&')

  return params ? `${base}${base.includes('?') ? '&' : '?'}${params}` : base
}

/** Reads the Bearer token directly from storage — avoids a circular import with authSession.ts. */
function getSessionToken(): string | null {
  try {
    const primary = localStorage.getItem('cvg.access_token')
    if (primary?.trim()) return primary.trim()
    return localStorage.getItem('auth_token')?.trim() || null
  } catch {
    return null
  }
}

// ── Singleton ─────────────────────────────────────────────────────────────────

export const apiClient = new ApiClient()
