import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Layers,
  Printer,
  Type,
} from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { useEditorStore } from '@/store/useEditorStore';
import { useAppStore } from '@/store/useAppStore';

const TEXT_COLORS = ['#1e293b', '#ffffff', '#422006', '#14532d'];

export default function MobileEditorPanel() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const ready = useEditorStore((s) => s.ready);
  const historyTick = useEditorStore((s) => s.historyTick);

  const [openSection, setOpenSection] = useState<'bg' | 'leg' | 'text' | null>('leg');
  const [legOpacity, setLegOpacity] = useState(0.15);
  const [legTone, setLegTone] = useState<'light' | 'dark'>('light');
  const [legVisible, setLegVisible] = useState(true);
  const [textFill, setTextFill] = useState('#1e293b');
  const [textScale, setTextScale] = useState(100);
  const textScaleRef = useRef(100);

  useEffect(() => {
    if (!ready) return;
    const leg = editor.getMobileLegibilityState();
    setLegOpacity(leg.opacity);
    setLegTone(leg.tone);
    setLegVisible(leg.visible);
    setTextFill(editor.getMobileTextFill());
    textScaleRef.current = 100;
    setTextScale(100);
  }, [ready, historyTick]);

  const bumpTextScale = (delta: number) => {
    const next = Math.max(70, Math.min(160, textScaleRef.current + delta));
    const ratio = next / textScaleRef.current;
    textScaleRef.current = next;
    setTextScale(next);
    editor.scaleAllTextBy(ratio);
  };

  return (
    <div className="shrink-0 border-t border-slate-200 bg-white safe-bottom">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {t('mobileEditor.layers', 'Label layers')}
        </p>
        <button
          type="button"
          className="btn-primary py-1.5 text-xs"
          onClick={() => goto('export')}
        >
          <Printer className="h-3.5 w-3.5" />
          {t('mobileEditor.print', 'Print')}
        </button>
      </div>

      <div className="max-h-[42vh] overflow-y-auto">
        {/* Background */}
        <section className="border-b border-slate-100">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => setOpenSection((s) => (s === 'bg' ? null : 'bg'))}
          >
            <ImageIcon className="h-4 w-4 text-gaia-600" />
            <span className="flex-1 text-sm font-medium text-slate-800">
              {t('mobileEditor.background', 'Background')}
            </span>
            {openSection === 'bg' ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {openSection === 'bg' && (
            <div className="space-y-2 px-4 pb-4">
              <p className="text-xs text-slate-500">
                {t(
                  'mobileEditor.backgroundHint',
                  'Set or change the art in Step 3 — Background. It appears behind your text automatically.',
                )}
              </p>
              <button type="button" className="btn-secondary w-full text-sm" onClick={() => goto('background')}>
                {t('mobileEditor.openBackground', 'Open Background step')}
              </button>
            </div>
          )}
        </section>

        {/* Legibility overlay */}
        <section className="border-b border-slate-100">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => setOpenSection((s) => (s === 'leg' ? null : 'leg'))}
          >
            <Layers className="h-4 w-4 text-gaia-600" />
            <span className="flex-1 text-sm font-medium text-slate-800">
              {t('mobileEditor.legibility', 'Legibility overlay')}
            </span>
            {openSection === 'leg' ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {openSection === 'leg' && (
            <div className="space-y-3 px-4 pb-4">
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={legVisible}
                  onChange={(e) => {
                    setLegVisible(e.target.checked);
                    editor.setLegibilityOverlayVisible(e.target.checked);
                  }}
                />
                {t('mobileEditor.showOverlay', 'Show overlay')}
              </label>
              <div>
                <label className="label">
                  {t('mobileEditor.overlayOpacity', 'Opacity')} ({Math.round(legOpacity * 100)}%)
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(legOpacity * 100)}
                  className="w-full accent-gaia-600"
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100;
                    setLegOpacity(v);
                    editor.setMobileLegibilityOpacity(v);
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ring-1 ${
                    legTone === 'light'
                      ? 'bg-white text-slate-800 ring-gaia-400'
                      : 'bg-slate-50 text-slate-600 ring-slate-200'
                  }`}
                  onClick={() => {
                    setLegTone('light');
                    editor.setMobileLegibilityTone('light');
                  }}
                >
                  {t('mobileEditor.lightOverlay', 'Light')}
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-lg py-2 text-sm font-medium ring-1 ${
                    legTone === 'dark'
                      ? 'bg-slate-800 text-white ring-gaia-400'
                      : 'bg-slate-50 text-slate-600 ring-slate-200'
                  }`}
                  onClick={() => {
                    setLegTone('dark');
                    editor.setMobileLegibilityTone('dark');
                  }}
                >
                  {t('mobileEditor.darkOverlay', 'Dark')}
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Text */}
        <section>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-4 py-3 text-left"
            onClick={() => setOpenSection((s) => (s === 'text' ? null : 'text'))}
          >
            <Type className="h-4 w-4 text-gaia-600" />
            <span className="flex-1 text-sm font-medium text-slate-800">
              {t('mobileEditor.information', 'Information (text)')}
            </span>
            {openSection === 'text' ? (
              <ChevronUp className="h-4 w-4 text-slate-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-slate-400" />
            )}
          </button>
          {openSection === 'text' && (
            <div className="space-y-3 px-4 pb-4">
              <p className="text-xs text-slate-500">
                {t(
                  'mobileEditor.textHint',
                  'Name, benefit, ingredients, and weight from your recipe. Adjust size and color for readability.',
                )}
              </p>
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  className="btn-secondary h-10 w-10 rounded-full p-0 text-lg"
                  onClick={() => bumpTextScale(-5)}
                  aria-label={t('mobileEditor.smallerText', 'Smaller text')}
                >
                  A−
                </button>
                <span className="text-sm font-medium text-slate-600">{textScale}%</span>
                <button
                  type="button"
                  className="btn-secondary h-10 w-10 rounded-full p-0 text-lg"
                  onClick={() => bumpTextScale(5)}
                  aria-label={t('mobileEditor.largerText', 'Larger text')}
                >
                  A+
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {TEXT_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    className={`h-9 w-9 rounded-full ring-2 ${
                      textFill === c ? 'ring-gaia-600' : 'ring-slate-200'
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => {
                      setTextFill(c);
                      editor.setAllTextFill(c);
                    }}
                  />
                ))}
              </div>
              <button type="button" className="btn-secondary w-full text-sm" onClick={() => goto('recipes')}>
                {t('mobileEditor.editRecipe', 'Edit recipe text')}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
