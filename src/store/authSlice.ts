import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/core/api'
import { authSession, getBearerToken, type AuthUser } from '@/core/auth/authSession'

export interface AuthState {
  user: AuthUser | null
  accessToken: string | null
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous'
  error: string | null
}

const initialState: AuthState = {
  user: authSession.read().user,
  accessToken: getBearerToken(),
  status: getBearerToken() ? 'authenticated' : 'anonymous',
  error: null,
}

export const brokerAuthLogin = createAsyncThunk<
  { user: AuthUser; accessToken: string },
  { email: string; password: string },
  { rejectValue: string }
>('auth/login', async ({ email, password }, { rejectWithValue }) => {
  try {
    const snapshot = await authSession.login(email, password)
    return { user: snapshot.user!, accessToken: snapshot.accessToken! }
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Unable to sign in.')
  }
})

export const brokerAuthRefresh = createAsyncThunk<
  { user: AuthUser | null; accessToken: string | null },
  void,
  { rejectValue: string }
>('auth/refresh', async (_, { rejectWithValue }) => {
  try {
    const snapshot = await authSession.refresh()
    return { user: snapshot.user, accessToken: snapshot.accessToken }
  } catch (err) {
    return rejectWithValue(err instanceof Error ? err.message : 'Unable to refresh session.')
  }
})

export const brokerAuthLogout = createAsyncThunk<void, void, { rejectValue: string }>(
  'auth/logout',
  async () => {
    try {
      await apiClient.post('/api/v1/auth/logout', undefined, { retryCount: 0 })
    } catch {
      // Remote logout is best-effort; local session cleanup must always happen.
    } finally {
      authSession.clear()
    }
  },
)

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    syncAuthSession(
      state,
      action: PayloadAction<{ user: AuthUser | null; accessToken: string | null }>,
    ) {
      state.user = action.payload.user
      state.accessToken = action.payload.accessToken
      state.status = action.payload.accessToken ? 'authenticated' : 'anonymous'
    },
    clearAuthError(state) {
      state.error = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(brokerAuthLogin.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(brokerAuthLogin.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.status = 'authenticated'
        state.error = null
      })
      .addCase(brokerAuthLogin.rejected, (state, action) => {
        state.user = null
        state.accessToken = null
        state.status = 'anonymous'
        state.error = action.payload ?? 'Unable to sign in.'
      })
      .addCase(brokerAuthRefresh.fulfilled, (state, action) => {
        state.user = action.payload.user
        state.accessToken = action.payload.accessToken
        state.status = action.payload.accessToken ? 'authenticated' : 'anonymous'
      })
      .addCase(brokerAuthLogout.fulfilled, (state) => {
        state.user = null
        state.accessToken = null
        state.status = 'anonymous'
        state.error = null
      })
  },
})

export const { syncAuthSession, clearAuthError } = authSlice.actions
export default authSlice.reducer
