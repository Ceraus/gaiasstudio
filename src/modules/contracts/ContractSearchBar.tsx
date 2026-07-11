import { useEffect, useRef, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { brokerMeilisearchQuery, clearSearch } from '@/store/contractsSlice'

const DEBOUNCE_MS = 300
const MIN_CHARS = 2

/**
 * ContractSearchBar — debounced Meilisearch gateway for the Contract Hub.
 *
 * Keystroke trace:
 *   onChange → local state update → 300 ms debounce → dispatch brokerMeilisearchQuery(q)
 *   → backend Scout/Meilisearch (index: `contracts`) → Redux searchResults
 *
 * Clearing the input (or clicking ×) dispatches clearSearch(), restoring the
 * three-lane swimlane view immediately.
 */
export function ContractSearchBar() {
  const dispatch = useAppDispatch()
  const searchStatus = useAppSelector((s) => s.contracts.searchStatus)
  const searchQuery  = useAppSelector((s) => s.contracts.searchQuery)

  const [localValue, setLocalValue] = useState(searchQuery)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep local input in sync when an external clearSearch() is dispatched
  useEffect(() => {
    if (searchQuery === '') setLocalValue('')
  }, [searchQuery])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setLocalValue(val)

    if (timerRef.current !== null) clearTimeout(timerRef.current)

    if (val.trim().length < MIN_CHARS) {
      dispatch(clearSearch())
      return
    }

    timerRef.current = setTimeout(() => {
      void dispatch(brokerMeilisearchQuery(val.trim()))
    }, DEBOUNCE_MS)
  }

  function handleClear() {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
    setLocalValue('')
    dispatch(clearSearch())
    inputRef.current?.focus()
  }

  // Cleanup debounce on unmount
  useEffect(() => () => {
    if (timerRef.current !== null) clearTimeout(timerRef.current)
  }, [])

  const isSearching = searchStatus === 'searching'

  return (
    <div className="relative w-full">
      {/* Leading icon */}
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center">
        {isSearching ? (
          <Loader2
            size={15}
            className="animate-spin text-[#166eb4]"
            aria-hidden
          />
        ) : (
          <Search size={15} className="text-slate-400" aria-hidden />
        )}
      </span>

      <input
        ref={inputRef}
        type="search"
        value={localValue}
        onChange={handleChange}
        placeholder="Search contracts — client, type, scope… (Meilisearch)"
        aria-label="Search contracts"
        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#166eb4] focus:ring-2 focus:ring-[#166eb4]/20"
      />

      {/* Clear button */}
      {localValue.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-2.5 flex items-center rounded p-0.5 text-slate-400 transition-colors hover:text-slate-700"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  )
}
