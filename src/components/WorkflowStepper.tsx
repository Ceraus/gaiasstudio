/**
 * WorkflowStepper — shows the label workflow as a navigation bar.
 *
 * Steps:
 *   1     Step 1: Choose Shape & Size  (template)
 *   2     Step 2: Choose Recipe        (recipes)
 *   3     Step 3: Choose Background    (background)
 *   4     Step 4: Refine & Design      (editor)
 *   5     Step 5: Print & Export       (export)
 *
 * The ingredient library is reached from Recipes, not from the step bar.
 *
 * All steps are freely clickable. Steps 4 and 5 are gated ONLY when navigating
 * from before the editor (currentOrder < 4):
 *   - Requires a template (step 1) — no override; go pick a shape.
 *   - Missing recipe or background — explain what’s missing, allow Continue anyway,
 *     and keep a reminder on later screens.
 *
 * Step 3 (background) only requires a template.
 *
 * Once the user is IN the editor (step 4), step 5 is always freely accessible.
 *
 * Past steps with their required data show a check on the step's colored chip.
 * Recipe or background missing while a later step is active shows a yellow
 * warning (not a check). Shape is never marked skipped. The current screen
 * uses the step icon in a white pill.
 */
import { Fragment, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Screen, type WorkflowGapKind } from '@/store/useAppStore';
import { checkTrainingGate, isTrainingModeActive } from '@/lib/trainingMode';
import { WORKFLOW_STEP_ICONS, type WorkflowStepOrder } from '@/lib/workflowStepIcons';
import { getWorkflowStepStatus } from '@/lib/workflowStepStatus';
import { useTrainingBlockStore } from '@/store/useTrainingBlockStore';
import WorkflowSkipModal from '@/components/WorkflowSkipModal';

interface SkipPrompt {
  message: string;
  detail?: string;
  allowOverride: boolean;
  overrideGaps?: WorkflowGapKind[];
  target: Screen;
  stepOrder: WorkflowStepOrder;
  title: string;
}

interface Step {
  order: WorkflowStepOrder;
  labelKey: string;
  defaultLabel: string;
  screens: Screen[];
  goto: Screen;
}

const STEPS: Step[] = [
  { order: 1, labelKey: 'workflow.step1Title', defaultLabel: 'Step 1: Choose Shape & Size', screens: ['template', 'sets'], goto: 'template' },
  { order: 2, labelKey: 'workflow.step2Title', defaultLabel: 'Step 2: Choose Recipe', screens: ['recipes'], goto: 'recipes' },
  { order: 3, labelKey: 'workflow.step3Title', defaultLabel: 'Step 3: Choose Background', screens: ['background'], goto: 'background' },
  { order: 4, labelKey: 'workflow.step4Title', defaultLabel: 'Step 4: Refine & Design', screens: ['editor-v2'], goto: 'editor-v2' },
  { order: 5, labelKey: 'workflow.step5Title', defaultLabel: 'Step 5: Print & Export', screens: ['export'], goto: 'export' },
];

const ALL_WORKFLOW_SCREENS: Screen[] = [
  ...STEPS.flatMap((s) => s.screens),
  'ingredients',
  'drafts',
  'batch',
  'inventory',
  'orders',
  'promptBuilder',
];

interface WorkflowStepperProps {
  /** When true, renders only the step pills without the outer band wrapper.
   *  Use when embedding inside a header grid column. */
  embedded?: boolean;
  /**
   * Icon-only pills (no labels, no connector line) for tight slots such as the Back/Next footer.
   * Same icons, colors, completed-check, skip warning, and current-step highlight as the header.
   */
  compact?: boolean;
}

export default function WorkflowStepper({ embedded = false, compact = false }: WorkflowStepperProps) {
  const screen         = useAppStore((s) => s.screen);
  const goto           = useAppStore((s) => s.goto);
  const template       = useAppStore((s) => s.template);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl);
  const settings       = useAppStore((s) => s.settings);
  const trainingMode   = isTrainingModeActive(settings);
  const showTrainingBlock = useTrainingBlockStore((s) => s.show);
  const setWorkflowGap = useAppStore((s) => s.setWorkflowGap);
  const { t }          = useTranslation();

  const [hintStep,        setHintStep]        = useState<number | null>(null);
  const [hintMsg,         setHintMsg]         = useState('');
  const [skipPrompt,      setSkipPrompt]      = useState<SkipPrompt | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  if (!ALL_WORKFLOW_SCREENS.includes(screen)) return null;

  const currentStep = STEPS.find((s) => s.screens.includes(screen));
  const currentOrder = currentStep?.order ?? 0;

  const showHint = (stepOrder: number, msg: string) => {
    if (hintTimer.current) clearTimeout(hintTimer.current);
    setHintStep(stepOrder);
    setHintMsg(msg);
    hintTimer.current = setTimeout(() => setHintStep(null), 3000);
  };

  const handleClick = (step: Step) => {
    const navigate = () => goto(step.goto);

    if (trainingMode) {
      const gate = checkTrainingGate({
        target: step.goto,
        template,
        activeRecipeId,
        backgroundImageUrl,
        currentOrder,
      });
      if (gate) {
        if (gate.canOverride) {
          showTrainingBlock(gate, step.goto, navigate);
          return;
        }
        showHint(step.order, t(gate.messageKey, gate.defaultMessage));
        goto(gate.redirectTo);
        return;
      }
      navigate();
      return;
    }

    if (step.goto === 'background' && !template) {
      setSkipPrompt({
        message: t('workflow.hintSelectTemplate'),
        detail: t('workflow.hintSelectTemplateBody', 'Pick a shape and size first — the editor needs a template to design on.'),
        allowOverride: false,
        target: 'template',
        stepOrder: 1,
        title: `${t('common.step', 'Step')} 1: ${t('trainingMode.blockTitleTemplate', 'Choose a Shape & Size')}`,
      });
      return;
    }

    // Gate Refine (4) and Export (5) when arriving from an earlier step.
    // Compare order, not a stale `'editor'` string — Refine goto is `'editor-v2'`.
    const shouldGate = step.order >= 4 && currentOrder < 4;

    if (shouldGate) {
      if (!template) {
        setSkipPrompt({
          message: t('workflow.hintSelectTemplate'),
          detail: t('workflow.hintSelectTemplateBody', 'Pick a shape and size first — the editor needs a template to design on.'),
          allowOverride: false,
          target: 'template',
          stepOrder: 1,
          title: `${t('common.step', 'Step')} 1: ${t('trainingMode.blockTitleTemplate', 'Choose a Shape & Size')}`,
        });
        return;
      }
      if (!activeRecipeId) {
        setSkipPrompt({
          message: t('workflow.hintSelectRecipe'),
          detail: t('workflow.hintSelectRecipeBody', 'Without a recipe, the label won’t include ingredients, benefits, or a product name from your formula.'),
          allowOverride: true,
          overrideGaps: backgroundImageUrl ? ['recipe'] : ['recipe', 'background'],
          target: step.goto,
          stepOrder: 2,
          title: `${t('common.step', 'Step')} 2: ${t('trainingMode.blockTitleRecipe', 'Choose a Recipe')}`,
        });
        return;
      }
      if (!backgroundImageUrl && step.goto !== 'background') {
        setSkipPrompt({
          message: t('workflow.hintSelectBackground', 'Choose a background to continue'),
          detail: t('workflow.hintSelectBackgroundBody', 'Without a background, the label will print on a blank canvas. You can add one later.'),
          allowOverride: true,
          overrideGaps: ['background'],
          target: step.goto,
          stepOrder: 3,
          title: `${t('common.step', 'Step')} 3: ${t('trainingMode.blockTitleBackground', 'Choose a Background')}`,
        });
        return;
      }
    }
    goto(step.goto);
  };

  const skippedLabel = t('workflow.skipped', 'Skipped');

  const stepPills = STEPS.map((step, idx) => {
    const { icon: Icon, chip } = WORKFLOW_STEP_ICONS[step.order];
    const status = getWorkflowStepStatus({
      stepOrder: step.order,
      currentOrder,
      hasRecipe: !!activeRecipeId,
      hasBackground: !!backgroundImageUrl,
    });
    const isActive = status === 'current';
    const isComplete = status === 'complete';
    const isSkipped = status === 'skipped';
    const label = t(step.labelKey, step.defaultLabel);

    return (
      <Fragment key={step.order}>
        <button
          type="button"
          data-workflow-step={step.order}
          data-step-status={status}
          className={`group relative inline-flex w-fit max-w-max flex-none items-center transition-all ${
            compact
              ? 'gap-0 rounded-full px-2 py-1.5'
              : 'gap-1.5 rounded-xl px-2 py-1.5 sm:gap-2.5 sm:px-3.5 sm:py-2'
          } ${
            isActive
              ? 'cursor-default bg-white shadow-md ring-1 ring-gaia-200'
              : isSkipped
                ? `cursor-pointer hover:bg-amber-50${compact ? ' bg-white ring-1 ring-slate-200' : ''}`
                : isComplete
                  ? `cursor-pointer hover:bg-gaia-50${compact ? ' bg-white ring-1 ring-slate-200' : ''}`
                  : `cursor-pointer opacity-55 hover:opacity-80 hover:bg-slate-50/70${compact ? ' bg-white ring-1 ring-slate-200' : ''}`
          }`}
          onClick={() => handleClick(step)}
          aria-current={isActive ? 'step' : undefined}
          aria-label={isSkipped ? `${label} — ${skippedLabel}` : compact ? label : undefined}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-lg transition-all ${
              isActive
                ? `h-8 w-8 ${chip}`
                : isSkipped
                  ? 'h-7 w-7 bg-amber-100 text-amber-700'
                  : `h-7 w-7 ${chip}`
            }`}
          >
            {isSkipped ? (
              <AlertTriangle className="h-4 w-4 max-sm:h-3.5 max-sm:w-3.5" aria-hidden="true" />
            ) : isComplete ? (
              <Check className="h-4 w-4 max-sm:h-3.5 max-sm:w-3.5" strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <Icon className="h-4 w-4 max-sm:h-3.5 max-sm:w-3.5" aria-hidden="true" />
            )}
          </span>

          {!compact && (
            <span
              className={`hidden whitespace-nowrap sm:inline ${
                isActive
                  ? 'text-[calc(0.875rem*1.05*1.08)] font-bold text-black'
                  : isSkipped
                    ? 'text-[calc(0.75rem*1.05*1.08)] font-semibold text-amber-700'
                    : isComplete
                      ? 'text-[calc(0.75rem*1.05*1.08)] font-semibold text-black'
                      : 'text-[calc(0.75rem*1.05*1.08)] font-medium text-black'
              }`}
            >
              {label}
            </span>
          )}
        </button>

        {!compact && idx < STEPS.length - 1 && (
          <div
            className={`flex-1 rounded-full mx-2 min-w-4 sm:mx-3 ${
              currentOrder > step.order
                ? isSkipped
                  ? 'h-1 bg-amber-400'
                  : 'h-1 bg-gaia-400'
                : 'h-0.5 bg-slate-200'
            }`}
          />
        )}
      </Fragment>
    );
  });

  const skipModal = (
    <WorkflowSkipModal
      open={skipPrompt !== null}
      onClose={() => setSkipPrompt(null)}
      stepOrder={skipPrompt?.stepOrder}
      title={skipPrompt?.title}
      message={skipPrompt?.message ?? ''}
      detail={skipPrompt?.detail}
      allowOverride={skipPrompt?.allowOverride ?? false}
      onOverride={() => {
        if (!skipPrompt) return;
        skipPrompt.overrideGaps?.forEach((gap) => setWorkflowGap(gap, true));
        goto(skipPrompt.target);
      }}
    />
  );

  if (embedded) {
    return (
      <div
        className={`relative flex w-full items-center ${compact ? 'justify-center gap-1.5' : 'px-6 sm:px-10 lg:px-12'}`}
        data-workflow-stepper={compact ? 'footer' : 'embedded'}
      >
        {stepPills}
        {hintStep !== null && (
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 shadow-lg"
          >
            <span aria-hidden="true">⚠</span>
            <span>{hintMsg}</span>
          </div>
        )}
        {skipModal}
      </div>
    );
  }

  return (
    <div className="border-b border-gaia-100 bg-gradient-to-b from-gaia-50/80 to-white/98 shadow-sm backdrop-blur" data-tour="workflow-steps" data-workflow-stepper="header">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex w-full min-w-max items-center px-6 py-2 sm:min-w-0 sm:px-10 sm:py-3.5 lg:px-12">
          {stepPills}
        </div>
      </div>

      {hintStep !== null && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center justify-center gap-2 border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800"
        >
          <span aria-hidden="true">⚠</span>
          <span>{hintMsg}</span>
        </div>
      )}
      {skipModal}
    </div>
  );
}
