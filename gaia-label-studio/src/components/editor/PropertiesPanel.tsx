import { useTranslation } from 'react-i18next';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';
import TextControls from './TextControls';

const BLEND_MODES = [
  'source-over',
  'multiply',
  'screen',
  'overlay',
  'darken',
  'lighten',
  'color-burn',
  'color-dodge',
  'difference',
  'hue',
  'saturation',
  'color',
  'luminosity',
];

export default function PropertiesPanel() {
  const { t } = useTranslation();
  const sel = useEditorStore((s) => s.selection);

  if (!sel) {
    return <p className="p-4 text-center text-xs text-slate-400">{t('panels.noSelection')}</p>;
  }

  const set = (patch: Record<string, unknown>) => void editor.setActiveProps(patch);
  const showFill = sel.isShape || sel.isText;
  const showStroke = sel.isShape;

  return (
    <div className="space-y-4 p-3">
      {sel.isText && <TextControls />}

      {showFill && (
        <div>
          <label className="label">{t('panels.fill')}</label>
          <input
            type="color"
            className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
            value={/^#/.test(sel.fill) ? sel.fill : '#a7c4a0'}
            onChange={(e) => set({ fill: e.target.value })}
          />
        </div>
      )}

      {showStroke && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">{t('panels.stroke')}</label>
            <input
              type="color"
              className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              value={/^#/.test(sel.stroke) ? sel.stroke : '#6b7c66'}
              onChange={(e) => set({ stroke: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t('panels.strokeWidth')}</label>
            <input
              type="number"
              min={0}
              max={40}
              className="input"
              value={Math.round(sel.strokeWidth)}
              onChange={(e) => set({ strokeWidth: Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      {sel.hasCornerRadius && (
        <div>
          <label className="label">
            {t('panels.cornerRadius')} · {Math.round(sel.cornerRadius)}
          </label>
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            className="w-full accent-gaia-600"
            value={sel.cornerRadius}
            onChange={(e) => set({ cornerRadius: Number(e.target.value) })}
          />
        </div>
      )}

      <div>
        <label className="label">
          {t('panels.opacity')} · {Math.round(sel.opacity * 100)}%
        </label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          className="w-full accent-gaia-600"
          value={sel.opacity}
          onChange={(e) => set({ opacity: Number(e.target.value) })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">{t('panels.blend')}</label>
          <select
            className="input"
            value={sel.blend}
            onChange={(e) => set({ blend: e.target.value })}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {m === 'source-over' ? 'normal' : m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">{t('panels.rotation')}</label>
          <input
            type="number"
            min={-180}
            max={180}
            className="input"
            value={Math.round(sel.angle)}
            onChange={(e) => set({ angle: Number(e.target.value) })}
          />
        </div>
      </div>
    </div>
  );
}
