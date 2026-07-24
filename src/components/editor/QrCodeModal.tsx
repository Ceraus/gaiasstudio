/**
 * QrCodeModal — lets the user type a URL or text, previews the generated QR
 * code, then drops it onto the canvas as a PNG image at the chosen size.
 * Uses the `qrcode` library which works fully offline.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { QrCode, X } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { EDITOR_PPI } from '@/lib/units';

interface Props {
  open: boolean;
  onClose: () => void;
}

// Size options in inches → converted to canvas pixels via EDITOR_PPI
const SIZES = [
  { label: '0.5"', inches: 0.5 },
  { label: '1"',   inches: 1.0 },
  { label: '1.5"', inches: 1.5 },
  { label: '2"',   inches: 2.0 },
] as const;

export default function QrCodeModal({ open, onClose }: Props) {
  const [text, setText] = useState('https://');
  const [sizeInches, setSizeInches] = useState(1.0);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // Debounce generation to avoid re-rendering on every keystroke
  const genTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  const generate = useCallback((value: string) => {
    if (genTimer.current) clearTimeout(genTimer.current);
    if (!value.trim()) { setDataUrl(''); setError(''); return; }
    genTimer.current = setTimeout(() => {
      QRCode.toDataURL(value.trim(), {
        margin: 1, width: 256,
        color: { dark: '#1a1a1a', light: '#ffffff' },
      })
        .then((url) => { setDataUrl(url); setError(''); })
        .catch(() => setError('Text too long for a QR code — try a shorter URL.'));
    }, 300);
  }, []);

  useEffect(() => { generate(text); }, [text, generate]);

  const addToCanvas = async () => {
    if (!dataUrl) return;
    // Re-generate at high resolution for crisp PDF export
    const printUrl = await QRCode.toDataURL(text.trim(), {
      margin: 1,
      width: Math.round(sizeInches * EDITOR_PPI * 4), // 4× oversampling
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
    // Pass target canvas pixels so the image lands at the requested size
    const targetPx = Math.round(sizeInches * EDITOR_PPI);
    await editor.addImageFromUrl(printUrl, 'image', 'QR Code', targetPx);
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Add QR Code"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-gaia-600" />
            <h2 className="font-semibold text-slate-800">Add QR Code</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 p-5">
          <div>
            <label className="label">URL or text</label>
            <input
              ref={inputRef}
              type="text"
              className="input"
              value={text}
              placeholder="https://yourwebsite.com"
              onChange={(e) => setText(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Enter a website URL, ingredient list link, or any short text.
            </p>
          </div>

          {/* Preview */}
          <div className="flex justify-center">
            {dataUrl ? (
              <img src={dataUrl} alt="QR code preview" className="h-32 w-32 rounded-xl" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                <QrCode className="h-10 w-10" />
              </div>
            )}
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          {/* Size picker */}
          <div>
            <label className="label">Size on label</label>
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

        {/* Footer */}
        <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!dataUrl || !!error}
            onClick={addToCanvas}
          >
            <QrCode className="h-4 w-4" /> Add to label
          </button>
        </div>
      </div>
    </div>
  );
}
