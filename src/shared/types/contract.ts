// ── 5-Tier taxonomy — strictly enforced ──────────────────────────────────────
export type ContractTier =
  | 'SIMPLE_1'
  | 'SIMPLE_2'
  | 'SLA_HELPDESK'
  | 'SLA_MONTHLY_NETWORK'
  | 'SLA_ACCESS_CONTROL'

export const TIER_LABELS: Record<ContractTier, string> = {
  SIMPLE_1: 'Standard Contract',
  SIMPLE_2: 'MSP Agreement',
  SLA_HELPDESK: 'Help Desk SLA',
  SLA_MONTHLY_NETWORK: 'Monthly Network SLA',
  SLA_ACCESS_CONTROL: 'Access Control SLA',
}

export const TIER_BADGE_COLORS: Record<ContractTier, string> = {
  SIMPLE_1: 'bg-blue-50 text-blue-700 border-blue-200',
  SIMPLE_2: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SLA_HELPDESK: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  SLA_MONTHLY_NETWORK: 'bg-violet-50 text-violet-700 border-violet-200',
  SLA_ACCESS_CONTROL: 'bg-amber-50 text-amber-700 border-amber-200',
}

export const ALL_TIERS: ContractTier[] = [
  'SIMPLE_1',
  'SIMPLE_2',
  'SLA_HELPDESK',
  'SLA_MONTHLY_NETWORK',
  'SLA_ACCESS_CONTROL',
]

// ── Line Item ─────────────────────────────────────────────────────────────────
export interface ContractLineItem {
  id: string
  description: string
  quantity: number
  unit_price: number
  line_total: number
  sku?: string | null
  sort_order?: number
}

// ── Contract Record ───────────────────────────────────────────────────────────
export type ContractStatus = 'draft' | 'active' | 'pending_approval' | 'expired' | 'cancelled'

export interface Contract {
  id: string
  client_id: string | null
  client_name: string
  client_email: string
  client_address: string
  billing_address: string
  contract_type: ContractTier
  contract_title: string
  issue_date: string
  expires_at: string | null
  scope_of_work: string
  line_items: ContractLineItem[]
  /** Strictly labeled "Total Investment" in all UI surfaces. */
  total_investment: number
  status: ContractStatus
  created_at: string
  updated_at: string
}

// ── API Submit Payload ────────────────────────────────────────────────────────
export interface ContractDraft {
  client_id?: string | null
  client_name: string
  client_email: string
  client_address: string
  billing_address: string
  contract_type: ContractTier | ''
  contract_title: string
  issue_date: string
  expires_at: string
  scope_of_work: string
  line_items: Array<{
    description: string
    quantity: number
    unit_price: number
  }>
}

// ── In-form Draft Line Item ───────────────────────────────────────────────────
export interface ContractDraftLineItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
}

// ── Live Form Draft (Redux global state for the creation form) ────────────────
export interface ContractFormDraft {
  // Section 0 — Document Metadata
  contractType: ContractTier | ''
  issueDate: string
  contractTitle: string
  expiresAt: string
  // Section 1 — Client Intelligence
  entityName: string
  contactName: string
  contactEmail: string
  // Section 2 — Logistics & Billing
  serviceAddress: string
  billingAddress: string
  // Clearview Contact Block
  correspondenceFrom: string
  correspondenceFromEmail: string
  companyStreet: string
  companyCityStateZip: string
  companyPhone: string
  // Section 3 — Scope & Execution
  scopeOfWork: string
  lineItems: ContractDraftLineItem[]
  // Financial calculations
  discount: number
  taxRate: number
  shipping: number
  /**
   * Structured legal disclaimer text injected at the bottom of the PDF preview.
   * Left empty until finalized legal copy is ready — the placeholder block always
   * renders in the document so the spacing is preserved.
   */
  legalDisclaimer: string
}

export function emptyFormDraft(): ContractFormDraft {
  return {
    contractType: '',
    issueDate: new Date().toISOString().split('T')[0] ?? '',
    contractTitle: '',
    expiresAt: '',
    entityName: '',
    contactName: '',
    contactEmail: '',
    serviceAddress: '',
    billingAddress: '',
    correspondenceFrom: '',
    correspondenceFromEmail: '',
    companyStreet: '',
    companyCityStateZip: '',
    companyPhone: '',
    scopeOfWork: '',
    lineItems: [],
    discount: 0,
    taxRate: 0,
    shipping: 0,
    legalDisclaimer: '',
  }
}

// ── Local Draft (frontend-only staging, not yet submitted to backend) ─────────

/**
 * A contract draft saved locally in Redux — not yet finalized or submitted.
 * Persists across tab switches within the session.
 * Identified by a generated ID so multiple drafts can coexist.
 */
export interface LocalDraft {
  id: string
  /** Taxonomy tier at time of save. */
  tier: ContractTier | ''
  /** Display label: contractTitle or entityName, whichever is non-empty. */
  label: string
  createdAt: string
  updatedAt: string
  /** Full form state captured at save time. */
  form: ContractFormDraft
  /** Total Investment calculated at save time (for display without re-computing). */
  totalInvestment: number
}

// ── Spatial Distribution (Client Map) ─────────────────────────────────────────
export type MapTone = 'active' | 'expiring_soon' | 'expired' | 'none'

export const MAP_TONE_COLORS: Record<MapTone, string> = {
  active: '#22c55e',
  expiring_soon: '#f59e0b',
  expired: '#ef4444',
  none: '#94a3b8',
}

export interface ClientDistributionEntry {
  id: string
  name: string
  lat: number
  lng: number
  contract_tier: ContractTier | null
  status: MapTone
  expires_at: string | null
  address?: string
}
