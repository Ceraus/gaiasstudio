/**
 * WorkflowStepper — shows the label workflow as a navigation bar.
 *
 * Steps:
 *   1     Choose Shape & Size  (template)
 *   2     Choose Recipe        (recipes)
 *   3     Choose Background    (background)
 *   4     Refine & Design      (editor)
 *   5     Print & Export       (export)
 *
 * All steps are freely clickable. Steps 4 and 5 are gated ONLY when navigating
 * from before the editor (currentOrder < 4):
 *   - Requires a template (step 1) — redirects to template if missing.
 *   - Requires an active recipe (step 2) — redirects to recipes if missing.
 *
 * Step 3 (background) only requires a template.
 *
 * Once the user is IN the editor (step 4), step 5 is always freely accessible.
 */
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Image as ImageIcon, Layers, Pencil, Printer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore, type Screen } from '@/store/useAppStore';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { getRecipeColor } from '@/lib/recipeColors';
import { checkTrainingGate, isTrainingModeActive } from '@/lib/trainingMode';
import { useTrainingBlockStore } from '@/store/useTrainingBlockStore';

interface Step {
  order: number;
  /** Shown in the step circle on desktop (e.g. "1", "2"). */
  stepLabel: string;
  labelKey: string;
  defaultLabel: string;
  icon: typeof Layers;
  screens: Screen[];
  goto: Screen;
}

const STEPS: Step[] = [
  { order: 1, stepLabel: '1', labelKey: 'workflow.shape', defaultLabel: 'Choose Shape & Size', icon: Layers, screens: ['template', 'sets'], goto: 'template' },
  { order: 2, stepLabel: '2', labelKey: 'workflow.recipe', defaultLabel: 'Choose Recipe', icon: BookOpen, screens: ['recipes'], goto: 'recipes' },
  { order: 3, stepLabel: '3', labelKey: 'workflow.step3', defaultLabel: 'Choose Background', icon: ImageIcon, screens: ['background'], goto: 'background' },
  { order: 4, stepLabel: '4', labelKey: 'workflow.refine', defaultLabel: 'Refine & Design', icon: Pencil, screens: ['editor'], goto: 'editor' },
  { order: 5, stepLabel: '5', labelKey: 'workflow.export', defaultLabel: 'Print & Export', icon: Printer, screens: ['export'], goto: 'export' },
];

const ALL_WORKFLOW_SCREENS: Screen[] = [
  ...STEPS.flatMap((s) => s.screens),
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
}

export default function WorkflowStepper({ embedded = false }: WorkflowStepperProps) {
  const screen         = useAppStore((s) => s.screen);
  const goto           = useAppStore((s) => s.goto);
  const template       = useAppStore((s) => s.template);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl);
  const settings       = useAppStore((s) => s.settings);
  const trainingMode   = isTrainingModeActive(settings);
  const showTrainingBlock = useTrainingBlockStore((s) => s.show);
  const { t }          = useTranslation();

  const [hintStep,        setHintStep]        = useState<number | null>(null);
  const [hintMsg,         setHintMsg]         = useState('');
  const [activeRecipeDot, setActiveRecipeDot] = useState<string | null>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => { if (hintTimer.current) clearTimeout(hintTimer.current); }, []);

  useEffect(() => {
    if (!activeRecipeId) { setActiveRecipeDot(null); return; }
    let cancelled = false;
    Promise.all([recipesRepo.get(activeRecipeId), ingredientsRepo.all()]).then(([recipe, ings]) => {
      if (cancelled || !recipe) return;
      const theme = getRecipeColor(recipe, ings);
      setActiveRecipeDot(theme.dot);
    });
    return () => { cancelled = true; };
  }, [activeRecipeId]);

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

    if (step.goto === 'background') {
      if (!template) {
        showHint(step.order, t('workflow.needTemplate', 'Choose a shape first (Step 1)'));
        goto('template');
        return;
      }
    }

    const shouldGate =
      (step.goto === 'editor' || step.goto === 'export') && currentOrder < 4;

    if (shouldGate) {
      if (!template) {
        showHint(step.order, t('workflow.needTemplate', 'Choose a shape first (Step 1)'));
        goto('template');
        return;
      }
      if (!activeRecipeId) {
        showHint(step.order, t('workflow.needRecipe', 'Choose a recipe first (Step 2)'));
        goto('recipes');
        return;
      }
    }
    goto(step.goto);
  };

  const stepPills = STEPS.map((step, idx) => {
    const Icon     = step.icon;
    const isActive = step.screens.includes(screen);
    const isPast   = step.order < currentOrder;

    return (
      <div key={step.order} className="relative flex flex-1 items-center">
        <button
          className={`group flex min-w-0 items-center gap-1.5 rounded-xl px-2 py-1.5 transition-all sm:gap-2.5 sm:px-3.5 sm:py-2 ${
            isActive
              ? 'cursor-default bg-white shadow-md ring-1 ring-gaia-200'
              : isPast
                ? 'cursor-pointer hover:bg-gaia-50'
                : 'cursor-pointer opacity-55 hover:opacity-80 hover:bg-slate-50/70'
          }`}
          onClick={() => handleClick(step)}
          aria-current={isActive ? 'step' : undefined}
        >
          <span
            className={`flex shrink-0 items-center justify-center rounded-full font-bold transition-all ${
              isActive
                ? 'h-8 w-8 bg-gaia-600 text-sm text-white ring-4 ring-gaia-100'
                : isPast
                  ? 'h-7 w-7 bg-gaia-400 text-xs text-white'
                  : 'h-7 w-7 bg-slate-200 text-xs text-slate-500'
            }`}
          >
            <Icon
              className={`h-4 w-4 max-sm:h-3.5 max-sm:w-3.5 sm:hidden ${
                isActive ? 'text-white' : isPast ? 'text-white' : 'text-slate-500'
              }`}
            />
            <span className="hidden sm:inline">{isPast ? '✓' : step.stepLabel}</span>
          </span>

          <span
            className={`hidden truncate sm:block ${
              isActive
                ? 'text-sm font-bold text-gaia-700'
                : isPast
                  ? 'text-xs font-semibold text-gaia-600'
                  : 'text-xs font-medium text-slate-400'
            }`}
          >
            {t(step.labelKey, step.defaultLabel)}
            {step.order === 2 && activeRecipeDot && (
              <span className={`ml-1.5 inline-block h-2 w-2 rounded-full align-middle ${activeRecipeDot}`} />
            )}
          </span>
        </button>

        {idx < STEPS.length - 1 && (
          <div
            className={`mx-1 flex-1 rounded-full transition-all ${
              currentOrder > step.order ? 'h-1 bg-gaia-400' : 'h-0.5 bg-slate-200'
            }`}
          />
        )}
      </div>
    );
  });

  if (embedded) {
    return (
      <div className="relative flex w-full items-center gap-0">
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
      </div>
    );
  }

  return (
    <div className="border-b border-gaia-100 bg-gradient-to-b from-gaia-50/80 to-white/98 shadow-sm backdrop-blur" data-tour="workflow-steps">
      <div className="overflow-x-auto no-scrollbar">
        <div className="flex min-w-max items-center gap-0 px-2 py-2 sm:min-w-0 sm:px-6 sm:py-3.5">
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
    </div>
  );
}
