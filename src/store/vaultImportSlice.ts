import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/core/api'
import type { ContractFormDraft, ContractTier } from '@/shared/types/contract'

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * Pipeline stages surfaced to the UI:
 *  idle       → nothing in flight
 *  uploading  → FormData payload is being transmitted to the backend
 *  extracting → backend NLP / Qwen extraction is running (server-side)
 *  succeeded  → structured payload received; auto-slot into Live Builder
 *  failed     → network or AI extraction error
 */
export type VaultImportStatus =
  | 'idle'
  | 'uploading'
  | 'extracting'
  | 'succeeded'
  | 'failed'

/**
 * Structured payload returned by the backend's multi-stage parser
 * (Regex sanitization → Qwen/Ollama NLP extraction).
 * Contains the resolved taxonomy tier and extracted contract fields.
 */
export interface VaultMappedPayload {
  tier: ContractTier
  draft: Partial<ContractFormDraft>
}

interface VaultImportState {
  status: VaultImportStatus
  /** File name shown in the UI while processing. */
  fileName: string | null
  /** Resolved payload after AI extraction completes. */
  mappedPayload: VaultMappedPayload | null
  error: string | null
}

const initialState: VaultImportState = {
  status: 'idle',
  fileName: null,
  mappedPayload: null,
  error: null,
}

// ── Thunk: broker raw file to the AI legacy extraction API ────────────────────

/**
 * Sends the raw document file as multipart FormData to the backend.
 * The backend pipeline runs:
 *   1. Regex sanitization of raw text / PDF-extracted text
 *   2. Qwen / Ollama NLP extraction → structured JSON
 *   3. Taxonomy tier classification
 *
 * Returns a `VaultMappedPayload` with `tier` + `draft` fields ready to
 * merge directly into the Live Builder Redux state.
 *
 * A mid-request dispatch transitions the UI from 'uploading' to 'extracting'
 * after the file has been transmitted, reflecting the server-side AI phase.
 */
export const brokerLegacyVaultData = createAsyncThunk<
  VaultMappedPayload,
  File,
  { rejectValue: string }
>(
  'vaultImport/brokerLegacyVaultData',
  async (file, { rejectWithValue, dispatch }) => {
    const formData = new FormData()
    formData.append('document', file)
    formData.append('filename', file.name)
    formData.append('mime_type', file.type || 'application/octet-stream')

    // Transition to 'extracting' after 2 s — the file transfer is typically
    // fast on localhost; the AI extraction phase dominates the wait time.
    const extractTimer = setTimeout(() => {
      dispatch(setExtracting())
    }, 2000)

    try {
      const payload = await apiClient.post<VaultMappedPayload>(
        '/api/v1/contracts/vault/extract',
        formData,
      )
      clearTimeout(extractTimer)
      return payload
    } catch (err) {
      clearTimeout(extractTimer)
      return rejectWithValue(
        err instanceof Error ? err.message : 'Vault extraction failed.',
      )
    }
  },
)

// ── Slice ─────────────────────────────────────────────────────────────────────

const vaultImportSlice = createSlice({
  name: 'vaultImport',
  initialState,
  reducers: {
    /** Transition UI from 'uploading' to 'extracting' mid-request. */
    setExtracting(state) {
      if (state.status === 'uploading') state.status = 'extracting'
    },
    resetVaultImport() {
      return { ...initialState }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(brokerLegacyVaultData.pending, (state, action) => {
        state.status = 'uploading'
        state.fileName = (action.meta.arg as File).name ?? null
        state.error = null
        state.mappedPayload = null
      })
      .addCase(brokerLegacyVaultData.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.mappedPayload = action.payload
      })
      .addCase(brokerLegacyVaultData.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unknown vault extraction error.'
      })
  },
})

export const { setExtracting, resetVaultImport } = vaultImportSlice.actions
export default vaultImportSlice.reducer
