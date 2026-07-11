import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/core/api/apiClient'

export interface M365SsoStatus {
  enabled: boolean
  redirect_url?: string
}

interface M365State {
  /** SSO availability from the Global-API gateway. */
  ssoStatus:    M365SsoStatus | null
  /** Microsoft access token — stored in Redux, never in localStorage directly. */
  accessToken:  string | null
  /** Unix timestamp (ms) at which the access token expires. */
  tokenExpiry:  number | null
  /** Email address of the authenticated Microsoft account. */
  userEmail:    string | null
  status: 'idle' | 'loading' | 'succeeded' | 'failed'
  error:  string | null
}

const initialState: M365State = {
  ssoStatus:   null,
  accessToken: null,
  tokenExpiry: null,
  userEmail:   null,
  status: 'idle',
  error:  null,
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
    /**
     * Store the Microsoft access token after a successful MSAL callback.
     * Called by the OAuth redirect handler once the token is validated.
     */
    setM365Token(
      state,
      action: PayloadAction<{ token: string; expiry: number; email: string }>,
    ) {
      state.accessToken = action.payload.token
      state.tokenExpiry = action.payload.expiry
      state.userEmail   = action.payload.email
      state.status      = 'succeeded'
      state.error       = null
    },

    /** Clear token and reset to disconnected state. */
    clearM365Token(state) {
      state.accessToken = null
      state.tokenExpiry = null
      state.userEmail   = null
      state.status      = 'idle'
      state.error       = null
    },

    resetM365State() {
      return { ...initialState }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(brokerM365SsoStatus.pending, (state) => {
        state.status = 'loading'
        state.error  = null
      })
      .addCase(brokerM365SsoStatus.fulfilled, (state, action) => {
        state.status    = 'succeeded'
        state.ssoStatus = action.payload
      })
      .addCase(brokerM365SsoStatus.rejected, (state, action) => {
        state.status = 'failed'
        state.error  = action.payload ?? 'Unable to load M365 SSO status.'
      })
  },
})

export const { setM365Token, clearM365Token, resetM365State } = m365Slice.actions

/** Returns true when the stored token exists and has not yet expired. */
export function isM365TokenValid(state: M365State): boolean {
  return !!state.accessToken && !!state.tokenExpiry && Date.now() < state.tokenExpiry
}

export default m365Slice.reducer
