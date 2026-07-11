import { apiClient } from '@/core/api'
import type {
  Contract,
  ContractDraft,
  ContractTier,
  ClientDistributionEntry,
} from '@/shared/types/contract'

export async function fetchContracts(): Promise<Contract[]> {
  return apiClient.get<Contract[]>('/api/v1/contracts')
}

export async function createContract(draft: ContractDraft): Promise<Contract> {
  return apiClient.post<Contract>('/api/v1/contracts', draft)
}

export async function fetchClientDistribution(): Promise<ClientDistributionEntry[]> {
  return apiClient.get<ClientDistributionEntry[]>('/api/v1/contracts/client-distribution')
}

export interface ContractSearchParams {
  q: string
  /** Restrict results to a single 5-tier taxonomy type. */
  contract_type?: ContractTier
  status?: string
  per_page?: number
}

/**
 * Broker a search query to the backend's Scout/Meilisearch search endpoint.
 * Index: `contracts` (configured server-side via MEILISEARCH_CONTRACTS_INDEX).
 * Falls back to SQL LIKE when Meilisearch is not configured on the backend.
 * Strictly scoped to the `contracts` index — no `quotes` index is queried.
 */
export async function searchContractsApi(params: ContractSearchParams): Promise<Contract[]> {
  const response = await apiClient.get<{ data: Contract[] }>('/api/v1/contracts/search', {
    query: {
      q: params.q,
      ...(params.contract_type ? { contract_type: params.contract_type } : {}),
      ...(params.status ? { status: params.status } : {}),
      per_page: params.per_page ?? 25,
    },
  })
  // Laravel paginated responses wrap items in `data`
  return Array.isArray(response) ? response : ((response as { data?: Contract[] }).data ?? [])
}
