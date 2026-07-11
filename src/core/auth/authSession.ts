import { apiClient } from '../api'
import { appConfig } from '../config/appConfig'

export type AuthUser = {
  id: string
  name: string
  email: string
  permissions: string[]
}

export type SessionSnapshot = {
  user: AuthUser | null
  accessToken: string | null
}

type LaravelUser = {
  id: string | number
  name?: string
  email?: string
  username?: string
  display_name?: string
  role?: string
  platform_role?: string
  command_role?: string
  is_superadmin?: boolean
  is_root?: boolean
  is_approved?: boolean
  approval_status?: string
}

type LaravelLoginResponse = {
  token?: string
  access_token?: string
  user?: LaravelUser
}

type LaravelAuthStatusResponse = {
  authenticated?: boolean
  user?: LaravelUser
}

const AUTH_PATHS = {
  login: '/api/v1/auth/login',
  logout: '/api/v1/auth/logout',
  me: '/api/v1/auth/me',
  status: '/api/v1/auth/status',
} as const

const PRIMARY_TOKEN_KEY = 'cvg.access_token'
const LEGACY_TOKEN_KEY = 'auth_token'
const USER_STORAGE_KEY = 'user'

let memoryToken: string | null = loadStoredToken()

export const authSession = {
  read(): SessionSnapshot {
    return {
      user: loadStoredUser(),
      accessToken: getBearerToken(),
    }
  },

  async login(email: string, password: string): Promise<SessionSnapshot> {
    const data = await apiClient.post<LaravelLoginResponse>(
      AUTH_PATHS.login,
      { email: email.trim(), password },
      { skipAuth: true, retryCount: 0 },
    )

    const accessToken = sanitizeAccessToken(data.access_token ?? data.token)
    if (!accessToken || !data.user) {
      this.clear()
      throw new Error('Login response missing token or user.')
    }

    applyToken(accessToken)
    const user = mapLaravelUser(data.user)
    persistStoredUser(user)
    return { user, accessToken }
  },

  async refresh(): Promise<SessionSnapshot> {
    captureCallbackTokenFromLocation()
    const token = getBearerToken()
    if (!token) {
      this.clear()
      return { user: null, accessToken: null }
    }

    try {
      const status = await apiClient.get<LaravelAuthStatusResponse>(AUTH_PATHS.status, {
        retryCount: 0,
      })
      const user = await fetchCurrentUser(status.user)
      if (!user) {
        this.clear()
        return { user: null, accessToken: null }
      }

      persistStoredUser(user)
      return { user, accessToken: getBearerToken() }
    } catch (error) {
      if (error instanceof Error && /network/i.test(error.message)) {
        return this.read()
      }

      this.clear()
      return { user: null, accessToken: null }
    }
  },

  async validate(): Promise<boolean> {
    const snapshot = await this.refresh()
    return Boolean(snapshot.user)
  },

  clear() {
    applyToken(null)
    clearStoredUser()
  },
}

export function getBearerToken(): string | null {
  if (memoryToken?.trim()) {
    const clean = sanitizeAccessToken(memoryToken)
    if (clean) return clean
  }

  const stored = loadStoredToken()
  if (stored) {
    memoryToken = stored
    return stored
  }

  return null
}

export function emitAuthUnauthorized(): void {
  window.dispatchEvent(new CustomEvent('cvg:auth-unauthorized'))
}

async function fetchCurrentUser(statusUser?: LaravelUser): Promise<AuthUser | null> {
  if (statusUser?.id) return mapLaravelUser(statusUser)

  const data = await apiClient.get<LaravelUser | { user?: LaravelUser; data?: LaravelUser }>(
    AUTH_PATHS.me,
    { retryCount: 0 },
  )
  const raw =
    'user' in data && data.user ? data.user : 'data' in data && data.data ? data.data : (data as LaravelUser)
  return raw?.id ? mapLaravelUser(raw) : null
}

function applyToken(token: string | null): void {
  memoryToken = token
  if (token) persistToken(token)
  else clearStoredToken()
}

function mapLaravelUser(raw: LaravelUser): AuthUser {
  const email = raw.email ?? raw.username ?? ''
  const name = raw.display_name ?? raw.name ?? email ?? 'User'
  return {
    id: String(raw.id),
    name,
    email,
    permissions: permissionsForUser(raw),
  }
}

function permissionsForUser(raw: LaravelUser): string[] {
  const role = raw.command_role ?? raw.platform_role ?? raw.role ?? 'user'
  if (raw.is_superadmin || raw.is_root || role === 'super_admin' || role === 'admin') {
    return ['admin:all', 'projects:read', 'projects:write', 'users:read', 'reports:read']
  }
  return ['projects:read', 'reports:read']
}

function loadStoredToken(): string | null {
  try {
    const token = localStorage.getItem(PRIMARY_TOKEN_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY)
    return sanitizeAccessToken(token)
  } catch {
    return null
  }
}

function persistToken(token: string): void {
  try {
    localStorage.setItem(PRIMARY_TOKEN_KEY, token)
    localStorage.setItem(LEGACY_TOKEN_KEY, token)
  } catch {
    // Storage is best-effort on restricted browsers/webviews.
  }
}

function clearStoredToken(): void {
  try {
    localStorage.removeItem(PRIMARY_TOKEN_KEY)
    localStorage.removeItem(LEGACY_TOKEN_KEY)
  } catch {
    // Storage is best-effort on restricted browsers/webviews.
  }
}

function persistStoredUser(user: AuthUser): void {
  try {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user))
  } catch {
    // Storage is best-effort on restricted browsers/webviews.
  }
}

function loadStoredUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    if (!parsed.id) return null
    return {
      id: String(parsed.id),
      name: parsed.name ?? parsed.email ?? 'User',
      email: parsed.email ?? '',
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
    }
  } catch {
    return null
  }
}

function clearStoredUser(): void {
  try {
    localStorage.removeItem(USER_STORAGE_KEY)
  } catch {
    // Storage is best-effort on restricted browsers/webviews.
  }
}

function captureCallbackTokenFromLocation(): void {
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  if (!hash) return

  const params = new URLSearchParams(hash)
  const token = sanitizeAccessToken(params.get('access_token') ?? params.get('token') ?? params.get('accessToken'))
  if (!token) return

  applyToken(token)
  const url = new URL(window.location.href)
  window.history.replaceState({}, document.title, url.pathname)
}

function sanitizeAccessToken(raw: string | null | undefined): string | null {
  if (raw == null) return null

  let token = String(raw).trim()
  if (!token) return null

  token = token.replace(/[&?#].*$/, '')
  token = token.replace(/[;,]+$/, '')

  try {
    for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(token); i += 1) {
      const decoded = decodeURIComponent(token)
      if (decoded === token) break
      token = decoded
    }
  } catch {
    return null
  }

  token = token.replace(/\s+/g, '')
  return token.length >= 8 ? token : null
}

/** @deprecated Legacy helper retained for diagnostics — apiClient resolves URLs internally. */
export function apiUrl(path: string): string {
  const normalized = path.replace(/^\//, '')
  if (!appConfig.apiBaseUrl) return `/${normalized}`
  return `${appConfig.apiBaseUrl.replace(/\/$/, '')}/${normalized}`
}
