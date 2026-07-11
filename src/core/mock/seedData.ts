/**
 * seedData.ts — local seed payloads for the Mock Data Gateway.
 *
 * Activated when `useMockData === true` in preferencesSlice.
 * Default state is strictly false — live data mode.
 *
 * Rules enforced:
 *  - All 5 tiers represented: SIMPLE_1, SIMPLE_2, SLA_HELPDESK,
 *    SLA_MONTHLY_NETWORK, SLA_ACCESS_CONTROL
 *  - Financial totals labelled as "Total Investment" internally
 *  - Zero references to "Quotes" in any field
 */

import type { Contract, ClientDistributionEntry } from '@/shared/types/contract'
import type { ProjectHit, VaultHit } from '@/core/api/globalSearchApi'

// ── Contracts (all 5 tiers, mixed statuses) ───────────────────────────────────

export const MOCK_CONTRACTS: Contract[] = [
  {
    id:               'mock-c1',
    client_id:        'cl-01',
    client_name:      'Skyline Electrical Corp',
    client_email:     'ops@skylineelec.com',
    client_address:   '142 Industrial Pkwy, Brooklyn, NY 11201',
    billing_address:  '142 Industrial Pkwy, Brooklyn, NY 11201',
    contract_type:    'SIMPLE_1',
    contract_title:   'Basic Deployment Package — Skyline Electrical',
    issue_date:       '2026-01-15',
    expires_at:       '2027-01-15',
    scope_of_work:    'Initial site survey, hardware procurement, and standard 3-page deployment agreement.',
    line_items: [
      { id: 'li-1a', description: 'Site Survey',          quantity: 1,  unit_price: 1500,  line_total: 1500,  sort_order: 1 },
      { id: 'li-1b', description: 'Hardware Procurement', quantity: 4,  unit_price: 875,   line_total: 3500,  sort_order: 2 },
      { id: 'li-1c', description: 'Installation Labour',  quantity: 8,  unit_price: 125,   line_total: 1000,  sort_order: 3 },
    ],
    total_investment: 6000,
    status:           'active',
    created_at:       '2026-01-10T09:00:00Z',
    updated_at:       '2026-01-15T11:30:00Z',
  },
  {
    id:               'mock-c2',
    client_id:        'cl-02',
    client_name:      'Metro Fiber Networks',
    client_email:     'contracts@metrofiber.net',
    client_address:   '55 Commerce Blvd, Newark, NJ 07102',
    billing_address:  '55 Commerce Blvd, Newark, NJ 07102',
    contract_type:    'SIMPLE_2',
    contract_title:   'Extended Coverage Agreement — Metro Fiber',
    issue_date:       '2026-02-01',
    expires_at:       '2027-02-01',
    scope_of_work:    'Extended 5-page coverage agreement including redundancy planning and quarterly reviews.',
    line_items: [
      { id: 'li-2a', description: 'Redundancy Planning',  quantity: 1,  unit_price: 3200,  line_total: 3200,  sort_order: 1 },
      { id: 'li-2b', description: 'Quarterly Reviews',    quantity: 4,  unit_price: 600,   line_total: 2400,  sort_order: 2 },
      { id: 'li-2c', description: 'Documentation Pack',   quantity: 1,  unit_price: 400,   line_total: 400,   sort_order: 3 },
    ],
    total_investment: 6000,
    status:           'pending_approval',
    created_at:       '2026-01-28T14:00:00Z',
    updated_at:       '2026-02-01T09:15:00Z',
  },
  {
    id:               'mock-c3',
    client_id:        'cl-03',
    client_name:      'Harbor Tech Support LLC',
    client_email:     'billing@harbortechsupport.com',
    client_address:   '301 Waterfront Dr, Jersey City, NJ 07310',
    billing_address:  '301 Waterfront Dr, Jersey City, NJ 07310',
    contract_type:    'SLA_HELPDESK',
    contract_title:   'Managed Helpdesk SLA — Harbor Tech',
    issue_date:       '2025-07-01',
    expires_at:       '2026-07-01',
    scope_of_work:    'Tier-1 and Tier-2 helpdesk coverage, 8×5 support window, 4-hour response SLA.',
    line_items: [
      { id: 'li-3a', description: 'Helpdesk Monthly Retainer', quantity: 12, unit_price: 1200, line_total: 14400, sort_order: 1 },
      { id: 'li-3b', description: 'After-Hours Escalation Pack', quantity: 1, unit_price: 800, line_total: 800,  sort_order: 2 },
    ],
    total_investment: 15200,
    status:           'expired',
    created_at:       '2025-06-15T10:00:00Z',
    updated_at:       '2025-07-01T08:00:00Z',
  },
  {
    id:               'mock-c4',
    client_id:        'cl-04',
    client_name:      'Pacific Grid Solutions',
    client_email:     'admin@pacificgrid.io',
    client_address:   '780 Enterprise Ave, Hoboken, NJ 07030',
    billing_address:  '780 Enterprise Ave, Hoboken, NJ 07030',
    contract_type:    'SLA_MONTHLY_NETWORK',
    contract_title:   'Monthly Network Management SLA — Pacific Grid',
    issue_date:       '2026-03-01',
    expires_at:       '2027-03-01',
    scope_of_work:    'Full monthly network monitoring, patch management, uptime reporting, and NOC escalation.',
    line_items: [
      { id: 'li-4a', description: 'Network Monitoring (Monthly)',  quantity: 12, unit_price: 2400, line_total: 28800, sort_order: 1 },
      { id: 'li-4b', description: 'Patch Management Cycles',       quantity: 12, unit_price: 450,  line_total: 5400,  sort_order: 2 },
      { id: 'li-4c', description: 'Uptime Reporting Dashboard',    quantity: 1,  unit_price: 1800, line_total: 1800,  sort_order: 3 },
    ],
    total_investment: 36000,
    status:           'active',
    created_at:       '2026-02-20T13:00:00Z',
    updated_at:       '2026-03-01T09:00:00Z',
  },
  {
    id:               'mock-c5',
    client_id:        'cl-05',
    client_name:      'SecureAccess Systems Inc',
    client_email:     'contracts@secureaccesssys.com',
    client_address:   '22 Security Plaza, Manhattan, NY 10001',
    billing_address:  '22 Security Plaza, Manhattan, NY 10001',
    contract_type:    'SLA_ACCESS_CONTROL',
    contract_title:   'Access Control SLA — SecureAccess Systems',
    issue_date:       '2026-04-01',
    expires_at:       '2027-04-01',
    scope_of_work:    'Managed access control, credential lifecycle, entry audit logging, and monthly compliance reporting.',
    line_items: [
      { id: 'li-5a', description: 'Access Control Management',    quantity: 12, unit_price: 1800, line_total: 21600, sort_order: 1 },
      { id: 'li-5b', description: 'Credential Lifecycle Service', quantity: 12, unit_price: 600,  line_total: 7200,  sort_order: 2 },
      { id: 'li-5c', description: 'Compliance Report Package',    quantity: 4,  unit_price: 300,  line_total: 1200,  sort_order: 3 },
    ],
    total_investment: 30000,
    status:           'active',
    created_at:       '2026-03-25T11:00:00Z',
    updated_at:       '2026-04-01T08:30:00Z',
  },
  {
    id:               'mock-c6',
    client_id:        'cl-06',
    client_name:      'Vertex Cloud Corp',
    client_email:     'hello@vertexcloud.io',
    client_address:   '90 Hudson St, New York, NY 10013',
    billing_address:  '90 Hudson St, New York, NY 10013',
    contract_type:    'SIMPLE_1',
    contract_title:   'Onboarding Deployment — Vertex Cloud',
    issue_date:       '2026-05-01',
    expires_at:       null,
    scope_of_work:    'Initial deployment package pending final approval.',
    line_items: [
      { id: 'li-6a', description: 'Deployment Setup', quantity: 1, unit_price: 2500, line_total: 2500, sort_order: 1 },
    ],
    total_investment: 2500,
    status:           'draft',
    created_at:       '2026-04-28T16:00:00Z',
    updated_at:       '2026-04-28T16:00:00Z',
  },
]

// ── Client distribution map ───────────────────────────────────────────────────

export const MOCK_CLIENT_DISTRIBUTION: ClientDistributionEntry[] = [
  { id: 'mock-m1', name: 'Skyline Electrical Corp',  lat: 40.6942, lng: -73.9856, contract_tier: 'SIMPLE_1',            status: 'active',        expires_at: '2027-01-15', address: 'Brooklyn, NY'    },
  { id: 'mock-m2', name: 'Metro Fiber Networks',      lat: 40.7282, lng: -74.0776, contract_tier: 'SIMPLE_2',            status: 'expiring_soon', expires_at: '2027-02-01', address: 'Newark, NJ'      },
  { id: 'mock-m3', name: 'Harbor Tech Support LLC',   lat: 40.7178, lng: -74.0431, contract_tier: 'SLA_HELPDESK',        status: 'expired',       expires_at: '2026-07-01', address: 'Jersey City, NJ' },
  { id: 'mock-m4', name: 'Pacific Grid Solutions',    lat: 40.7614, lng: -74.0300, contract_tier: 'SLA_MONTHLY_NETWORK', status: 'active',        expires_at: '2027-03-01', address: 'Hoboken, NJ'     },
  { id: 'mock-m5', name: 'SecureAccess Systems Inc',  lat: 40.7489, lng: -73.9680, contract_tier: 'SLA_ACCESS_CONTROL',  status: 'active',        expires_at: '2027-04-01', address: 'Manhattan, NY'   },
  { id: 'mock-m6', name: 'Vertex Cloud Corp',         lat: 40.7183, lng: -74.0027, contract_tier: 'SIMPLE_1',            status: 'active',        expires_at: null,         address: 'Tribeca, NY'     },
]

// ── Global search seed results ────────────────────────────────────────────────

export const MOCK_SEARCH_CONTRACTS: Contract[] = MOCK_CONTRACTS.slice(0, 3)

export const MOCK_SEARCH_PROJECTS: ProjectHit[] = [
  { id: 'mock-p1', name: 'Skyline Network Refresh',      status: 'active',      company: 'Skyline Electrical Corp'  },
  { id: 'mock-p2', name: 'Harbor Helpdesk Rollout',      status: 'in_progress', company: 'Harbor Tech Support LLC'  },
  { id: 'mock-p3', name: 'SecureAccess Phase 2 Upgrade', status: 'planning',    company: 'SecureAccess Systems Inc' },
]

export const MOCK_SEARCH_VAULT: VaultHit[] = [
  { id: 'mock-v1', document_title: 'Legacy SLA Agreement — Harbor Tech 2024',   tier: 'SLA_HELPDESK',        created_at: '2024-06-01T00:00:00Z' },
  { id: 'mock-v2', document_title: 'Network Scope Document — Pacific Grid 2023', tier: 'SLA_MONTHLY_NETWORK', created_at: '2023-11-15T00:00:00Z' },
]
