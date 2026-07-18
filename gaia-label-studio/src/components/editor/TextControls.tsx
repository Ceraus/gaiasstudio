import { useTranslation } from 'react-i18next';
import { AlignCenter, AlignLeft, AlignRight, Bold, Italic, Loader2, Underline } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';
import { ptToPx, pxToPt } from '@/lib/units';
import { BUNDLED_FONTS, ONLINE_FONTS, SYSTEM_FONTS } from '@/data/googleFonts';

export default function TextControls() {
  const { t } = useTranslation();
  const sel = useEditorStore((s) => s.selection);
  if (!sel || !sel.isText) return null;

  const set = (patch: Record<string, unknown>) => void editor.setActiveProps(patch);
  const pt = Math.round(pxToPt(sel.fontSize));

  return (
    <div className="space-y-3">
      <div>
        <label className="label flex items-center gap-2">
          {t('text.font')}
          {sel.fontLoading && <Loader2 className="h-3 w-3 animate-spin text-gaia-500" />}
        </label>
        <select
          className="input"
          value={sel.fontFamily}
          style={{ fontFamily: sel.fontFamily }}
          onChange={(e) => set({ fontFamily: e.target.value })}
        >
          <optgroup label="System">
            {SYSTEM_FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.family}
              </option>
            ))}
          </optgroup>
          <optgroup label="Offline">
            {BUNDLED_FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.family}
              </option>
            ))}
          </optgroup>
          <optgroup label={`Google (${t('text.onlineFont')})`}>
            {ONLINE_FONTS.map((f) => (
              <option key={f.family} value={f.family}>
                {f.family}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('text.size')} (pt)</label>
          <input
            type="number"
            min={4}
            max={200}
            className="input"
            value={pt}
            onChange={(e) => set({ fontSize: ptToPx(Number(e.target.value) || pt) })}
          />
        </div>
        <div>
          <label className="label">{t('text.color')}</label>
          <input
            type="color"
            className="h-[38px] w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            value={/^#/.test(sel.fill) ? sel.fill : '#2b2b2b'}
            onChange={(e) => set({ fill: e.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <button
          className={`icon-btn ${sel.bold ? 'icon-btn-active' : ''}`}
          title={t('text.bold')}
          onClick={() => set({ fontWeight: sel.bold ? 'normal' : 'bold' })}
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          className={`icon-btn ${sel.italic ? 'icon-btn-active' : ''}`}
          title={t('text.italic')}
          onClick={() => set({ fontStyle: sel.italic ? 'normal' : 'italic' })}
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          className={`icon-btn ${sel.underline ? 'icon-btn-active' : ''}`}
          title={t('text.underline')}
          onClick={() => set({ underline: !sel.underline })}
        >
          <Underline className="h-4 w-4" />
        </button>
        <span className="mx-1 h-5 w-px bg-slate-200" />
        {(['left', 'center', 'right'] as const).map((a) => {
          const Icon = a === 'left' ? AlignLeft : a === 'center' ? AlignCenter : AlignRight;
          return (
            <button
              key={a}
              className={`icon-btn ${sel.textAlign === a ? 'icon-btn-active' : ''}`}
              title={t(`text.align${a[0].toUpperCase()}${a.slice(1)}`)}
              onClick={() => set({ textAlign: a })}
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>

      <div>
        <label className="label">
          {t('text.lineHeight')} · {sel.lineHeight.toFixed(2)}
        </label>
        <input
          type="range"
          min={0.7}
          max={2.2}
          step={0.02}
          className="w-full accent-gaia-600"
          value={sel.lineHeight}
          onChange={(e) => set({ lineHeight: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">
          {t('text.letterSpacing')} · {Math.round(sel.charSpacing)}
        </label>
        <input
          type="range"
          min={-100}
          max={800}
          step={10}
          className="w-full accent-gaia-600"
          value={sel.charSpacing}
          onChange={(e) => set({ charSpacing: Number(e.target.value) })}
        />
      </div>
    </div>
  );
}
