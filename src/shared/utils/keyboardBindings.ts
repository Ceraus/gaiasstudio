// ── Shortcut action IDs ───────────────────────────────────────────────────────
export type ShortcutActionId =
  | 'commandPalette'
  | 'tabSwitcher'
  | 'findClient'
  | 'findWorkspace'
  | 'findReplace'
  | 'focusMode'
  | 'save'
  | 'generate'
  | 'calculator'
  | 'copySummary'
  | 'globalSearch'
  | 'teamChat'
  | 'clipboardHistory'

export interface ShortcutBinding {
  id: ShortcutActionId
  keys: string
  /** Plain English label — no i18n dependency. */
  label: string
}

export type ShortcutOverrides = Partial<Record<ShortcutActionId, string>>

// ── Default bindings ──────────────────────────────────────────────────────────
export const DEFAULT_SHORTCUTS: ShortcutBinding[] = [
  { id: 'commandPalette',   keys: 'Ctrl+K',         label: 'Command Palette' },
  { id: 'globalSearch',     keys: 'Ctrl+Shift+K',   label: 'Global Search' },
  { id: 'tabSwitcher',      keys: 'Ctrl+Shift+P',   label: 'Tab Switcher' },
  { id: 'findClient',       keys: 'Ctrl+F',         label: 'Find / Filter' },
  { id: 'findWorkspace',    keys: 'Ctrl+Shift+F',   label: 'Find in Workspace' },
  { id: 'findReplace',      keys: 'Ctrl+H',         label: 'Find & Replace' },
  { id: 'focusMode',        keys: 'Ctrl+Shift+D',   label: 'Focus Mode' },
  { id: 'save',             keys: 'Ctrl+S',         label: 'Save' },
  { id: 'generate',         keys: 'Ctrl+Enter',     label: 'Generate / Confirm' },
  { id: 'calculator',       keys: 'Ctrl+Shift+C',   label: 'Calculator' },
  { id: 'copySummary',      keys: 'Ctrl+Shift+Y',   label: 'Copy Summary' },
  { id: 'teamChat',         keys: 'Ctrl+Shift+M',   label: 'Team Chat' },
  { id: 'clipboardHistory', keys: 'Ctrl+Shift+V',   label: 'Clipboard History' },
]

// ── Resolution + matching ─────────────────────────────────────────────────────

export function resolveShortcutKeys(
  id: ShortcutActionId,
  overrides: ShortcutOverrides = {},
): string {
  return overrides[id] ?? DEFAULT_SHORTCUTS.find((s) => s.id === id)?.keys ?? ''
}

export function matchShortcut(e: KeyboardEvent, keys: string): boolean {
  if (!keys) return false
  const parts = keys.split('+').map((p) => p.trim())
  const needCtrl = parts.some((p) => p === 'Ctrl' || p === 'Meta')
  const needShift = parts.includes('Shift')
  const needAlt = parts.includes('Alt')
  const keyPart = parts.find((p) => !['Ctrl', 'Meta', 'Shift', 'Alt'].includes(p))
  if (!keyPart) return false

  const mod = e.ctrlKey || e.metaKey
  if (needCtrl !== mod) return false
  if (needShift !== e.shiftKey) return false
  if (needAlt !== e.altKey) return false

  if (keyPart === 'Enter') return e.key === 'Enter'
  if (keyPart === 'Tab') return e.key === 'Tab'
  return e.key.toLowerCase() === keyPart.toLowerCase()
}

/**
 * Builds a normalized "Ctrl+Shift+K" string from a live keydown event.
 * Returns null for lone modifier presses so capture mode keeps waiting.
 */
export function comboFromEvent(e: KeyboardEvent): string | null {
  const key = e.key
  if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') return null
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')
  let k = key === ' ' || key === 'Spacebar' ? 'Space' : key.length === 1 ? key.toUpperCase() : key
  parts.push(k)
  return parts.join('+')
}

/** True when a combo string includes at least one modifier. */
export function hasModifier(keys: string): boolean {
  return /(?:^|\+)(Ctrl|Shift|Alt|Meta)(?:\+|$)/.test(keys)
}

/** Returns a conflict map: id → the other id it collides with. */
export function findShortcutConflicts(
  overrides: ShortcutOverrides = {},
): Record<string, string> {
  const byKeys = new Map<string, ShortcutActionId>()
  const conflicts: Record<string, string> = {}
  for (const { id } of DEFAULT_SHORTCUTS) {
    const keys = resolveShortcutKeys(id, overrides)
    const existing = byKeys.get(keys)
    if (existing) {
      conflicts[id] = existing
      conflicts[existing] = id
    } else {
      byKeys.set(keys, id)
    }
  }
  return conflicts
}

export function isMacPlatform(): boolean {
  if (typeof navigator === 'undefined') return false
  return navigator.platform?.includes('Mac') || navigator.userAgent?.includes('Mac')
}

export function formatShortcutForDisplay(keys: string): string {
  if (isMacPlatform()) {
    return keys.replace(/Ctrl\+/g, '⌘').replace(/Shift\+/g, '⇧').replace(/Alt\+/g, '⌥')
  }
  return keys
}

export function getModKey(): string {
  return isMacPlatform() ? '⌘' : 'Ctrl'
}
