import type { ReactNode } from 'react';
import { Loader2, Sparkles } from 'lucide-react';

/** Same green→purple capsule as Recipes AI Suggest — icon + label stay centered. */
export const AI_SUGGEST_FLAIR =
  'flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-gaia-600 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-md ring-1 ring-gaia-500/30 transition hover:from-gaia-700 hover:to-violet-700 hover:shadow-lg disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none disabled:ring-slate-200';

interface AiSuggestFlairButtonProps {
  suggesting: boolean;
  disabled?: boolean;
  idleLabel: string;
  busyLabel: string;
  title?: string;
  className?: string;
  onClick: () => void;
}

export function AiSuggestFlairButton({
  suggesting,
  disabled,
  idleLabel,
  busyLabel,
  title,
  className,
  onClick,
}: AiSuggestFlairButtonProps) {
  return (
    <button
      type="button"
      data-ai-suggest-flair=""
      className={[className, suggesting ? 'pointer-events-none' : '', AI_SUGGEST_FLAIR].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={disabled && !suggesting}
      aria-busy={suggesting || undefined}
      title={title}
    >
      {suggesting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {suggesting ? busyLabel : idleLabel}
    </button>
  );
}

interface AiSuggestFlairBlockProps extends AiSuggestFlairButtonProps {
  children: ReactNode;
}

export function AiSuggestFlairBlock({
  children,
  className = 'mb-2',
  ...button
}: AiSuggestFlairBlockProps) {
  return (
    <div className="rounded-xl border border-gaia-100 bg-white px-3 py-2.5">
      <AiSuggestFlairButton {...button} className={className} />
      <div className="text-sm leading-snug text-slate-700">{children}</div>
    </div>
  );
}
