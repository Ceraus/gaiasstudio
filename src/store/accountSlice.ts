import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const STORAGE_KEY = 'cvg.account.useMockData'

function loadUseMockData(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch {
    // Storage unavailable — default to live API.
  }
  return import.meta.env.VITE_USE_MOCKS === 'true'
}

export interface AccountState {
  /** When true, the Axios gateway resolves taxonomy-compliant seed data locally. */
  useMockData: boolean
}

const initialState: AccountState = {
  useMockData: loadUseMockData(),
}

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setUseMockData(state, action: PayloadAction<boolean>) {
      state.useMockData = action.payload
      try {
        localStorage.setItem(STORAGE_KEY, String(action.payload))
      } catch {
        // Best-effort persistence.
      }
    },
    toggleUseMockData(state) {
      state.useMockData = !state.useMockData
      try {
        localStorage.setItem(STORAGE_KEY, String(state.useMockData))
      } catch {
        // Best-effort persistence.
      }
    },
  },
})

export const { setUseMockData, toggleUseMockData } = accountSlice.actions
export default accountSlice.reducer
