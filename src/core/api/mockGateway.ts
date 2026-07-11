/**
 * mockGateway.ts — Example data payload resolver for the API gateway.
 *
 * When `account.useExampleData === true` the API request interceptor in
 * `apiClient.ts` calls `resolveMockPayload(config)` instead of dispatching the
 * real network request. Every primary API route is handled here with
 * taxonomy-compliant, realistic example data.
 *
 * Rules:
 *   - All 5 tiers covered: SIMPLE_1, SIMPLE_2, SLA_HELPDESK,
 *     SLA_MONTHLY_NETWORK, SLA_ACCESS_CONTROL
 *   - Financial totals labelled "total_investment" — no "project_investment"
 *   - Zero references to "Quotes" in any payload field
 */

import type { InternalAxiosRequestConfig } from 'axios'
import type { Contract, ContractFormDraft, ContractTier } from '@/shared/types/contract'
import type { BlueprintPin, BlueprintTier, BlueprintZone } from '@/modules/map/useBlueprintStore'

/** Minimal request descriptor used by the mock gateway resolver. */
export interface MockRequestConfig {
  method?: string
  url?: string
  data?: unknown
}

interface VaultMappedPayload {
  tier: ContractTier
  draft: Partial<ContractFormDraft>
}

const MOCK_NOW = '2026-07-10T00:00:00.000Z'

// ── Contracts — all 5 tiers, mixed statuses ───────────────────────────────────

const MOCK_CONTRACTS: Contract[] = [
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
      { id: 'li-1a', description: 'Site Survey',          quantity: 1, unit_price: 1500, line_total: 1500, sort_order: 1 },
      { id: 'li-1b', description: 'Hardware Procurement', quantity: 4, unit_price: 875,  line_total: 3500, sort_order: 2 },
      { id: 'li-1c', description: 'Installation Labour',  quantity: 8, unit_price: 125,  line_total: 1000, sort_order: 3 },
    ],
    total_investment: 6000,
    status:           'active',
    created_at:       MOCK_NOW,
    updated_at:       MOCK_NOW,
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
      { id: 'li-2a', description: 'Redundancy Planning', quantity: 1, unit_price: 3200, line_total: 3200, sort_order: 1 },
      { id: 'li-2b', description: 'Quarterly Reviews',   quantity: 4, unit_price: 600,  line_total: 2400, sort_order: 2 },
      { id: 'li-2c', description: 'Documentation Pack',  quantity: 1, unit_price: 400,  line_total: 400,  sort_order: 3 },
    ],
    total_investment: 6000,
    status:           'pending_approval',
    created_at:       MOCK_NOW,
    updated_at:       MOCK_NOW,
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
      { id: 'li-3a', description: 'Helpdesk Monthly Retainer',  quantity: 12, unit_price: 1200, line_total: 14400, sort_order: 1 },
      { id: 'li-3b', description: 'After-Hours Escalation Pack', quantity: 1, unit_price: 800,  line_total: 800,   sort_order: 2 },
    ],
    total_investment: 15200,
    status:           'expired',
    created_at:       MOCK_NOW,
    updated_at:       MOCK_NOW,
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
      { id: 'li-4a', description: 'Network Monitoring (Monthly)', quantity: 12, unit_price: 2400, line_total: 28800, sort_order: 1 },
      { id: 'li-4b', description: 'Patch Management Cycles',      quantity: 12, unit_price: 450,  line_total: 5400,  sort_order: 2 },
      { id: 'li-4c', description: 'Uptime Reporting Dashboard',   quantity: 1,  unit_price: 1800, line_total: 1800,  sort_order: 3 },
    ],
    total_investment: 36000,
    status:           'active',
    created_at:       MOCK_NOW,
    updated_at:       MOCK_NOW,
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
    created_at:       MOCK_NOW,
    updated_at:       MOCK_NOW,
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
    created_at:       MOCK_NOW,
    updated_at:       MOCK_NOW,
  },
]

// ── Client distribution map entries ───────────────────────────────────────────

const MOCK_CLIENT_DISTRIBUTION = [
  { id: 'mock-m1', name: 'Skyline Electrical Corp', lat: 40.6942, lng: -73.9856, contract_tier: 'SIMPLE_1'            as ContractTier, status: 'active'        as const, expires_at: '2027-01-15', address: 'Brooklyn, NY'    },
  { id: 'mock-m2', name: 'Metro Fiber Networks',    lat: 40.7282, lng: -74.0776, contract_tier: 'SIMPLE_2'            as ContractTier, status: 'expiring_soon' as const, expires_at: '2027-02-01', address: 'Newark, NJ'      },
  { id: 'mock-m3', name: 'Harbor Tech Support LLC', lat: 40.7178, lng: -74.0431, contract_tier: 'SLA_HELPDESK'        as ContractTier, status: 'expired'       as const, expires_at: '2026-07-01', address: 'Jersey City, NJ' },
  { id: 'mock-m4', name: 'Pacific Grid Solutions',  lat: 40.7614, lng: -74.0300, contract_tier: 'SLA_MONTHLY_NETWORK' as ContractTier, status: 'active'        as const, expires_at: '2027-03-01', address: 'Hoboken, NJ'     },
  { id: 'mock-m5', name: 'SecureAccess Systems Inc',lat: 40.7489, lng: -73.9680, contract_tier: 'SLA_ACCESS_CONTROL'  as ContractTier, status: 'active'        as const, expires_at: '2027-04-01', address: 'Manhattan, NY'   },
  { id: 'mock-m6', name: 'Vertex Cloud Corp',       lat: 40.7183, lng: -74.0027, contract_tier: 'SIMPLE_1'            as ContractTier, status: 'active'        as const, expires_at: null,         address: 'Tribeca, NY'     },
]

// ── Vault extraction payload ───────────────────────────────────────────────────

const MOCK_VAULT_EXTRACT: VaultMappedPayload = {
  tier: 'SLA_HELPDESK',
  draft: {
    contractType:  'SLA_HELPDESK',
    contractTitle: 'Managed Helpdesk SLA — Extracted Draft',
    entityName:    'Harbor Tech Support LLC',
    contactEmail:  'billing@harbortechsupport.com',
    serviceAddress: '301 Waterfront Dr, Jersey City, NJ 07310',
    scopeOfWork:   'Managed helpdesk SLA extracted from legacy vault document.',
    lineItems: [
      { id: 'mock-li-1', description: 'Helpdesk Monthly Retainer', quantity: 12, unitPrice: 1200 },
    ],
  },
}

// ── Blueprint Hub spatial data ─────────────────────────────────────────────────

const MOCK_BLUEPRINT_PINS: BlueprintPin[] = [
  {
    id:              'mock-pin-1',
    lat:             420,
    lng:             280,
    tier:            'SLA_HELPDESK',
    label:           'Helpdesk Node — Server Room A',
    notes:           'Primary IT support hub for floor 3.',
    totalInvestment: 15200,
    createdAt:       MOCK_NOW,
  },
  {
    id:              'mock-pin-2',
    lat:             180,
    lng:             640,
    tier:            'SLA_ACCESS_CONTROL',
    label:           'Access Control Panel — East Entry',
    notes:           'Card reader + biometric integration.',
    totalInvestment: 30000,
    createdAt:       MOCK_NOW,
  },
  {
    id:              'mock-pin-3',
    lat:             720,
    lng:             500,
    tier:            'SLA_MONTHLY_NETWORK',
    label:           'Network Distribution Switch — B2',
    notes:           'Core switch for basement network distribution.',
    totalInvestment: 36000,
    createdAt:       MOCK_NOW,
  },
]

const MOCK_BLUEPRINT_ZONES: BlueprintZone[] = [
  {
    id:            'mock-zone-1',
    type:          'polygon',
    points:        [
      { lat: 100, lng: 100 },
      { lat: 100, lng: 500 },
      { lat: 400, lng: 500 },
      { lat: 400, lng: 100 },
    ],
    closed:        true,
    measureArea:   120000,
    measureLength: 1200,
    label:         'SLA Coverage Zone — North Wing',
    color:         '#166eb4',
    tier:          'SLA_HELPDESK',
    createdAt:     MOCK_NOW,
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePath(url?: string): string {
  if (!url) return '/'
  const path = url.replace(/^https?:\/\/[^/]+/i, '')
  return path.split('?')[0] ?? path
}

function extractPlanId(config: InternalAxiosRequestConfig): string {
  const match = normalizePath(config.url).match(/\/api\/v1\/blueprint\/hub\/([^/]+)/)
  return match?.[1] ?? 'default-plan'
}

// ── Route resolver ────────────────────────────────────────────────────────────

/** Returns taxonomy-compliant example payloads for the Example Data Mode gateway branch. */
export function resolveMockPayload(config: MockRequestConfig): unknown {
  const method = (config.method ?? 'get').toLowerCase()
  const path   = normalizePath(config.url)

  // ── Auth ─────────────────────────────────────────────────────────────────
  if (path === '/api/v1/auth/login' && method === 'post') {
    return {
      access_token: 'mock-access-token',
      token_type:   'Bearer',
      user: {
        id:           'mock-user-1',
        name:         'Mock User',
        email:        'dev@clearviewglobal.net',
        command_role: 'admin',
        permissions:  ['contracts.read', 'contracts.write', 'blueprint.write'],
      },
    }
  }

  if (path === '/api/v1/auth/me' || path === '/api/v1/auth/status') {
    return {
      authenticated: true,
      user: {
        id:           'mock-user-1',
        name:         'Mock User',
        email:        'dev@clearviewglobal.net',
        command_role: 'admin',
        permissions:  ['contracts.read', 'contracts.write', 'blueprint.write'],
      },
    }
  }

  if (path === '/api/v1/auth/logout'     && method === 'post') return { message: 'Logged out.' }
  if (path === '/api/v1/auth/sso/status')                      return { enabled: true, redirect_url: '/api/v1/auth/sso/microsoft/redirect' }

  // ── Contracts ────────────────────────────────────────────────────────────
  if (path === '/api/v1/contracts' && method === 'get') return MOCK_CONTRACTS

  if (path === '/api/v1/contracts' && method === 'post') {
    const body = (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as Record<string, unknown> | undefined
    const lineItems = (body?.line_items as Array<{ quantity: number; unit_price: number }> | undefined) ?? []
    return {
      id:               `mock-contract-${Date.now()}`,
      client_id:        body?.client_id ?? null,
      client_name:      body?.client_name      ?? 'Mock Client',
      client_email:     body?.client_email     ?? 'client@example.com',
      client_address:   body?.client_address   ?? '',
      billing_address:  body?.billing_address  ?? '',
      contract_type:    body?.contract_type    ?? 'SIMPLE_1',
      contract_title:   body?.contract_title   ?? 'New Contract',
      issue_date:       body?.issue_date       ?? '2026-07-10',
      expires_at:       body?.expires_at       ?? '2027-07-10',
      scope_of_work:    body?.scope_of_work    ?? '',
      line_items:       lineItems.map((li, i) => ({
        id:          `mock-li-${i}`,
        description: (li as unknown as Record<string, string>).description ?? 'Line item',
        quantity:    li.quantity,
        unit_price:  li.unit_price,
        line_total:  li.quantity * li.unit_price,
        sort_order:  i,
      })),
      total_investment: lineItems.reduce((s, li) => s + li.quantity * li.unit_price, 0),
      status:           'pending_approval',
      created_at:       MOCK_NOW,
      updated_at:       MOCK_NOW,
    }
  }

  if (path === '/api/v1/contracts/search') {
    return { data: MOCK_CONTRACTS }
  }

  if (path === '/api/v1/contracts/client-distribution') return MOCK_CLIENT_DISTRIBUTION

  if (path === '/api/v1/contracts/vault/extract' && method === 'post') return MOCK_VAULT_EXTRACT

  // ── Global search (multi-index) ───────────────────────────────────────────
  if (path === '/api/v1/projects/search') {
    return [
      { id: 'mock-p1', name: 'Skyline Network Refresh',      status: 'active',      company: 'Skyline Electrical Corp'  },
      { id: 'mock-p2', name: 'Harbor Helpdesk Rollout',      status: 'in_progress', company: 'Harbor Tech Support LLC'  },
      { id: 'mock-p3', name: 'SecureAccess Phase 2 Upgrade', status: 'planning',    company: 'SecureAccess Systems Inc' },
    ]
  }

  if (path === '/api/v1/contracts/vault/search') {
    return [
      { id: 'mock-v1', document_title: 'Legacy SLA Agreement — Harbor Tech 2024',    tier: 'SLA_HELPDESK',        created_at: MOCK_NOW },
      { id: 'mock-v2', document_title: 'Network Scope Document — Pacific Grid 2023', tier: 'SLA_MONTHLY_NETWORK', created_at: MOCK_NOW },
    ]
  }

  // ── User preferences ──────────────────────────────────────────────────────
  if (path === '/api/v1/user/preferences' && method === 'patch') {
    return (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) ?? {}
  }

  // ── Blueprint Hub ─────────────────────────────────────────────────────────
  if (path.startsWith('/api/v1/blueprint/hub/') && method === 'get') {
    return {
      plan_id:       extractPlanId(config),
      active_tier:   'SIMPLE_1' as BlueprintTier,
      plan_image_url: null,
      plan_bounds:   [[0, 0], [1000, 1000]],
      pins:          MOCK_BLUEPRINT_PINS,
      zones:         MOCK_BLUEPRINT_ZONES,
      saved_at:      MOCK_NOW,
    }
  }

  if (path.startsWith('/api/v1/blueprint/hub/') && (method === 'put' || method === 'post')) {
    const body = (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as Record<string, unknown>
    return { plan_id: extractPlanId(config), ...body, saved_at: new Date().toISOString() }
  }

  return {}
}
