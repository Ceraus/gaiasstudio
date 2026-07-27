import { GraduationCap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isTrainingModeActive } from '@/lib/trainingMode';
import { useAppStore } from '@/store/useAppStore';

interface TrainingModeToggleProps {
  /** Compact pill for mobile header rows. */
  compact?: boolean;
}

export default function TrainingModeToggle({ compact = false }: TrainingModeToggleProps) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const trainingMode = isTrainingModeActive(settings);
  const setTrainingMode = useAppStore((s) => s.setTrainingMode);

  const toggle = () => void setTrainingMode(!trainingMode);

  if (compact) {
    return (
      <button
        type="button"
        role="switch"
        aria-checked={trainingMode}
        aria-label={t('trainingMode.toggle', 'Training Mode')}
        title={trainingMode ? t('trainingMode.onHint') : t('trainingMode.offHint')}
        onClick={toggle}
        className={`flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors ${
          trainingMode
            ? 'bg-emerald-600 text-white shadow-sm'
            : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
        }`}
      >
        <GraduationCap className="h-3.5 w-3.5" />
        {trainingMode ? t('trainingMode.onShort', 'Training') : t('trainingMode.offShort', 'Full')}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={trainingMode}
      aria-label={t('trainingMode.toggle', 'Training Mode')}
      title={trainingMode ? t('trainingMode.onHint') : t('trainingMode.offHint')}
      onClick={toggle}
      className={`flex shrink-0 items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
        trainingMode
          ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-200'
          : 'bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
    >
      <GraduationCap className="h-4 w-4" />
      <span className="hidden sm:inline">
        {trainingMode ? t('trainingMode.onLabel', 'Training Mode') : t('trainingMode.offLabel', 'Full Studio')}
      </span>
      <span
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
          trainingMode ? 'bg-emerald-800/30' : 'bg-slate-300'
        }`}
        aria-hidden="true"
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
            trainingMode ? 'translate-x-[18px]' : 'translate-x-0.5'
          }`}
        />
      </span>
    </button>
  );
}
