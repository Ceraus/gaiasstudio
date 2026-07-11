import type { AuthUser } from './authSession'

// Only active in Vite dev builds — tree-shaken out of production.
const DEV_SESSION_KEY = 'cvg.dev_session'

/**
 * Persists a local dev user to localStorage so AuthContext can pick it up
 * on the next load without hitting the API. DEV builds only.
 */
export function activateDevSession(user: AuthUser): void {
  if (!import.meta.env.DEV) return
  try {
    localStorage.setItem(DEV_SESSION_KEY, JSON.stringify(user))
  } catch {
    // Storage unavailable.
  }
}

/**
 * Reads back a stored dev session. Returns null in production or when
 * no dev session has been activated.
 */
export function loadDevSession(): AuthUser | null {
  if (!import.meta.env.DEV) return null
  try {
    const raw = localStorage.getItem(DEV_SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<AuthUser>
    if (!parsed.id) return null
    return {
      id: String(parsed.id),
      name: parsed.name ?? 'Dev User',
      email: parsed.email ?? 'dev@clearviewglobal.com',
      permissions: Array.isArray(parsed.permissions)
        ? parsed.permissions
        : ['admin:all'],
    }
  } catch {
    return null
  }
}

export function clearDevSession(): void {
  try {
    localStorage.removeItem(DEV_SESSION_KEY)
  } catch {
    // Storage unavailable.
  }
}
