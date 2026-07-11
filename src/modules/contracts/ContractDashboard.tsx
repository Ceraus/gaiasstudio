import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import {
  AlertTriangle,
  Check,
  Clock,
  Eye,
  FileSearch,
  FileSignature,
  FileSpreadsheet,
  FileStack,
  FileText,
  FileUp,
  Headset,
  LockKeyhole,
  Network,
  Play,
  RefreshCw,
  ShieldCheck,
  Trash2,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import {
  loadContracts,
  resumeLocalDraft,
  loadServerContractIntoBuilder,
  deleteLocalDraft,
  clearSearch,
} from '@/store/contractsSlice'
import { ContractSearchBar } from './ContractSearchBar'
import { setActiveContractType } from '@/store/studioSlice'
import {
  TIER_LABELS,
  TIER_BADGE_COLORS,
  type Contract,
  type ContractTier,
  type LocalDraft,
} from '@/shared/types/contract'
import { ContractViewModal } from './ContractViewModal'
import { VaultImportModal } from './VaultImportModal'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function fmtDate(str: string | null | undefined): string {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000)
}

// ── Design tokens ─────────────────────────────────────────────────────────────

const PRIMARY_BLUE  = '#166eb4'
const SIMPLE_PURPLE = '#7c3aed'

// ── Taxonomy lane config ───────────────────────────────────────────────────────

const STUDIO_LABELS: Record<ContractTier, string> = {
  SIMPLE_1:            'Simple-1 (3 Page)',
  SIMPLE_2:            'Simple-2 (5 Page)',
  SLA_HELPDESK:        'SLA Helpdesk',
  SLA_MONTHLY_NETWORK: 'SLA Monthly Network',
  SLA_ACCESS_CONTROL:  'SLA Access Control',
}

type TaxBtn = { id: ContractTier; Icon: typeof FileText; accent: string }

const TAXONOMY_BTNS: TaxBtn[] = [
  { id: 'SIMPLE_1',            Icon: FileText,    accent: SIMPLE_PURPLE },
  { id: 'SIMPLE_2',            Icon: FileStack,   accent: SIMPLE_PURPLE },
  { id: 'SLA_HELPDESK',        Icon: Headset,     accent: PRIMARY_BLUE  },
  { id: 'SLA_MONTHLY_NETWORK', Icon: Network,     accent: PRIMARY_BLUE  },
  { id: 'SLA_ACCESS_CONTROL',  Icon: LockKeyhole, accent: PRIMARY_BLUE  },
]

// ── Shared badge components ───────────────────────────────────────────────────

function TierBadge({ tier }: { tier: ContractTier }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${TIER_BADGE_COLORS[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  )
}

function StatusBadge({ status }: { status: Contract['status'] }) {
  const cfg: Record<Contract['status'], { label: string; cls: string }> = {
    active:           { label: 'Active',    cls: 'bg-white text-emerald-700 border-emerald-300' },
    draft:            { label: 'Draft',     cls: 'bg-white text-slate-600   border-slate-200'   },
    pending_approval: { label: 'Pending',   cls: 'bg-white text-amber-600   border-amber-300'   },
    expired:          { label: 'Expired',   cls: 'bg-white text-red-600     border-red-300'     },
    cancelled:        { label: 'Cancelled', cls: 'bg-white text-slate-400   border-slate-200'   },
  }
  const { label, cls } = cfg[status]
  return (
    <span className={`inline-flex rounded-md border px-2 py-0.5 text-[10px] font-bold ${cls}`}>
      {label}
    </span>
  )
}

// ── Taxonomy quick-create bar ─────────────────────────────────────────────────

function TaxonomyLane({
  onCreateWithType,
  onVaultImport,
  onImportXls,
  disabled,
}: {
  onCreateWithType?: (type: ContractTier) => void
  onVaultImport?: () => void
  onImportXls?: () => void
  disabled?: boolean
}) {
  const dispatch = useAppDispatch()
  const activeContractType = useAppSelector((s) => s.studio.activeContractType)

  function hubTileStyle(accent: string, selected: boolean): CSSProperties | undefined {
    if (!selected) return undefined
    return {
      borderColor: accent,
      backgroundColor: `${accent}14`,
      boxShadow: `0 0 0 2px ${accent}44`,
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Select Type &amp; Create
      </p>
      <div
        className="grid w-full gap-1.5"
        style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}
        role="toolbar"
        aria-label="Contract type quick-create"
      >
        {/* Vault Import */}
        <button
          type="button"
          disabled={disabled}
          onClick={onVaultImport}
          title="Vault import"
          className="flex w-full flex-col items-center gap-0.5 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-0.5 pb-1.5 pt-1 text-center transition-all hover:border-[#6c9f42] hover:bg-[#6c9f42]/6 disabled:opacity-50"
        >
          <span className="flex h-[72px] w-full items-center justify-center rounded-md bg-slate-100" style={{ color: '#6c9f42' }}>
            <FileUp className="h-[42px] w-[42px]" aria-hidden />
          </span>
          <span className="line-clamp-2 w-full overflow-hidden break-words px-0.5 text-[7px] font-semibold leading-snug text-slate-500 sm:text-[8px]">
            Vault Import
          </span>
        </button>

        {/* Import XLS */}
        <button
          type="button"
          disabled={disabled}
          onClick={onImportXls}
          title="Import Excel"
          className="flex w-full flex-col items-center gap-0.5 rounded-lg border border-slate-200 bg-white px-0.5 pb-1.5 pt-1 text-center shadow-sm transition-all hover:border-[#6c9f42]/60 hover:bg-[#6c9f42]/5 disabled:opacity-50"
        >
          <span
            className="flex h-[72px] w-full items-center justify-center rounded-md"
            style={{ backgroundColor: '#6c9f4218', color: '#6c9f42' }}
          >
            <FileSpreadsheet className="h-[42px] w-[42px]" aria-hidden />
          </span>
          <span
            className="line-clamp-2 w-full overflow-hidden break-words px-0.5 text-[7px] font-semibold leading-snug sm:text-[8px]"
            style={{ color: '#6c9f42' }}
          >
            Import XLS
          </span>
        </button>

        {/* Taxonomy type buttons */}
        {TAXONOMY_BTNS.map(({ id, Icon, accent }) => {
          const selected = activeContractType === id
          return (
            <button
              key={id}
              type="button"
              disabled={disabled}
              aria-pressed={selected}
              title={STUDIO_LABELS[id]}
              onClick={() => {
                dispatch(setActiveContractType(id))
                onCreateWithType?.(id)
              }}
              className={`relative flex w-full flex-col items-center gap-0.5 rounded-lg border-2 px-0.5 pb-1.5 pt-1 text-center shadow-sm transition-all disabled:opacity-50 ${
                selected ? 'scale-[1.02] shadow-md' : 'border-slate-200 bg-white hover:border-slate-300'
              }`}
              style={hubTileStyle(accent, selected)}
            >
              {selected && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: accent }}
                  aria-hidden
                >
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              )}
              <span
                className="flex h-[72px] w-full items-center justify-center rounded-md"
                style={{ backgroundColor: `${accent}${selected ? '28' : '16'}`, color: accent }}
              >
                <Icon className="h-[42px] w-[42px] shrink-0" aria-hidden />
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

// ── KPI summary tiles ─────────────────────────────────────────────────────────

function SummaryTile({
  label, value, hint, icon: Icon, tone = 'default',
}: {
  label: string
  value: string
  hint?: string
  icon: React.ElementType
  tone?: 'default' | 'blue' | 'warning' | 'danger'
}) {
  const tileClass = {
    default: 'border-slate-200 bg-white',
    blue:    'border-[#166eb4]/40 bg-white',
    warning: 'border-amber-300 bg-white',
    danger:  'border-red-300 bg-white',
  }
  const iconClass = {
    default: 'text-slate-400',
    blue:    'text-[#166eb4]',
    warning: 'text-amber-500',
    danger:  'text-red-500',
  }
  const valClass = {
    default: 'text-slate-800',
    blue:    'text-[#166eb4]',
    warning: 'text-amber-600',
    danger:  'text-red-600',
  }
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${tileClass[tone]}`}>
      <div className="flex items-center gap-2">
        <Icon size={14} className={iconClass[tone]} aria-hidden />
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valClass[tone]}`}>{value}</p>
      {hint ? <p className="mt-1 text-[11px] text-slate-500">{hint}</p> : null}
    </div>
  )
}

// ── Lane header ───────────────────────────────────────────────────────────────

function LaneHeader({
  icon: Icon,
  title,
  count,
  accent,
  description,
}: {
  icon: React.ElementType
  title: string
  count: number
  accent: string
  description: string
}) {
  return (
    <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-100">
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          <Icon size={14} aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <p className="text-[10px] text-slate-400">{description}</p>
        </div>
      </div>
      <span
        className="mt-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
        style={{ backgroundColor: count > 0 ? accent : '#94a3b8' }}
      >
        {count}
      </span>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyLane({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-10 text-center">
      <FileSignature size={28} className="text-slate-300" strokeWidth={1.5} aria-hidden />
      <p className="mt-2 text-xs font-semibold text-slate-400">{message}</p>
    </div>
  )
}

// ── Local Draft card ──────────────────────────────────────────────────────────

function LocalDraftCard({
  draft,
  onResume,
  onDelete,
}: {
  draft: LocalDraft
  onResume: () => void
  onDelete: () => void
}) {
  return (
    <div className="group flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-[#166eb4]/40 hover:shadow-md transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">{draft.label}</p>
          <p className="mt-0.5 text-[10px] text-slate-400">
            Saved {fmtDate(draft.updatedAt)}
          </p>
        </div>
        {draft.tier ? <TierBadge tier={draft.tier as ContractTier} /> : null}
      </div>

      {/* Investment */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
          Total Investment
        </span>
        <span className="text-sm font-bold tabular-nums text-slate-700">
          {formatUsd(draft.totalInvestment)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        <button
          type="button"
          onClick={onResume}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#166eb4] py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#125c96]"
        >
          <Play size={10} strokeWidth={3} aria-hidden />
          Resume
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete draft"
          className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-red-300 hover:text-red-500"
        >
          <Trash2 size={12} aria-hidden />
        </button>
      </div>
    </div>
  )
}

// ── Server contract card (Pending / Executed) ─────────────────────────────────

function ServerContractCard({
  contract,
  onView,
  onResume,
}: {
  contract: Contract
  onView?: () => void
  onResume?: () => void
}) {
  const days = daysUntil(contract.expires_at)
  const expiringSoon = days !== null && days >= 0 && days <= 90

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-slate-300 hover:shadow-md transition-all">
      {/* Top row */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">{contract.client_name}</p>
          <p className="mt-0.5 truncate text-[10px] text-slate-400">{contract.contract_title}</p>
        </div>
        <TierBadge tier={contract.contract_type} />
      </div>

      {/* Meta row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span>Issued {fmtDate(contract.issue_date)}</span>
        {contract.expires_at && (
          <span className={expiringSoon ? 'font-semibold text-amber-600' : ''}>
            Expires {fmtDate(contract.expires_at)}
            {expiringSoon && days !== null ? ` (${days}d)` : ''}
          </span>
        )}
      </div>

      {/* Bottom row */}
      <div className="flex items-center justify-between pt-0.5">
        <StatusBadge status={contract.status} />
        <span className="text-sm font-bold tabular-nums text-slate-700">
          {formatUsd(contract.total_investment)}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 pt-1">
        {onResume ? (
          <button
            type="button"
            onClick={onResume}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#166eb4] py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#125c96]"
          >
            <Play size={10} strokeWidth={3} aria-hidden />
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={onView}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#166eb4] hover:text-[#166eb4]"
          >
            <Eye size={10} aria-hidden />
            View
          </button>
        )}
      </div>
    </div>
  )
}

// ── Swimlane wrapper ──────────────────────────────────────────────────────────

function Lane({
  icon,
  title,
  count,
  accent,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  count: number
  accent: string
  description: string
  children: React.ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm"
      style={{ borderColor: `${accent}28` }}
    >
      <LaneHeader
        icon={icon}
        title={title}
        count={count}
        accent={accent}
        description={description}
      />
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  )
}

// ── Meilisearch results pane ──────────────────────────────────────────────────

function SearchHitCard({
  contract,
  onView,
  onResume,
}: {
  contract: Contract
  onView: () => void
  onResume?: () => void
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm hover:border-[#166eb4]/40 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-slate-800">{contract.client_name}</p>
          {contract.contract_title && (
            <p className="mt-0.5 truncate text-[10px] text-slate-400">{contract.contract_title}</p>
          )}
        </div>
        <TierBadge tier={contract.contract_type} />
      </div>

      <div className="flex items-center justify-between pt-0.5">
        <StatusBadge status={contract.status} />
        <span className="text-sm font-bold tabular-nums text-slate-700">
          {formatUsd(contract.total_investment)}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1">
        {contract.status === 'draft' && onResume ? (
          <button
            type="button"
            onClick={onResume}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[#166eb4] py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#125c96]"
          >
            <Play size={10} strokeWidth={3} aria-hidden />
            Resume
          </button>
        ) : (
          <button
            type="button"
            onClick={onView}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white py-1.5 text-[11px] font-semibold text-slate-600 transition-colors hover:border-[#166eb4] hover:text-[#166eb4]"
          >
            <Eye size={10} aria-hidden />
            View
          </button>
        )}
      </div>
    </div>
  )
}

function SearchResultsPane({
  onViewContract,
  onResumeContract,
}: {
  onViewContract: (c: Contract) => void
  onResumeContract: (c: Contract) => void
}) {
  const { searchResults, searchStatus, searchError, searchQuery } = useAppSelector(
    (s) => s.contracts,
  )

  if (searchStatus === 'searching') {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500 shadow-sm">
        <RefreshCw size={16} className="animate-spin text-[#166eb4]" aria-hidden />
        Searching contracts…
      </div>
    )
  }

  if (searchStatus === 'failed') {
    return (
      <p className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm text-red-600">
        {searchError ?? 'Search failed. The Meilisearch index may be unreachable.'}
      </p>
    )
  }

  if (searchResults.length === 0 && searchStatus === 'succeeded') {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 py-16 text-center">
        <FileSearch size={28} className="text-slate-300" strokeWidth={1.5} aria-hidden />
        <p className="text-xs font-semibold text-slate-400">
          No contracts matched &ldquo;{searchQuery}&rdquo;
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        {searchResults.length} result{searchResults.length === 1 ? '' : 's'} for &ldquo;{searchQuery}&rdquo;
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {searchResults.map((c) => (
          <SearchHitCard
            key={c.id}
            contract={c}
            onView={() => onViewContract(c)}
            onResume={() => onResumeContract(c)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export function ContractDashboard({
  onCreateContract,
  onCreateWithType,
  onResumeDraft,
}: {
  onCreateContract?: () => void
  onCreateWithType?: (type: ContractTier) => void
  onResumeDraft?: () => void
}) {
  const dispatch = useAppDispatch()
  const { records, localDrafts, status, error, searchQuery, searchStatus } = useAppSelector(
    (s) => s.contracts,
  )

  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [vaultModalOpen, setVaultModalOpen] = useState(false)

  const openVaultModal  = useCallback(() => setVaultModalOpen(true),  [])
  const closeVaultModal = useCallback(() => setVaultModalOpen(false), [])

  /** After a successful vault import, slot fields and navigate to the Live Builder. */
  const handleVaultImported = useCallback(() => {
    setVaultModalOpen(false)
    dispatch(clearSearch())
    onResumeDraft?.()
  }, [dispatch, onResumeDraft])

  useEffect(() => {
    if (status === 'idle') dispatch(loadContracts())
  }, [dispatch, status])

  /** True when the search pane should replace the swimlanes. */
  const searchActive = searchQuery.trim().length >= 2 || searchStatus === 'searching'

  // ── Swimlane selectors ────────────────────────────────────────────────────
  const serverDrafts  = records.filter((c) => c.status === 'draft')
  const pending       = records.filter((c) => c.status === 'pending_approval')
  const executed      = records.filter((c) =>
    c.status === 'active' || c.status === 'expired' || c.status === 'cancelled',
  )
  const expiringSoon  = executed.filter((c) => {
    const d = daysUntil(c.expires_at)
    return d !== null && d >= 0 && d <= 90 && c.status === 'active'
  })

  // ── Resume handlers ───────────────────────────────────────────────────────
  function handleResumeLocalDraft(draft: LocalDraft) {
    dispatch(resumeLocalDraft(draft.id))
    dispatch(setActiveContractType(draft.tier as ContractTier || 'SIMPLE_1'))
    onResumeDraft?.()
  }

  function handleResumeServerDraft(contract: Contract) {
    dispatch(loadServerContractIntoBuilder(contract))
    dispatch(setActiveContractType(contract.contract_type))
    onResumeDraft?.()
  }

  const totalDraftCount = localDrafts.length + serverDrafts.length

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            <FileSignature size={20} className="text-[#166eb4]" aria-hidden />
            Contract Hub
          </h2>
          <p className="text-sm text-slate-500">
            Active contracts, SLA coverage, and renewal pipeline
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => dispatch(loadContracts())}
            disabled={status === 'loading'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-[#166eb4] hover:text-[#166eb4]"
          >
            <RefreshCw size={13} className={status === 'loading' ? 'animate-spin' : ''} aria-hidden />
            Refresh
          </button>
          {onCreateContract && (
            <button
              type="button"
              onClick={onCreateContract}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#166eb4] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#125c96]"
            >
              + New Contract
            </button>
          )}
        </div>
      </div>

      {/* ── Meilisearch search bar ── */}
      <ContractSearchBar />

      {/* ── Taxonomy quick-create (hidden while searching to keep focus on results) ── */}
      {!searchActive && (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <TaxonomyLane
            onCreateWithType={onCreateWithType}
            onVaultImport={openVaultModal}
            onImportXls={openVaultModal}
            disabled={false}
          />
        </div>
      )}

      {searchActive ? (
        /* ── Search results pane replaces KPI tiles + swimlanes ── */
        <SearchResultsPane
          onViewContract={(c) => setViewingContract(c)}
          onResumeContract={(c) => handleResumeServerDraft(c)}
        />
      ) : (
        <>
          {/* ── KPI tiles ── */}
          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryTile
              label="Drafts"
              value={String(totalDraftCount)}
              hint={totalDraftCount > 0 ? 'Awaiting finalization' : undefined}
              icon={Clock}
              tone="default"
            />
            <SummaryTile
              label="Pending Acceptance"
              value={String(pending.length)}
              icon={AlertTriangle}
              tone={pending.length > 0 ? 'warning' : 'default'}
            />
            <SummaryTile
              label="Executed"
              value={String(executed.length)}
              hint={expiringSoon.length > 0 ? `${expiringSoon.length} expiring soon` : undefined}
              icon={ShieldCheck}
              tone={expiringSoon.length > 0 ? 'danger' : 'blue'}
            />
          </div>

          {/* ── Error banner ── */}
          {error ? (
            <p className="rounded-lg border border-red-200 bg-white px-3 py-2 text-sm text-red-600">
              {error}
            </p>
          ) : null}

          {/* ── Loading skeleton ── */}
          {status === 'loading' && records.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <RefreshCw size={24} className="animate-spin text-[#166eb4]" aria-hidden />
            </div>
          ) : (
            /* ── Three-lane swimlane ── */
            <div className="grid gap-4 lg:grid-cols-3">

              {/* ── Lane 1: Drafts ── */}
              <Lane
                icon={Clock}
                title="Drafts"
                count={totalDraftCount}
                accent="#166eb4"
                description="In progress — not yet finalized"
              >
                {totalDraftCount === 0 ? (
                  <EmptyLane message="No active drafts found." />
                ) : (
                  <>
                    {localDrafts.map((d) => (
                      <LocalDraftCard
                        key={d.id}
                        draft={d}
                        onResume={() => handleResumeLocalDraft(d)}
                        onDelete={() => dispatch(deleteLocalDraft(d.id))}
                      />
                    ))}
                    {serverDrafts.map((c) => (
                      <ServerContractCard
                        key={c.id}
                        contract={c}
                        onResume={() => handleResumeServerDraft(c)}
                      />
                    ))}
                  </>
                )}
              </Lane>

              {/* ── Lane 2: Pending Acceptance ── */}
              <Lane
                icon={AlertTriangle}
                title="Pending Acceptance"
                count={pending.length}
                accent="#f59e0b"
                description="Finalized — awaiting client signature"
              >
                {pending.length === 0 ? (
                  <EmptyLane message="No contracts pending acceptance." />
                ) : (
                  pending.map((c) => (
                    <ServerContractCard
                      key={c.id}
                      contract={c}
                      onView={() => setViewingContract(c)}
                    />
                  ))
                )}
              </Lane>

              {/* ── Lane 3: Executed Contracts ── */}
              <Lane
                icon={ShieldCheck}
                title="Executed Contracts"
                count={executed.length}
                accent="#6c9f42"
                description="Signed, active, or closed"
              >
                {executed.length === 0 ? (
                  <EmptyLane message="No executed contracts on record." />
                ) : (
                  executed.map((c) => (
                    <ServerContractCard
                      key={c.id}
                      contract={c}
                      onView={() => setViewingContract(c)}
                    />
                  ))
                )}
              </Lane>
            </div>
          )}
        </>
      )}

      {/* ── Read-only contract view modal ── */}
      {viewingContract && (
        <ContractViewModal
          contract={viewingContract}
          onClose={() => setViewingContract(null)}
        />
      )}

      {/* ── Vault Import modal (mirrors New Contract toolbar) ── */}
      {vaultModalOpen && (
        <VaultImportModal
          onClose={closeVaultModal}
          onImported={handleVaultImported}
        />
      )}
    </div>
  )
}
