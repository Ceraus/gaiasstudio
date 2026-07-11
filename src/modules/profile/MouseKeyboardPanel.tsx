/**
 * MouseKeyboardPanel — full peripheral configuration panel.
 *
 * Structure (mirrors Pre-Redux `InputPreferencesPanel`):
 *   1. Global shortcuts gate toggle.
 *   2. Scroll Behaviour section — invert scroll + sensitivity slider.
 *   3. Mouse — Radial Context Menu section + RadialMenuBuilder when enabled.
 *   4. Visual behaviour — reduce motion + compact density.
 *   5. Keyboard Shortcuts section with live keyboard diagram + rebindable list.
 *
 * All preferences are stored in `preferencesSlice`, persisted to localStorage,
 * and brokered to `/api/v1/user/preferences` via the `savePreferences` thunk.
 */
import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Keyboard,
  Mouse,
  Pencil,
  RotateCcw,
  Scroll,
  Sliders,
  X,
} from 'lucide-react'
import { useAppDispatch, useAppSelector } from '@/store/hooks'
import { patchPreferences, savePreferences } from '@/store/preferencesSlice'
import {
  comboFromEvent,
  DEFAULT_SHORTCUTS,
  findShortcutConflicts,
  formatShortcutForDisplay,
  hasModifier,
  resolveShortcutKeys,
  type ShortcutActionId,
  type ShortcutOverrides,
} from '@/shared/utils/keyboardBindings'
import { RadialMenuBuilder } from './RadialMenuBuilder'

// ── Shared panel styling ──────────────────────────────────────────────────────
const PANEL = 'rounded-xl border border-slate-200 bg-white p-5 shadow-sm'

// ── Toggle control ────────────────────────────────────────────────────────────
function SettingsToggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
  hint?: string
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <span className="relative mt-0.5 inline-flex h-5 w-9 shrink-0">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="block h-full w-full rounded-full bg-slate-200 transition-colors peer-checked:bg-[#166eb4]" />
        <span className="pointer-events-none absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] text-slate-500">{hint}</span> : null}
      </span>
    </label>
  )
}

// ── Compact live keyboard diagram ─────────────────────────────────────────────
const KEY_ROWS = [
  ['Esc','F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12'],
  ['`','1','2','3','4','5','6','7','8','9','0','-','=','Backspace'],
  ['Tab','Q','W','E','R','T','Y','U','I','O','P','[',']','\\'],
  ['Caps','A','S','D','F','G','H','J','K','L',';',"'",'Enter'],
  ['Shift','Z','X','C','V','B','N','M',',','.','/','/Shift'],
  ['Ctrl','Alt','Space','Alt','Ctrl'],
]

function KeyboardDiagram({ highlightCombo }: { highlightCombo: string }) {
  const parts = highlightCombo
    ? highlightCombo.split('+').map((p) => p.trim().toLowerCase())
    : []

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
      {KEY_ROWS.map((row, ri) => (
        <div key={ri} className="mb-0.5 flex flex-wrap gap-0.5">
          {row.map((key) => {
            const display = key.startsWith('/') ? key.slice(1) : key
            const isWide =
              key === 'Backspace' ||
              key === 'Tab' ||
              key === 'Caps' ||
              key === 'Enter' ||
              key === 'Shift' ||
              key === '/Shift'
            const isSpace = key === 'Space'
            const normalized = display.toLowerCase()
            const active =
              parts.length > 0 &&
              (parts.includes(normalized) ||
                (normalized === 'ctrl'  && parts.includes('ctrl'))  ||
                (normalized === 'shift' && parts.includes('shift')) ||
                (normalized === 'alt'   && parts.includes('alt')))
            return (
              <kbd
                key={key}
                className={`inline-flex items-center justify-center rounded border text-[9px] font-bold uppercase transition-colors ${
                  isSpace ? 'min-w-[80px] flex-1' : isWide ? 'min-w-[42px] px-1.5' : 'w-6'
                } h-6 ${
                  active
                    ? 'border-[#166eb4] bg-[#166eb4] text-white shadow-md'
                    : 'border-slate-300 bg-white text-slate-500'
                }`}
              >
                {isSpace ? '' : display.length > 4 ? display.slice(0, 4) : display}
              </kbd>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ── System shortcuts reference ────────────────────────────────────────────────
const SYSTEM_SHORTCUTS: { keys: string; label: string }[] = [
  { keys: 'Ctrl+Z',           label: 'Undo'               },
  { keys: 'Ctrl+Y',           label: 'Redo'               },
  { keys: 'Ctrl+N',           label: 'New Client'         },
  { keys: 'Ctrl+B',           label: 'Toggle Sidebar'     },
  { keys: 'Ctrl+P',           label: 'Print'              },
  { keys: 'Ctrl+W',           label: 'Close Tab'          },
  { keys: 'Ctrl+Shift+T',     label: 'Reopen Tab'         },
  { keys: 'Ctrl+Tab',         label: 'Next Tab'           },
  { keys: 'Ctrl+Shift+Tab',   label: 'Previous Tab'       },
  { keys: 'Ctrl+= / Ctrl+-',  label: 'Zoom In / Out'      },
  { keys: 'F11',              label: 'Toggle Full Screen'  },
  { keys: 'Ctrl+,',           label: 'Open Settings'      },
  { keys: '?',                label: 'Show Shortcuts Help' },
]

// ── Keyboard Shortcut Editor ──────────────────────────────────────────────────
function KeyboardShortcutEditor() {
  const dispatch  = useAppDispatch()
  const overrides = useAppSelector((s) => s.preferences.shortcutOverrides)
  const [capturingId, setCapturingId]   = useState<ShortcutActionId | null>(null)
  const [pendingCombo, setPendingCombo] = useState<string>('')

  const conflicts   = useMemo(() => findShortcutConflicts(overrides), [overrides])
  const hasOverrides = Object.keys(overrides ?? {}).length > 0

  // Capture mode — intercept the next key combo while a shortcut row is active.
  useEffect(() => {
    if (!capturingId) return

    function onKeyDown(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
      if (e.key === 'Escape') {
        setCapturingId(null)
        setPendingCombo('')
        return
      }
      const combo = comboFromEvent(e)
      if (!combo) {
        const parts: string[] = []
        if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
        if (e.shiftKey) parts.push('Shift')
        if (e.altKey)   parts.push('Alt')
        setPendingCombo(parts.join('+'))
        return
      }
      const next: ShortcutOverrides = { ...overrides, [capturingId!]: combo }
      dispatch(patchPreferences({ shortcutOverrides: next }))
      dispatch(savePreferences({  shortcutOverrides: next }))
      setCapturingId(null)
      setPendingCombo('')
    }
    function onKeyUp() { setPendingCombo('') }

    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup',   onKeyUp,   true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup',   onKeyUp,   true)
    }
  }, [capturingId, overrides, dispatch])

  function resetOne(id: ShortcutActionId) {
    const next = { ...(overrides ?? {}) }
    delete next[id]
    dispatch(patchPreferences({ shortcutOverrides: next }))
    dispatch(savePreferences({  shortcutOverrides: next }))
  }

  function resetAll() {
    dispatch(patchPreferences({ shortcutOverrides: {} }))
    dispatch(savePreferences({  shortcutOverrides: {} }))
  }

  return (
    <div className="space-y-4">
      <KeyboardDiagram highlightCombo={pendingCombo} />

      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Keyboard size={14} className="text-[#166eb4]" aria-hidden />
          Rebindable Shortcuts
        </p>
        {hasOverrides ? (
          <button
            type="button"
            onClick={resetAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-[#166eb4] hover:underline"
          >
            <RotateCcw size={12} aria-hidden />
            Reset all
          </button>
        ) : null}
      </div>

      <ul className="space-y-1.5">
        {DEFAULT_SHORTCUTS.map(({ id, label }) => {
          const keys      = resolveShortcutKeys(id, overrides)
          const capturing = capturingId === id
          const overridden = Boolean(overrides?.[id])
          const conflict  = conflicts[id]
          const noMod     = !hasModifier(keys)

          return (
            <li
              key={id}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                conflict
                  ? 'border-amber-400/60 bg-amber-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="min-w-0">
                <span className="block truncate text-sm text-slate-700">{label}</span>
                {conflict ? (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600">
                    <AlertTriangle size={10} aria-hidden />
                    Conflict with another binding
                  </span>
                ) : noMod ? (
                  <span className="text-[10px] text-slate-400">No modifier key — use with caution</span>
                ) : null}
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                {capturing ? (
                  <span className="animate-pulse rounded border border-[#166eb4] bg-[#166eb4]/10 px-2 py-1 text-[11px] font-semibold text-[#166eb4]">
                    Press keys…
                  </span>
                ) : (
                  <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700">
                    {formatShortcutForDisplay(keys)}
                  </kbd>
                )}

                <button
                  type="button"
                  onClick={() => { setPendingCombo(''); setCapturingId(capturing ? null : id) }}
                  aria-label={capturing ? 'Cancel capture' : 'Edit shortcut'}
                  className={`flex h-7 w-7 items-center justify-center rounded-md border transition-colors ${
                    capturing
                      ? 'border-[#166eb4] bg-[#166eb4] text-white'
                      : 'border-slate-300 text-slate-500 hover:border-[#166eb4] hover:text-[#166eb4]'
                  }`}
                >
                  {capturing ? <X size={13} aria-hidden /> : <Pencil size={13} aria-hidden />}
                </button>

                {overridden ? (
                  <button
                    type="button"
                    onClick={() => resetOne(id)}
                    aria-label="Reset to default"
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-300 text-slate-500 transition-colors hover:border-[#166eb4] hover:text-[#166eb4]"
                  >
                    <RotateCcw size={13} aria-hidden />
                  </button>
                ) : null}
              </div>
            </li>
          )
        })}
      </ul>

      {/* System shortcuts reference */}
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400">
          System Shortcuts (non-rebindable)
        </p>
        <ul className="grid gap-1 sm:grid-cols-2">
          {SYSTEM_SHORTCUTS.map(({ keys, label }) => (
            <li
              key={keys}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200/70 px-2.5 py-1.5 text-xs"
            >
              <span className="truncate text-slate-500">{label}</span>
              <kbd className="shrink-0 rounded border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                {keys}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── Main exported panel ───────────────────────────────────────────────────────
export function MouseKeyboardPanel() {
  const dispatch = useAppDispatch()
  const {
    globalShortcutsEnabled,
    radialMenuEnabled,
    invertScroll,
    scrollSensitivity,
    reducedMotion,
    compactDensity,
  } = useAppSelector((s) => s.preferences)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function patch(key: string, value: boolean | number | string) {
    const payload = { [key]: value } as any
    dispatch(patchPreferences(payload))
    dispatch(savePreferences(payload))
  }

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-lg font-semibold text-slate-900">Mouse &amp; Keyboard</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tune scroll behaviour, the radial context menu, and rebind keyboard shortcuts.
          All changes are saved to the Redux store, persisted to localStorage, and brokered
          to the user profile API.
        </p>
      </header>

      {/* ── 1. Global shortcuts gate ── */}
      <section className={`${PANEL} space-y-3`}>
        <div className="flex items-center gap-2">
          <Keyboard size={15} className="text-[#166eb4]" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Global Shortcuts
          </p>
        </div>
        <SettingsToggle
          checked={globalShortcutsEnabled}
          onChange={(v) => patch('globalShortcutsEnabled', v)}
          label="Enable global keyboard shortcuts"
          hint="When off, all rebindable hotkeys are suspended. F11 (fullscreen) and Ctrl+, (settings) remain active."
        />
      </section>

      {/* ── 2. Scroll behaviour ── */}
      <section className={`${PANEL} space-y-4`}>
        <div className="flex items-center gap-2">
          <Scroll size={15} className="text-[#166eb4]" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Scroll Behaviour
          </p>
        </div>

        <SettingsToggle
          checked={invertScroll}
          onChange={(v) => patch('invertScroll', v)}
          label="Invert scroll direction"
          hint="Flips the wheel delta for the main page scroll (natural / reverse). Canvas views apply this automatically."
        />

        <div className="border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-800">Scroll sensitivity</p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Multiplies the native scroll speed.
              </p>
            </div>
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-slate-700">
              {scrollSensitivity.toFixed(1)}×
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.1}
            value={scrollSensitivity}
            onChange={(e) => patch('scrollSensitivity', parseFloat(e.target.value))}
            onMouseUp={(e)  => dispatch(savePreferences({ scrollSensitivity: parseFloat((e.target as HTMLInputElement).value) }))}
            onTouchEnd={(e) => dispatch(savePreferences({ scrollSensitivity: parseFloat((e.target as HTMLInputElement).value) }))}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-[#166eb4]"
            aria-label="Scroll sensitivity"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-400">
            <span>0.5× slow</span>
            <span>3.0× fast</span>
          </div>
        </div>
      </section>

      {/* ── 3. Mouse / Radial context menu ── */}
      <section className={`${PANEL} space-y-4`}>
        <div className="flex items-center gap-2">
          <Mouse size={15} className="text-[#166eb4]" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Mouse — Radial Context Menu
          </p>
        </div>

        <SettingsToggle
          checked={radialMenuEnabled}
          onChange={(v) => patch('radialMenuEnabled', v)}
          label="Enable radial right-click menu"
          hint="Hold right-click to open a circular action menu on canvas and blueprint views."
        />

        {radialMenuEnabled ? (
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <p className="text-xs font-medium text-slate-600">
              Customise your ring
            </p>
            <p className="text-[11px] text-slate-500">
              Drag chips from the palette onto slots, or tap a chip then tap a slot.
              Drag any node in the preview to reposition it freeform.
            </p>
            <RadialMenuBuilder />
          </div>
        ) : null}
      </section>

      {/* ── 4. Visual behaviour ── */}
      <section className={`${PANEL} space-y-4`}>
        <div className="flex items-center gap-2">
          <Sliders size={15} className="text-[#166eb4]" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Visual Behaviour
          </p>
        </div>

        <SettingsToggle
          checked={reducedMotion}
          onChange={(v) => patch('reducedMotion', v)}
          label="Reduce motion"
          hint="Minimises animations and transitions throughout the app."
        />
        <SettingsToggle
          checked={compactDensity}
          onChange={(v) => patch('compactDensity', v)}
          label="Compact density"
          hint="Tightens spacing in lists, tables, and nav items."
        />
      </section>

      {/* ── 5. Keyboard shortcuts ── */}
      <section className={PANEL}>
        <div className="mb-4 flex items-center gap-2">
          <Keyboard size={15} className="text-[#166eb4]" aria-hidden />
          <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
            Keyboard Shortcuts
          </p>
        </div>
        {globalShortcutsEnabled ? (
          <>
            <p className="mb-4 text-xs text-slate-500">
              Click the pencil icon on any row, then press your new key combination.
              Overrides are stored globally in the Redux preferences slice and traced
              by all shortcut-aware components across the app.
            </p>
            <KeyboardShortcutEditor />
          </>
        ) : (
          <div className="flex items-start gap-2 rounded-lg border border-amber-300/60 bg-amber-50/60 px-4 py-3">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
            <p className="text-sm text-amber-700">
              Global shortcuts are currently <strong>disabled</strong>. Enable them above to
              view and rebind shortcuts.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}
