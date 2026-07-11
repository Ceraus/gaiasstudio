import { X, FileSignature, MapPin, Mail, Calendar, DollarSign } from 'lucide-react'
import {
  TIER_LABELS,
  TIER_BADGE_COLORS,
  type Contract,
  type ContractTier,
} from '@/shared/types/contract'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function fmtDate(str: string | null | undefined): string {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TierBadge({ tier }: { tier: ContractTier }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${TIER_BADGE_COLORS[tier]}`}
    >
      {TIER_LABELS[tier]}
    </span>
  )
}

function StatusBadge({ status }: { status: Contract['status'] }) {
  const cfg: Record<Contract['status'], { label: string; cls: string }> = {
    active:           { label: 'Active',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
    draft:            { label: 'Draft',     cls: 'bg-slate-50   text-slate-600   border-slate-200'   },
    pending_approval: { label: 'Pending',   cls: 'bg-amber-50   text-amber-700   border-amber-300'   },
    expired:          { label: 'Expired',   cls: 'bg-red-50     text-red-700     border-red-300'     },
    cancelled:        { label: 'Cancelled', cls: 'bg-slate-50   text-slate-500   border-slate-200'   },
  }
  const { label, cls } = cfg[status]
  return (
    <span className={`inline-flex rounded-md border px-2.5 py-1 text-xs font-bold ${cls}`}>
      {label}
    </span>
  )
}

function DetailRow({ label, value, icon: Icon }: { label: string; value: string; icon?: React.ElementType }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      {Icon ? (
        <Icon size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
      ) : (
        <div className="h-[14px] w-[14px] shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="mt-0.5 text-sm text-slate-800 whitespace-pre-wrap">{value || '—'}</p>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

interface ContractViewModalProps {
  contract: Contract
  onClose: () => void
}

export function ContractViewModal({ contract, onClose }: ContractViewModalProps) {
  const lineTotal = contract.line_items.reduce((s, li) => s + li.line_total, 0)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Contract details"
    >
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* ── Header ── */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#166eb4]/10">
              <FileSignature size={18} className="text-[#166eb4]" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 leading-tight">
                {contract.contract_title || contract.client_name}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">{contract.client_name}</p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <TierBadge tier={contract.contract_type} />
            <StatusBadge status={contract.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="ml-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        </div>

        {/* ── Read-only notice ── */}
        <div className="shrink-0 border-b border-amber-100 bg-amber-50 px-6 py-2 text-[11px] font-semibold text-amber-700">
          This contract is read-only. Changes can only be made to Drafts in the Live Builder.
        </div>

        {/* ── Body (scrollable) ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

          {/* Contact & Dates */}
          <section>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
              Contact & Dates
            </p>
            <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4">
              <DetailRow label="Client Email" value={contract.client_email} icon={Mail} />
              <DetailRow label="Service Address" value={contract.client_address} icon={MapPin} />
              <DetailRow label="Billing Address" value={contract.billing_address} />
              <DetailRow label="Issue Date" value={fmtDate(contract.issue_date)} icon={Calendar} />
              <DetailRow label="Expires" value={fmtDate(contract.expires_at)} icon={Calendar} />
            </div>
          </section>

          {/* Scope of Work */}
          {contract.scope_of_work && (
            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Scope of Work
              </p>
              <p className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                {contract.scope_of_work}
              </p>
            </section>
          )}

          {/* Line Items */}
          {contract.line_items.length > 0 && (
            <section>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Line Items
              </p>
              <div className="overflow-hidden rounded-xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Description</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Qty</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Unit Price</th>
                      <th className="px-3 py-2 text-right text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contract.line_items.map((li, i) => (
                      <tr key={li.id ?? i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-700">{li.description}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{li.quantity}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{formatUsd(li.unit_price)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-slate-800">{formatUsd(li.line_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Total Investment */}
          <section>
            <div className="flex items-center justify-between rounded-xl border-2 border-[#166eb4]/30 bg-white px-5 py-4">
              <div className="flex items-center gap-2">
                <DollarSign size={16} className="text-[#166eb4]" aria-hidden />
                <span className="text-sm font-bold uppercase tracking-wider text-[#166eb4]">
                  Total Investment
                </span>
              </div>
              <span className="text-xl font-bold tabular-nums text-slate-900">
                {formatUsd(contract.total_investment || lineTotal)}
              </span>
            </div>
            <p className="mt-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Acceptance of Proposal
            </p>
          </section>
        </div>

        {/* ── Footer ── */}
        <div className="shrink-0 border-t border-slate-100 bg-slate-50 px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:border-[#166eb4] hover:text-[#166eb4]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
