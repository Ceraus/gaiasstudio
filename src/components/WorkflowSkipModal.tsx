import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Modal from '@/components/common/Modal';
import { WORKFLOW_STEP_ICONS, type WorkflowStepOrder } from '@/lib/workflowStepIcons';

interface WorkflowSkipModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Missing step — shows that step's header chip instead of a generic warning icon. */
  stepOrder?: WorkflowStepOrder;
  message: string;
  detail?: string;
  allowOverride?: boolean;
  onOverride?: () => void;
  overrideLabel?: string;
  stayLabel?: string;
}

export default function WorkflowSkipModal({
  open,
  onClose,
  title,
  stepOrder,
  message,
  detail,
  allowOverride = true,
  onOverride,
  overrideLabel,
  stayLabel,
}: WorkflowSkipModalProps) {
  const { t } = useTranslation();
  const step = stepOrder ? WORKFLOW_STEP_ICONS[stepOrder] : null;
  const StepIcon = step?.icon;

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={420}
      title={
        <span className="flex items-center gap-2.5">
          {StepIcon && step ? (
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${step.chip}`}
              aria-hidden="true"
            >
              <StepIcon className="h-4 w-4" />
            </span>
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-700" />
          )}
          {title ?? t('workflow.missingTitle', 'Something is missing')}
        </span>
      }
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-secondary w-full sm:w-auto" onClick={onClose}>
            {stayLabel ?? t('workflow.stayAndFix', 'Stay And Finish')}
          </button>
          {allowOverride && (
            <button
              type="button"
              className="w-full rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 sm:w-auto"
              onClick={() => {
                onOverride?.();
                onClose();
              }}
            >
              {overrideLabel ?? t('workflow.continueAnyway', 'Continue Anyway')}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-2 text-sm text-slate-600">
        <p className="font-medium text-slate-800">{message}</p>
        {detail && <p>{detail}</p>}
        {allowOverride && (
          <p className="text-xs text-slate-400">
            {t('workflow.overrideReminder', 'Later screens will remind you until this is filled in.')}
          </p>
        )}
      </div>
    </Modal>
  );
}
