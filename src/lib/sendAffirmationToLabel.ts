import { useAppStore } from '@/store/useAppStore';

/**
 * Stash affirmation text and route to the editor (or Choose Shape).
 * Never injects a product name and never writes Benefit copy.
 */
export function sendAffirmationToLabel(text: string): 'editor' | 'template' {
  const trimmed = text.trim();
  const store = useAppStore.getState();
  store.setPendingAffirmationText(trimmed || null);

  if (store.template) {
    store.goto('editor-v2');
    return 'editor';
  }

  // A saved design already in progress — editor redirects to Choose Shape
  // if the canvas is not ready yet; the stash applies once a template exists.
  if (store.activeDraftId || store.designJson) {
    store.goto('editor-v2');
    return 'editor';
  }

  store.goto('template');
  return 'template';
}

export function consumePendingAffirmationText(): string | null {
  const store = useAppStore.getState();
  const text = store.pendingAffirmationText?.trim() || null;
  if (text) store.setPendingAffirmationText(null);
  return text;
}
