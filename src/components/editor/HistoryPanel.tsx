import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, RotateCcw } from 'lucide-react';
import { versionsRepo } from '@/db/repositories';
import type { DesignVersion } from '@/types';
import { editor } from '@/lib/fabric/editorController';
import { useAppStore } from '@/store/useAppStore';
import { useEditorStore } from '@/store/useEditorStore';

export default function HistoryPanel() {
  const { t } = useTranslation();
  const designId = useAppStore((s) => s.designId);
  const tick = useEditorStore((s) => s.historyTick);
  const [versions, setVersions] = useState<DesignVersion[]>([]);

  useEffect(() => {
    let alive = true;
    void versionsRepo.forDesign(designId).then((v) => {
      if (alive) setVersions(v);
    });
    return () => {
      alive = false;
    };
  }, [designId, tick]);

  if (versions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-slate-400">
        <History className="h-6 w-6 text-slate-300" />
        {t('history.empty')}
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-50">
      {versions.map((v, i) => (
        <li key={v.id} className="flex items-center gap-3 p-2.5">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100 ring-1 ring-slate-200">
            {v.thumbnail && (
              <img src={v.thumbnail} alt="" className="h-full w-full object-contain" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-slate-700">
              {i === 0 ? t('history.current') : t('history.autosaved')}
            </p>
            <p className="truncate text-[11px] text-slate-400">{v.label}</p>
          </div>
          <button
            className="btn-ghost px-2 py-1 text-xs"
            title={t('history.restore')}
            onClick={() => void editor.restoreJson(v.canvasJson)}
          >
            <RotateCcw className="h-3.5 w-3.5" /> {t('history.restore')}
          </button>
        </li>
      ))}
    </ul>
  );
}
