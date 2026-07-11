import { apiClient } from '@/core/api'
import type { Contract } from '@/shared/types/contract'

/**
 * globalSearchApi — brokers queries to three Meilisearch indices in parallel.
 *
 * Index routing (all server-side via Laravel Scout):
 *   contracts  → /api/v1/contracts/search
 *   projects   → /api/v1/projects/search
 *   vault      → /api/v1/contracts/vault/search
 *
 * The `quotes` index is strictly excluded and never contacted.
 * Each function catches network/404 errors and returns [] so the
 * multi-index `brokerGlobalSearch` thunk degrades gracefully when
 * an index is not yet wired on the backend.
 */

// ── Shared result shapes ──────────────────────────────────────────────────────

export interface ProjectHit {
  id: string
  name: string
  status: string
  company?: string
}

export interface VaultHit {
  id: string
  document_title: string
  /** Classified tier string — one of the 5-tier taxonomy values. */
  tier?: string
  created_at: string
}

// ── Index query functions ─────────────────────────────────────────────────────

/**
 * Query the `contracts` Meilisearch index via the backend Scout gateway.
 * Returns up to 5 hits; falls back to [] on any error.
 */
export async function searchContractsGlobal(q: string): Promise<Contract[]> {
  try {
    const res = await apiClient.get<{ data: Contract[] } | Contract[]>(
      '/api/v1/contracts/search',
      { query: { q, per_page: 5 } },
    )
    return Array.isArray(res) ? res : ((res as { data?: Contract[] }).data ?? [])
  } catch {
    return []
  }
}

/**
 * Query the `projects` index.
 * Returns [] gracefully if the endpoint is not yet wired.
 */
export async function searchProjectsGlobal(q: string): Promise<ProjectHit[]> {
  try {
    return await apiClient.get<ProjectHit[]>('/api/v1/projects/search', {
      query: { q, per_page: 5 },
    })
  } catch {
    return []
  }
}

/**
 * Query the `vault` index for archived legacy documents.
 * Returns [] gracefully if the endpoint is not yet wired.
 */
export async function searchVaultGlobal(q: string): Promise<VaultHit[]> {
  try {
    return await apiClient.get<VaultHit[]>('/api/v1/contracts/vault/search', {
      query: { q, per_page: 5 },
    })
  } catch {
    return []
  }
}
