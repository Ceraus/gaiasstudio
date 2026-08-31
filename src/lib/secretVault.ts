// ---------------------------------------------------------------------------
// Encrypt API keys & OAuth tokens at rest (AES-GCM, key derived from PIN).
// Vault key lives in memory only — cleared on lock / session expiry.
// ---------------------------------------------------------------------------

import type { AppSettings, EtsyShopConfig } from '@/types';
import { deriveVaultKeyFromPin } from '@/lib/appLockVault';

const ALGO = 'AES-GCM';
const IV_BYTES = 12;

export interface SecretsPayload {
  googleAiApiKey?: string;
  googleTranslateApiKey?: string;
  unsplashKey?: string;
  unsplashSecretKey?: string;
  pixabayKey?: string;
  etsyShop?: EtsyShopConfig;
}

let activeVaultKey: CryptoKey | null = null;

export function setVaultKey(key: CryptoKey | null): void {
  activeVaultKey = key;
}

export function hasVaultKey(): boolean {
  return activeVaultKey !== null;
}

export function clearVaultKey(): void {
  activeVaultKey = null;
}

export async function activateVaultFromPin(
  pin: string,
  record: Pick<AppSettings, 'lockPinSalt' | 'lockPinIterations'>,
): Promise<boolean> {
  if (!record.lockPinSalt) return false;
  try {
    const key = await deriveVaultKeyFromPin(pin, record.lockPinSalt, record.lockPinIterations);
    setVaultKey(key);
    return true;
  } catch {
    return false;
  }
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

export function extractSecrets(settings: AppSettings): SecretsPayload {
  const payload: SecretsPayload = {};
  if (settings.googleAiApiKey) payload.googleAiApiKey = settings.googleAiApiKey;
  if (settings.googleTranslateApiKey) payload.googleTranslateApiKey = settings.googleTranslateApiKey;
  if (settings.unsplashKey) payload.unsplashKey = settings.unsplashKey;
  if (settings.unsplashSecretKey) payload.unsplashSecretKey = settings.unsplashSecretKey;
  if (settings.pixabayKey) payload.pixabayKey = settings.pixabayKey;
  if (settings.etsyShop) payload.etsyShop = { ...settings.etsyShop };
  return payload;
}

function hasAnySecrets(payload: SecretsPayload): boolean {
  return !!(
    payload.googleAiApiKey
    || payload.googleTranslateApiKey
    || payload.unsplashKey
    || payload.unsplashSecretKey
    || payload.pixabayKey
    || payload.etsyShop?.apiKey
    || payload.etsyShop?.accessToken
    || payload.etsyShop?.refreshToken
  );
}

export async function encryptSecretsBlob(payload: SecretsPayload): Promise<string | undefined> {
  if (!activeVaultKey || !hasAnySecrets(payload)) return undefined;
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const plaintext = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: ALGO, iv }, activeVaultKey, plaintext);
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return toBase64(combined);
}

export async function decryptSecretsBlob(blob: string): Promise<SecretsPayload | null> {
  if (!activeVaultKey) return null;
  try {
    const combined = fromBase64(blob);
    const iv = combined.slice(0, IV_BYTES);
    const data = combined.slice(IV_BYTES);
    const plaintext = await crypto.subtle.decrypt({ name: ALGO, iv }, activeVaultKey, data);
    return JSON.parse(new TextDecoder().decode(plaintext)) as SecretsPayload;
  } catch {
    return null;
  }
}

/** Strip plaintext secret fields before persisting to IndexedDB. */
export function stripPlaintextSecrets(settings: AppSettings): AppSettings {
  const next = { ...settings };
  delete next.googleAiApiKey;
  delete next.googleTranslateApiKey;
  delete next.unsplashKey;
  delete next.unsplashSecretKey;
  delete next.pixabayKey;
  delete next.etsyShop;
  return next;
}

/** Merge decrypted secrets into settings for in-app use. */
export function mergeSecrets(settings: AppSettings, payload: SecretsPayload | null): AppSettings {
  if (!payload) return settings;
  return {
    ...settings,
    googleAiApiKey: payload.googleAiApiKey ?? settings.googleAiApiKey,
    googleTranslateApiKey: payload.googleTranslateApiKey ?? settings.googleTranslateApiKey,
    unsplashKey: payload.unsplashKey ?? settings.unsplashKey,
    unsplashSecretKey: payload.unsplashSecretKey ?? settings.unsplashSecretKey,
    pixabayKey: payload.pixabayKey ?? settings.pixabayKey,
    etsyShop: payload.etsyShop ?? settings.etsyShop,
  };
}

export async function prepareSettingsForStorage(settings: AppSettings): Promise<AppSettings> {
  const payload = extractSecrets(settings);
  const secretsEnc = await encryptSecretsBlob(payload);
  const stored = stripPlaintextSecrets(settings);
  if (secretsEnc) {
    return { ...stored, secretsEnc };
  }
  // No vault key — keep legacy plaintext (first launch before PIN setup)
  return settings;
}

export async function hydrateSettingsFromStorage(settings: AppSettings): Promise<AppSettings> {
  if (!settings.secretsEnc) return settings;
  if (!activeVaultKey) {
    return stripPlaintextSecrets(settings);
  }
  const payload = await decryptSecretsBlob(settings.secretsEnc);
  return mergeSecrets(stripPlaintextSecrets(settings), payload);
}
