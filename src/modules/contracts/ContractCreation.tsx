import {
  type ChangeEvent,
  type CSSProperties,
  type ReactNode,
  forwardRef,
  useCallback,
  useEffect,
  useId,
  useState,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useMemo,
} from 'react'
import {
  Check,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  FileStack,
  FileText,
  FileUp,
  Headset,
  LayoutTemplate,
  LockKeyhole,
  Network,
  Plus,
  Trash2,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  submitContract,
  saveLocalDraft,
  updateDraftField,
  addDraftLineItem,
  updateDraftLineItem,
  removeDraftLineItem,
} from '@/store/contractsSlice'
import {
  setActiveContractType,
  setFieldNotAvailable,
  setStudioTab,
  patchLayout,
  patchLayoutMargins,
  patchStyles,
  setFinalized,
  type StudioPaperSize,
  type StudioOrientation,
  type StudioFontFamily,
  type StudioFontSize,
} from '@/store/studioSlice'
import { type ContractTier, type ContractFormDraft } from '@/shared/types/contract'
import {
  formSectionThemeClasses,
  formSectionTitleClasses,
  formSectionBadgeColor,
} from '@/shared/utils/formSectionPalette'
import { getPastelFieldClasses } from '@/shared/utils/pastelFieldPalette'
import {
  type ContractFieldTone,
  fieldBlockClasses,
  fieldLabelClasses,
  toneInputBorder,
  toneFocusRing,
} from '@/shared/utils/contractFieldPalette'
import { VaultImportModal } from './VaultImportModal'

// ── Shared with ContractsPage ─────────────────────────────────────────────────

export type ContractTab = 'dashboard' | 'create' | 'map'

// ── Design tokens ─────────────────────────────────────────────────────────────

const PRIMARY_BLUE = '#166eb4'
const VIBRANT_GREEN = '#6c9f42'
const SIMPLE_PURPLE = '#7c3aed'

// ── Studio taxonomy labels (exact Pre-Redux strings) ──────────────────────────

const STUDIO_LABELS: Record<ContractTier, string> = {
  SIMPLE_1: 'Simple-1 (3 Page)',
  SIMPLE_2: 'Simple-2 (5 Page)',
  SLA_HELPDESK: 'SLA Helpdesk',
  SLA_MONTHLY_NETWORK: 'SLA Monthly Network',
  SLA_ACCESS_CONTROL: 'SLA Access Control',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasVal(v: unknown): boolean {
  if (v == null) return false
  if (typeof v === 'number') return Number.isFinite(v) && v !== 0
  return String(v).trim().length > 0
}

function moneyFmt(n: number): string {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })
}

function accentForType(type: ContractTier): string {
  return type === 'SIMPLE_1' || type === 'SIMPLE_2' ? SIMPLE_PURPLE : PRIMARY_BLUE
}

// ── Palette-driven control classes ────────────────────────────────────────────

function controlClasses(
  valid: boolean,
  tone: ContractFieldTone | undefined,
  inSection: boolean,
  extra = '',
): string {
  const base =
    'w-full rounded-lg border px-3 py-2 text-sm outline-none transition-[border-color,box-shadow,background-color] disabled:cursor-not-allowed disabled:opacity-50'
  const bg = inSection
    ? 'bg-white'
    : valid && tone
      ? 'bg-white/80'
      : 'bg-white'

  if (valid && tone) {
    return `${base} ${bg} ${toneInputBorder(tone)} ${toneFocusRing(tone)} focus:ring-1 ${extra}`.trim()
  }
  if (valid) {
    return `${base} ${bg} border-[#6c9f42]/50 focus:border-[#6c9f42] focus:ring-2 focus:ring-[#6c9f42]/20 ${extra}`.trim()
  }
  return `${base} ${bg} border-slate-200 focus:border-[#166eb4] focus:ring-2 focus:ring-[#166eb4]/25 dark:border-slate-700 ${extra}`.trim()
}

// ── FieldShell ────────────────────────────────────────────────────────────────

interface ShellProps {
  label?: string
  labelAddon?: ReactNode
  tone?: ContractFieldTone
  valid?: boolean
  inSection?: boolean
  children: ReactNode
  className?: string
}

function FieldShell({ label, labelAddon, tone, valid = false, inSection, children, className = '' }: ShellProps) {
  const toneValid = tone && valid
  const shellClass = toneValid
    ? fieldBlockClasses(tone)
    : valid
      ? 'rounded-lg border border-[#6c9f42]/35 bg-[#6c9f42]/10 p-2.5'
      : ''
  const labelClass = `text-[11px] font-bold uppercase tracking-wide mb-1 flex items-center gap-1.5 ${
    toneValid ? fieldLabelClasses(tone) : 'text-slate-500'
  }${labelAddon ? ' w-full justify-between' : ''}`

  return (
    <div className={`${shellClass} ${className}`.trim()}>
      {label ? (
        <label className={labelClass}>
          <span>{label}</span>
          {labelAddon}
        </label>
      ) : null}
      {children}
    </div>
  )
}

// ── StyledInput ───────────────────────────────────────────────────────────────

type SInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> & {
  label?: string
  labelAddon?: ReactNode
  tone?: ContractFieldTone
  inSection?: boolean
  valid?: boolean
  fieldClass?: string
}

const StyledInput = forwardRef<HTMLInputElement, SInputProps>(function StyledInput(
  { label, labelAddon, tone, inSection, valid: validProp, fieldClass = '', value, ...props },
  ref,
) {
  const id = useId()
  const valid = validProp ?? hasVal(value)
  return (
    <FieldShell label={label} labelAddon={labelAddon} tone={tone} valid={valid} inSection={inSection}>
      <input ref={ref} id={id} value={value} {...props} className={controlClasses(valid, tone, !!inSection, fieldClass)} />
    </FieldShell>
  )
})

// ── StyledTextarea ────────────────────────────────────────────────────────────

type STextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className'> & {
  label?: string
  labelAddon?: ReactNode
  tone?: ContractFieldTone
  inSection?: boolean
  valid?: boolean
  fieldClass?: string
}

const StyledTextarea = forwardRef<HTMLTextAreaElement, STextareaProps>(function StyledTextarea(
  { label, labelAddon, tone, inSection, valid: validProp, fieldClass = '', value, ...props },
  ref,
) {
  const id = useId()
  const valid = validProp ?? hasVal(value)
  return (
    <FieldShell label={label} labelAddon={labelAddon} tone={tone} valid={valid} inSection={inSection}>
      <textarea
        ref={ref}
        id={id}
        value={value}
        {...props}
        className={controlClasses(valid, tone, !!inSection, `min-h-[88px] resize-y ${fieldClass}`)}
      />
    </FieldShell>
  )
})

// ── StyledSelect ──────────────────────────────────────────────────────────────

type SSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'className' | 'children'> & {
  label?: string
  labelAddon?: ReactNode
  tone?: ContractFieldTone
  inSection?: boolean
  valid?: boolean
  options: Array<{ value: string; label: string }>
  placeholder?: string
  fieldClass?: string
}

const StyledSelect = forwardRef<HTMLSelectElement, SSelectProps>(function StyledSelect(
  { label, labelAddon, tone, inSection, valid: validProp, options, placeholder = 'Select…', fieldClass = '', value, ...props },
  ref,
) {
  const id = useId()
  const valid = validProp ?? hasVal(value)
  return (
    <FieldShell label={label} labelAddon={labelAddon} tone={tone} valid={valid} inSection={inSection}>
      <select ref={ref} id={id} value={value} {...props} className={controlClasses(valid, tone, !!inSection, fieldClass)}>
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </FieldShell>
  )
})

// ── FormSection ───────────────────────────────────────────────────────────────

function FormSection({ title, index, children, className = '' }: { title: string; index: number; children: ReactNode; className?: string }) {
  const themeClass = formSectionThemeClasses(index)
  const titleClass = formSectionTitleClasses(index)
  const badgeColor = formSectionBadgeColor(index)
  return (
    <section className={`rounded-lg border border-l-4 p-5 ${themeClass} ${className}`.trim()}>
      <h3 className={`mb-4 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider ${titleClass}`}>
        <span
          aria-hidden
          className="grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full text-[9px] font-extrabold text-white"
          style={{ backgroundColor: badgeColor }}
        >
          {index + 1}
        </span>
        {title}
      </h3>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

// ── FieldRow ──────────────────────────────────────────────────────────────────

function FieldRow({ index, children, className = '' }: { index: number; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg p-2.5 transition-[background-color] duration-300 ease-in-out ${getPastelFieldClasses(index)} ${className}`.trim()}>
      {children}
    </div>
  )
}

// ── NOT AVAILABLE toggle ──────────────────────────────────────────────────────

function NaToggle({ fieldKey, disabled }: { fieldKey: string; disabled?: boolean }) {
  const dispatch = useAppDispatch()
  const checked = useAppSelector((s) => !!s.studio.fieldNotAvailable[fieldKey])
  return (
    <label className="flex shrink-0 cursor-pointer items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => dispatch(setFieldNotAvailable({ key: fieldKey, value: e.target.checked }))}
        className="h-3.5 w-3.5 rounded border-slate-300 text-[#166eb4] focus:ring-[#166eb4]/30 dark:border-slate-600"
      />
      Not Available
    </label>
  )
}

// ── Taxonomy Action Bar ───────────────────────────────────────────────────────

interface TaxonomyBarProps {
  onVaultImport?: () => void
  onImportXls?: () => void
  disabled?: boolean
}

function TaxonomyActionBar({ onVaultImport, onImportXls, disabled }: TaxonomyBarProps) {
  const dispatch = useAppDispatch()
  const activeContractType = useAppSelector((s) => s.studio.activeContractType)

  type TypeBtn = { id: ContractTier; Icon: typeof FileText; accent: string }
  const typeBtns: TypeBtn[] = [
    { id: 'SIMPLE_1',            Icon: FileText,    accent: SIMPLE_PURPLE },
    { id: 'SIMPLE_2',            Icon: FileStack,   accent: SIMPLE_PURPLE },
    { id: 'SLA_HELPDESK',        Icon: Headset,     accent: PRIMARY_BLUE },
    { id: 'SLA_MONTHLY_NETWORK', Icon: Network,     accent: PRIMARY_BLUE },
    { id: 'SLA_ACCESS_CONTROL',  Icon: LockKeyhole, accent: PRIMARY_BLUE },
  ]

  function hubTileStyle(accent: string, selected: boolean): CSSProperties | undefined {
    if (!selected) return undefined
    return {
      borderColor: accent,
      backgroundColor: `${accent}16`,
      boxShadow: `0 0 0 3px ${accent}45, 0 6px 16px ${accent}22`,
    }
  }

  function ImportTile({ id, onClick, title, label, Icon, accent, dashed = false }: {
    id: string; onClick: () => void; title: string; label: string; Icon: typeof FileText; accent: string; dashed?: boolean
  }) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        title={title}
        className={`flex w-full flex-col items-center gap-0.5 rounded-lg border-2 px-0.5 pb-1.5 pt-1 text-center shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
          dashed
            ? 'border-dashed border-slate-300 bg-slate-50 hover:border-[#6c9f42] hover:bg-[#6c9f42]/6'
            : 'border-slate-200 bg-white hover:border-slate-300'
        }`}
        key={id}
      >
        <span
          className="flex h-[72px] w-full items-center justify-center rounded-md"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon className="h-[42px] w-[42px]" aria-hidden />
        </span>
        <span className="line-clamp-2 w-full overflow-hidden break-words px-0.5 text-[7px] font-semibold leading-snug sm:text-[8px]" style={{ color: accent }}>
          {label}
        </span>
      </button>
    )
  }

  return (
    <div className="shrink-0 border-b border-slate-200 bg-white px-3 py-3">
      {/* Taxonomy action buttons — fills full bar width with equal columns */}
      <div
        className="grid w-full gap-1.5"
        style={{ gridTemplateColumns: `repeat(${(onVaultImport ? 1 : 0) + (onImportXls ? 1 : 0) + 5}, minmax(0, 1fr))` }}
        role="toolbar"
        aria-label="Contract Hub action shortcuts"
      >
        {/* Vault Import — dashed */}
        {onVaultImport ? (
          <ImportTile
            id="vault-import"
            onClick={onVaultImport}
            title="Vault import"
            label="Vault Import"
            Icon={FileUp}
            accent={VIBRANT_GREEN}
            dashed
          />
        ) : null}

        {/* Import XLS */}
        {onImportXls ? (
          <ImportTile
            id="import-xls"
            onClick={onImportXls}
            title="Import Excel"
            label="Import XLS"
            Icon={FileSpreadsheet}
            accent={VIBRANT_GREEN}
          />
        ) : null}

        {/* Taxonomy type buttons — NO Quote Original */}
        {typeBtns.map(({ id, Icon, accent }) => {
          const selected = activeContractType === id
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              onClick={() => {
                dispatch(setActiveContractType(id))
                dispatch(updateDraftField({ contractType: id }))
              }}
              title={STUDIO_LABELS[id]}
              className={`relative flex w-full flex-col items-center gap-0.5 rounded-lg border-2 px-0.5 pb-1.5 pt-1 text-center shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                selected
                  ? 'scale-[1.03] shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              style={hubTileStyle(accent, selected)}
            >
              {selected ? (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              ) : null}
              <span
                className="flex h-[72px] w-full items-center justify-center rounded-md"
                style={{ backgroundColor: `${accent}${selected ? '28' : '16'}`, color: accent }}
              >
                <Icon className="h-[42px] w-[42px]" aria-hidden />
              </span>
              <span
                className="line-clamp-2 w-full overflow-hidden break-words px-0.5 text-[7px] font-semibold leading-snug sm:text-[8px]"
                style={{ color: selected ? accent : '#64748b' }}
              >
                {STUDIO_LABELS[id]}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── SIMPLE_1 / SIMPLE_2 editor ────────────────────────────────────────────────

function Simple1EditorContent({
  type,
  draft,
  dispatch,
  isNa,
  disabled,
}: {
  type: ContractTier
  draft: ContractFormDraft
  dispatch: ReturnType<typeof useAppDispatch>
  isNa: (key: string) => boolean
  disabled: boolean
}) {
  function set<K extends keyof ContractFormDraft>(field: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      dispatch(updateDraftField({ [field]: e.target.value } as Partial<ContractFormDraft>))
  }

  const lineItems = draft.lineItems
  const equipSub = lineItems.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * 100) / 100, 0)
  const accent = accentForType(type)
  const label = STUDIO_LABELS[type]
  const TypeIcon = type === 'SIMPLE_2' ? FileStack : FileText

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      {/* Type display badge */}
      <div
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        role="status"
        aria-label={`Contract type: ${label}`}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          <TypeIcon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contract type</p>
          <p className="truncate text-lg font-bold leading-tight" style={{ color: accent }}>{label}</p>
        </div>
      </div>

      {/* ── Section 0: PDF PAGE 1 — COVER VALUES */}
      <FormSection index={0} title="PDF PAGE 1 — COVER VALUES">
        <FieldRow index={0}>
          <StyledInput
            inSection
            label="Issue Date"
            tone="date"
            type="date"
            value={draft.issueDate}
            onChange={set('issueDate')}
            disabled={disabled || isNa('documentDate')}
            valid={hasVal(draft.issueDate) || isNa('documentDate')}
            labelAddon={<NaToggle fieldKey="documentDate" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={1}>
          <StyledInput
            inSection
            label="Company / Entity Name"
            tone="clientCompany"
            value={draft.entityName}
            onChange={set('entityName')}
            disabled={disabled || isNa('clientCompany')}
            valid={hasVal(draft.entityName) || isNa('clientCompany')}
            labelAddon={<NaToggle fieldKey="clientCompany" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={2}>
          <StyledInput
            inSection
            label="Attention / Contact Name"
            tone="clientAttention"
            value={draft.contactName}
            onChange={set('contactName')}
            disabled={disabled || isNa('clientAttention')}
            valid={hasVal(draft.contactName) || isNa('clientAttention')}
            labelAddon={<NaToggle fieldKey="clientAttention" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={3}>
          <StyledInput
            inSection
            label="Address 1 / Service Address"
            tone="clientStreet"
            value={draft.serviceAddress}
            onChange={set('serviceAddress')}
            disabled={disabled || isNa('clientStreet')}
            valid={hasVal(draft.serviceAddress) || isNa('clientStreet')}
            labelAddon={<NaToggle fieldKey="clientStreet" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={4}>
          <StyledInput
            inSection
            label="Address 2 / Billing Address"
            tone="clientCity"
            value={draft.billingAddress}
            onChange={set('billingAddress')}
            disabled={disabled || isNa('clientCity')}
            valid={hasVal(draft.billingAddress) || isNa('clientCity')}
            labelAddon={<NaToggle fieldKey="clientCity" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={5}>
          <StyledInput
            inSection
            label="Email"
            tone="clientEmail"
            type="email"
            value={draft.contactEmail}
            onChange={set('contactEmail')}
            disabled={disabled || isNa('clientEmail')}
            valid={hasVal(draft.contactEmail) || isNa('clientEmail')}
            labelAddon={<NaToggle fieldKey="clientEmail" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={6}>
          <StyledInput
            inSection
            label="Project Type / Contract Title"
            tone="companyName"
            value={draft.contractTitle}
            onChange={set('contractTitle')}
            disabled={disabled || isNa('projectType')}
            valid={hasVal(draft.contractTitle) || isNa('projectType')}
            labelAddon={<NaToggle fieldKey="projectType" disabled={disabled} />}
          />
        </FieldRow>
      </FormSection>

      {/* ── Section 1: CLEARVIEW CONTACT BLOCK */}
      <FormSection index={1} title="CLEARVIEW CONTACT BLOCK">
        <FieldRow index={0}>
          <StyledInput
            inSection
            label="Contact Name"
            tone="clientAttention"
            value={draft.correspondenceFrom}
            onChange={set('correspondenceFrom')}
            disabled={disabled || isNa('companyContactName')}
            valid={hasVal(draft.correspondenceFrom) || isNa('companyContactName')}
            labelAddon={<NaToggle fieldKey="companyContactName" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={1}>
          <StyledInput
            inSection
            label="Street"
            tone="companyStreet"
            value={draft.companyStreet}
            onChange={set('companyStreet')}
            disabled={disabled || isNa('companyContactStreet')}
            valid={hasVal(draft.companyStreet) || isNa('companyContactStreet')}
            labelAddon={<NaToggle fieldKey="companyContactStreet" disabled={disabled} />}
            placeholder="123 Tech Blvd"
          />
        </FieldRow>
        <FieldRow index={2}>
          <StyledInput
            inSection
            label="City, State ZIP"
            tone="clientCity"
            value={draft.companyCityStateZip}
            onChange={set('companyCityStateZip')}
            disabled={disabled || isNa('companyContactCity')}
            valid={hasVal(draft.companyCityStateZip) || isNa('companyContactCity')}
            labelAddon={<NaToggle fieldKey="companyContactCity" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={3}>
          <StyledInput
            inSection
            label="Email"
            tone="companyEmail"
            type="email"
            value={draft.correspondenceFromEmail}
            onChange={set('correspondenceFromEmail')}
            disabled={disabled || isNa('companyContactEmail')}
            valid={hasVal(draft.correspondenceFromEmail) || isNa('companyContactEmail')}
            labelAddon={<NaToggle fieldKey="companyContactEmail" disabled={disabled} />}
          />
        </FieldRow>
        <FieldRow index={4}>
          <StyledInput
            inSection
            label="Phone"
            tone="companyPhone"
            type="tel"
            value={draft.companyPhone}
            onChange={set('companyPhone')}
            disabled={disabled || isNa('companyContactPhone')}
            valid={hasVal(draft.companyPhone) || isNa('companyContactPhone')}
            labelAddon={<NaToggle fieldKey="companyContactPhone" disabled={disabled} />}
          />
        </FieldRow>
      </FormSection>

      {/* ── Section 2: SERVICE LINE ITEMS */}
      <FormSection index={2} title="SERVICE LINE ITEMS">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Add equipment and service line items. Quantities and unit prices calculate the subtotal automatically.
        </p>
        <FieldRow index={0} className="p-0 overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Line Items</span>
            <button
              type="button"
              disabled={disabled}
              onClick={() => dispatch(addDraftLineItem())}
              className="inline-flex items-center gap-1 rounded-md bg-[#166eb4] px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-[#125a94] disabled:opacity-50"
            >
              <Plus size={10} aria-hidden />
              Add Line
            </button>
          </div>
          {lineItems.length === 0 ? (
            <p className="px-4 py-4 text-xs italic text-slate-400">No line items yet. Click Add Line to begin.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2 text-left w-[44%]">Description</th>
                  <th className="px-3 py-2 text-center w-[11%]">Qty</th>
                  <th className="px-3 py-2 text-right w-[18%]">Unit Price</th>
                  <th className="px-3 py-2 text-right w-[20%]">Line Total</th>
                  <th className="px-3 py-2 w-[7%]" />
                </tr>
              </thead>
              <tbody>
                {lineItems.map((line, i) => {
                  const lineTotal = Math.round(line.quantity * line.unitPrice * 100) / 100
                  return (
                    <tr key={line.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}`}>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={line.description}
                          disabled={disabled}
                          onChange={(e) => dispatch(updateDraftLineItem({ index: i, patch: { description: e.target.value } }))}
                          className="w-full rounded border border-slate-200 bg-transparent px-2 py-1 text-xs outline-none focus:border-[#166eb4] focus:ring-1 focus:ring-[#166eb4]/25 disabled:opacity-50"
                          placeholder="Description…"
                        />
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={line.quantity}
                          disabled={disabled}
                          onChange={(e) => dispatch(updateDraftLineItem({ index: i, patch: { quantity: parseInt(e.target.value) || 1 } }))}
                          className="w-14 rounded border border-slate-200 bg-transparent px-2 py-1 text-center text-xs outline-none focus:border-[#166eb4] focus:ring-1 focus:ring-[#166eb4]/25 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center justify-end gap-0.5">
                          <span className="text-slate-400">$</span>
                          <input
                            type="number"
                            min={0}
                            step={0.01}
                            value={line.unitPrice}
                            disabled={disabled}
                            onChange={(e) => dispatch(updateDraftLineItem({ index: i, patch: { unitPrice: parseFloat(e.target.value) || 0 } }))}
                            className="w-20 rounded border border-slate-200 bg-transparent px-2 py-1 text-right text-xs outline-none focus:border-[#166eb4] focus:ring-1 focus:ring-[#166eb4]/25 disabled:opacity-50"
                          />
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right font-semibold tabular-nums text-slate-700">
                        {moneyFmt(lineTotal)}
                      </td>
                      <td className="px-3 py-1.5 text-center">
                        <button
                          type="button"
                          disabled={disabled}
                          aria-label="Remove line"
                          onClick={() => dispatch(removeDraftLineItem(i))}
                          className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
                        >
                          <Trash2 size={12} aria-hidden />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50">
                  <td colSpan={3} className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-wide text-slate-500">
                    Equipment Subtotal
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-bold tabular-nums text-slate-700">
                    {moneyFmt(equipSub)}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </FieldRow>
      </FormSection>

      {/* ── Section 3: TOTAL INVESTMENT (renamed from "Quote Totals") */}
      <FormSection index={3} title="TOTAL INVESTMENT">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Adjust shipping, tax rate, and discount. Total Investment updates automatically.
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <FieldRow index={0}>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Shipping ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              disabled={disabled}
              value={draft.shipping}
              onChange={(e) => dispatch(updateDraftField({ shipping: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs outline-none focus:border-[#6c9f42] focus:ring-2 focus:ring-[#6c9f42]/20 disabled:opacity-50"
            />
          </FieldRow>
          <FieldRow index={1}>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Tax Rate (%)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              disabled={disabled}
              value={draft.taxRate}
              onChange={(e) => dispatch(updateDraftField({ taxRate: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs outline-none focus:border-[#6c9f42] focus:ring-2 focus:ring-[#6c9f42]/20 disabled:opacity-50"
            />
          </FieldRow>
          <FieldRow index={2}>
            <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Discount ($)</label>
            <input
              type="number"
              min={0}
              step={0.01}
              disabled={disabled}
              value={draft.discount}
              onChange={(e) => dispatch(updateDraftField({ discount: parseFloat(e.target.value) || 0 }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-right text-xs outline-none focus:border-[#6c9f42] focus:ring-2 focus:ring-[#6c9f42]/20 disabled:opacity-50"
            />
          </FieldRow>
        </div>
      </FormSection>
    </div>
  )
}

// ── SLA editor (generic for HELPDESK / MONTHLY_NETWORK / ACCESS_CONTROL) ──────

function SlaEditorContent({
  type,
  draft,
  dispatch,
  disabled,
}: {
  type: ContractTier
  draft: ContractFormDraft
  dispatch: ReturnType<typeof useAppDispatch>
  disabled: boolean
}) {
  function set<K extends keyof ContractFormDraft>(field: K) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      dispatch(updateDraftField({ [field]: e.target.value } as Partial<ContractFormDraft>))
  }
  const accent = accentForType(type)
  const label = STUDIO_LABELS[type]
  const TypeIcon = type === 'SLA_HELPDESK' ? Headset : type === 'SLA_MONTHLY_NETWORK' ? Network : LockKeyhole

  return (
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
      {/* Type display badge */}
      <div
        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"
        role="status"
        aria-label={`Contract type: ${label}`}
      >
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          <TypeIcon className="h-5 w-5" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Contract type</p>
          <p className="truncate text-lg font-bold leading-tight" style={{ color: accent }}>{label}</p>
        </div>
      </div>

      <FormSection index={0} title="Document Metadata">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow index={0}>
            <StyledInput inSection label="Contract Title" tone="clientCompany"
              value={draft.contractTitle} onChange={set('contractTitle')} disabled={disabled}
              valid={hasVal(draft.contractTitle)} />
          </FieldRow>
          <FieldRow index={1}>
            <StyledInput inSection label="Issue Date" tone="date" type="date"
              value={draft.issueDate} onChange={set('issueDate')} disabled={disabled}
              valid={hasVal(draft.issueDate)} />
          </FieldRow>
        </div>
        <FieldRow index={2}>
          <StyledInput inSection label="Expiration Date" tone="clientStreet" type="date"
            value={draft.expiresAt} onChange={set('expiresAt')} disabled={disabled}
            valid={hasVal(draft.expiresAt)} />
        </FieldRow>
      </FormSection>

      <FormSection index={1} title="Client Intelligence">
        <div className="grid gap-3 sm:grid-cols-2">
          <FieldRow index={0}>
            <StyledInput inSection label="Entity Name *" tone="clientCompany"
              value={draft.entityName} onChange={set('entityName')} disabled={disabled}
              valid={hasVal(draft.entityName)} />
          </FieldRow>
          <FieldRow index={1}>
            <StyledInput inSection label="Contact Name" tone="clientAttention"
              value={draft.contactName} onChange={set('contactName')} disabled={disabled}
              valid={hasVal(draft.contactName)} />
          </FieldRow>
          <FieldRow index={2}>
            <StyledInput inSection label="Contact Email" tone="clientEmail" type="email"
              value={draft.contactEmail} onChange={set('contactEmail')} disabled={disabled}
              valid={hasVal(draft.contactEmail)} />
          </FieldRow>
        </div>
      </FormSection>

      <FormSection index={2} title="Logistics & Billing">
        <FieldRow index={0}>
          <StyledInput inSection label="Service Address" tone="clientStreet"
            value={draft.serviceAddress} onChange={set('serviceAddress')} disabled={disabled}
            valid={hasVal(draft.serviceAddress)} />
        </FieldRow>
        <FieldRow index={1}>
          <StyledInput inSection label="Billing Address" tone="clientCity"
            value={draft.billingAddress} onChange={set('billingAddress')} disabled={disabled}
            valid={hasVal(draft.billingAddress)} />
        </FieldRow>
      </FormSection>

      <FormSection index={3} title="Scope of Work & Execution">
        <FieldRow index={0}>
          <StyledTextarea inSection label="Scope of Work" tone="intro" rows={5}
            value={draft.scopeOfWork} onChange={set('scopeOfWork')} disabled={disabled}
            valid={hasVal(draft.scopeOfWork)} />
        </FieldRow>
      </FormSection>
    </div>
  )
}

// ── Layout Tab ────────────────────────────────────────────────────────────────

const PAPER_OPTS: Array<{ value: StudioPaperSize; label: string }> = [
  { value: 'letter', label: 'Letter (8.5 × 11 in)' },
  { value: 'a4',     label: 'A4 (210 × 297 mm)' },
  { value: 'legal',  label: 'Legal (8.5 × 14 in)' },
]
const FONT_FAMILY_OPTS: Array<{ value: StudioFontFamily; label: string }> = [
  { value: 'inter',     label: 'Inter (sans-serif)' },
  { value: 'georgia',   label: 'Georgia (serif)' },
  { value: 'times',     label: 'Times New Roman' },
  { value: 'helvetica', label: 'Helvetica Neue' },
  { value: 'courier',   label: 'Courier New (monospace)' },
]
const FONT_SIZE_OPTS: Array<{ value: StudioFontSize; label: string }> = [
  { value: 'sm',   label: 'Small (10pt)' },
  { value: 'base', label: 'Base (11pt)' },
  { value: 'lg',   label: 'Large (12pt)' },
]

/** Standalone field — reads/writes `legalDisclaimer` from `contractsSlice.formDraft`. */
function LegalDisclaimerField({ disabled }: { disabled: boolean }) {
  const dispatch = useAppDispatch()
  const value = useAppSelector((s) => s.contracts.formDraft.legalDisclaimer)
  return (
    <StyledTextarea
      inSection
      label="Legal Disclaimer"
      tone="scopeOfWork"
      rows={5}
      disabled={disabled}
      value={value}
      onChange={(e) => dispatch(updateDraftField({ legalDisclaimer: e.target.value }))}
      valid={hasVal(value)}
    />
  )
}

function LayoutTabContent({ disabled }: { disabled: boolean }) {
  const dispatch = useAppDispatch()
  const layout = useAppSelector((s) => s.studio.layout)
  const styles = useAppSelector((s) => s.studio.styles)

  return (
    <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4">
      <p className="text-sm text-slate-600 dark:text-slate-400">
        Configure paper format, margins, fonts, and header/footer text for the generated contract document.
      </p>

      <FieldRow index={0}>
        <StyledSelect inSection label="Paper Size" tone="date"
          value={layout.paperSize} disabled={disabled}
          onChange={(e) => dispatch(patchLayout({ paperSize: e.target.value as StudioPaperSize }))}
          valid={hasVal(layout.paperSize)} options={PAPER_OPTS} placeholder="" />
      </FieldRow>

      <div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2 block">Orientation</span>
        <div className="inline-flex rounded-lg border border-slate-200 p-0.5 dark:border-slate-700">
          {(['portrait', 'landscape'] as StudioOrientation[]).map((v) => {
            const active = layout.orientation === v
            return (
              <button
                key={v}
                type="button"
                disabled={disabled}
                onClick={() => dispatch(patchLayout({ orientation: v }))}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                  active ? 'text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300'
                }`}
                style={active ? { backgroundColor: PRIMARY_BLUE } : undefined}
              >
                {v}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2 block">Margins (inches)</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {(['top', 'right', 'bottom', 'left'] as const).map((edge, idx) => (
            <FieldRow key={edge} index={1 + idx}>
              <StyledInput
                inSection label={edge.charAt(0).toUpperCase() + edge.slice(1)} tone="clientState"
                type="number" min={0} step={0.05} disabled={disabled}
                value={layout.margins[edge]}
                onChange={(e) => dispatch(patchLayoutMargins({ [edge]: parseFloat(e.target.value) || 0 }))}
                valid={layout.margins[edge] >= 0}
              />
            </FieldRow>
          ))}
        </div>
      </div>

      <FieldRow index={5}>
        <StyledTextarea inSection label="Header Text" tone="clientAttention" rows={2}
          value={layout.header} disabled={disabled}
          onChange={(e) => dispatch(patchLayout({ header: e.target.value }))}
          valid={hasVal(layout.header)} />
      </FieldRow>

      <FieldRow index={6}>
        <StyledTextarea inSection label="Footer Text" tone="clientZip" rows={2}
          value={layout.footer} disabled={disabled}
          onChange={(e) => dispatch(patchLayout({ footer: e.target.value }))}
          valid={hasVal(layout.footer)} />
      </FieldRow>

      {/* Legal Disclaimer — rendered at the bottom of every generated document */}
      <FieldRow index={7}>
        <LegalDisclaimerField disabled={disabled} />
      </FieldRow>

      <FieldRow index={7}>
        <StyledSelect inSection label="Font Family" tone="companyEmail"
          value={styles.fontFamily} disabled={disabled}
          onChange={(e) => dispatch(patchStyles({ fontFamily: e.target.value as StudioFontFamily }))}
          valid={hasVal(styles.fontFamily)} options={FONT_FAMILY_OPTS} placeholder="" />
      </FieldRow>

      <FieldRow index={8}>
        <StyledSelect inSection label="Font Size" tone="companyPhone"
          value={styles.fontSize} disabled={disabled}
          onChange={(e) => dispatch(patchStyles({ fontSize: e.target.value as StudioFontSize }))}
          valid={hasVal(styles.fontSize)} options={FONT_SIZE_OPTS} placeholder="" />
      </FieldRow>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 px-3 py-3 dark:border-slate-700">
        <input
          type="checkbox"
          disabled={disabled}
          checked={layout.watermark}
          onChange={(e) => dispatch(patchLayout({ watermark: e.target.checked }))}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#6c9f42] focus:ring-[#6c9f42]"
        />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">Watermark</span>
          <span className="mt-0.5 block text-xs text-slate-500">Print a diagonal watermark across all pages (e.g. DRAFT).</span>
          {layout.watermark ? (
            <div className="mt-3">
              <FieldRow index={9}>
                <StyledInput inSection label="Watermark Text" tone="companyName"
                  value={layout.watermarkText} disabled={disabled}
                  onChange={(e) => dispatch(patchLayout({ watermarkText: e.target.value }))}
                  valid={hasVal(layout.watermarkText)} />
              </FieldRow>
            </div>
          ) : null}
        </span>
      </label>
    </div>
  )
}

// ── Contract Document Preview (right pane — live HTML) ────────────────────────

function ContractDocumentPreview() {
  const draft = useAppSelector((s) => s.contracts.formDraft)
  const activeContractType = useAppSelector((s) => s.studio.activeContractType)
  const layout = useAppSelector((s) => s.studio.layout)
  const fieldNa = useAppSelector((s) => s.studio.fieldNotAvailable)

  const lineItems = draft.lineItems
  const equipSub = lineItems.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * 100) / 100, 0)
  const tax = Math.round(equipSub * (draft.taxRate / 100) * 100) / 100
  const totalInvestment = Math.round((equipSub + draft.shipping + tax - draft.discount) * 100) / 100
  const typeName = activeContractType ? STUDIO_LABELS[activeContractType] : ''

  function naOrValue(key: string, value: string, fallback = '—') {
    if (fieldNa[key]) return <span className="italic text-slate-400">N/A</span>
    return value || <span className="text-slate-300">{fallback}</span>
  }

  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-slate-100 p-3">
      {/* Paper */}
      <div className="relative mx-auto w-full max-w-[48rem] rounded-sm bg-white shadow-lg">
        {/* Watermark */}
        {layout.watermark && layout.watermarkText ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden rounded-sm"
            aria-hidden
          >
            <span
              className="select-none text-[5rem] font-black uppercase tracking-widest opacity-[0.04]"
              style={{ transform: 'rotate(-35deg)', color: '#166eb4', whiteSpace: 'nowrap' }}
            >
              {layout.watermarkText}
            </span>
          </div>
        ) : null}

        {/* Header bar */}
        <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#166eb4]">Clearview Global, LLC</p>
              {layout.header ? <p className="mt-0.5 text-[9px] text-slate-500">{layout.header}</p> : null}
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#6c9f42]">Contract</p>
              {typeName ? <p className="mt-0.5 text-[9px] font-semibold text-slate-600">{typeName}</p> : null}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-5 text-sm text-slate-800 dark:text-slate-200">

          {/* Date + title row */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-4 dark:border-slate-800">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Issue Date</p>
              <p className="mt-0.5 text-sm font-semibold">{naOrValue('documentDate', draft.issueDate)}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Project / Contract Title</p>
              <p className="mt-0.5 text-sm font-semibold">{naOrValue('projectType', draft.contractTitle)}</p>
            </div>
          </div>

          {/* Client block */}
          <div>
            <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[#166eb4]">Client Information</p>
            <div className="rounded-lg border border-[#166eb4]/20 bg-[#166eb4]/4 px-4 py-3 text-xs leading-6">
              <p><strong>Company:</strong> {naOrValue('clientCompany', draft.entityName)}</p>
              <p><strong>Attention:</strong> {naOrValue('clientAttention', draft.contactName)}</p>
              <p><strong>Address:</strong> {naOrValue('clientStreet', draft.serviceAddress)}</p>
              {draft.billingAddress ? <p><strong>Billing:</strong> {naOrValue('clientCity', draft.billingAddress)}</p> : null}
              <p><strong>Email:</strong> {naOrValue('clientEmail', draft.contactEmail)}</p>
            </div>
          </div>

          {/* Clearview contact block */}
          {(draft.correspondenceFrom || draft.companyCityStateZip || draft.companyPhone) ? (
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-[#6c9f42]">Clearview Contact</p>
              <div className="rounded-lg border border-[#6c9f42]/20 bg-[#6c9f42]/4 px-4 py-3 text-xs leading-6">
                {draft.correspondenceFrom ? <p><strong>Contact:</strong> {naOrValue('companyContactName', draft.correspondenceFrom)}</p> : null}
                {draft.companyStreet ? <p><strong>Street:</strong> {naOrValue('companyContactStreet', draft.companyStreet)}</p> : null}
                {draft.companyCityStateZip ? <p><strong>Location:</strong> {naOrValue('companyContactCity', draft.companyCityStateZip)}</p> : null}
                {draft.correspondenceFromEmail ? <p><strong>Email:</strong> {naOrValue('companyContactEmail', draft.correspondenceFromEmail)}</p> : null}
                {draft.companyPhone ? <p><strong>Phone:</strong> {naOrValue('companyContactPhone', draft.companyPhone)}</p> : null}
              </div>
            </div>
          ) : null}

          {/* Scope of work */}
          {draft.scopeOfWork ? (
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Scope of Work</p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed whitespace-pre-wrap">
                {draft.scopeOfWork}
              </p>
            </div>
          ) : null}

          {/* Line items */}
          {lineItems.length > 0 ? (
            <div>
              <p className="mb-2 text-[9px] font-bold uppercase tracking-wider text-slate-400">Service Line Items</p>
              <table className="w-full text-xs border border-slate-200 dark:border-slate-700">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-slate-200 px-3 py-1.5 text-left font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700">Description</th>
                    <th className="border-b border-slate-200 px-3 py-1.5 text-center font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 w-12">Qty</th>
                    <th className="border-b border-slate-200 px-3 py-1.5 text-right font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 w-20">Unit</th>
                    <th className="border-b border-slate-200 px-3 py-1.5 text-right font-bold uppercase tracking-wide text-slate-500 dark:border-slate-700 w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((l, i) => (
                    <tr key={l.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                      <td className="border-b border-slate-100 px-3 py-1 dark:border-slate-800">{l.description || '—'}</td>
                      <td className="border-b border-slate-100 px-3 py-1 text-center dark:border-slate-800">{l.quantity}</td>
                      <td className="border-b border-slate-100 px-3 py-1 text-right tabular-nums dark:border-slate-800">{moneyFmt(l.unitPrice)}</td>
                      <td className="border-b border-slate-100 px-3 py-1 text-right tabular-nums font-semibold dark:border-slate-800">{moneyFmt(Math.round(l.quantity * l.unitPrice * 100) / 100)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {/* Total Investment */}
          <div className="rounded-lg border-2 border-[#6c9f42]/50 bg-[#6c9f42]/6 px-4 py-3">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div className="space-y-0.5 text-xs text-slate-500">
                <p>Equipment Subtotal: <strong className="text-slate-700 tabular-nums">{moneyFmt(equipSub)}</strong></p>
                {draft.shipping > 0 ? <p>+ Shipping: <strong className="tabular-nums">{moneyFmt(draft.shipping)}</strong></p> : null}
                {draft.taxRate > 0 ? <p>+ Tax ({draft.taxRate}%): <strong className="tabular-nums">{moneyFmt(tax)}</strong></p> : null}
                {draft.discount > 0 ? <p>− Discount: <strong className="text-red-600 tabular-nums">{moneyFmt(draft.discount)}</strong></p> : null}
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#4a7a2e]">Total Investment</p>
                <p className="text-xl font-bold tabular-nums text-[#4a7a2e]">{moneyFmt(totalInvestment)}</p>
                <p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400 mt-0.5">Acceptance of Proposal</p>
              </div>
            </div>
          </div>

        </div>

        {/* ── Legal Disclaimer Block ────────────────────────────────────────────
             data-section="legal-disclaimer" is the stable injection anchor.
             Drop finalized legal copy into draft.legalDisclaimer (Layout tab)
             and it will flow into every generated document automatically.      */}
        <div
          data-section="legal-disclaimer"
          className="border-t border-dashed border-slate-200 px-6 py-4"
        >
          <p className="mb-1 text-[8px] font-bold uppercase tracking-widest text-slate-400">
            Legal Disclaimer
          </p>
          {draft.legalDisclaimer ? (
            <p className="text-[7.5px] leading-relaxed text-slate-500 whitespace-pre-wrap">
              {draft.legalDisclaimer}
            </p>
          ) : (
            <p className="text-[7.5px] italic text-slate-300">
              Finalized legal disclaimer text will appear here. Add it via the Layout tab → Legal Disclaimer field.
            </p>
          )}
        </div>

        {/* Footer */}
        {layout.footer ? (
          <div className="border-t border-slate-100 px-6 py-3">
            <p className="text-[9px] text-center text-slate-400">{layout.footer}</p>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Pricing Bar (bottom sticky) ───────────────────────────────────────────────

function PricingBar({
  equipSub,
  totalInvestment,
  disabled,
  finalized,
  saving,
  finalizing,
  generating,
  taxonomyReady,
  onSave,
  onGeneratePdf,
  onFinalize,
}: {
  equipSub: number
  totalInvestment: number
  disabled: boolean
  finalized: boolean
  saving: boolean
  finalizing: boolean
  generating: boolean
  taxonomyReady: boolean
  onSave: () => void
  onGeneratePdf: () => void
  onFinalize: () => void
}) {
  return (
    <div
      className="sticky bottom-0 z-20 shrink-0 border-t border-slate-200 bg-white px-3 py-2.5 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]"
      role="region"
      aria-label="Total Investment pricing"
    >
      <div className="flex flex-wrap items-end justify-end gap-3">
        <div className="flex flex-wrap items-end gap-2">
          {/* Equipment tile */}
          <div className="hidden min-w-[8rem] flex-col gap-0.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 sm:flex">
            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-500">Equipment</span>
            <span className="text-sm font-semibold tabular-nums text-slate-700">{moneyFmt(equipSub)}</span>
          </div>

          {/* TOTAL INVESTMENT tile */}
          <div className="flex min-w-[10rem] flex-col gap-0.5 rounded-lg border-2 border-[#166eb4]/50 bg-white px-3 py-1.5">
            <span className="text-[9px] font-bold uppercase tracking-wider text-[#166eb4]">Total Investment</span>
            <span className="text-lg font-bold tabular-nums text-slate-900">{moneyFmt(totalInvestment)}</span>
            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Acceptance of Proposal</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Save Draft */}
          <button
            type="button"
            disabled={saving || !taxonomyReady || disabled}
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-md border-2 border-[#166eb4] bg-white px-3 py-2 text-sm font-semibold text-[#166eb4] hover:bg-[#166eb4]/8 disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </button>

          {/* Generate PDF */}
          <button
            type="button"
            disabled={generating || saving || finalizing || !taxonomyReady || disabled}
            onClick={onGeneratePdf}
            className="inline-flex items-center gap-2 rounded-md border-2 border-[#166eb4] bg-[#166eb4] px-3 py-2 text-sm font-semibold text-white hover:bg-[#125a94] disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-500"
          >
            <Download size={16} aria-hidden />
            {generating ? 'Generating…' : 'Generate PDF'}
          </button>

          {/* Finalize */}
          <button
            type="button"
            disabled={finalizing || !taxonomyReady || disabled || finalized}
            onClick={onFinalize}
            className="inline-flex items-center gap-2 rounded-md border-2 border-[#6c9f42] bg-[#6c9f42] px-3 py-2 text-sm font-semibold text-white shadow-md hover:bg-[#5a8837] disabled:bg-slate-300 disabled:border-slate-300 disabled:text-slate-500"
          >
            <CheckCircle2 size={16} aria-hidden />
            {finalized ? 'Finalized' : finalizing ? 'Finalizing…' : 'Finalize'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

interface ContractCreationProps {
  activeTab?: ContractTab
  onTabChange?: (tab: ContractTab) => void
  onSuccess?: () => void
}

export function ContractCreation({
  activeTab = 'create',
  onTabChange,
  onSuccess,
}: ContractCreationProps) {
  const dispatch = useAppDispatch()
  const draft = useAppSelector((s) => s.contracts.formDraft)
  const activeContractType = useAppSelector((s) => s.studio.activeContractType)
  const studioTab = useAppSelector((s) => s.studio.studioTab)
  const fieldNotAvailable = useAppSelector((s) => s.studio.fieldNotAvailable)
  const finalized = useAppSelector((s) => s.studio.finalized)
  const createStatus = useAppSelector((s) => s.contracts.createStatus)

  const isNa = (key: string) => !!fieldNotAvailable[key]
  const disabled = finalized

  const lineItems = draft.lineItems
  const equipSub = useMemo(
    () => lineItems.reduce((s, l) => s + Math.round(l.quantity * l.unitPrice * 100) / 100, 0),
    [lineItems],
  )
  const tax = Math.round(equipSub * (draft.taxRate / 100) * 100) / 100
  const totalInvestment = Math.round((equipSub + draft.shipping + tax - draft.discount) * 100) / 100
  const taxonomyReady = !!activeContractType

  function changeTab(t: ContractTab) { onTabChange?.(t) }

  function handleSave() {
    dispatch(saveLocalDraft({
      tier: activeContractType,
      form: draft,
      totalInvestment,
    }))
    setSaving(true)
    setTimeout(() => setSaving(false), 1200)
  }

  function handleGeneratePdf() {
    window.print()
  }

  function handleFinalize() {
    if (!taxonomyReady) return
    dispatch(
      submitContract({
        client_name:      draft.entityName,
        client_email:     draft.contactEmail,
        client_address:   draft.serviceAddress,
        billing_address:  draft.billingAddress,
        contract_type:    activeContractType as ContractTier,
        contract_title:   draft.contractTitle,
        issue_date:       draft.issueDate,
        expires_at:       draft.expiresAt,
        scope_of_work:    draft.scopeOfWork,
        line_items:       lineItems.map((l) => ({
          description: l.description,
          quantity:    l.quantity,
          unit_price:  l.unitPrice,
        })),
      }),
    ).then((action) => {
      if (submitContract.fulfilled.match(action)) {
        dispatch(setFinalized(true))
        onSuccess?.()
        onTabChange?.('dashboard')
      }
    })
  }

  // Default to SIMPLE_1 so the builder is never empty on first open
  useEffect(() => {
    if (!activeContractType) {
      dispatch(setActiveContractType('SIMPLE_1'))
      dispatch(updateDraftField({ contractType: 'SIMPLE_1' }))
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const isSimple = activeContractType === 'SIMPLE_1' || activeContractType === 'SIMPLE_2'

  const [saving, setSaving] = useState(false)
  const [vaultModalOpen, setVaultModalOpen] = useState(false)
  const openVaultModal = useCallback(() => setVaultModalOpen(true), [])
  const closeVaultModal = useCallback(() => setVaultModalOpen(false), [])
  const handleVaultImported = useCallback(() => {
    setVaultModalOpen(false)
    // Builder tab becomes active so the user lands on the pre-filled form
    dispatch(setStudioTab('editor'))
  }, [dispatch])

  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{ height: 'calc(100dvh - 10rem)' } as CSSProperties}
    >
      {/* ── Vault Import Modal ── */}
      {vaultModalOpen && (
        <VaultImportModal onClose={closeVaultModal} onImported={handleVaultImported} />
      )}

      {/* ── Taxonomy Action Bar (top) */}
      <TaxonomyActionBar
        onVaultImport={openVaultModal}
        onImportXls={() => {}}
        disabled={disabled}
      />

      {/* Finalized banner */}
      {finalized ? (
        <div className="shrink-0 border-b border-emerald-300 bg-white px-4 py-2 text-xs font-semibold text-emerald-700" role="status">
          Contract finalized — fields are read-only. Data has been brokered for acceptance.
        </div>
      ) : null}

      {createStatus === 'succeeded' && (
        <div className="shrink-0 border-b border-emerald-300 bg-white px-4 py-2 text-xs font-medium text-emerald-700">
          Contract submitted and routed for acceptance.
        </div>
      )}

      {/* ── Split pane ────────────────────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 gap-0 overflow-hidden lg:grid-cols-2">

        {/* ── LEFT: Live Builder ───────────────────────────────────────────── */}
        <section className="flex min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-white">
          {/* Panel header */}
          <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-3">
            <FileText className="h-4 w-4 text-[#166eb4]" aria-hidden />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Contract Hub — Live Builder
            </h3>
          </header>

          {/* Builder / Layout tabs */}
          <div className="flex shrink-0 border-b border-slate-200 bg-white px-2">
            {([
              { id: 'editor' as const, label: 'Builder',  Icon: FileText },
              { id: 'layout' as const, label: 'Layout',   Icon: LayoutTemplate },
            ] as const).map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => dispatch(setStudioTab(id))}
                className={`inline-flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                  studioTab === id
                    ? 'border-[#166eb4] text-[#166eb4]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {studioTab === 'editor' ? (
              isSimple ? (
                <Simple1EditorContent
                  type={activeContractType as ContractTier}
                  draft={draft}
                  dispatch={dispatch}
                  isNa={isNa}
                  disabled={disabled}
                />
              ) : (
                <SlaEditorContent
                  type={activeContractType}
                  draft={draft}
                  dispatch={dispatch}
                  disabled={disabled}
                />
              )
            ) : (
              <LayoutTabContent disabled={disabled} />
            )}
          </div>
        </section>

        {/* ── RIGHT: Contract Preview ───────────────────────────────────────── */}
        <section className="flex min-h-0 flex-col overflow-hidden bg-slate-50">
          <header className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4 py-3">
            <FileText className="h-4 w-4 shrink-0 text-[#6c9f42]" aria-hidden />
            <div className="min-w-0">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Contract Preview</h3>
              {activeContractType ? (
                <p className="truncate text-[11px] text-slate-500">{STUDIO_LABELS[activeContractType]}</p>
              ) : null}
            </div>
          </header>
          <ContractDocumentPreview />
        </section>
      </div>

      {/* ── Pricing Bar (bottom) */}
      <PricingBar
        equipSub={equipSub}
        totalInvestment={totalInvestment}
        disabled={disabled}
        finalized={finalized}
        saving={saving}
        finalizing={createStatus === 'submitting'}
        generating={false}
        taxonomyReady={taxonomyReady}
        onSave={handleSave}
        onGeneratePdf={handleGeneratePdf}
        onFinalize={handleFinalize}
      />
    </div>
  )
}
