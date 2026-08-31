import { useTranslation } from 'react-i18next';
import { FilePlus, Folder } from 'lucide-react';
import type { Screen } from '@/store/useAppStore';
import { useAppStore } from '@/store/useAppStore';
import { WORKFLOW_STEP_ICONS, type WorkflowStepOrder } from '@/lib/workflowStepIcons';
import AffirmationCenterPill from '@/components/common/AffirmationCenterPill';
import logo from '@/assets/logo.png';

/** Mirrors the global WorkflowStepper — same order, keys, icons, and destinations. */
const WORKFLOW_STEPS: Array<{
  order: WorkflowStepOrder;
  labelKey: string;
  defaultLabel: string;
  screen: Screen;
}> = [
  { order: 1, labelKey: 'workflow.shape', defaultLabel: 'Choose Shape & Size', screen: 'template' },
  { order: 2, labelKey: 'workflow.recipe', defaultLabel: 'Choose Recipe', screen: 'recipes' },
  { order: 3, labelKey: 'workflow.step3', defaultLabel: 'Choose Background', screen: 'background' },
  { order: 4, labelKey: 'workflow.refine', defaultLabel: 'Refine & Design', screen: 'editor-v2' },
  { order: 5, labelKey: 'workflow.export', defaultLabel: 'Print & Export', screen: 'export' },
];

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);

  return (
    <div data-welcome-dash="" className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-hidden bg-[#e2ece0] max-sm:overflow-y-auto">
      <div data-welcome-hero="" className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        <div data-welcome-wreath="" className="w-full shrink-0 overflow-hidden pt-[var(--welcome-wreath-pt)]">
          <div className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden px-6 text-center">
            <div className="welcome-wreath-frame mx-auto w-full min-h-0 min-w-0 max-w-[18.627rem] shrink-0 overflow-hidden sm:max-w-[22.353rem]">
              <img
                src={logo}
                alt="Gaia's Essences"
                width={298}
                height={277}
                className="block h-full w-full max-w-full select-none object-contain"
                style={{ maxWidth: '100%', maxHeight: '100%' }}
                draggable={false}
              />
            </div>
          </div>
        </div>

        <div data-welcome-copy="" className="w-full shrink-0">
          <div data-welcome-greeting-pad="" className="w-full pb-[var(--welcome-greeting-pb)]">
            <div className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden px-6 text-center">
              <h1
                data-welcome-greeting=""
                className="mx-auto max-w-2xl shrink-0 text-4xl font-semibold leading-tight text-gaia-900 sm:text-5xl"
              >
                {t('welcome.title')}
              </h1>
            </div>
          </div>

          <div data-welcome-cta-pad="" className="w-full pt-[var(--welcome-cta-pt)]">
            <div className="mx-auto w-full min-w-0 max-w-5xl overflow-hidden px-6 text-center">
              <div
                data-welcome-cta-row=""
                className="mx-auto flex w-full max-w-2xl shrink-0 items-center justify-center gap-[var(--welcome-cta-gap)]"
              >
                <button className="btn btn-primary min-w-0 flex-1 justify-center whitespace-nowrap rounded-full px-6 py-3 text-base" onClick={() => goto('template')}>
                  <FilePlus className="h-5 w-5" /> {t('welcome.start')}
                </button>
                <button
                  type="button"
                  className="saved-designs-pill btn min-w-0 flex-1 justify-center whitespace-nowrap rounded-full px-6 py-3 text-base text-white shadow-md hover:shadow-lg"
                  style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
                  onClick={() => goto('drafts')}
                >
                  <Folder className="h-5 w-5" /> {t('welcome.savedDesigns', 'Saved Designs')}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div data-affirmation-pill-spacer="" className="w-full shrink-0 pt-[var(--welcome-pill-pt)]" />

        <div data-welcome-pill-wrap="" className="w-full shrink-0">
          <div className="mx-auto w-full max-w-5xl px-6">
            <AffirmationCenterPill />
          </div>
        </div>

        <div data-welcome-sage-leftover="" className="min-h-0 w-full flex-1" />
      </div>

      <div data-welcome-mint="" className="w-full shrink-0 bg-[#f3f7f2] py-[var(--welcome-mint-py)]">
        <div className="mx-auto w-full min-w-0 max-w-[73.6rem] px-6 text-left">
          <p className="text-center text-[calc(0.75rem*1.15*1.15)] font-bold uppercase tracking-widest text-gaia-600">
            {t('welcome.gettingStarted')}
          </p>
          <div className="mt-[0.8625rem] grid grid-cols-1 gap-[0.8625rem] sm:grid-cols-2 lg:grid-cols-5">
            {WORKFLOW_STEPS.map((step) => {
              const { icon: Icon, chip } = WORKFLOW_STEP_ICONS[step.order];
              return (
                <button
                  key={step.screen}
                  type="button"
                  onClick={() => goto(step.screen)}
                  className="flex flex-col items-center gap-[0.575rem] rounded-xl bg-white px-[0.8625rem] py-[0.8625rem] ring-1 ring-slate-100 transition hover:ring-gaia-300 hover:shadow-sm sm:px-[0.575rem]"
                >
                  <span className={`flex h-[2.875rem] w-[2.875rem] shrink-0 items-center justify-center rounded-xl ${chip}`}>
                    <Icon className="h-[1.4375rem] w-[1.4375rem]" />
                  </span>
                  <span className="text-[calc(0.6875rem*1.15*1.15)] font-semibold uppercase tracking-wide text-black">
                    {t('common.step', 'Step')} {step.order}
                  </span>
                  <span className="text-center text-[1.00625rem] font-medium leading-snug text-slate-800">
                    {t(step.labelKey, step.defaultLabel)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
