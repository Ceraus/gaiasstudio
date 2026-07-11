/**
 * isMockMode.ts — reads the mock-data flag from localStorage.
 *
 * Using localStorage instead of importing the Redux store directly avoids
 * circular dependency chains across the slice layer.
 * `preferencesSlice` persists `useMockData` to the key below on every toggle.
 */

const PREFS_KEY = 'cvg.preferences'

export function isMockMode(): boolean {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw) as { useMockData?: boolean }
    return parsed.useMockData === true
  } catch {
    return false
  }
}
