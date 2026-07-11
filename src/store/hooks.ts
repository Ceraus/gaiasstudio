import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from './index'

/** Typed `useDispatch` — use this instead of plain `useDispatch` for RTK thunks. */
export const useAppDispatch = useDispatch.withTypes<AppDispatch>()

/** Typed `useSelector` — guarantees `state` is typed as `RootState`. */
export const useAppSelector = useSelector.withTypes<RootState>()
