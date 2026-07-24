import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Target, Unlink2 } from 'lucide-react';
import * as fabric from 'fabric';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';
import TextControls from './TextControls';

/** A forgiving inch input that keeps a local draft so multi-digit typing works. */
function InchInput({
  value,
  onCommit,
  label,
  allowNegative = false,
}: {
  value: number;
  onCommit: (v: number) => void;
  label: string;
  allowNegative?: boolean;
}) {
  const [draft, setDraft] = useState(value.toFixed(2));
  useEffect(() => setDraft(value.toFixed(2)), [value]);
  const commit = () => {
    const n = Number(draft);
    if (Number.isFinite(n) && (allowNegative || n > 0)) onCommit(n);
    else setDraft(value.toFixed(2));
  };
  return (
    <div className="relative">
      <input
        type="number"
        step={0.05}
        min={allowNegative ? undefined : 0.05}
        className="input pr-6"
        aria-label={label}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
        "
      </span>
    </div>
  );
}

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

  const single = sel.count === 1;

  return (
    <div className="space-y-4 p-4">
      {single && (
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="label mb-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {t('panels.sizePosition')}
            </label>
            <div className="flex items-center gap-1">
              <button
                className={`icon-btn h-7 w-7 ${sel.lockAspect ? 'icon-btn-active' : ''}`}
                title={t('panels.lockAspect')}
                aria-label={t('panels.lockAspect')}
                aria-pressed={sel.lockAspect}
                onClick={() => editor.toggleLockAspect()}
              >
                {sel.lockAspect ? <Link2 className="h-3.5 w-3.5" /> : <Unlink2 className="h-3.5 w-3.5" />}
              </button>
              <button
                className="icon-btn h-7 w-7"
                title={t('editor.centerOnLabel')}
                aria-label={t('editor.centerOnLabel')}
                onClick={() => editor.centerSelected()}
              >
                <Target className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <span className="mb-1 block text-[11px] text-slate-400">{t('panels.width')}</span>
              <InchInput label={t('panels.width')} value={sel.widthIn}
                onCommit={(w) => editor.setSelectedSizeIn(w, sel.heightIn)} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-slate-400">{t('panels.height')}</span>
              <InchInput label={t('panels.height')} value={sel.heightIn}
                onCommit={(h) => editor.setSelectedSizeIn(sel.widthIn, h)} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-slate-400">X</span>
              <InchInput label="X" allowNegative value={sel.leftIn}
                onCommit={(x) => editor.setSelectedPositionIn(x, sel.topIn)} />
            </div>
            <div>
              <span className="mb-1 block text-[11px] text-slate-400">Y</span>
              <InchInput label="Y" allowNegative value={sel.topIn}
                onCommit={(y) => editor.setSelectedPositionIn(sel.leftIn, y)} />
            </div>
          </div>
        </section>
      )}

      {sel.isText && <TextControls />}

      {/* ── Rotation — always visible for any selected object ────────── */}
      {single && (
        <div>
          <label className="label">{t('panels.rotation')} (°)</label>
          <input
            type="number"
            min={-360}
            max={360}
            className="input"
            value={Math.round(sel.angle)}
            onChange={(e) => set({ angle: Number(e.target.value) })}
          />
        </div>
      )}

      {/* ── Appearance row: fill + stroke side-by-side ────────────────── */}
      {(showFill || showStroke) && (
        <section className="space-y-2">
          <p className="label mb-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {t('panels.appearance')}
          </p>
          <div className="grid grid-cols-2 gap-3">
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
              <div>
                <label className="label">{t('panels.stroke')}</label>
                <input
                  type="color"
                  className="h-9 w-full cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
                  value={/^#/.test(sel.stroke) ? sel.stroke : '#6b7c66'}
                  onChange={(e) => set({ stroke: e.target.value })}
                />
              </div>
            )}
            {showStroke && (
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
            )}
          </div>
        </section>
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

      {/* ── Opacity + blend ──────────────────────────────────────────────── */}
      <section className="space-y-3">
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
        <div>
          <label className="label">{t('panels.blend')}</label>
          <select
            className="input"
            value={sel.blend}
            onChange={(e) => set({ blend: e.target.value })}
          >
            {BLEND_MODES.map((m) => (
              <option key={m} value={m}>
                {m === 'source-over' ? 'Normal' : m.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ── Drop Shadow ──────────────────────────────────────────────────── */}
      <ShadowSection />
    </div>
  );
}

function ShadowSection() {
  const { t } = useTranslation();
  // Re-sync whenever selection changes
  const sel = useEditorStore((s) => s.selection);

  const getShadow = () => {
    const a = editor.canvas?.getActiveObject() as (fabric.FabricObject & { shadow?: fabric.Shadow | null }) | undefined;
    return a?.shadow ?? null;
  };

  const [enabled, setEnabled] = useState(() => !!getShadow());
  const [shadowColor, setShadowColor] = useState(() => getShadow()?.color ?? '#000000');
  const [blur, setBlur] = useState(() => getShadow()?.blur ?? 10);
  const [offsetX, setOffsetX] = useState(() => getShadow()?.offsetX ?? 4);
  const [offsetY, setOffsetY] = useState(() => getShadow()?.offsetY ?? 4);

  // Resync shadow UI whenever the selected object changes
  useEffect(() => {
    const s = getShadow();
    setEnabled(!!s);
    setShadowColor(s?.color ?? '#000000');
    setBlur(s?.blur ?? 10);
    setOffsetX(s?.offsetX ?? 4);
    setOffsetY(s?.offsetY ?? 4);
    // sel is the dependency — triggers when user picks a different object
  }, [sel]);

  const apply = (patch: Partial<{ color: string; blur: number; offsetX: number; offsetY: number; on: boolean }>) => {
    const nowOn = patch.on !== undefined ? patch.on : enabled;
    const c = patch.color ?? shadowColor;
    const b = patch.blur ?? blur;
    const ox = patch.offsetX ?? offsetX;
    const oy = patch.offsetY ?? offsetY;
    if (patch.color !== undefined) setShadowColor(c);
    if (patch.blur !== undefined) setBlur(b);
    if (patch.offsetX !== undefined) setOffsetX(ox);
    if (patch.offsetY !== undefined) setOffsetY(oy);
    if (patch.on !== undefined) setEnabled(nowOn);
    const shadow = nowOn ? new fabric.Shadow({ color: c, blur: b, offsetX: ox, offsetY: oy }) : null;
    editor.canvas?.getActiveObjects().forEach((o) => {
      (o as fabric.FabricObject & { shadow?: fabric.Shadow | null }).shadow = shadow;
    });
    editor.canvas?.requestRenderAll();
    (editor as unknown as { onChanged?: () => void }).onChanged?.();
  };

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="label mb-0 text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('panels.shadow', 'Drop Shadow')}
        </p>
        <button
          role="switch"
          aria-checked={enabled}
          onClick={() => apply({ on: !enabled })}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${enabled ? 'bg-gaia-500' : 'bg-slate-200'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition ${enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
        </button>
      </div>
      {enabled && (
        <div className="space-y-2 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2">
            <label className="w-16 text-[11px] text-slate-500">{t('panels.color', 'Color')}</label>
            <input
              type="color"
              value={shadowColor}
              className="h-7 w-12 cursor-pointer rounded border border-slate-200 p-0.5"
              onChange={(e) => apply({ color: e.target.value })}
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 text-[11px] text-slate-500">{t('panels.blur', 'Blur')}</label>
            <input type="range" min={0} max={60} className="flex-1 accent-gaia-600" value={blur}
              onChange={(e) => apply({ blur: Number(e.target.value) })} />
            <span className="w-6 text-right text-[11px] text-slate-500">{blur}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 text-[11px] text-slate-500">{t('panels.offsetX', 'Offset X')}</label>
            <input type="range" min={-40} max={40} className="flex-1 accent-gaia-600" value={offsetX}
              onChange={(e) => apply({ offsetX: Number(e.target.value) })} />
            <span className="w-6 text-right text-[11px] text-slate-500">{offsetX}</span>
          </div>
          <div className="flex items-center gap-2">
            <label className="w-16 text-[11px] text-slate-500">{t('panels.offsetY', 'Offset Y')}</label>
            <input type="range" min={-40} max={40} className="flex-1 accent-gaia-600" value={offsetY}
              onChange={(e) => apply({ offsetY: Number(e.target.value) })} />
            <span className="w-6 text-right text-[11px] text-slate-500">{offsetY}</span>
          </div>
        </div>
      )}
    </section>
  );
}
