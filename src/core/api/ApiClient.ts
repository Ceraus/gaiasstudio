import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import { appConfig } from '../config/appConfig'
import { getBearerToken, emitAuthUnauthorized } from '../auth/authSession'
import { readReduxState } from '@/store/storeRef'
import { resolveMockPayload } from './mockGateway'
import { ApiError, normalizeApiError } from './apiErrors'

export type ApiRequestOptions = Omit<AxiosRequestConfig, 'url' | 'method' | 'data'> & {
  query?: Record<string, string | number | boolean | undefined | null>
  timeoutMs?: number
  retryCount?: number
  skipAuth?: boolean
}

function withQuery(path: string, query?: ApiRequestOptions['query']): string {
  if (!query) return path
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== '') search.set(key, String(value))
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

function resolveUrl(path: string): string {
  const route = path.startsWith('/') ? path : `/${path}`
  if (/^https?:\/\//.test(path)) return path
  if (!appConfig.apiBaseUrl) return route
  return `${appConfig.apiBaseUrl}${route}`
}

function shouldRetry(error: ApiError, attempt: number, retries: number): boolean {
  if (attempt >= retries) return false
  return error.kind === 'network' || error.kind === 'timeout' || error.kind === 'server'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function toApiError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED') {
      return new ApiError('The request timed out.', 'timeout')
    }
    if (!error.response) {
      return new ApiError('The network request failed.', 'network', undefined, error)
    }
    const status = error.response.status
    const details = error.response.data
    const message =
      details && typeof details === 'object' && 'message' in details && typeof details.message === 'string'
        ? details.message
        : error.message || 'The API request failed.'
    if (status === 401 || status === 403) return new ApiError(message, 'auth', status, details)
    if (status === 422) return new ApiError(message, 'validation', status, details)
    if (status >= 500) return new ApiError(message, 'server', status, details)
    return new ApiError(message, 'unknown', status, details)
  }
  return normalizeApiError(error)
}

function installGatewayInterceptors(instance: AxiosInstance): void {
  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const state = readReduxState()
    const useMockData = state?.account.useMockData ?? false

    if (useMockData) {
      config.adapter = async (cfg) => {
        const payload = resolveMockPayload(cfg)
        return {
          data: payload,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: cfg,
        } satisfies AxiosResponse
      }
    }

    const skipAuth = (config as InternalAxiosRequestConfig & { skipAuth?: boolean }).skipAuth
    const token = state?.auth.accessToken ?? getBearerToken()
    if (!skipAuth && token) {
      config.headers.set('Authorization', `Bearer ${token}`)
    }

    config.headers.set('Accept', 'application/json')
    config.headers.set('X-Requested-With', 'XMLHttpRequest')

    return config
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = toApiError(error)
      if (apiError.kind === 'auth') emitAuthUnauthorized()
      return Promise.reject(apiError)
    },
  )
}

function createAxiosConductor(): AxiosInstance {
  const instance = axios.create({
    baseURL: appConfig.apiBaseUrl || undefined,
    timeout: appConfig.apiTimeoutMs,
    withCredentials: false,
  })
  installGatewayInterceptors(instance)
  return instance
}

class ApiClientFacade {
  private readonly axios = createAxiosConductor()

  async get<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  async post<T>(
    path: string,
    body?: ApiRequestOptions['data'],
    options: ApiRequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', data: body })
  }

  async patch<T>(
    path: string,
    body?: ApiRequestOptions['data'],
    options: ApiRequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PATCH', data: body })
  }

  async put<T>(
    path: string,
    body?: ApiRequestOptions['data'],
    options: ApiRequestOptions = {},
  ): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', data: body })
  }

  async delete<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }

  async request<T>(path: string, options: ApiRequestOptions & { method?: string } = {}): Promise<T> {
    const retries = options.retryCount ?? appConfig.apiRetryCount
    let lastError: ApiError | null = null

    for (let attempt = 0; attempt <= retries; attempt += 1) {
      try {
        const response = await this.dispatchOnce(path, options)
        if (response.status === 204) return undefined as T
        return response.data as T
      } catch (error) {
        lastError = toApiError(error)
        if (!shouldRetry(lastError, attempt, retries)) throw lastError
        await delay(250 * 2 ** attempt)
      }
    }

    throw lastError ?? new ApiError('The API request failed.', 'unknown')
  }

  private async dispatchOnce(
    path: string,
    options: ApiRequestOptions & { method?: string },
  ): Promise<AxiosResponse> {
    const { query, timeoutMs, retryCount: _retryCount, skipAuth, ...axiosConfig } = options
    const url = resolveUrl(withQuery(path, query))

    const isFormData =
      typeof FormData !== 'undefined' && axiosConfig.data instanceof FormData

    return this.axios.request({
      ...axiosConfig,
      url,
      timeout: timeoutMs ?? appConfig.apiTimeoutMs,
      skipAuth,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(axiosConfig.headers ?? {}),
      },
    } as AxiosRequestConfig & { skipAuth?: boolean })
  }
}

/** Singleton Axios gateway — all Redux thunks and Zustand brokers route through this conduit. */
export const apiClient = new ApiClientFacade()

export type { AxiosInstance }
