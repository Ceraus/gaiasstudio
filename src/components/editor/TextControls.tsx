/**
 * TextControls — shows the ADVANCED text settings in the floating side panel.
 * Basic controls (font, size, colour, B/I/U, alignment) now live in the
 * context toolbar so users see them at a glance without opening a side panel.
 */

import { useTranslation } from 'react-i18next';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';

export default function TextControls() {
  const { t } = useTranslation();
  const sel = useEditorStore((s) => s.selection);
  if (!sel || !sel.isText) return null;

  const set = (patch: Record<string, unknown>) => void editor.setActiveProps(patch);

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
        {t('text.advancedLabel', 'Advanced Text')}
      </p>

      <div>
        <label className="label">
          {t('text.lineHeight')} · {sel.lineHeight.toFixed(2)}
        </label>
        <input
          type="range"
          min={0.7} max={2.2} step={0.02}
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
          min={-100} max={800} step={10}
          className="w-full accent-gaia-600"
          value={sel.charSpacing}
          onChange={(e) => set({ charSpacing: Number(e.target.value) })}
        />
      </div>

      <div>
        <label className="label">
          {t('text.curve')} · {Math.round(sel.curve)}
        </label>
        <input
          type="range"
          min={-100} max={100} step={1}
          className="w-full accent-gaia-600"
          value={sel.curve}
          aria-label={t('text.curve')}
          onChange={(e) => editor.setTextCurve(Number(e.target.value))}
        />
      </div>
    </div>
  );
}
