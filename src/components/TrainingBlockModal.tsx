import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { useTrainingBlockStore } from '@/store/useTrainingBlockStore';
import { useAppStore } from '@/store/useAppStore';

export default function TrainingBlockModal() {
  const { t } = useTranslation();
  const open = useTrainingBlockStore((s) => s.open);
  const gate = useTrainingBlockStore((s) => s.gate);
  const onProceed = useTrainingBlockStore((s) => s.onProceed);
  const dismiss = useTrainingBlockStore((s) => s.dismiss);
  const goto = useAppStore((s) => s.goto);

  if (!gate) return null;

  const message = t(gate.messageKey, gate.defaultMessage);
  const overrideLabel = gate.overrideMessageKey
    ? t(gate.overrideMessageKey, gate.overrideDefaultMessage ?? 'Proceed anyway')
    : null;

  return (
    <Modal
      open={open}
      onClose={dismiss}
      title={
        <span className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-gaia-600" />
          {t('trainingMode.blockTitle', 'Training Mode')}
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
            {gate.reason === 'needRecipe' && t('trainingMode.goToRecipe', 'Select a Recipe')}
            {gate.reason === 'needBackground' && t('trainingMode.goToBackground', 'Choose Background')}
            {gate.reason === 'needEditor' && t('trainingMode.goToEditor', 'Open Editor')}
          </button>
          {gate.canOverride && overrideLabel && onProceed && (
            <button
              type="button"
              className="btn-primary w-full sm:w-auto"
              onClick={() => {
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
