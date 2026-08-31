import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { History } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { LAYER_NAME_KEYS, layerDisplayName } from '@/lib/layerDisplayName';
import { useEditorStore } from '@/store/useEditorStore';

type HistoryPanelProps = {
  /** Dark matches the v1 right rail; light matches editor V2. */
  variant?: 'dark' | 'light';
};

const HISTORY_KEYS: Record<string, string> = {
  'Add Text': 'history.addText',
  'Add Shape': 'history.addShape',
  'Add Image': 'history.addImage',
  'Added text': 'history.addText',
  'Added shape': 'history.addShape',
  'Set Background': 'history.setBackground',
  Move: 'history.move',
  Resize: 'history.resize',
  Rotate: 'history.rotate',
  Skew: 'history.skew',
  Flip: 'history.flip',
  Font: 'history.font',
  Color: 'history.color',
  Style: 'history.style',
  Align: 'history.align',
  Opacity: 'history.opacity',
  Curve: 'history.curve',
  Spacing: 'history.spacing',
  Text: 'history.text',
  Delete: 'history.delete',
  Duplicate: 'history.duplicate',
  Edit: 'history.edit',
  Change: 'history.change',
  Add: 'history.add',
  Hide: 'history.hide',
  Show: 'history.show',
  Lock: 'history.lock',
  Unlock: 'history.unlock',
  Rename: 'history.rename',
  Reorder: 'history.reorder',
  Group: 'history.group',
  'Initial State': 'history.initial',
};

function formatHistoryLabel(label: string, t: TFunction) {
  if (HISTORY_KEYS[label]) return t(HISTORY_KEYS[label], { defaultValue: label });
  const space = label.indexOf(' ');
  if (space <= 0) return label;
  const verb = label.slice(0, space);
  const rest = label.slice(space + 1);
  const verbKey = HISTORY_KEYS[verb];
  const verbT = verbKey ? t(verbKey, { defaultValue: verb }) : verb;
  const restT = LAYER_NAME_KEYS[rest] ? layerDisplayName(rest, (key) => t(key)) : rest;
  return `${verbT} ${restT}`;
}

export default function HistoryPanel({ variant = 'dark' }: HistoryPanelProps) {
  const { t } = useTranslation();
  const steps = useEditorStore((s) => s.historySteps);
  const light = variant === 'light';

  if (steps.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 p-6 text-center text-xs text-slate-500">
        <History className={`h-6 w-6 ${light ? 'text-slate-400' : 'text-slate-600'}`} />
        {t('history.emptySteps', 'Edits you make will appear here. Click a step to jump back.')}
      </div>
    );
  }

  return (
    <ul className={light ? 'divide-y divide-slate-200' : 'divide-y divide-slate-800'}>
      {steps.map((step) => (
        <li key={step.index}>
          <button
            type="button"
            className={`flex w-full items-center gap-2 pl-3 pr-[43px] py-2 text-left text-xs transition ${
              step.current
                ? light
                  ? 'bg-white text-slate-700 shadow-sm'
                  : 'bg-gaia-900/40 text-gaia-300'
                : light
                  ? 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
            title={step.current ? t('history.currentStep', 'Current State') : t('history.jumpTo', 'Jump To This State')}
            onClick={() => void editor.jumpToHistory(step.index)}
          >
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                step.current
                  ? light ? 'bg-[#1e60d3]' : 'bg-gaia-400'
                  : light ? 'bg-slate-400' : 'bg-slate-600'
              }`}
            />
            <span className="min-w-0 flex-1 truncate font-medium">{formatHistoryLabel(step.label, t)}</span>
            {step.current && (
              <span className={`shrink-0 text-[10px] uppercase tracking-wide ${light ? 'text-[#1e60d3]' : 'text-gaia-500'}`}>
                {t('history.current')}
              </span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
