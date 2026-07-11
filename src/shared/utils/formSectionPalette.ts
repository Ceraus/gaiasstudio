export type FormSectionThemeId = 'slate' | 'blue' | 'indigo' | 'purple' | 'green'

export interface FormSectionTheme {
  id: FormSectionThemeId
  bg: string
  border: string
  accent: string
  title: string
  badgeColor: string
}

export const FORM_SECTION_THEMES: FormSectionTheme[] = [
  { id: 'slate',  bg: 'bg-slate-100/90',   border: 'border-slate-300',     accent: 'border-l-slate-600',    title: 'text-slate-800',    badgeColor: '#475569' },
  { id: 'blue',   bg: 'bg-[#166eb4]/14',   border: 'border-[#166eb4]/35',  accent: 'border-l-[#166eb4]',   title: 'text-[#125a94]',   badgeColor: '#166eb4' },
  { id: 'indigo', bg: 'bg-[#2f6fad]/14',   border: 'border-[#2f6fad]/35',  accent: 'border-l-[#2f6fad]',   title: 'text-[#1f5a8f]',   badgeColor: '#2f6fad' },
  { id: 'purple', bg: 'bg-violet-50/60',   border: 'border-violet-300/60', accent: 'border-l-violet-600',   title: 'text-violet-800',  badgeColor: '#7c3aed' },
  { id: 'green',  bg: 'bg-[#6c9f42]/18',   border: 'border-[#6c9f42]/40',  accent: 'border-l-[#6c9f42]',   title: 'text-[#4a7a2e]',   badgeColor: '#6c9f42' },
]

/** Editor section index → theme index (mirrors Pre-Redux SECTION_INDEX_TO_THEME). */
const SECTION_INDEX_TO_THEME: number[] = [0, 1, 2, 4]

export function formSectionThemeForIndex(index: number): FormSectionTheme {
  const mapped = SECTION_INDEX_TO_THEME[index]
  if (mapped !== undefined) return FORM_SECTION_THEMES[mapped]!
  return FORM_SECTION_THEMES[index % FORM_SECTION_THEMES.length]!
}

export function formSectionThemeClasses(index: number): string {
  const theme = formSectionThemeForIndex(index)
  return `${theme.bg} ${theme.border} ${theme.accent}`
}

export function formSectionTitleClasses(index: number): string {
  return formSectionThemeForIndex(index).title
}

export function formSectionBadgeColor(index: number): string {
  return formSectionThemeForIndex(index).badgeColor
}
