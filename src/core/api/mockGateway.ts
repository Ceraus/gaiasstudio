import type { InternalAxiosRequestConfig } from 'axios'
import type { Contract, ContractFormDraft, ContractTier } from '@/shared/types/contract'
import type { BlueprintPin, BlueprintTier, BlueprintZone } from '@/modules/map/useBlueprintStore'

interface VaultMappedPayload {
  tier: ContractTier
  draft: Partial<ContractFormDraft>
}

const MOCK_NOW = '2026-07-10T00:00:00.000Z'

const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'mock-contract-1',
    client_id: 'client-1',
    client_name: 'Northstar Medical',
    client_email: 'amelia@northstar.example',
    client_address: '418 Market St, Boston, MA',
    billing_address: '418 Market St, Boston, MA',
    contract_type: 'SLA_HELPDESK',
    contract_title: 'Help Desk SLA — Northstar',
    issue_date: '2026-01-15',
    expires_at: '2027-01-15',
    scope_of_work: 'Tier-1 help desk coverage with remote remediation.',
    line_items: [
      {
        id: 'li-1',
        description: 'Help Desk SLA — Monthly',
        quantity: 1,
        unit_price: 2500,
        line_total: 2500,
      },
    ],
    total_investment: 2500,
    status: 'active',
    created_at: MOCK_NOW,
    updated_at: MOCK_NOW,
  },
  {
    id: 'mock-contract-2',
    client_id: 'client-2',
    client_name: 'Civicline Offices',
    client_email: 'mateo@civicline.example',
    client_address: '22 River Ave, Providence, RI',
    billing_address: '22 River Ave, Providence, RI',
    contract_type: 'SLA_MONTHLY_NETWORK',
    contract_title: 'Monthly Network SLA — Civicline',
    issue_date: '2026-02-01',
    expires_at: '2027-02-01',
    scope_of_work: 'Network monitoring, patching, and on-site response.',
    line_items: [
      {
        id: 'li-2',
        description: 'Monthly Network SLA',
        quantity: 1,
        unit_price: 4200,
        line_total: 4200,
      },
    ],
    total_investment: 4200,
    status: 'active',
    created_at: MOCK_NOW,
    updated_at: MOCK_NOW,
  },
]

const MOCK_CLIENT_DISTRIBUTION = [
  {
    id: 'mock-cd-1',
    name: 'MetroTech Solutions',
    lat: 40.6942,
    lng: -73.9856,
    contract_tier: 'SLA_HELPDESK' as ContractTier,
    status: 'active' as const,
    expires_at: '2026-12-31',
    address: 'Brooklyn, NY',
  },
  {
    id: 'mock-cd-2',
    name: 'Harbor Networks',
    lat: 40.7282,
    lng: -74.0776,
    contract_tier: 'SLA_MONTHLY_NETWORK' as ContractTier,
    status: 'expiring_soon' as const,
    expires_at: '2026-08-15',
    address: 'Jersey City, NJ',
  },
]

const MOCK_VAULT_EXTRACT: VaultMappedPayload = {
  tier: 'SIMPLE_2',
  draft: {
    contractType: 'SIMPLE_2',
    contractTitle: 'MSP Agreement — Extracted Draft',
    entityName: 'Summit Data Systems',
    contactEmail: 'ops@summit.example',
    serviceAddress: '40.7178, -74.0431',
    scopeOfWork: 'Managed services agreement extracted from legacy vault document.',
    lineItems: [
      { id: 'mock-li-1', description: 'Managed Services — Monthly', quantity: 1, unitPrice: 3800 },
    ],
  },
}

const MOCK_BLUEPRINT_PINS: BlueprintPin[] = [
  {
    id: 'mock-pin-1',
    lat: 420,
    lng: 680,
    tier: 'SLA_HELPDESK',
    label: 'Help Desk Node',
    notes: 'Mock taxonomy pin',
    totalInvestment: 2500,
    createdAt: MOCK_NOW,
  },
]

const MOCK_BLUEPRINT_ZONES: BlueprintZone[] = [
  {
    id: 'mock-zone-1',
    type: 'polygon',
    points: [
      { lat: 200, lng: 200 },
      { lat: 200, lng: 500 },
      { lat: 400, lng: 500 },
      { lat: 400, lng: 200 },
    ],
    closed: true,
    measureArea: 60000,
    measureLength: 1000,
    label: 'SLA Coverage Zone',
    color: '#166eb4',
    tier: 'SLA_HELPDESK' as BlueprintTier,
    createdAt: MOCK_NOW,
  },
]

function normalizePath(url?: string): string {
  if (!url) return '/'
  const path = url.replace(/^https?:\/\/[^/]+/i, '')
  return path.split('?')[0] ?? path
}

function extractPlanId(config: InternalAxiosRequestConfig): string {
  const match = normalizePath(config.url).match(/\/api\/v1\/blueprint\/hub\/([^/]+)/)
  return match?.[1] ?? 'default-plan'
}

/** Resolves taxonomy-compliant seed payloads for the mock data gateway branch. */
export function resolveMockPayload(config: InternalAxiosRequestConfig): unknown {
  const method = (config.method ?? 'get').toLowerCase()
  const path = normalizePath(config.url)

  if (path === '/api/v1/auth/login' && method === 'post') {
    return {
      access_token: 'mock-access-token',
      token_type: 'Bearer',
      user: {
        id: 'mock-user-1',
        name: 'Mock Operator',
        email: 'operator@clearviewglobal.com',
        command_role: 'admin',
      },
    }
  }

  if (path === '/api/v1/auth/me' || path === '/api/v1/auth/status') {
    return {
      authenticated: true,
      user: {
        id: 'mock-user-1',
        name: 'Mock Operator',
        email: 'operator@clearviewglobal.com',
        command_role: 'admin',
      },
    }
  }

  if (path === '/api/v1/auth/logout' && method === 'post') {
    return { message: 'Logged out.' }
  }

  if (path === '/api/v1/auth/sso/status') {
    return { enabled: true, redirect_url: '/api/v1/auth/sso/microsoft/redirect' }
  }

  if (path === '/api/v1/contracts' && method === 'get') {
    return MOCK_CONTRACTS
  }

  if (path === '/api/v1/contracts' && method === 'post') {
    const body = config.data as Record<string, unknown> | undefined
    return {
      id: `mock-contract-${Date.now()}`,
      client_id: body?.client_id ?? null,
      client_name: body?.client_name ?? 'Mock Client',
      client_email: body?.client_email ?? 'client@example.com',
      client_address: body?.client_address ?? '',
      billing_address: body?.billing_address ?? '',
      contract_type: body?.contract_type ?? 'SIMPLE_1',
      contract_title: body?.contract_title ?? 'Mock Contract',
      issue_date: body?.issue_date ?? '2026-07-10',
      expires_at: body?.expires_at ?? '2027-07-10',
      scope_of_work: body?.scope_of_work ?? '',
      line_items: [],
      total_investment: 0,
      status: 'draft',
      created_at: MOCK_NOW,
      updated_at: MOCK_NOW,
    }
  }

  if (path === '/api/v1/contracts/search') {
    return { data: MOCK_CONTRACTS }
  }

  if (path === '/api/v1/contracts/client-distribution') {
    return MOCK_CLIENT_DISTRIBUTION
  }

  if (path === '/api/v1/contracts/vault/extract' && method === 'post') {
    return MOCK_VAULT_EXTRACT
  }

  if (path === '/api/v1/projects/search') {
    return [
      { id: 'mock-proj-1', name: 'Northstar Clinic Expansion', status: 'Active', company: 'Northstar Medical' },
    ]
  }

  if (path === '/api/v1/contracts/vault/search') {
    return [
      {
        id: 'mock-vault-1',
        document_title: 'Legacy MSP Agreement',
        tier: 'SIMPLE_2',
        created_at: MOCK_NOW,
      },
    ]
  }

  if (path === '/api/v1/user/preferences' && method === 'patch') {
    return config.data ?? {}
  }

  if (path.startsWith('/api/v1/blueprint/hub/') && method === 'get') {
    return {
      plan_id: extractPlanId(config),
      active_tier: 'SIMPLE_1' as BlueprintTier,
      plan_image_url: null,
      plan_bounds: [[0, 0], [1000, 1000]],
      pins: MOCK_BLUEPRINT_PINS,
      zones: MOCK_BLUEPRINT_ZONES,
      saved_at: MOCK_NOW,
    }
  }

  if (path.startsWith('/api/v1/blueprint/hub/') && (method === 'put' || method === 'post')) {
    const body = (typeof config.data === 'string' ? JSON.parse(config.data) : config.data) as Record<
      string,
      unknown
    >
    return {
      plan_id: extractPlanId(config),
      ...body,
      saved_at: MOCK_NOW,
    }
  }

  return {}
}
