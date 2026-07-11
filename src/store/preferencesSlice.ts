import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { apiClient } from '@/core/api'
import type { ShortcutOverrides } from '@/shared/utils/keyboardBindings'

// ── LocalStorage persistence helpers ─────────────────────────────────────────
const STORAGE_KEY = 'cvg.preferences'

function loadStoredPreferences(): Partial<PreferencesState> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<PreferencesState>
  } catch {
    return {}
  }
}

function persistPreferences(prefs: Partial<PreferencesState>): void {
  try {
    const stored = loadStoredPreferences()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...stored, ...prefs }))
  } catch {
    // Storage unavailable — silently continue.
  }
}

// ── Preferences state shape ───────────────────────────────────────────────────

export interface PreferencesState {
  /**
   * Hotkey payload — the global source of truth for all rebindable shortcuts.
   * Keys are ShortcutActionIds; values are resolved combo strings ("Ctrl+K").
   * An absent key means "use the default binding from DEFAULT_SHORTCUTS."
   */
  shortcutOverrides: ShortcutOverrides

  /**
   * Master gate for all rebindable global hotkeys. When false, the global
   * `keydown` listener returns early and no app shortcuts fire.
   * F11 fullscreen and Ctrl+, settings are always active regardless.
   */
  globalShortcutsEnabled: boolean

  /** Enables the right-click radial context menu. */
  radialMenuEnabled: boolean

  /**
   * Radial ring action slot IDs, in clockwise order from 12 o'clock.
   * Empty array means "use role defaults" (resolved at render time).
   */
  radialActions: string[]

  /** User-configured slot count for the radial ring (0 = use role default). */
  radialCount: number

  /** Inverts the scroll wheel direction across the entire app. */
  invertScroll: boolean

  /**
   * Scroll velocity multiplier applied on top of the native delta.
   * Range: 0.5 (slow) → 3.0 (fast). Default 1.0 = native speed.
   */
  scrollSensitivity: number

  /** Reduces CSS animations app-wide. */
  reducedMotion: boolean

  /** Compact content density. */
  compactDensity: boolean

  saveStatus: 'idle' | 'saving' | 'saved' | 'failed'
  saveError: string | null
}

function buildInitialState(): PreferencesState {
  const stored = loadStoredPreferences()
  return {
    shortcutOverrides:     stored.shortcutOverrides     ?? {},
    globalShortcutsEnabled: stored.globalShortcutsEnabled ?? true,
    radialMenuEnabled:     stored.radialMenuEnabled     ?? false,
    radialActions:         stored.radialActions         ?? [],
    radialCount:           stored.radialCount           ?? 0,
    invertScroll:          stored.invertScroll          ?? false,
    scrollSensitivity:     stored.scrollSensitivity     ?? 1.0,
    reducedMotion:         stored.reducedMotion         ?? false,
    compactDensity:        stored.compactDensity        ?? false,
    saveStatus: 'idle',
    saveError: null,
  }
}

// ── Thunk: persist patch to API + localStorage ────────────────────────────────

export const savePreferences = createAsyncThunk<
  Partial<PreferencesState>,
  Partial<PreferencesState>,
  { rejectValue: string }
>('preferences/save', async (patch, { rejectWithValue }) => {
  persistPreferences(patch)
  try {
    await apiClient.patch('/api/v1/user/preferences', patch)
  } catch {
    // API unavailable — the localStorage write above still secured the data.
  }
  return patch
})

// ── Slice ─────────────────────────────────────────────────────────────────────

const preferencesSlice = createSlice({
  name: 'preferences',
  initialState: buildInitialState(),
  reducers: {
    /** Optimistic in-memory update — call `savePreferences` thunk for persistence. */
    patchPreferences(state, action: PayloadAction<Partial<PreferencesState>>) {
      const { saveStatus, saveError, ...fields } = action.payload
      Object.assign(state, fields)
    },
    resetSaveStatus(state) {
      state.saveStatus = 'idle'
      state.saveError = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(savePreferences.pending, (state) => {
        state.saveStatus = 'saving'
        state.saveError = null
      })
      .addCase(savePreferences.fulfilled, (state, action) => {
        // Fulfilled means localStorage is written; apply any returned fields.
        const { saveStatus, saveError, ...fields } = action.payload
        Object.assign(state, fields)
        state.saveStatus = 'saved'
      })
      .addCase(savePreferences.rejected, (state, action) => {
        state.saveStatus = 'failed'
        state.saveError = action.payload ?? 'Save failed.'
      })
  },
})

export const { patchPreferences, resetSaveStatus } = preferencesSlice.actions
export default preferencesSlice.reducer
