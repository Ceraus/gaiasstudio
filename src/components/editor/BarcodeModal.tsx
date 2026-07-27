/**
 * BarcodeModal — prompts for a SKU/value, renders a barcode via JsBarcode,
 * and drops it onto the canvas as a resizable Fabric image.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import { Barcode, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { editor } from '@/lib/fabric/editorController';
import { EDITOR_PPI } from '@/lib/units';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SIZES = [
  { label: '0.75"', inches: 0.75 },
  { label: '1"', inches: 1.0 },
  { label: '1.5"', inches: 1.5 },
  { label: '2"', inches: 2.0 },
] as const;

function renderBarcodeDataUrl(value: string, width = 2, height = 80): string {
  const canvas = document.createElement('canvas');
  JsBarcode(canvas, value, {
    format: 'CODE128',
    width,
    height,
    displayValue: true,
    margin: 8,
    fontSize: 14,
  });
  return canvas.toDataURL('image/png');
}

export default function BarcodeModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [sku, setSku] = useState('');
  const [sizeInches, setSizeInches] = useState(1.0);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const genTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const generate = useCallback((value: string) => {
    if (genTimer.current) clearTimeout(genTimer.current);
    const trimmed = value.trim();
    if (!trimmed) { setDataUrl(''); setError(''); return; }
    genTimer.current = setTimeout(() => {
      try {
        setDataUrl(renderBarcodeDataUrl(trimmed));
        setError('');
      } catch {
        setDataUrl('');
        setError(t('editor.barcode.invalidValue', 'Could not generate a barcode for that value.'));
      }
    }, 300);
  }, [t]);

  useEffect(() => { generate(sku); }, [sku, generate]);

  const addToCanvas = async () => {
    if (!dataUrl || !sku.trim()) return;
    const printUrl = renderBarcodeDataUrl(sku.trim(), 3, Math.round(sizeInches * EDITOR_PPI * 2));
    const targetPx = Math.round(sizeInches * EDITOR_PPI);
    await editor.addImageFromUrl(printUrl, 'image', t('editor.barcode.label', 'Barcode'), targetPx);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={t('editor.barcode.title', 'Add Barcode')}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Barcode className="h-5 w-5 text-gaia-600" />
            <h2 className="font-semibold text-slate-800">{t('editor.barcode.title', 'Add Barcode')}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="label">{t('editor.barcode.skuLabel', 'SKU or value')}</label>
            <input
              ref={inputRef}
              type="text"
              className="input"
              value={sku}
              placeholder={t('editor.barcode.skuPlaceholder', 'e.g. SOAP-LAV-001')}
              onChange={(e) => setSku(e.target.value)}
            />
          </div>

          <div className="flex justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="" className="max-h-24 rounded-lg bg-white" />
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                <Barcode className="h-10 w-10" />
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          <div>
            <label className="label">{t('editor.barcode.sizeLabel', 'Size on label')}</label>
            <div className="grid grid-cols-4 gap-2">
              {SIZES.map(({ label, inches }) => (
                <button
                  key={inches}
                  onClick={() => setSizeInches(inches)}
                  className={`rounded-lg border py-2 text-sm font-medium transition ${
                    sizeInches === inches
                      ? 'border-gaia-500 bg-gaia-50 text-gaia-700'
                      : 'border-slate-200 text-slate-600 hover:border-gaia-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</button>
          <button
            className="btn-primary"
            disabled={!dataUrl || !!error}
            onClick={() => void addToCanvas()}
          >
            <Barcode className="h-4 w-4" /> {t('editor.barcode.addToLabel', 'Add to label')}
          </button>
        </div>
      </div>
    </div>
  );
}
