import type { RootState } from './index'

type StoreReader = { getState: () => RootState }

let storeReader: StoreReader | null = null

/** Binds the Redux store for Axios interceptors without circular imports. */
export function bindReduxStore(reader: StoreReader): void {
  storeReader = reader
}

export function readReduxState(): RootState | null {
  return storeReader?.getState() ?? null
}
