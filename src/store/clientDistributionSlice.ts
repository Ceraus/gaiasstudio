import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchClientDistribution } from '@/modules/contracts/contractApi'
import type { ClientDistributionEntry } from '@/shared/types/contract'

interface ClientDistributionState {
  entries: ClientDistributionEntry[]
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: ClientDistributionState = {
  entries: [],
  status: 'idle',
  error: null,
}

export const loadClientDistribution = createAsyncThunk<
  ClientDistributionEntry[],
  void,
  { rejectValue: string }
>('clientDistribution/load', async (_, { rejectWithValue }) => {
  try {
    return await fetchClientDistribution()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to load client distribution.'
    if (/not.?found|404/i.test(msg)) return []
    return rejectWithValue(msg)
  }
})

const clientDistributionSlice = createSlice({
  name: 'clientDistribution',
  initialState,
  reducers: {
    /**
     * Flush all client distribution entries and reset status to 'idle'.
     * Called when the Example Data toggle is switched off so the map
     * instantly reverts to a blank slate and re-triggers a live API fetch.
     */
    flushExampleData(state) {
      state.entries = []
      state.status = 'idle'
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadClientDistribution.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(loadClientDistribution.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.entries = action.payload
      })
      .addCase(loadClientDistribution.rejected, (state, action) => {
        state.status = 'failed'
        state.entries = []
        state.error = action.payload ?? 'Load failed.'
      })
  },
})

export const { flushExampleData } = clientDistributionSlice.actions
export default clientDistributionSlice.reducer
