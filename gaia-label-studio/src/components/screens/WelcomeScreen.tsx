import { useTranslation } from 'react-i18next';
import { BookOpen, MousePointerClick, Printer, Shapes, Sparkles, Upload } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);

  const steps = [
    { icon: Shapes, label: t('welcome.step1') },
    { icon: Upload, label: t('welcome.step2') },
    { icon: MousePointerClick, label: t('welcome.step3') },
    { icon: Printer, label: t('welcome.step4') },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full bg-gaia-100 px-4 py-1.5 text-sm font-medium text-gaia-700">
          <Sparkles className="h-4 w-4" /> {t('app.tagline')}
        </span>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight text-gaia-900 sm:text-5xl">
          {t('welcome.title')}
        </h1>
        <p className="mt-4 max-w-xl text-base text-slate-600">{t('welcome.body')}</p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <button className="btn-primary px-6 py-3 text-base" onClick={() => goto('template')}>
            <Sparkles className="h-5 w-5" /> {t('welcome.start')}
          </button>
          <button className="btn-secondary px-6 py-3 text-base" onClick={() => goto('recipes')}>
            <BookOpen className="h-5 w-5" /> {t('welcome.manageRecipes')}
          </button>
        </div>

        <div className="mt-14 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="card flex flex-col items-center gap-3 text-center">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gaia-100 text-gaia-700">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <p className="text-sm text-slate-700">{s.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
