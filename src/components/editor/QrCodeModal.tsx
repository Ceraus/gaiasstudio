/**
 * QrCodeModal — stacked URL / text / contact / social fields encoded as one QR.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from 'react-i18next';
import { QrCode, X } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { EDITOR_PPI } from '@/lib/units';
import {
  EMPTY_QR_FIELDS,
  buildQrPayload,
  normalizeQrFields,
  type QrFields,
} from '@/lib/qrPayload';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SIZES = [
  { label: '0.5"', inches: 0.5 },
  { label: '1"',   inches: 1.0 },
  { label: '1.5"', inches: 1.5 },
  { label: '2"',   inches: 2.0 },
] as const;

export default function QrCodeModal({ open, onClose }: Props) {
  const { t } = useTranslation();
  const [fields, setFields] = useState<QrFields>(EMPTY_QR_FIELDS);
  const [editing, setEditing] = useState(false);
  const [sizeInches, setSizeInches] = useState(1.0);
  const [dataUrl, setDataUrl] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const genTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const patch = useCallback((key: keyof QrFields, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  }, []);

  const encoded = useMemo(() => buildQrPayload(fields), [fields]);
  const payload = encoded.payload;

  useEffect(() => {
    if (!open) return;
    const existing = editor.getActiveQrMeta();
    if (existing) {
      setFields(normalizeQrFields(existing.fields));
      setEditing(true);
    } else {
      setFields(EMPTY_QR_FIELDS);
      setEditing(false);
      setSizeInches(1.0);
    }
    setDataUrl('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

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
        .then((next) => { setDataUrl(next); setError(''); })
        .catch(() => setError(t('editor.qr.tooLong')));
    }, 300);
  }, [t]);

  useEffect(() => { generate(payload); }, [payload, generate]);

  const addToCanvas = async () => {
    if (!dataUrl || !payload) return;
    const printUrl = await QRCode.toDataURL(payload, {
      margin: 1,
      width: Math.round(sizeInches * EDITOR_PPI * 4),
      color: { dark: '#1a1a1a', light: '#ffffff' },
    });
    const targetPx = Math.round(sizeInches * EDITOR_PPI);
    const qrName = t('add.qrCode', 'QR Code');
    if (editing) {
      await editor.replaceSelectedImage(printUrl, qrName);
    } else {
      await editor.addImageFromUrl(printUrl, 'qr', qrName, targetPx);
    }
    editor.stampActiveQr(fields, payload);
    onClose();
  };

  if (!open) return null;

  const formatHint =
    encoded.kind === 'vcard' ? t('editor.qr.formatVcard')
    : encoded.kind === 'url' ? t('editor.qr.formatUrl')
    : encoded.kind === 'text' ? t('editor.qr.formatText')
    : '';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? t('editor.qr.editTitle') : t('editor.qr.title')}
    >
      <div className="flex max-h-[min(90vh,760px)] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-gaia-600" />
            <h2 className="font-semibold text-slate-800">
              {editing ? t('editor.qr.editTitle') : t('editor.qr.title')}
            </h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100" aria-label={t('common.close')}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
          <p className="text-[12px] leading-snug text-slate-500">{t('editor.qr.combineHint')}</p>

          <section className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('editor.qr.typeUrl')}
            </h3>
            <label className="block">
              <span className="label">{t('editor.qr.urlLabel')}</span>
              <input
                ref={inputRef}
                type="url"
                className="input"
                value={fields.url}
                placeholder={t('editor.qr.urlPlaceholder')}
                onChange={(e) => patch('url', e.target.value)}
              />
            </label>
            <p className="text-[11px] text-slate-400">{t('editor.qr.urlHint')}</p>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('editor.qr.typeText')}
            </h3>
            <label className="block">
              <span className="label">{t('editor.qr.textLabel', 'Text')}</span>
              <textarea
                className="input min-h-20"
                value={fields.text}
                placeholder={t('editor.qr.textPlaceholder')}
                onChange={(e) => patch('text', e.target.value)}
              />
            </label>
            <p className="text-[11px] text-slate-400">{t('editor.qr.textHint')}</p>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('editor.qr.typeContact')}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <label className="block">
                <span className="label">{t('editor.qr.fullName')}</span>
                <input className="input" value={fields.name} onChange={(e) => patch('name', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{t('editor.qr.phone')}</span>
                <input className="input" type="tel" value={fields.phone} onChange={(e) => patch('phone', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{t('editor.qr.email')}</span>
                <input className="input" type="email" value={fields.email} onChange={(e) => patch('email', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{t('editor.qr.address')}</span>
                <textarea className="input min-h-16" value={fields.address} onChange={(e) => patch('address', e.target.value)} />
              </label>
            </div>
            <p className="text-[11px] text-slate-400">{t('editor.qr.vcardHint')}</p>
          </section>

          <section className="space-y-2 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {t('editor.qr.typeSocial')}
            </h3>
            <div className="grid grid-cols-1 gap-2">
              <label className="block">
                <span className="label">{t('editor.qr.socialInstagram')}</span>
                <input className="input" placeholder="https://instagram.com/…" value={fields.instagram} onChange={(e) => patch('instagram', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{t('editor.qr.socialFacebook')}</span>
                <input className="input" placeholder="https://facebook.com/…" value={fields.facebook} onChange={(e) => patch('facebook', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{t('editor.qr.socialTiktok')}</span>
                <input className="input" placeholder="https://tiktok.com/@…" value={fields.tiktok} onChange={(e) => patch('tiktok', e.target.value)} />
              </label>
              <label className="block">
                <span className="label">{t('editor.qr.socialEtsy')}</span>
                <input className="input" placeholder="https://etsy.com/shop/…" value={fields.etsy} onChange={(e) => patch('etsy', e.target.value)} />
              </label>
            </div>
            <p className="text-[11px] text-slate-400">{t('editor.qr.socialHandleHint')}</p>
          </section>

          <div className="flex flex-col items-center gap-1.5">
            {dataUrl ? (
              <img src={dataUrl} alt={t('editor.qr.preview')} className="h-32 w-32 rounded-xl" />
            ) : (
              <div className="flex h-32 w-32 items-center justify-center rounded-xl bg-slate-100 text-slate-300">
                <QrCode className="h-10 w-10" />
              </div>
            )}
            {formatHint && (
              <p className="max-w-[16rem] text-center text-[11px] text-slate-400">{formatHint}</p>
            )}
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</p>}

          {!editing && (
            <div>
              <label className="label">{t('editor.qr.sizeLabel')}</label>
              <div className="grid grid-cols-4 gap-2">
                {SIZES.map(({ label, inches }) => (
                  <button
                    key={inches}
                    type="button"
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
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 px-5 py-4">
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
          <button
            className="btn-primary"
            disabled={!dataUrl || !!error}
            onClick={() => void addToCanvas()}
          >
            <QrCode className="h-4 w-4" /> {editing ? t('editor.qr.updateOnLabel') : t('editor.qr.addToLabel')}
          </button>
        </div>
      </div>
    </div>
  );
}
