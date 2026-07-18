import { useTranslation } from 'react-i18next';
import { ArrowLeft, Check, Cloud, Loader2, Printer } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useEditorStore } from '@/store/useEditorStore';
import { describeSize } from '@/lib/units';
import { editor } from '@/lib/fabric/editorController';

export default function EditorHeader() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const setDesignJson = useAppStore((s) => s.setDesignJson);
  const setLabelPng = useAppStore((s) => s.setLabelPng);
  const template = useAppStore((s) => s.template);
  const context = useAppStore((s) => s.context);
  const saveState = useEditorStore((s) => s.saveState);

  const openExport = () => {
    // Capture a print-resolution flattened label and the design before leaving.
    setLabelPng(editor.exportLabelPng());
    setDesignJson(editor.serialize());
    goto('export');
  };

  return (
    <header className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <button className="icon-btn" title={t('common.back')} onClick={() => goto('template')}>
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">
            {template ? template.name : t('steps.design')}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {template ? describeSize(template) : ''} · {t(`template.${context}`)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1 text-xs text-slate-400 sm:flex">
          {saveState === 'saving' ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('editor.saving')}
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check className="h-3.5 w-3.5 text-emerald-500" /> {t('editor.saved')}
            </>
          ) : (
            <Cloud className="h-3.5 w-3.5" />
          )}
        </span>
        <button className="btn-primary" onClick={openExport}>
          <Printer className="h-4 w-4" /> {t('export.title')}
        </button>
      </div>
    </header>
  );
}
