import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import type { Contract } from '@/shared/types/contract'
import type { ProjectHit, VaultHit } from '@/core/api/globalSearchApi'
import {
  searchContractsGlobal,
  searchProjectsGlobal,
  searchVaultGlobal,
} from '@/core/api/globalSearchApi'

export type { ProjectHit, VaultHit }

// ── Result shape ──────────────────────────────────────────────────────────────

export interface GlobalSearchResults {
  contracts: Contract[]
  projects:  ProjectHit[]
  vault:     VaultHit[]
}

const EMPTY_RESULTS: GlobalSearchResults = { contracts: [], projects: [], vault: [] }

// ── Slice state ───────────────────────────────────────────────────────────────

interface GlobalSearchState {
  query:   string
  results: GlobalSearchResults
  status:  'idle' | 'searching' | 'succeeded' | 'failed'
  error:   string | null
}

const initialState: GlobalSearchState = {
  query:   '',
  results: EMPTY_RESULTS,
  status:  'idle',
  error:   null,
}

// ── Thunk ─────────────────────────────────────────────────────────────────────

/**
 * Broker a debounced user query to all available Meilisearch indices in
 * parallel (`contracts`, `projects`, `vault`).
 *
 * IMPORTANT: The `quotes` index is strictly excluded and never contacted.
 * Individual index failures degrade silently — a missing backend endpoint
 * returns [] rather than failing the whole search.
 */
export const brokerGlobalSearch = createAsyncThunk<
  GlobalSearchResults,
  string,
  { rejectValue: string }
>(
  'globalSearch/broker',
  async (query, { rejectWithValue }) => {
    const q = query.trim()
    if (q.length < 2) return EMPTY_RESULTS

    try {
      const [contractsResult, projectsResult, vaultResult] = await Promise.allSettled([
        searchContractsGlobal(q),
        searchProjectsGlobal(q),
        searchVaultGlobal(q),
      ])

      return {
        contracts: contractsResult.status === 'fulfilled' ? contractsResult.value : [],
        projects:  projectsResult.status  === 'fulfilled' ? projectsResult.value  : [],
        vault:     vaultResult.status     === 'fulfilled' ? vaultResult.value     : [],
      }
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Global search failed.')
    }
  },
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const globalSearchSlice = createSlice({
  name: 'globalSearch',
  initialState,
  reducers: {
    clearGlobalSearch(state) {
      state.query   = ''
      state.results = EMPTY_RESULTS
      state.status  = 'idle'
      state.error   = null
    },
  },
  extraReducers(builder) {
    builder
      .addCase(brokerGlobalSearch.pending, (state, action) => {
        state.query  = action.meta.arg
        state.status = 'searching'
        state.error  = null
      })
      .addCase(brokerGlobalSearch.fulfilled, (state, action) => {
        state.results = action.payload
        state.status  = 'succeeded'
      })
      .addCase(brokerGlobalSearch.rejected, (state, action) => {
        state.status = 'failed'
        state.error  = action.payload ?? 'Search failed.'
      })
  },
})

export const { clearGlobalSearch } = globalSearchSlice.actions
export default globalSearchSlice.reducer
