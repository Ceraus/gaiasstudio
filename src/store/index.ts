import { configureStore } from '@reduxjs/toolkit'
import accountReducer from './accountSlice'
import authReducer from './authSlice'
import contractsReducer from './contractsSlice'
import clientDistributionReducer from './clientDistributionSlice'
import preferencesReducer from './preferencesSlice'
import studioReducer from './studioSlice'
import vaultImportReducer from './vaultImportSlice'
import globalSearchReducer from './globalSearchSlice'
import m365Reducer from './m365Slice'
import { bindReduxStore } from './storeRef'

export const store = configureStore({
  reducer: {
    account:            accountReducer,
    auth:               authReducer,
    contracts:          contractsReducer,
    clientDistribution: clientDistributionReducer,
    preferences:        preferencesReducer,
    studio:             studioReducer,
    vaultImport:        vaultImportReducer,
    globalSearch:       globalSearchReducer,
    m365:               m365Reducer,
  },
})

bindReduxStore(store)

export type RootState   = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
