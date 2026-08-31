import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store/useAppStore';
import { useEditorStore } from '@/store/useEditorStore';
import { useStreamlinedMobile } from '@/hooks/useMobileLayout';
import { maskLabelPngForTemplate } from '@/lib/labelMask';
import { editor, readCanvasLabelLanguage } from '@/lib/fabric/editorController';
import { detectCanvasLabelLanguage } from '@/lib/detectLabelLanguage';
import Modal from '@/components/common/Modal';
import BackgroundScreen from '@/components/screens/BackgroundScreen';
import EditorHeaderV2 from '@/components/editor/EditorHeaderV2';
import LeftSidebarV2 from '@/components/editor/LeftSidebarV2';
import CanvasStage from '@/components/editor/CanvasStage';
import RightSidebarV2 from '@/components/editor/RightSidebarV2';

export default function EditorScreenV2() {
  const { t } = useTranslation();
  const template = useAppStore((s) => s.template);
  const goto = useAppStore((s) => s.goto);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const context = useAppStore((s) => s.context);
  const pendingExportLang = useAppStore((s) => s.pendingExportLang);
  const setPendingExportLang = useAppStore((s) => s.setPendingExportLang);
  const setLabelPng = useAppStore((s) => s.setLabelPng);
  const setDesignJson = useAppStore((s) => s.setDesignJson);
  const setLabelLanguage = useAppStore((s) => s.setLabelLanguage);
  const settings = useAppStore((s) => s.settings);
  const streamlinedMobile = useStreamlinedMobile(settings);
  const hasAutoApplied = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [mobilePropsOpen, setMobilePropsOpen] = useState(false);
  const [showBgChooser, setShowBgChooser] = useState(false);
  const openBgChooser = useCallback(() => setShowBgChooser(true), []);
  const closeBgChooser = useCallback(() => setShowBgChooser(false), []);
  const setBackgroundImageUrl = useAppStore((s) => s.setBackgroundImageUrl);
  const applyBackground = useCallback(async (url: string) => {
    setBackgroundImageUrl(url);
    await editor.setBackgroundFromUrl(url);
    setShowBgChooser(false);
  }, [setBackgroundImageUrl]);

  useEffect(() => {
    const sync = () => {
      const active = document.fullscreenElement === rootRef.current;
      if (useEditorStore.getState().editorFullscreen !== active) {
        useEditorStore.getState().set({ editorFullscreen: active });
      }
    };
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = () => {
    const el = rootRef.current;
    if (!el) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void el.requestFullscreen().catch(() => undefined);
  };

  useEffect(() => {
    if (!template) goto('template');
  }, [template, goto]);

  useEffect(() => {
    if (!pendingExportLang) return;
    let attempts = 0;
    let active = true;
    const interval = setInterval(() => {
      attempts++;
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
        const json = editor.serialize();
        setDesignJson(json);
        const detected = detectCanvasLabelLanguage(json, readCanvasLabelLanguage(json));
        if (detected) setLabelLanguage(detected);
        setLabelPng(png);
        setPendingExportLang(null);
        goto('export');
      })();
    }, 100);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [pendingExportLang, context, template, goto, setDesignJson, setLabelPng, setLabelLanguage, setPendingExportLang]);

  useEffect(() => {
    if (!activeRecipeId || hasAutoApplied.current || pendingExportLang) return;
    let attempts = 0;
    let active = true;
    let applyTimer: ReturnType<typeof setTimeout> | null = null;
    let toastTimer: ReturnType<typeof setTimeout> | null = null;
    const interval = setInterval(() => {
      attempts++;
      const bridge = (window as any).gaiaEditor;
      if (bridge?.applyAutoLayout && attempts < 30) {
        clearInterval(interval);
        hasAutoApplied.current = true;
        applyTimer = setTimeout(() => {
          if (!active) return;
          void (bridge.applyAutoLayout(context) as Promise<void>).then(() => {
            if (!active) return;
            setToastMsg(t('editor.layoutAppliedFromRecipe', 'Label layout applied from recipe'));
            toastTimer = setTimeout(() => {
              if (active) setToastMsg(null);
            }, 4000);
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
  }, [activeRecipeId, context, pendingExportLang, t]);

  const openExport = async () => {
    const raw = editor.exportLabelPng();
    const png = template ? await maskLabelPngForTemplate(raw, template) : raw;
    const json = editor.serialize();
    setLabelPng(png);
    setDesignJson(json);
    const detected = detectCanvasLabelLanguage(
      json,
      useAppStore.getState().labelLanguage ?? readCanvasLabelLanguage(json),
    );
    if (detected) setLabelLanguage(detected);
    goto('export');
  };

  if (!template) return null;

  return (
    <div ref={rootRef} className="flex flex-col h-full bg-white absolute inset-0 z-50">
      <EditorHeaderV2
        onExport={openExport}
        onToggleFullscreen={toggleFullscreen}
        onOpenBackgroundChooser={openBgChooser}
      />
      
      <div className="flex flex-1 overflow-hidden relative">
        <LeftSidebarV2 onOpenBackgroundChooser={openBgChooser} />
        
        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[#e9ecef]">
          <CanvasStage />

          {toastMsg && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
              <div className="bg-slate-800 text-white px-4 py-2 rounded-full text-sm shadow-lg whitespace-nowrap animate-in fade-in slide-in-from-top-4 duration-300">
                {toastMsg}
              </div>
            </div>
          )}

          {streamlinedMobile && (
            <button
              onClick={() => setMobilePropsOpen(!mobilePropsOpen)}
              className="absolute bottom-4 right-4 z-40 bg-white shadow-lg border border-slate-200 p-3 rounded-full text-slate-700 md:hidden hover:bg-slate-50 transition-colors"
            >
              <PanelRight className="w-5 h-5" />
            </button>
          )}
        </div>

        {!streamlinedMobile && <RightSidebarV2 />}
      </div>

      {streamlinedMobile && (
        <div
          className={`absolute inset-x-0 bottom-0 bg-white shadow-2xl transition-transform duration-300 ease-in-out z-50 md:hidden flex flex-col rounded-t-2xl border-t border-slate-200 ${
            mobilePropsOpen ? 'translate-y-0 h-[60vh]' : 'translate-y-full'
          }`}
        >
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800">{t('editor.properties', 'Properties')}</h3>
            <button
              onClick={() => setMobilePropsOpen(false)}
              className="text-slate-400 hover:text-slate-600 p-1"
              aria-label={t('common.close')}
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto">
            <RightSidebarV2 />
          </div>
        </div>
      )}

      <Modal
        open={showBgChooser}
        onClose={closeBgChooser}
        title={t('background.title', 'Choose A Background')}
        width="min(92vw, 1456px)"
        fullHeight
        flush
      >
        <BackgroundScreen embedded onSelect={(url) => void applyBackground(url)} />
      </Modal>
    </div>
  );
}
