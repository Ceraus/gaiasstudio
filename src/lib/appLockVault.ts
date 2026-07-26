// Split from appLock so secretVault can import deriveVaultKey without circular deps.

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export async function deriveVaultKeyFromPin(
  pin: string,
  saltB64: string,
  iterations = 210_000,
): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const salt = fromBase64(saltB64);
  const saltBuffer = Uint8Array.from(salt);
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: saltBuffer, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}
