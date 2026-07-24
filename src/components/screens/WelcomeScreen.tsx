import { useTranslation } from 'react-i18next';
import { BookOpen, FlaskConical, Layers, MousePointerClick, Printer, Shapes, Sparkles, Upload } from 'lucide-react';
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

  const gettingStartedSteps = [
    { icon: FlaskConical, label: t('welcome.gs1'), screen: 'ingredients' as const, color: 'bg-emerald-100 text-emerald-700' },
    { icon: BookOpen,     label: t('welcome.gs2'), screen: 'recipes' as const,     color: 'bg-gaia-100 text-gaia-700'      },
    { icon: Layers,       label: t('welcome.gs3'), screen: 'template' as const,    color: 'bg-sky-100 text-sky-700'        },
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
          <button className="btn btn-primary px-6 py-3 text-base" onClick={() => goto('template')}>
            <Sparkles className="h-5 w-5" /> {t('welcome.start')}
          </button>
          <button className="btn btn-secondary px-6 py-3 text-base" onClick={() => goto('recipes')}>
            <BookOpen className="h-5 w-5" /> {t('welcome.manageRecipes')}
          </button>
        </div>

        {/* Getting Started section */}
        <div className="mt-14 w-full rounded-2xl bg-gaia-50 px-6 py-7 ring-1 ring-gaia-100 text-left">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-gaia-600">
            {t('welcome.gettingStarted')}
          </p>
          <p className="mt-1 text-center text-sm text-slate-500">{t('welcome.gettingStartedBody')}</p>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {gettingStartedSteps.map((s, i) => {
              const Icon = s.icon;
              return (
                <button
                  key={s.screen}
                  onClick={() => goto(s.screen)}
                  className="flex items-center gap-3 rounded-xl bg-white px-4 py-3.5 ring-1 ring-slate-100 transition hover:ring-gaia-300 hover:shadow-sm text-left"
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${s.color}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t('common.step', 'Step')} {i + 1}
                    </span>
                    <span className="text-sm font-medium text-slate-800">{s.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-8 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="card flex flex-col items-center gap-3 text-center">
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
