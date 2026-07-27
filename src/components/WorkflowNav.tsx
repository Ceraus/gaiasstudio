import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Screen } from '@/store/useAppStore';
import { useAppStore } from '@/store/useAppStore';
import { isTrainingModeActive } from '@/lib/trainingMode';

interface WorkflowNavProps {
  /** Screen to navigate back to. Omit to hide the Back button. */
  prevScreen?: Screen;
  /** Label for the Back button. Defaults to i18n 'common.back'. */
  prevLabel?: string;
  /** Screen to navigate forward to. Omit to hide the Next button. */
  nextScreen?: Screen;
  /** Label for the Next button. Defaults to i18n 'common.next'. */
  nextLabel?: string;
  /**
   * Whether the forward navigation is allowed.
   * false = button renders in a muted style with a tooltip but is still clickable.
   */
  canProceed?: boolean;
  /** Tooltip text shown when canProceed is false. */
  hint?: string;
  /** Custom handler for the Next button (overrides simple goto(nextScreen)). */
  onNext?: () => void;
  /** Shown as a guide bubble above Next when Training Mode is on. */
  trainingHint?: string;
}

export default function WorkflowNav({
  prevScreen,
  prevLabel,
  nextScreen,
  nextLabel,
  canProceed = true,
  hint,
  onNext,
  trainingHint,
}: WorkflowNavProps) {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);
  const trainingMode = isTrainingModeActive(settings);

  // Flash the tooltip on click when canProceed is false (CSS hover alone gives no feedback on tap/click).
  const [hintFlash, setHintFlash] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (flashTimer.current) clearTimeout(flashTimer.current); };
  }, []);

  const hasNext = !!(nextScreen || onNext);

  const handleNext = () => {
    if (!canProceed) {
      if (hint) {
        if (flashTimer.current) clearTimeout(flashTimer.current);
        setHintFlash(true);
        flashTimer.current = setTimeout(() => setHintFlash(false), 2500);
      }
      return;
    }
    if (onNext) {
      onNext();
    } else if (nextScreen) {
      goto(nextScreen);
    }
  };

  const handlePrev = () => {
    if (prevScreen) goto(prevScreen);
  };

  if (!prevScreen && !hasNext) return null;

  return (
    <div className="flex shrink-0 items-center justify-between border-t border-slate-200 bg-white/95 px-6 py-3 backdrop-blur-sm">
      <div>
        {prevScreen && (
          <button
            className="btn-secondary flex items-center gap-2"
            onClick={handlePrev}
          >
            <ArrowLeft className="h-4 w-4" />
            {prevLabel ?? t('common.back')}
          </button>
        )}
      </div>

      <div className="relative">
        {hasNext && (
          <>
            {trainingMode && trainingHint && (
              <div
                role="note"
                className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 max-w-[14rem] rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900 shadow-sm"
              >
                {trainingHint}
                <span className="absolute -bottom-1.5 right-6 h-3 w-3 rotate-45 border-b border-r border-emerald-200 bg-emerald-50" />
              </div>
            )}
            <button
              className={`btn-primary flex items-center gap-2 px-5 py-2.5 text-sm transition-opacity ${
                !canProceed ? 'opacity-60' : ''
              }`}
              onClick={handleNext}
              title={!canProceed && hint ? hint : undefined}
            >
              {nextLabel ?? t('common.next')}
              <ArrowRight className="h-4 w-4" />
            </button>

            {/* Hint toast — fixed so it's never clipped by any overflow ancestor */}
            {!canProceed && hint && hintFlash && (
              <div
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed left-1/2 top-20 z-50 -translate-x-1/2 flex items-center gap-2 whitespace-nowrap rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 shadow-lg"
              >
                <span aria-hidden="true">⚠</span>
                <span>{hint}</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
