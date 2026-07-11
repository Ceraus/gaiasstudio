import { createSlice, type PayloadAction } from '@reduxjs/toolkit'

const STORAGE_KEY = 'cvg.account.useExampleData'

function loadUseExampleData(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'true') return true
    if (raw === 'false') return false
  } catch {
    // Storage unavailable — default to live API.
  }
  return import.meta.env.VITE_USE_EXAMPLE_DATA === 'true'
}

export interface AccountState {
  /** When true, the API gateway resolves taxonomy-compliant example data locally. */
  useExampleData: boolean
}

const initialState: AccountState = {
  useExampleData: loadUseExampleData(),
}

const accountSlice = createSlice({
  name: 'account',
  initialState,
  reducers: {
    setUseExampleData(state, action: PayloadAction<boolean>) {
      state.useExampleData = action.payload
      try {
        localStorage.setItem(STORAGE_KEY, String(action.payload))
      } catch {
        // Best-effort persistence.
      }
    },
    toggleUseExampleData(state) {
      state.useExampleData = !state.useExampleData
      try {
        localStorage.setItem(STORAGE_KEY, String(state.useExampleData))
      } catch {
        // Best-effort persistence.
      }
    },
  },
})

export const { setUseExampleData, toggleUseExampleData } = accountSlice.actions
export default accountSlice.reducer
