import type { Ingredient } from '@/types';

/** Newly added library rows stay highlighted for two days (survives modal re-open). */
export const LIBRARY_NEW_WINDOW_MS = 48 * 60 * 60 * 1000;

export const LIBRARY_ACCENT_STYLES = [
  {
    key: 'teal',
    row: 'bg-teal-100 ring-2 ring-teal-500',
    rowIdle: 'bg-teal-50 ring-2 ring-teal-400 hover:bg-teal-100',
    pill: 'bg-teal-200/90 text-teal-950 ring-1 ring-teal-400',
  },
  {
    key: 'violet',
    row: 'bg-violet-100 ring-2 ring-violet-500',
    rowIdle: 'bg-violet-50 ring-2 ring-violet-400 hover:bg-violet-100',
    pill: 'bg-violet-200/90 text-violet-950 ring-1 ring-violet-400',
  },
  {
    key: 'sky',
    row: 'bg-sky-100 ring-2 ring-sky-500',
    rowIdle: 'bg-sky-50 ring-2 ring-sky-400 hover:bg-sky-100',
    pill: 'bg-sky-200/90 text-sky-950 ring-1 ring-sky-400',
  },
  {
    key: 'rose',
    row: 'bg-rose-100 ring-2 ring-rose-500',
    rowIdle: 'bg-rose-50 ring-2 ring-rose-400 hover:bg-rose-100',
    pill: 'bg-rose-200/90 text-rose-950 ring-1 ring-rose-400',
  },
  {
    key: 'amber',
    row: 'bg-amber-100 ring-2 ring-amber-500',
    rowIdle: 'bg-amber-50 ring-2 ring-amber-400 hover:bg-amber-100',
    pill: 'bg-amber-200/90 text-amber-950 ring-1 ring-amber-400',
  },
  {
    key: 'lime',
    row: 'bg-lime-100 ring-2 ring-lime-500',
    rowIdle: 'bg-lime-50 ring-2 ring-lime-400 hover:bg-lime-100',
    pill: 'bg-lime-200/90 text-lime-950 ring-1 ring-lime-400',
  },
] as const;

export const LIBRARY_ACCENT_COUNT = LIBRARY_ACCENT_STYLES.length;

export type LibraryAccentStyle = (typeof LIBRARY_ACCENT_STYLES)[number];

export function nextLibraryAccentIndex(
  existing: Array<{ libraryAccent?: number; createdAt: number }>,
): number {
  const last = existing
    .filter((item) => item.libraryAccent != null)
    .sort((a, b) => b.createdAt - a.createdAt)[0];
  return last?.libraryAccent == null ? 0 : (last.libraryAccent + 1) % LIBRARY_ACCENT_COUNT;
}

export function isNewlyAddedLibraryIngredient(
  ingredient: Pick<Ingredient, 'createdAt' | 'libraryAccent'>,
  now = Date.now(),
): boolean {
  if (ingredient.libraryAccent == null) return false;
  return now - ingredient.createdAt < LIBRARY_NEW_WINDOW_MS;
}

export function newlyAddedLibraryAccent(
  ingredient: Pick<Ingredient, 'createdAt' | 'libraryAccent'>,
  now = Date.now(),
): LibraryAccentStyle | null {
  if (!isNewlyAddedLibraryIngredient(ingredient, now)) return null;
  const accent = ingredient.libraryAccent ?? 0;
  const index = ((accent % LIBRARY_ACCENT_COUNT) + LIBRARY_ACCENT_COUNT) % LIBRARY_ACCENT_COUNT;
  return LIBRARY_ACCENT_STYLES[index] ?? null;
}

export function libraryIngredientRowClass(
  ingredient: Pick<Ingredient, 'createdAt' | 'libraryAccent'>,
  options: { selected?: boolean; active?: boolean },
  now = Date.now(),
): string {
  const accent = newlyAddedLibraryAccent(ingredient, now);
  if (accent) return options.selected || options.active ? accent.row : accent.rowIdle;
  if (options.selected) return 'bg-gaia-50 ring-1 ring-gaia-300';
  if (options.active) return 'bg-slate-50 ring-1 ring-gaia-200';
  return 'bg-white ring-1 ring-slate-100 hover:bg-slate-50';
}

export function sortLibraryIngredientsForPreview<T extends Pick<Ingredient, 'createdAt' | 'libraryAccent'>>(
  items: T[],
  now = Date.now(),
): T[] {
  return [...items].sort((a, b) => {
    const aNew = isNewlyAddedLibraryIngredient(a, now);
    const bNew = isNewlyAddedLibraryIngredient(b, now);
    if (aNew !== bNew) return aNew ? -1 : 1;
    if (aNew && bNew) return b.createdAt - a.createdAt;
    return 0;
  });
}
