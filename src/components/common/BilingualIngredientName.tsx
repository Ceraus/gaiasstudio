import type { ReactNode } from 'react';
import { getIngredientBilingualNames } from '@/lib/ingredientI18n';

function LangCircle({ code }: { code: 'EN' | 'ES' }) {
  return (
    <span
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center self-center justify-self-center rounded-full text-[8px] font-bold leading-none tracking-wide ${
        code === 'EN'
          ? 'bg-slate-200 text-slate-700'
          : 'bg-gaia-100 text-gaia-800'
      }`}
      aria-hidden
    >
      {code}
    </span>
  );
}

export default function BilingualIngredientName({
  name,
  inci,
  nameEs,
  aliases,
  subtitle,
  layout = 'grid',
  className = '',
}: {
  name: string;
  inci?: string;
  nameEs?: string;
  aliases?: string[];
  subtitle?: ReactNode;
  /** `contents` lets a parent CSS grid own icon/EN/ES/action columns. */
  layout?: 'grid' | 'contents';
  className?: string;
}) {
  const { en, es } = getIngredientBilingualNames({ name, inci, nameEs, aliases });
  const title = `${en} · ${es}`;
  return (
    <span
      className={
        layout === 'contents'
          ? `contents ${className}`
          : `grid min-w-0 w-full grid-cols-[1.25rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-center gap-x-2 ${className}`
      }
      data-ingredient-en={en}
      data-ingredient-es={es}
      title={title}
    >
      <LangCircle code="EN" />
      <span className="min-w-0 w-full self-center" title={title}>
        <span className="block whitespace-normal break-words leading-5 text-slate-700">{en}</span>
        {subtitle}
      </span>
      <LangCircle code="ES" />
      <span className="min-w-0 w-full self-center whitespace-normal break-words leading-5 text-slate-700" title={es}>
        {es}
      </span>
    </span>
  );
}
