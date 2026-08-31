// ---------------------------------------------------------------------------
// PDF Vault — register a print-ready PDF in the portable save system and
// IndexedDB so Saved Designs → PDF Vault lists it without relying on the
// Electron download interceptor (blob <a download> often never hits it).
// ---------------------------------------------------------------------------

import { pdfVaultRepo } from '@/db/repositories';
import { downloadBytes } from '@/lib/pdfExport';
import { uid } from '@/lib/id';
import type { VaultPdf } from '@/types';

interface ElectronPdfApi {
  savePdf?: (base64: string, folder: string, filename: string) => Promise<{ path: string }>;
}

function electronPdfApi(): ElectronPdfApi | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { electronAPI?: ElectronPdfApi }).electronAPI;
}

/** True when the preload bridge is present (same signal as `isElectronWithBridge`). */
export function hasElectronPdfVault(): boolean {
  return typeof electronPdfApi()?.savePdf === 'function';
}

export function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/**
 * Writes the PDF into Electron `exports/` (the folder the vault lists) when
 * the bridge is available, and always stores a vault record in IndexedDB so
 * the in-app list updates offline / without waiting for `onPdfExported`.
 */
export async function savePdfToVault(bytes: Uint8Array, filename: string): Promise<VaultPdf> {
  const api = electronPdfApi();
  const base64 = uint8ToBase64(bytes);
  let path: string | undefined;

  if (typeof api?.savePdf === 'function') {
    const saved = await api.savePdf(base64, 'exports', filename);
    path = saved.path;
  }

  const record: VaultPdf = {
    id: uid(),
    name: filename,
    size: bytes.byteLength,
    createdAt: Date.now(),
    path,
    dataUrl: `data:application/pdf;base64,${base64}`,
  };
  await pdfVaultRepo.add(record);
  return record;
}

/**
 * What the Print-Ready PDF button must do after `buildLabelSheetPdf`:
 * register the file in the vault, then still offer the regular download.
 * PNG export must not call this.
 */
export async function exportPrintReadyPdf(bytes: Uint8Array, filename: string): Promise<VaultPdf> {
  const record = await savePdfToVault(bytes, filename);
  downloadBytes(bytes, filename);
  return record;
}
