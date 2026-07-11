import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { fetchContracts, createContract, searchContractsApi } from '@/modules/contracts/contractApi'
import type {
  Contract,
  ContractDraft,
  ContractFormDraft,
  ContractDraftLineItem,
  ContractTier,
  LocalDraft,
} from '@/shared/types/contract'
import { emptyFormDraft } from '@/shared/types/contract'

interface ContractsState {
  records: Contract[]
  /** Frontend-only drafts saved via "Save Draft" in the Live Studio. */
  localDrafts: LocalDraft[]
  /**
   * ID of the LocalDraft currently being edited in the Live Studio.
   * When set, "Save Draft" updates the existing entry instead of creating a new one.
   * Reset to null when the form is reset or a contract is finalized.
   */
  activeDraftId: string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  createStatus: 'idle' | 'submitting' | 'succeeded' | 'failed'
  error: string | null
  createError: string | null
  formDraft: ContractFormDraft

  // ── Meilisearch / Scout search ────────────────────────────────────────────
  /** Active search query string — drives the search results pane visibility. */
  searchQuery: string
  /** Hits returned by the backend Scout/Meilisearch search endpoint. */
  searchResults: Contract[]
  searchStatus: 'idle' | 'searching' | 'succeeded' | 'failed'
  searchError: string | null
}

const initialState: ContractsState = {
  records: [],
  localDrafts: [],
  activeDraftId: null,
  status: 'idle',
  createStatus: 'idle',
  error: null,
  createError: null,
  formDraft: emptyFormDraft(),

  searchQuery: '',
  searchResults: [],
  searchStatus: 'idle',
  searchError: null,
}

// ── Thunks ────────────────────────────────────────────────────────────────────

export const loadContracts = createAsyncThunk<Contract[], void, { rejectValue: string }>(
  'contracts/load',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchContracts()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load contracts.'
      // 404 / "Not Found" means the endpoint is not wired yet — return empty list.
      if (/not.?found|404/i.test(msg)) return []
      return rejectWithValue(msg)
    }
  },
)

export const submitContract = createAsyncThunk<Contract, ContractDraft, { rejectValue: string }>(
  'contracts/submit',
  async (draft, { rejectWithValue }) => {
    try {
      return await createContract(draft)
    } catch (err) {
      return rejectWithValue(err instanceof Error ? err.message : 'Failed to create contract.')
    }
  },
)

/**
 * Meilisearch search broker — sends the user's query to the backend Scout endpoint
 * (index: `contracts`). The backend routes to Meilisearch when configured; falls
 * back to SQL LIKE automatically. Strictly scoped to the `contracts` index —
 * no `quotes` index is contacted.
 *
 * Usage: dispatched from `ContractSearchBar` after a 300 ms debounce.
 */
export const brokerMeilisearchQuery = createAsyncThunk<
  Contract[],
  string,
  { rejectValue: string }
>(
  'contracts/search',
  async (query, { rejectWithValue }) => {
    const trimmed = query.trim()
    if (trimmed.length < 2) return []
    try {
      return await searchContractsApi({ q: trimmed, per_page: 25 })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Search failed.'
      if (/not.?found|404/i.test(msg)) return []
      return rejectWithValue(msg)
    }
  },
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const contractsSlice = createSlice({
  name: 'contracts',
  initialState,
  reducers: {
    resetCreateStatus(state) {
      state.createStatus = 'idle'
      state.createError = null
    },

    addContractLocal(state, action: PayloadAction<Contract>) {
      state.records.unshift(action.payload)
    },

    // ── Local Draft management ────────────────────────────────────────────────

    /**
     * Capture the current Live Studio state into `localDrafts`.
     * If `activeDraftId` points to an existing draft, update it.
     * Otherwise create a new draft and set `activeDraftId`.
     */
    saveLocalDraft(
      state,
      action: PayloadAction<{
        tier: ContractTier | ''
        form: ContractFormDraft
        totalInvestment: number
      }>,
    ) {
      const { tier, form, totalInvestment } = action.payload
      const label =
        form.contractTitle.trim() || form.entityName.trim() || 'Untitled Draft'
      const now = new Date().toISOString()

      const existing = state.activeDraftId
        ? state.localDrafts.find((d) => d.id === state.activeDraftId)
        : null

      if (existing) {
        existing.tier = tier
        existing.label = label
        existing.updatedAt = now
        existing.form = form
        existing.totalInvestment = totalInvestment
      } else {
        const id = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
        state.localDrafts.unshift({
          id,
          tier,
          label,
          createdAt: now,
          updatedAt: now,
          form,
          totalInvestment,
        })
        state.activeDraftId = id
      }
    },

    /**
     * Load a saved LocalDraft back into the Live Studio form.
     * Sets `activeDraftId` so subsequent saves update this draft.
     */
    resumeLocalDraft(state, action: PayloadAction<string>) {
      const draft = state.localDrafts.find((d) => d.id === action.payload)
      if (!draft) return
      state.formDraft = { ...draft.form }
      state.activeDraftId = draft.id
    },

    /**
     * Load a server-side Contract record into the Live Studio form.
     * Used for server drafts (status === 'draft'). Does NOT set activeDraftId
     * because these are server records, not local drafts.
     */
    loadServerContractIntoBuilder(state, action: PayloadAction<Contract>) {
      const c = action.payload
      const lineItems: ContractDraftLineItem[] = c.line_items.map((li, i) => ({
        id: li.id ?? `li-${i}`,
        description: li.description,
        quantity: li.quantity,
        unitPrice: li.unit_price,
      }))

      state.formDraft = {
        ...emptyFormDraft(),
        contractType: c.contract_type,
        contractTitle: c.contract_title,
        issueDate: c.issue_date,
        expiresAt: c.expires_at ?? '',
        entityName: c.client_name,
        contactEmail: c.client_email,
        serviceAddress: c.client_address,
        billingAddress: c.billing_address,
        scopeOfWork: c.scope_of_work,
        lineItems,
      }
      state.activeDraftId = null
    },

    /** Remove a local draft by ID. */
    deleteLocalDraft(state, action: PayloadAction<string>) {
      state.localDrafts = state.localDrafts.filter((d) => d.id !== action.payload)
      if (state.activeDraftId === action.payload) {
        state.activeDraftId = null
      }
    },

    // ── Form-draft field CRUD ─────────────────────────────────────────────────

    updateDraftField(state, action: PayloadAction<Partial<ContractFormDraft>>) {
      Object.assign(state.formDraft, action.payload)
    },

    addDraftLineItem(state) {
      const newLine: ContractDraftLineItem = {
        id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        description: '',
        quantity: 1,
        unitPrice: 0,
      }
      state.formDraft.lineItems.push(newLine)
    },

    updateDraftLineItem(
      state,
      action: PayloadAction<{ index: number; patch: Partial<ContractDraftLineItem> }>,
    ) {
      const line = state.formDraft.lineItems[action.payload.index]
      if (line) Object.assign(line, action.payload.patch)
    },

    removeDraftLineItem(state, action: PayloadAction<number>) {
      state.formDraft.lineItems.splice(action.payload, 1)
    },

    resetDraft(state) {
      state.formDraft = emptyFormDraft()
      state.createStatus = 'idle'
      state.createError = null
      state.activeDraftId = null
    },

    /** Clear all search state and return to the swimlane view. */
    clearSearch(state) {
      state.searchQuery = ''
      state.searchResults = []
      state.searchStatus = 'idle'
      state.searchError = null
    },
  },

  extraReducers: (builder) => {
    builder
      .addCase(loadContracts.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadContracts.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.records = action.payload
      })
      .addCase(loadContracts.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unknown error.'
      })
      .addCase(submitContract.pending, (state) => {
        state.createStatus = 'submitting'
        state.createError = null
      })
      .addCase(submitContract.fulfilled, (state, action) => {
        state.createStatus = 'succeeded'
        state.records.unshift(action.payload)
        state.formDraft = emptyFormDraft()
        state.activeDraftId = null
      })
      .addCase(submitContract.rejected, (state, action) => {
        state.createStatus = 'failed'
        state.createError = action.payload ?? 'Unknown error.'
      })
      .addCase(brokerMeilisearchQuery.pending, (state, action) => {
        state.searchQuery = action.meta.arg
        state.searchStatus = 'searching'
        state.searchError = null
      })
      .addCase(brokerMeilisearchQuery.fulfilled, (state, action) => {
        state.searchStatus = 'succeeded'
        state.searchResults = action.payload
      })
      .addCase(brokerMeilisearchQuery.rejected, (state, action) => {
        state.searchStatus = 'failed'
        state.searchError = action.payload ?? 'Search failed.'
      })
  },
})

export const {
  resetCreateStatus,
  addContractLocal,
  saveLocalDraft,
  resumeLocalDraft,
  loadServerContractIntoBuilder,
  deleteLocalDraft,
  updateDraftField,
  addDraftLineItem,
  updateDraftLineItem,
  removeDraftLineItem,
  resetDraft,
  clearSearch,
} = contractsSlice.actions

export default contractsSlice.reducer
