import { useEffect } from 'react'
import { store } from '@/store'
import { DEFAULT_SHORTCUTS, matchShortcut, resolveShortcutKeys } from '@/shared/utils/keyboardBindings'
import type { ShortcutActionId } from '@/shared/utils/keyboardBindings'

/**
 * Reads the current `shortcutOverrides` directly from the Redux store state
 * (not via `useSelector`) so the event listener closure never goes stale.
 */
function shortcutMatches(e: KeyboardEvent, id: ShortcutActionId): boolean {
  const overrides = store.getState().preferences.shortcutOverrides
  return matchShortcut(e, resolveShortcutKeys(id, overrides))
}

/**
 * Mounts a global `keydown` listener that traces every keydown event against
 * the hotkey payload stored in the Redux `preferences` slice. The resolved
 * combo for each action is read live from `store.getState()` on every event —
 * guaranteeing the listener always reflects the latest user overrides without
 * requiring re-registration.
 *
 * Mount this hook once inside `AppShell` (or equivalent root layout) so the
 * listener is active for the entire authenticated session lifetime.
 */
export function useGlobalHotkeys(handlers: {
  onOpenSettings?: () => void
  onToggleSidebar?: () => void
  onGlobalSearch?: () => void
  onCommandPalette?: () => void
  onSave?: () => void
  onGenerate?: () => void
}) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      const inField =
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        target?.isContentEditable

      // F11 fullscreen — always active.
      if (e.key === 'F11') {
        e.preventDefault()
        try {
          if (document.fullscreenElement) void document.exitFullscreen()
          else void document.documentElement.requestFullscreen()
        } catch {
          // Fullscreen not supported or blocked.
        }
        return
      }

      // Ctrl+, → open settings.
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault()
        handlers.onOpenSettings?.()
        return
      }

      // Global Search
      if (shortcutMatches(e, 'globalSearch')) {
        e.preventDefault()
        handlers.onGlobalSearch?.()
        return
      }

      // Command Palette
      if (shortcutMatches(e, 'commandPalette')) {
        e.preventDefault()
        handlers.onCommandPalette?.()
        return
      }

      // Sidebar toggle — only when not typing.
      if (!inField && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault()
        handlers.onToggleSidebar?.()
        return
      }

      // Save
      if (shortcutMatches(e, 'save') && !e.shiftKey) {
        e.preventDefault()
        handlers.onSave?.()
        return
      }

      // Generate / Confirm
      if (shortcutMatches(e, 'generate')) {
        e.preventDefault()
        handlers.onGenerate?.()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handlers])
}

/**
 * Checks whether any of the DEFAULT_SHORTCUTS are active via the Redux store.
 * Intended for use in Blueprint-mode canvas components that need to trace
 * whether the user is holding Alt (free-draw gate) or any custom binding.
 */
export function isShortcutActive(id: ShortcutActionId, e: KeyboardEvent): boolean {
  return shortcutMatches(e, id)
}

/** The full list of rebindable shortcut IDs, for reference in UI labels. */
export { DEFAULT_SHORTCUTS }
