import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { fetchClientDistribution } from '@/modules/contracts/contractApi'
import type { ClientDistributionEntry } from '@/shared/types/contract'
import { isMockMode } from '@/core/mock/isMockMode'
import { MOCK_CLIENT_DISTRIBUTION } from '@/core/mock/seedData'

// Seeded NYC-area demo entries — rendered when the API is unavailable.
const NYC_DEMO_ENTRIES: ClientDistributionEntry[] = [
  { id: 'demo-1', name: 'MetroTech Solutions', lat: 40.6942, lng: -73.9856, contract_tier: 'SLA_HELPDESK', status: 'active', expires_at: '2026-12-31', address: 'Brooklyn, NY' },
  { id: 'demo-2', name: 'Harbor Networks', lat: 40.7282, lng: -74.0776, contract_tier: 'SLA_MONTHLY_NETWORK', status: 'expiring_soon', expires_at: '2026-08-15', address: 'Jersey City, NJ' },
  { id: 'demo-3', name: 'Clearview Financial', lat: 40.7614, lng: -73.9776, contract_tier: 'SIMPLE_1', status: 'active', expires_at: '2027-01-01', address: 'Midtown, NY' },
  { id: 'demo-4', name: 'Apex Security LLC', lat: 40.7489, lng: -73.9680, contract_tier: 'SLA_ACCESS_CONTROL', status: 'active', expires_at: '2027-03-01', address: 'Murray Hill, NY' },
  { id: 'demo-5', name: 'Atlas IT Group', lat: 40.7831, lng: -73.9712, contract_tier: 'SLA_HELPDESK', status: 'expired', expires_at: '2025-12-01', address: 'Upper West Side, NY' },
  { id: 'demo-6', name: 'Pinnacle MSP', lat: 40.6501, lng: -73.9496, contract_tier: 'SIMPLE_2', status: 'active', expires_at: '2026-11-30', address: 'Flatbush, NY' },
  { id: 'demo-7', name: 'Summit Data Systems', lat: 40.7178, lng: -74.0431, contract_tier: 'SLA_MONTHLY_NETWORK', status: 'active', expires_at: '2026-10-15', address: 'Downtown, NY' },
  { id: 'demo-8', name: 'Vertex Cloud Corp', lat: 40.7359, lng: -74.0027, contract_tier: 'SIMPLE_1', status: 'expiring_soon', expires_at: '2026-09-01', address: 'Greenwich Village, NY' },
]

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
  if (isMockMode()) return MOCK_CLIENT_DISTRIBUTION
  try {
    const data = await fetchClientDistribution()
    return data.length > 0 ? data : NYC_DEMO_ENTRIES
  } catch {
    return NYC_DEMO_ENTRIES
  }
})

const clientDistributionSlice = createSlice({
  name: 'clientDistribution',
  initialState,
  reducers: {},
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
        state.entries = NYC_DEMO_ENTRIES
        state.error = action.payload ?? 'Load failed.'
      })
  },
})

export default clientDistributionSlice.reducer
