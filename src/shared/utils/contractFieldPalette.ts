/** Coordinated CVG contract-builder field tones (blue → teal → green → amber). */
export type ContractFieldTone =
  | 'date'
  | 'clientCompany'
  | 'clientAttention'
  | 'clientStreet'
  | 'clientCity'
  | 'clientState'
  | 'clientZip'
  | 'clientEmail'
  | 'clientPhone'
  | 'companyName'
  | 'companyStreet'
  | 'companyCity'
  | 'companyState'
  | 'companyZip'
  | 'companyEmail'
  | 'companyPhone'
  | 'intro'
  | 'scopeOfWork'

type ToneSpec = {
  border: string
  bg: string
  label: string
  inputBorder: string
  focusRing: string
}

const TONES: Record<ContractFieldTone, ToneSpec> = {
  date:             { border: 'border-[#166eb4]/65', bg: 'bg-[#166eb4]/18', label: 'text-[#125a94]', inputBorder: 'border-[#166eb4]/50', focusRing: 'focus:border-[#166eb4] focus:ring-[#166eb4]' },
  clientCompany:    { border: 'border-[#1a5f9e]/60', bg: 'bg-[#1a5f9e]/18', label: 'text-[#1a5f9e]', inputBorder: 'border-[#1a5f9e]/50', focusRing: 'focus:border-[#1a5f9e] focus:ring-[#1a5f9e]' },
  clientAttention:  { border: 'border-[#2f6fad]/60', bg: 'bg-[#2f6fad]/18', label: 'text-[#2f6fad]', inputBorder: 'border-[#2f6fad]/50', focusRing: 'focus:border-[#2f6fad] focus:ring-[#2f6fad]' },
  clientStreet:     { border: 'border-[#3d7fb8]/60', bg: 'bg-[#3d7fb8]/18', label: 'text-[#3d7fb8]', inputBorder: 'border-[#3d7fb8]/50', focusRing: 'focus:border-[#3d7fb8] focus:ring-[#3d7fb8]' },
  clientCity:       { border: 'border-[#4a8fc4]/60', bg: 'bg-[#4a8fc4]/18', label: 'text-[#4a8fc4]', inputBorder: 'border-[#4a8fc4]/50', focusRing: 'focus:border-[#4a8fc4] focus:ring-[#4a8fc4]' },
  clientState:      { border: 'border-[#5899b0]/60', bg: 'bg-[#5899b0]/18', label: 'text-[#5899b0]', inputBorder: 'border-[#5899b0]/50', focusRing: 'focus:border-[#5899b0] focus:ring-[#5899b0]' },
  clientZip:        { border: 'border-[#5a9e9a]/60', bg: 'bg-[#5a9e9a]/18', label: 'text-[#5a9e9a]', inputBorder: 'border-[#5a9e9a]/50', focusRing: 'focus:border-[#5a9e9a] focus:ring-[#5a9e9a]' },
  clientEmail:      { border: 'border-[#4f9a6e]/60', bg: 'bg-[#4f9a6e]/18', label: 'text-[#4f9a6e]', inputBorder: 'border-[#4f9a6e]/50', focusRing: 'focus:border-[#4f9a6e] focus:ring-[#4f9a6e]' },
  clientPhone:      { border: 'border-[#5a9f55]/60', bg: 'bg-[#5a9f55]/18', label: 'text-[#5a9f55]', inputBorder: 'border-[#5a9f55]/50', focusRing: 'focus:border-[#5a9f55] focus:ring-[#5a9f55]' },
  companyName:      { border: 'border-[#6c9f42]/65', bg: 'bg-[#6c9f42]/20', label: 'text-[#4a7a2e]', inputBorder: 'border-[#6c9f42]/55', focusRing: 'focus:border-[#6c9f42] focus:ring-[#6c9f42]' },
  companyStreet:    { border: 'border-[#7aaa48]/60', bg: 'bg-[#7aaa48]/18', label: 'text-[#7aaa48]', inputBorder: 'border-[#7aaa48]/50', focusRing: 'focus:border-[#7aaa48] focus:ring-[#7aaa48]' },
  companyCity:      { border: 'border-[#88b84e]/60', bg: 'bg-[#88b84e]/18', label: 'text-[#88b84e]', inputBorder: 'border-[#88b84e]/50', focusRing: 'focus:border-[#88b84e] focus:ring-[#88b84e]' },
  companyState:     { border: 'border-[#5d8a38]/60', bg: 'bg-[#5d8a38]/18', label: 'text-[#5d8a38]', inputBorder: 'border-[#5d8a38]/50', focusRing: 'focus:border-[#5d8a38] focus:ring-[#5d8a38]' },
  companyZip:       { border: 'border-[#4f7a32]/60', bg: 'bg-[#4f7a32]/18', label: 'text-[#4f7a32]', inputBorder: 'border-[#4f7a32]/50', focusRing: 'focus:border-[#4f7a32] focus:ring-[#4f7a32]' },
  companyEmail:     { border: 'border-[#8fbf62]/60', bg: 'bg-[#8fbf62]/18', label: 'text-[#6c9f42]', inputBorder: 'border-[#8fbf62]/50', focusRing: 'focus:border-[#8fbf62] focus:ring-[#8fbf62]' },
  companyPhone:     { border: 'border-[#9acb6e]/60', bg: 'bg-[#9acb6e]/18', label: 'text-[#6a9438]', inputBorder: 'border-[#9acb6e]/50', focusRing: 'focus:border-[#9acb6e] focus:ring-[#9acb6e]' },
  intro:            { border: 'border-[#c48a2f]/65', bg: 'bg-[#c48a2f]/18', label: 'text-[#a67324]', inputBorder: 'border-[#c48a2f]/55', focusRing: 'focus:border-[#c48a2f] focus:ring-[#c48a2f]' },
  scopeOfWork:      { border: 'border-[#7c3aed]/55', bg: 'bg-[#7c3aed]/12', label: 'text-[#6d28d9]', inputBorder: 'border-[#7c3aed]/45', focusRing: 'focus:border-[#7c3aed] focus:ring-[#7c3aed]' },
}

export function fieldBlockClasses(tone: ContractFieldTone): string {
  const t = TONES[tone]
  return `rounded-lg border p-2.5 ${t.border} ${t.bg}`
}

export function fieldLabelClasses(tone: ContractFieldTone): string {
  return TONES[tone].label
}

export function fieldInputClasses(tone: ContractFieldTone, base = ''): string {
  const t = TONES[tone]
  return `${base} ${t.inputBorder} ${t.focusRing} focus:ring-1`.trim()
}

export function toneInputBorder(tone: ContractFieldTone): string {
  return TONES[tone].inputBorder
}

export function toneFocusRing(tone: ContractFieldTone): string {
  return TONES[tone].focusRing
}

export function toneBg(tone: ContractFieldTone): string {
  return TONES[tone].bg
}

export function toneBorder(tone: ContractFieldTone): string {
  return TONES[tone].border
}

export function toneLabel(tone: ContractFieldTone): string {
  return TONES[tone].label
}
