// ---------------------------------------------------------------------------
// App lock — PBKDF2 PIN hash, session unlock, rate limiting.
// Privacy screen + vault key derivation; not server-backed authentication.
// ---------------------------------------------------------------------------

export const UNLOCK_KEY = 'gaia:unlocked';
export const UNLOCK_EXPIRES_KEY = 'gaia:unlock-expires';
export const RATE_LIMIT_KEY = 'gaia:lock-attempts';
export const LOCK_ITERATIONS = 210_000;
export const AUTO_LOCK_MS = 60 * 60 * 1000; // 1 hour idle / session cap
export const MAX_PIN_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000;

export interface LockPinRecord {
  lockPinHash?: string;
  lockPinSalt?: string;
  lockPinIterations?: number;
}

interface RateLimitState {
  attempts: number;
  lockedUntil: number;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Smoke / dev builds only — never enabled in production Hostinger deploys. */
export function isE2EBypass(): boolean {
  return import.meta.env.DEV || import.meta.env.VITE_E2E === 'true';
}

export function isSessionUnlocked(): boolean {
  if (isE2EBypass()) return true;
  try {
    if (sessionStorage.getItem(UNLOCK_KEY) !== '1') return false;
    const expires = Number(sessionStorage.getItem(UNLOCK_EXPIRES_KEY) || '0');
    if (expires && Date.now() > expires) {
      clearSessionUnlock();
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function setSessionUnlocked(): void {
  try {
    sessionStorage.setItem(UNLOCK_KEY, '1');
    sessionStorage.setItem(UNLOCK_EXPIRES_KEY, String(Date.now() + AUTO_LOCK_MS));
  } catch {
    // sessionStorage unavailable — unlock still works for this render
  }
}

export function clearSessionUnlock(): void {
  try {
    sessionStorage.removeItem(UNLOCK_KEY);
    sessionStorage.removeItem(UNLOCK_EXPIRES_KEY);
  } catch {
    // ignore
  }
}

export function touchSessionUnlock(): void {
  if (!isSessionUnlocked()) return;
  try {
    sessionStorage.setItem(UNLOCK_EXPIRES_KEY, String(Date.now() + AUTO_LOCK_MS));
  } catch {
    // ignore
  }
}

function readRateLimit(): RateLimitState {
  try {
    const raw = localStorage.getItem(RATE_LIMIT_KEY);
    if (!raw) return { attempts: 0, lockedUntil: 0 };
    const parsed = JSON.parse(raw) as RateLimitState;
    return {
      attempts: parsed.attempts ?? 0,
      lockedUntil: parsed.lockedUntil ?? 0,
    };
  } catch {
    return { attempts: 0, lockedUntil: 0 };
  }
}

function writeRateLimit(state: RateLimitState): void {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getLockoutRemainingMs(): number {
  const { lockedUntil } = readRateLimit();
  if (!lockedUntil) return 0;
  return Math.max(0, lockedUntil - Date.now());
}

export function isLockoutActive(): boolean {
  return getLockoutRemainingMs() > 0;
}

export function recordFailedAttempt(): void {
  const state = readRateLimit();
  if (Date.now() < state.lockedUntil) return;
  const attempts = state.attempts + 1;
  if (attempts >= MAX_PIN_ATTEMPTS) {
    writeRateLimit({ attempts: 0, lockedUntil: Date.now() + LOCKOUT_MS });
  } else {
    writeRateLimit({ attempts, lockedUntil: 0 });
  }
}

export function clearFailedAttempts(): void {
  writeRateLimit({ attempts: 0, lockedUntil: 0 });
}

export async function hashPin(pin: string, existingSaltB64?: string): Promise<{
  hash: string;
  salt: string;
  iterations: number;
}> {
  const salt = existingSaltB64 ? fromBase64(existingSaltB64) : crypto.getRandomValues(new Uint8Array(16));
  const saltBuffer = Uint8Array.from(salt);
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations: LOCK_ITERATIONS, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return {
    hash: toBase64(new Uint8Array(bits)),
    salt: toBase64(salt),
    iterations: LOCK_ITERATIONS,
  };
}

export async function verifyPin(pin: string, record: LockPinRecord): Promise<boolean> {
  if (!record.lockPinHash || !record.lockPinSalt) return false;
  const iterations = record.lockPinIterations ?? LOCK_ITERATIONS;
  const enc = new TextEncoder();
  const salt = fromBase64(record.lockPinSalt);
  const saltBuffer = Uint8Array.from(salt);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  const hash = toBase64(new Uint8Array(bits));
  return hash === record.lockPinHash;
}

export function hasPinConfigured(record: LockPinRecord | undefined | null): boolean {
  return !!(record?.lockPinHash && record?.lockPinSalt);
}
