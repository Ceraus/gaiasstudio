import { useTranslation } from "react-i18next";
import { useAppStore, type WizardStep } from "../../state/useAppStore";

const STEPS: { key: WizardStep; labelKey: string }[] = [
  { key: "template", labelKey: "steps.template" },
  { key: "assets", labelKey: "steps.assets" },
  { key: "editor", labelKey: "steps.editor" },
  { key: "print", labelKey: "steps.print" },
];

export function StepIndicator() {
  const { t } = useTranslation();
  const step = useAppStore((s) => s.step);
  const templateSku = useAppStore((s) => s.templateSku);
  const setStep = useAppStore((s) => s.setStep);
  const currentIndex = STEPS.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center gap-2">
      {STEPS.map((s, idx) => {
        const isActive = s.key === step;
        const isDone = idx < currentIndex;
        const isLocked = idx > 0 && !templateSku;
        return (
          <button
            key={s.key}
            disabled={isLocked}
            onClick={() => !isLocked && setStep(s.key)}
            className={[
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              isActive
                ? "bg-brand-600 text-white shadow-panel"
                : isDone
                ? "bg-brand-100 text-brand-700 hover:bg-brand-200"
                : isLocked
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-white text-brand-700 hover:bg-brand-50 border border-brand-200",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-5 w-5 items-center justify-center rounded-full text-xs",
                isActive ? "bg-white text-brand-700" : isDone ? "bg-brand-600 text-white" : "bg-gray-200 text-gray-500",
              ].join(" ")}
            >
              {idx + 1}
            </span>
            {t(s.labelKey).replace(/^\d+\.\s*/, "")}
          </button>
        );
      })}
    </div>
  );
}
