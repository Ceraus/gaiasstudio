import { GraduationCap, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { isTrainingModeActive } from '@/lib/trainingMode';
import { useAppStore } from '@/store/useAppStore';

/**
 * First-launch popup introducing Training Mode. Shown once when
 * hasSeenTrainingWelcome is false and Training Mode is enabled.
 */
export default function TrainingModeWelcome() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const goto = useAppStore((s) => s.goto);

  if (settings.hasSeenTrainingWelcome || !isTrainingModeActive(settings)) return null;

  const dismiss = () => void updateSettings({ hasSeenTrainingWelcome: true });

  const start = () => {
    void updateSettings({ hasSeenTrainingWelcome: true });
    goto('template');
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center overflow-hidden bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-gaia-600 px-6 pb-4 pt-5">
          <button
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label={t('common.close')}
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-white" />
            <h2 className="text-xl font-semibold text-white">
              {t('trainingMode.welcomeTitle', "Welcome to Gaia's Studio!")}
            </h2>
          </div>
          <p className="mt-1 text-sm text-emerald-50">
            {t('trainingMode.welcomeSubtitle', 'Training Mode helps you master the label maker step by step.')}
          </p>
        </div>

        <div className="space-y-3 px-6 py-5 text-sm leading-relaxed text-slate-700">
          <p>{t('trainingMode.welcomeBody1')}</p>
          <p>{t('trainingMode.welcomeBody2')}</p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={dismiss}>
            {t('trainingMode.welcomeDismiss', 'Got it')}
          </button>
          <button type="button" className="btn-primary w-full sm:w-auto" onClick={start}>
            {t('trainingMode.welcomeStart', 'Start Step 1 — Choose Shape')}
          </button>
        </div>
      </div>
    </div>
  );
}
