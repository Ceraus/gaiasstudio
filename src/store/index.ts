import { configureStore } from '@reduxjs/toolkit'
import contractsReducer from './contractsSlice'
import clientDistributionReducer from './clientDistributionSlice'
import preferencesReducer from './preferencesSlice'
import studioReducer from './studioSlice'
import vaultImportReducer from './vaultImportSlice'

export const store = configureStore({
  reducer: {
    contracts: contractsReducer,
    clientDistribution: clientDistributionReducer,
    preferences: preferencesReducer,
    studio: studioReducer,
    vaultImport: vaultImportReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
