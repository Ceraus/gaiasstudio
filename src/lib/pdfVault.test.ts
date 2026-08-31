/** @vitest-environment jsdom */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const add = vi.fn(async (record: unknown) => record);

vi.mock('@/db/repositories', () => ({
  pdfVaultRepo: { add: (...args: unknown[]) => add(args[0]) },
}));

const downloadBytes = vi.fn();

vi.mock('@/lib/pdfExport', () => ({
  downloadBytes: (...args: unknown[]) => downloadBytes(...args),
}));

import { exportPrintReadyPdf, hasElectronPdfVault, savePdfToVault, uint8ToBase64 } from '@/lib/pdfVault';

describe('savePdfToVault', () => {
  const bytes = new Uint8Array([0x25, 0x50, 0x44, 0x46]); // %PDF

  beforeEach(() => {
    add.mockClear();
    downloadBytes.mockClear();
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  afterEach(() => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  it('always writes an IndexedDB vault record', async () => {
    const record = await savePdfToVault(bytes, 'Soap – Label.pdf');
    expect(add).toHaveBeenCalledTimes(1);
    expect(record.name).toBe('Soap – Label.pdf');
    expect(record.size).toBe(4);
    expect(record.dataUrl).toMatch(/^data:application\/pdf;base64,/);
    expect(record.path).toBeUndefined();
    expect(hasElectronPdfVault()).toBe(false);
  });

  it('calls electronAPI.savePdf with the exports folder when the bridge exists', async () => {
    const savePdf = vi.fn(async () => ({ path: 'C:\\Gaia\\exports\\Soap – Label.pdf' }));
    (window as unknown as { electronAPI: { savePdf: typeof savePdf } }).electronAPI = { savePdf };

    const record = await savePdfToVault(bytes, 'Soap – Label.pdf');

    expect(hasElectronPdfVault()).toBe(true);
    expect(savePdf).toHaveBeenCalledTimes(1);
    expect(savePdf).toHaveBeenCalledWith(uint8ToBase64(bytes), 'exports', 'Soap – Label.pdf');
    expect(record.path).toBe('C:\\Gaia\\exports\\Soap – Label.pdf');
    expect(add).toHaveBeenCalledTimes(1);
  });

  it('exportPrintReadyPdf registers the vault then downloads (the Export PDF click path)', async () => {
    const savePdf = vi.fn(async () => ({ path: '/exports/label.pdf' }));
    (window as unknown as { electronAPI: { savePdf: typeof savePdf } }).electronAPI = { savePdf };

    await exportPrintReadyPdf(bytes, 'label.pdf');

    expect(savePdf).toHaveBeenCalledWith(uint8ToBase64(bytes), 'exports', 'label.pdf');
    expect(add).toHaveBeenCalledTimes(1);
    expect(downloadBytes).toHaveBeenCalledWith(bytes, 'label.pdf');
    expect(add.mock.invocationCallOrder[0]).toBeLessThan(downloadBytes.mock.invocationCallOrder[0]);
  });
});

describe('Export Print-Ready PDF button wiring', () => {
  it('ExportScreen exportPdf click handler calls exportPrintReadyPdf', () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, '../components/screens/ExportScreen.tsx'), 'utf8');
    expect(src).toContain('import { exportPrintReadyPdf } from \'@/lib/pdfVault\'');
    expect(src).toMatch(/const exportPdf = async \(\) => \{[\s\S]*await exportPrintReadyPdf\(bytes, name\)/);
    expect(src).toMatch(/onClick=\{\(\) => void exportPdf\(\)\}/);
    expect(src).not.toMatch(/exportPng/);
    expect(src).not.toMatch(/exportPng[\s\S]{0,400}exportPrintReadyPdf/);
  });
});
