/**
 * Recipe name / net weight pills. Violet so they never match EN sky, ES amber,
 * or the banned recipe fills (#eefafd / #fcfbeb).
 */
export const RECIPE_META_COL = {
  wrap: 'rounded-xl bg-violet-50 p-2 ring-1 ring-violet-100',
  label: 'text-violet-700',
  input: 'border-violet-200 bg-white focus:border-violet-400 focus:ring-violet-200',
} as const;

/** Shared EN / ES column colors for bilingual recipe fields and preview. */
export const BILINGUAL_COL = {
  en: {
    wrap: 'rounded-xl bg-sky-50 p-2 ring-1 ring-sky-100',
    label: 'text-sky-700',
    input: 'border-sky-200 bg-white focus:border-sky-400 focus:ring-sky-200',
    preview: 'rounded-lg bg-white px-2 py-1 text-sky-950',
    chip: 'bg-sky-600 text-white',
  },
  es: {
    wrap: 'rounded-xl bg-amber-50 p-2 ring-1 ring-amber-100',
    label: 'text-amber-800',
    input: 'border-amber-200 bg-white focus:border-amber-400 focus:ring-amber-200',
    preview: 'rounded-lg bg-white px-2 py-1 text-amber-950',
    chip: 'bg-amber-600 text-white',
  },
} as const;

/** Benefit form pills: slate until focused, then BILINGUAL_COL sky / amber. */
export const BILINGUAL_FIELD = {
  en: {
    wrap: 'group rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200 focus-within:bg-sky-50 focus-within:ring-sky-100',
    label: 'text-slate-500 group-focus-within:text-sky-700',
    input: 'border-slate-200 bg-white focus:border-sky-400 focus:ring-sky-200',
  },
  es: {
    wrap: 'group rounded-xl bg-slate-50 p-2 ring-1 ring-slate-200 focus-within:bg-amber-50 focus-within:ring-amber-100',
    label: 'text-slate-500 group-focus-within:text-amber-800',
    input: 'border-slate-200 bg-white focus:border-amber-400 focus:ring-amber-200',
  },
} as const;
