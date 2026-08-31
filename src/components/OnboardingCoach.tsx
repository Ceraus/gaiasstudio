import { useTranslation } from 'react-i18next';
import { Download, Image as ImageIcon, LayoutTemplate, Sparkles, X } from 'lucide-react';
import { isTrainingModeActive } from '@/lib/trainingMode';
import { useAppStore } from '@/store/useAppStore';
import { useTourStore } from '@/store/useTourStore';

/**
 * First-run welcome card when Training Mode is off.
 */
export default function OnboardingCoach() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const startTour = useTourStore((s) => s.start);

  if (settings.onboarded || isTrainingModeActive(settings)) return null;

  const dismiss = () => void updateSettings({ onboarded: true });
  const start = () => {
    void updateSettings({ onboarded: true });
    startTour('getting-started');
  };

  const steps = [
    { icon: LayoutTemplate, text: t('onboarding.step1') },
    { icon: ImageIcon, text: t('onboarding.step2') },
    { icon: Sparkles, text: t('onboarding.step3') },
    { icon: Download, text: t('onboarding.step4') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden bg-slate-900/40 p-4 backdrop-blur-sm sm:items-center">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Gradient header strip */}
        <div className="bg-gradient-to-r from-gaia-600 to-gaia-500 px-6 pb-4 pt-5">
          <button
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            aria-label={t('common.close')}
            onClick={dismiss}
          >
            <X className="h-4 w-4" />
          </button>
          <h2 className="text-xl font-semibold text-white">{t('onboarding.title')}</h2>
          <p className="mt-0.5 text-sm text-gaia-100">{t('onboarding.subtitle')}</p>
        </div>

        <div className="px-6 py-5">
          <ol className="space-y-3">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={i} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gaia-100 text-gaia-700">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="pt-1.5 text-sm leading-snug text-slate-700">
                    <span className="mr-1 font-semibold text-gaia-700">{i + 1}.</span>
                    {step.text}
                  </span>
                </li>
              );
            })}
          </ol>

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button className="btn-secondary w-full sm:w-auto" onClick={dismiss}>
              {t('onboarding.dismiss')}
            </button>
            <button className="btn-primary w-full sm:w-auto" onClick={start}>
              {t('onboarding.startTour', 'Show Me Around')}
            </button>
          </div>
          <p className="mt-3 text-center text-[11px] text-slate-400">
            {t('onboarding.hubHint', 'You can replay every walkthrough later from the ? button in the header.')}
          </p>
        </div>
      </div>
    </div>
  );
}
