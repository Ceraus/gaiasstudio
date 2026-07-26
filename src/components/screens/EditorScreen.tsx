import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import WorkflowNav from '@/components/WorkflowNav';
import { maskLabelPngForTemplate } from '@/lib/labelMask';
import { editor } from '@/lib/fabric/editorController';
import EditorHeader from '@/components/editor/EditorHeader';
import Toolbar from '@/components/editor/Toolbar';
import LeftRail from '@/components/editor/LeftRail';
import CanvasStage from '@/components/editor/CanvasStage';
import RightPanel from '@/components/editor/RightPanel';

export default function EditorScreen() {
  const { t } = useTranslation();
  const template       = useAppStore((s) => s.template);
  const goto           = useAppStore((s) => s.goto);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const context        = useAppStore((s) => s.context);
  const pendingExportLang = useAppStore((s) => s.pendingExportLang);
  const setPendingExportLang = useAppStore((s) => s.setPendingExportLang);
  const setLabelPng = useAppStore((s) => s.setLabelPng);
  const setDesignJson = useAppStore((s) => s.setDesignJson);
  const hasAutoApplied = useRef(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!template) goto('template');
  }, [template, goto]);

  // When a recipe is active and the canvas is fresh, auto-inject its data via
  // the global editor bridge once the editor has fully initialised.
  // Re-apply label text in the language chosen on the Export screen, then return there.
  useEffect(() => {
    if (!pendingExportLang) return;

    let attempts = 0;
    let active = true;
    const interval = setInterval(() => {
      attempts++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bridge = (window as any).gaiaEditor;
      if (!bridge?.applyAutoLayout || attempts >= 40) {
        if (attempts >= 40) clearInterval(interval);
        return;
      }
      clearInterval(interval);
      void (async () => {
        await bridge.applyAutoLayout(context, pendingExportLang);
        if (!active || !template) return;
        const raw = editor.exportLabelPng();
        const png = await maskLabelPngForTemplate(raw, template);
        setDesignJson(editor.serialize());
        setLabelPng(png);
        setPendingExportLang(null);
        goto('export');
      })();
    }, 100);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pendingExportLang, context, template, goto, setDesignJson, setLabelPng, setPendingExportLang]);

  useEffect(() => {
    if (!activeRecipeId || hasAutoApplied.current || pendingExportLang) return;

    let attempts = 0;
    let active = true;
    let applyTimer: ReturnType<typeof setTimeout> | null = null;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;

    const interval = setInterval(() => {
      attempts++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const bridge = (window as any).gaiaEditor;
      if (bridge?.applyAutoLayout && attempts < 30) {
        clearInterval(interval);
        hasAutoApplied.current = true;
        applyTimer = setTimeout(() => {
          if (!active) return;
          void (bridge.applyAutoLayout(context) as Promise<void>).then(() => {
            if (!active) return;
            setToastMsg('Label layout applied from recipe');
            toastTimer = setTimeout(() => { if (active) setToastMsg(null); }, 4000);
          });
        }, 500);
      }
      if (attempts >= 30) clearInterval(interval);
    }, 100);

    return () => {
      active = false;
      clearInterval(interval);
      if (applyTimer) clearTimeout(applyTimer);
      if (toastTimer) clearTimeout(toastTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRecipeId, context]);

  if (!template) return null;

  return (
    <div className="flex h-full flex-col">
      <EditorHeader />
      <Toolbar />
      <div className="relative flex min-h-0 flex-1">
        <LeftRail />
        <CanvasStage />
        <RightPanel />
      </div>
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toastMsg}
        </div>
      )}
      <WorkflowNav
        prevScreen="background"
        prevLabel={t('workflow.backToBackground', 'Back: Background')}
        nextScreen="export"
        nextLabel={t('workflow.nextExport', 'Next: Print & Export')}
      />
    </div>
  );
}
