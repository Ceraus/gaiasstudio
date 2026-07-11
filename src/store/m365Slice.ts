import { createAsyncThunk, createSlice } from '@reduxjs/toolkit'
import { apiClient } from '@/core/api/apiClient'

export interface M365SsoStatus {
  enabled: boolean
  redirect_url?: string
}

interface M365State {
  ssoStatus: M365SsoStatus | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error: string | null
}

const initialState: M365State = {
  ssoStatus: null,
  status: 'idle',
  error: null,
}

/** Broker Microsoft 365 SSO availability from the Global-API gateway. */
export const brokerM365SsoStatus = createAsyncThunk<
  M365SsoStatus,
  void,
  { rejectValue: string }
>('m365/ssoStatus', async (_, { rejectWithValue }) => {
  try {
    return await apiClient.get<M365SsoStatus>('/api/v1/auth/sso/status', { skipAuth: true })
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Unable to load M365 SSO status.')
  }
})

const m365Slice = createSlice({
  name: 'm365',
  initialState,
  reducers: {
    resetM365State() {
      return { ...initialState }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(brokerM365SsoStatus.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(brokerM365SsoStatus.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.ssoStatus = action.payload
      })
      .addCase(brokerM365SsoStatus.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload ?? 'Unable to load M365 SSO status.'
      })
  },
})

export const { resetM365State } = m365Slice.actions
export default m365Slice.reducer
