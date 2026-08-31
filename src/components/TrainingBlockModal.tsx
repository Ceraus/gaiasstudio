import { useTranslation } from 'react-i18next';
import Modal from '@/components/common/Modal';
import { useTrainingBlockStore } from '@/store/useTrainingBlockStore';
import { useAppStore } from '@/store/useAppStore';
import { WORKFLOW_STEP_ICONS, type WorkflowStepOrder } from '@/lib/workflowStepIcons';
import type { TrainingBlockReason } from '@/lib/trainingMode';

const REASON_STEP: Record<TrainingBlockReason, WorkflowStepOrder> = {
  needTemplate: 1,
  needRecipe: 2,
  needBackground: 3,
  needEditor: 4,
};

export default function TrainingBlockModal() {
  const { t } = useTranslation();
  const open = useTrainingBlockStore((s) => s.open);
  const gate = useTrainingBlockStore((s) => s.gate);
  const onProceed = useTrainingBlockStore((s) => s.onProceed);
  const dismiss = useTrainingBlockStore((s) => s.dismiss);
  const goto = useAppStore((s) => s.goto);
  const setWorkflowGap = useAppStore((s) => s.setWorkflowGap);
  const pendingTarget = useTrainingBlockStore((s) => s.pendingTarget);
  const backgroundImageUrl = useAppStore((s) => s.backgroundImageUrl);

  if (!gate) return null;

  const message = t(gate.messageKey, gate.defaultMessage);
  const overrideLabel = gate.overrideMessageKey
    ? t(gate.overrideMessageKey, gate.overrideDefaultMessage ?? 'Proceed anyway')
    : null;

  const titleByReason = {
    needTemplate: t('trainingMode.blockTitleTemplate', 'Choose a Shape & Size'),
    needRecipe: t('trainingMode.blockTitleRecipe', 'Choose a Recipe'),
    needBackground: t('trainingMode.blockTitleBackground', 'Choose a Background'),
    needEditor: t('trainingMode.blockTitleEditor', 'Refine Your Design'),
  } as const;

  const stepOrder = REASON_STEP[gate.reason];
  const step = stepOrder ? WORKFLOW_STEP_ICONS[stepOrder] : null;
  const StepIcon = step?.icon;
  const baseTitle = titleByReason[gate.reason] ?? t('trainingMode.blockTitle', 'Before you continue');
  const title = stepOrder
    ? `${t('common.step', 'Step')} ${stepOrder}: ${baseTitle}`
    : baseTitle;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={
        <span className="flex items-center gap-2.5">
          {StepIcon && step && (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.chip}`}
              aria-hidden="true"
            >
              <StepIcon className="h-4 w-4" />
            </span>
          )}
          {title}
        </span>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-secondary w-full sm:w-auto"
            onClick={() => {
              dismiss();
              goto(gate.redirectTo);
            }}
          >
            {gate.reason === 'needTemplate' && t('trainingMode.goToShape', 'Choose Shape & Size')}
            {gate.reason === 'needRecipe' && t('trainingMode.goToRecipe', 'Select A Recipe')}
            {gate.reason === 'needBackground' && t('trainingMode.goToBackground', 'Choose Background')}
            {gate.reason === 'needEditor' && t('trainingMode.goToEditor', 'Open Editor')}
          </button>
          {gate.canOverride && overrideLabel && onProceed && (
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={() => {
                if (gate.reason === 'needRecipe') {
                  setWorkflowGap('recipe', true);
                  if (!backgroundImageUrl && pendingTarget !== 'background' && pendingTarget !== 'recipes') {
                    setWorkflowGap('background', true);
                  }
                }
                if (gate.reason === 'needBackground') setWorkflowGap('background', true);
                onProceed();
                dismiss();
              }}
            >
              {overrideLabel}
            </button>
          )}
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600">{message}</p>
    </Modal>
  );
}
