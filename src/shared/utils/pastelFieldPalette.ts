/** Subtle desaturated pastels for sequential form-field row backgrounds (~8 % opacity). */
export const PASTEL_FIELD_CLASS_PALETTE = [
  'bg-[#166eb4]/8 dark:bg-blue-900/10',
  'bg-red-600/[0.07] dark:bg-red-950/10',
  'bg-[#6c9f42]/8 dark:bg-emerald-900/10',
  'bg-amber-400/8 dark:bg-amber-950/10',
  'bg-violet-600/[0.07] dark:bg-violet-900/10',
  'bg-orange-500/[0.07] dark:bg-orange-950/10',
  'bg-teal-400/8 dark:bg-teal-950/10',
  'bg-pink-500/[0.07] dark:bg-pink-950/10',
] as const

export function getPastelFieldClasses(index: number): string {
  const palette: readonly string[] = PASTEL_FIELD_CLASS_PALETTE
  const normalized = ((index % palette.length) + palette.length) % palette.length
  return palette[normalized] ?? ''
}
