import { useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Screen } from '@/store/useAppStore';
import { useAppStore } from '@/store/useAppStore';
import WorkflowSkipModal from '@/components/WorkflowSkipModal';
import {
  WORKFLOW_STEP_ICONS,
  workflowOrderForScreen,
  type WorkflowStepOrder,
} from '@/lib/workflowStepIcons';
import { getWorkflowStepStatus } from '@/lib/workflowStepStatus';

interface WorkflowNavProps {
  /** Screen to navigate back to. Omit to show Return to Dashboard when Next is present. */
  prevScreen?: Screen;
  /** Label for the Back button. Defaults to i18n 'common.back'. */
  prevLabel?: string;
  /** Screen to navigate forward to. Omit to hide the Next button. */
  nextScreen?: Screen;
  /** Label for the Next button. Defaults to the destination step title (e.g. "Step 3: Choose Background"). */
  nextLabel?: string;
  /**
   * Whether the forward navigation is allowed.
   * false = button renders in a muted style but is still clickable (opens a missing-step dialog).
   */
  canProceed?: boolean;
  /** Short reason shown when canProceed is false. */
  hint?: string;
  /** Longer explanation of what is missing. */
  missingDetail?: string;
  /** Title for the missing-step dialog. */
  missingTitle?: string;
  /**
   * When canProceed is false, offer “Continue anyway”.
   * Set false for required steps (e.g. choosing a template).
   */
  allowOverride?: boolean;
  /** Called when the user confirms Continue anyway (before navigating). */
  onOverride?: () => void;
  /** Custom handler for the Next button (overrides simple goto(nextScreen)). */
  onNext?: () => void;
}

function NavStepChip({
  order,
  currentOrder,
  hasRecipe,
  hasBackground,
}: {
  order: WorkflowStepOrder;
  currentOrder: number;
  hasRecipe: boolean;
  hasBackground: boolean;
}) {
  const { icon: Icon, chip } = WORKFLOW_STEP_ICONS[order];
  const status = getWorkflowStepStatus({
    stepOrder: order,
    currentOrder,
    hasRecipe,
    hasBackground,
  });

  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
        status === 'skipped' ? 'bg-amber-100 text-amber-700' : chip
      }`}
      aria-hidden="true"
    >
      {status === 'skipped' ? (
        <AlertTriangle className="h-4 w-4" />
      ) : status === 'complete' ? (
        <Check className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <Icon className="h-4 w-4" />
      )}
    </span>
  );
}

export default function WorkflowNav({
  prevScreen,
  prevLabel,
  nextScreen,
  nextLabel,
  canProceed = true,
  hint,
  missingDetail,
  missingTitle,
  allowOverride = true,
  onOverride,
  onNext,
}: WorkflowNavProps) {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const screen = useAppStore((s) => s.screen);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl);
  const [skipOpen, setSkipOpen] = useState(false);

  const hasNext = !!(nextScreen || onNext);
  const currentOrder = workflowOrderForScreen(screen) ?? 0;
  const prevOrder = prevScreen ? workflowOrderForScreen(prevScreen) : undefined;
  const nextOrder = nextScreen
    ? workflowOrderForScreen(nextScreen)
    : hasNext && currentOrder > 0 && currentOrder < 5
      ? ((currentOrder + 1) as WorkflowStepOrder)
      : undefined;
  const nextStepLabel =
    nextOrder === 2
      ? t('workflow.nextRecipe', 'Step 2: Choose Recipe')
      : nextOrder === 3
        ? t('workflow.nextBackground', 'Step 3: Choose Background')
        : nextOrder === 4
          ? t('workflow.nextRefine', 'Step 4: Refine & Design')
          : nextOrder === 5
            ? t('workflow.nextExport', 'Step 5: Print & Export')
            : t('common.next');
  const chipProps = {
    currentOrder,
    hasRecipe: !!activeRecipeId,
    hasBackground: !!backgroundImageUrl,
  };

  const missingStepOrder =
    currentOrder >= 1 && currentOrder <= 5 ? (currentOrder as WorkflowStepOrder) : undefined;
  const missingStepTitle =
    missingTitle ??
    (missingStepOrder === 1
      ? t('trainingMode.blockTitleTemplate', 'Choose a Shape & Size')
      : missingStepOrder === 2
        ? t('trainingMode.blockTitleRecipe', 'Choose a Recipe')
        : missingStepOrder === 3
          ? t('trainingMode.blockTitleBackground', 'Choose a Background')
          : missingStepOrder === 4
            ? t('trainingMode.blockTitleEditor', 'Refine Your Design')
            : undefined);
  const skipTitle =
    missingStepOrder && missingStepTitle
      ? `${t('common.step', 'Step')} ${missingStepOrder}: ${missingStepTitle}`
      : missingStepTitle;

  const proceed = () => {
    if (onNext) {
      onNext();
    } else if (nextScreen) {
      goto(nextScreen);
    }
  };

  const handleNext = () => {
    if (!canProceed) {
      setSkipOpen(true);
      return;
    }
    proceed();
  };

  const handlePrev = () => {
    if (prevScreen) goto(prevScreen);
  };

  const handleHome = () => {
    goto('welcome');
  };

  if (!prevScreen && !hasNext) return null;

  return (
    <div
      className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-sm"
      data-workflow-nav
    >
      <div>
        {prevScreen ? (
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={handlePrev}
          >
            <ArrowLeft className="h-4 w-4" />
            {prevOrder && <NavStepChip order={prevOrder} {...chipProps} />}
            {prevLabel ?? t('common.back')}
          </button>
        ) : (
          <button
            type="button"
            className="btn-secondary flex items-center gap-2"
            onClick={handleHome}
            data-workflow-nav-home
          >
            <ArrowLeft className="h-4 w-4" />
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gaia-100 text-gaia-700"
              aria-hidden="true"
            >
              <Home className="h-4 w-4" />
            </span>
            {t('workflow.backToDashboard', 'Return to Dashboard')}
          </button>
        )}
      </div>

      <div>
        {hasNext && (
          <button
            className={`btn-primary flex items-center gap-2 px-5 py-2.5 text-sm transition-opacity ${
              !canProceed ? 'opacity-60' : ''
            }`}
            onClick={handleNext}
            title={!canProceed && hint ? hint : undefined}
            aria-disabled={!canProceed}
          >
            {nextOrder && <NavStepChip order={nextOrder} {...chipProps} />}
            {nextLabel ?? nextStepLabel}
            <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      <WorkflowSkipModal
        open={skipOpen}
        onClose={() => setSkipOpen(false)}
        stepOrder={missingStepOrder}
        title={skipTitle}
        message={hint ?? t('workflow.missingTitle', 'Something is missing')}
        detail={missingDetail}
        allowOverride={allowOverride}
        onOverride={() => {
          onOverride?.();
          proceed();
        }}
      />
    </div>
  );
}
