import { useTranslation } from 'react-i18next';
import { Download, Image as ImageIcon, LayoutTemplate, Sparkles, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

/**
 * First-run coach marks. A single, friendly, dismissible card that walks a
 * non-technical maker through the whole flow. The dismiss state lives in
 * settings so it never nags again.
 */
export default function OnboardingCoach() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const goto = useAppStore((s) => s.goto);

  if (settings.onboarded) return null;

  const dismiss = () => void updateSettings({ onboarded: true });
  const start = () => {
    void updateSettings({ onboarded: true });
    goto('template');
  };

  const steps = [
    { icon: LayoutTemplate, text: t('onboarding.step1') },
    { icon: ImageIcon, text: t('onboarding.step2') },
    { icon: Sparkles, text: t('onboarding.step3') },
    { icon: Download, text: t('onboarding.step4') },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          className="icon-btn absolute right-3 top-3"
          title={t('common.close')}
          aria-label={t('common.close')}
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-xl font-semibold text-gaia-900">{t('onboarding.title')}</h2>
        <p className="mt-1 text-sm text-slate-600">{t('onboarding.subtitle')}</p>

        <ol className="mt-5 space-y-3">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <li key={i} className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gaia-100 text-gaia-700">
                  <Icon className="h-4 w-4" />
                </span>
                <span className="text-sm text-slate-700">
                  <span className="mr-1 font-semibold text-gaia-700">{i + 1}.</span>
                  {step.text}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-secondary" onClick={dismiss}>
            {t('onboarding.dismiss')}
          </button>
          <button className="btn-primary" onClick={start}>
            {t('onboarding.start')}
          </button>
        </div>
      </div>
    </div>
  );
}
