import type { AuthUser } from './authSession'

const ALLOWED_EMAIL_DOMAINS = ['clearviewglobal.com', 'clearviewglobal.net'] as const

function readDevOfflinePassword(): string | null {
  if (!import.meta.env.DEV) return null
  const password = import.meta.env.VITE_DEV_OFFLINE_PASSWORD?.trim()
  return password || null
}

/** True when running `vite dev` and a shared offline password is configured. */
export function isDevOfflineLoginEnabled(): boolean {
  return import.meta.env.DEV && readDevOfflinePassword() !== null
}

function isAllowedDevEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at <= 0) return false
  const domain = normalized.slice(at + 1)
  return ALLOWED_EMAIL_DOMAINS.includes(domain as (typeof ALLOWED_EMAIL_DOMAINS)[number])
}

function secureEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false
  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return mismatch === 0
}

function devUserFromEmail(email: string): AuthUser {
  const normalized = email.trim().toLowerCase()
  const localPart = normalized.split('@')[0] ?? 'dev'
  const displayName = localPart
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

  return {
    id: `dev-offline:${normalized}`,
    name: displayName || 'Dev User',
    email: normalized,
    permissions: ['admin:all'],
  }
}

/**
 * Validates dev-only offline credentials. Returns a session user on success.
 * Never succeeds outside Vite dev builds or without VITE_DEV_OFFLINE_PASSWORD.
 */
export function authenticateDevOffline(email: string, password: string): AuthUser | null {
  if (!import.meta.env.DEV) return null

  const expectedPassword = readDevOfflinePassword()
  if (!expectedPassword) return null

  const normalizedEmail = email.trim().toLowerCase()
  if (!isAllowedDevEmail(normalizedEmail)) return null
  if (!secureEqual(password, expectedPassword)) return null

  return devUserFromEmail(normalizedEmail)
}
