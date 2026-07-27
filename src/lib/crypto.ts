// ---------------------------------------------------------------------------
// At-rest encryption for sensitive AppSettings fields (IndexedDB / Dexie).
// Uses Web Crypto (AES-GCM + PBKDF2) — purely client-side, no backend.
// Deters casual local-storage inspection; not a substitute for OS-level security.
// ---------------------------------------------------------------------------

import type { AppSettings, EtsyShopConfig } from '@/types';

export const AT_REST_PREFIX = 'enc:v1:';

const ALGO = 'AES-GCM';
const IV_BYTES = 12;
const PBKDF2_ITERATIONS = 120_000;

/** Static app salt + pepper — obfuscated, stable across installs. */
const APP_SECRET_MATERIAL = 'GaiaStudio|v1|gaiasessences-at-rest';
const PBKDF2_SALT = 'gaia-settings-field-secrets-v1';

let derivedKeyPromise: Promise<CryptoKey> | null = null;

function getDerivedKey(): Promise<CryptoKey> {
  if (!derivedKeyPromise) {
    derivedKeyPromise = (async () => {
      const enc = new TextEncoder();
      const keyMaterial = await crypto.subtle.importKey(
        'raw',
        enc.encode(APP_SECRET_MATERIAL),
        'PBKDF2',
        false,
        ['deriveKey'],
      );
      return crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: enc.encode(PBKDF2_SALT),
          iterations: PBKDF2_ITERATIONS,
          hash: 'SHA-256',
        },
        keyMaterial,
        { name: ALGO, length: 256 },
        false,
        ['encrypt', 'decrypt'],
      );
    })();
  }
  return derivedKeyPromise;
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

export function isAtRestEncrypted(value: string | undefined): boolean {
  return !!value?.startsWith(AT_REST_PREFIX);
}

/** Encrypt a single string for IndexedDB storage. Never throws. */
export async function encryptAtRest(plaintext: string): Promise<string> {
  if (!plaintext || isAtRestEncrypted(plaintext)) return plaintext;
  try {
    const key = await getDerivedKey();
    const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
    const data = new TextEncoder().encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, key, data);
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);
    return `${AT_REST_PREFIX}${toBase64(combined)}`;
  } catch {
    return plaintext;
  }
}

/** Decrypt a stored string. Returns null on failure. Never throws. */
export async function decryptAtRest(stored: string): Promise<string | null> {
  if (!stored) return null;
  if (!isAtRestEncrypted(stored)) return stored;
  try {
    const key = await getDerivedKey();
    const combined = fromBase64(stored.slice(AT_REST_PREFIX.length));
    const iv = combined.slice(0, IV_BYTES);
    const data = combined.slice(IV_BYTES);
    const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, key, data);
    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

async function encryptOptionalField(value: string | undefined): Promise<string | undefined> {
  if (!value?.trim()) return value;
  return encryptAtRest(value);
}

async function decryptOptionalField(value: string | undefined): Promise<string | undefined> {
  if (!value?.trim()) return value;
  const plain = await decryptAtRest(value);
  return plain ?? undefined;
}

async function encryptEtsyShop(shop: EtsyShopConfig | undefined): Promise<EtsyShopConfig | undefined> {
  if (!shop) return shop;
  const next = { ...shop };
  if (next.accessToken) next.accessToken = await encryptAtRest(next.accessToken);
  if (next.refreshToken) next.refreshToken = await encryptAtRest(next.refreshToken);
  return next;
}

async function decryptEtsyShop(shop: EtsyShopConfig | undefined): Promise<EtsyShopConfig | undefined> {
  if (!shop) return shop;
  const next = { ...shop };
  if (next.accessToken) next.accessToken = (await decryptOptionalField(next.accessToken)) ?? next.accessToken;
  if (next.refreshToken) next.refreshToken = (await decryptOptionalField(next.refreshToken)) ?? next.refreshToken;
  return next;
}

/** Encrypt sensitive settings fields before writing to IndexedDB. */
export async function encryptSettingsForStorage(settings: AppSettings): Promise<AppSettings> {
  const next: AppSettings = { ...settings };
  if (next.googleAiApiKey) {
    next.googleAiApiKey = await encryptOptionalField(next.googleAiApiKey);
  }
  if (next.etsyShop) {
    next.etsyShop = await encryptEtsyShop(next.etsyShop);
  }
  return next;
}

/** Decrypt sensitive settings fields after reading from IndexedDB (plaintext passthrough for migration). */
export async function decryptSettingsFromStorage(settings: AppSettings): Promise<AppSettings> {
  const next: AppSettings = { ...settings };
  if (next.googleAiApiKey) {
    next.googleAiApiKey = await decryptOptionalField(next.googleAiApiKey);
  }
  if (next.etsyShop) {
    next.etsyShop = await decryptEtsyShop(next.etsyShop);
  }
  return next;
}
