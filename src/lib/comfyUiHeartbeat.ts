import { getAiActivity } from '@/lib/aiActivity';
import { pingComfyUi } from '@/lib/comfyUiApi';
import type { AppSettings } from '@/types';

export type ComfyUiState = 'connected' | 'unreachable' | 'loading';

export interface ComfyUiStatus {
  state: ComfyUiState;
  message?: string;
}

export interface ComfyUiHeartbeat {
  online: boolean;
  checking: boolean;
  status: ComfyUiStatus | null;
}

const CONNECTED_MS = 15_000;
const RECOVER_START_MS = 6_000;
const RECOVER_MAX_MS = 30_000;
const FAIL_STREAK_BEFORE_RED = 3;

type Listener = () => void;

let snapshot: ComfyUiHeartbeat = { online: false, checking: false, status: null };
const listeners = new Set<Listener>();

let settingsRef: AppSettings | null = null;
let subscribers = 0;
let timer: number | null = null;
let inFlight = false;
let failStreak = 0;
let recoverDelay = RECOVER_START_MS;

function emit(next: ComfyUiHeartbeat): void {
  snapshot = next;
  listeners.forEach((fn) => fn());
}

export function getComfyUiHeartbeat(): ComfyUiHeartbeat {
  return snapshot;
}

export function subscribeComfyUiHeartbeat(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

export function setComfyUiHeartbeatSettings(settings: AppSettings): void {
  settingsRef = settings;
}

export async function checkComfyUiStatus(settings: AppSettings): Promise<ComfyUiStatus> {
  const ping = await pingComfyUi(settings);
  if (ping.ok) {
    return { state: 'connected', message: ping.baseUrl ? `Connected · ${ping.baseUrl}` : 'ComfyUI is connected' };
  }
  return { state: 'unreachable', message: ping.message };
}

async function tick(force = false): Promise<ComfyUiHeartbeat | null> {
  const settings = settingsRef;
  if (!settings?.comfyUiEnabled) {
    failStreak = 0;
    recoverDelay = RECOVER_START_MS;
    emit({ online: false, checking: false, status: null });
    return snapshot;
  }
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden' && !force) {
    return null;
  }
  if (inFlight) return snapshot;

  inFlight = true;
  const showSpinner = force || snapshot.status === null;
  if (showSpinner) emit({ ...snapshot, checking: true });
  try {
    const result = await Promise.race([
      checkComfyUiStatus(settings),
      new Promise<ComfyUiStatus>((resolve) => {
        window.setTimeout(
          () => resolve({
            state: 'unreachable',
            message: 'ComfyUI did not respond. Start it on the AI PC (port 8188) and check Tailscale.',
          }),
          5_000,
        );
      }),
    ]);
    if (result.state === 'connected') {
      failStreak = 0;
      recoverDelay = RECOVER_START_MS;
      emit({ online: true, checking: false, status: result });
      return snapshot;
    }

    if (getAiActivity().comfy && snapshot.online) {
      emit({
        online: true,
        checking: false,
        status: { state: 'connected', message: 'ComfyUI is working…' },
      });
      return snapshot;
    }

    failStreak += 1;
    recoverDelay = Math.min(RECOVER_MAX_MS, Math.max(RECOVER_START_MS, recoverDelay * 1.6));
    if (failStreak < FAIL_STREAK_BEFORE_RED && snapshot.online) {
      emit({
        online: true,
        checking: false,
        status: { state: 'connected', message: 'Heartbeat missed — retrying…' },
      });
      return snapshot;
    }

    emit({ online: false, checking: false, status: result });
    return snapshot;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not reach ComfyUI.';
    failStreak += 1;
    recoverDelay = Math.min(RECOVER_MAX_MS, Math.max(RECOVER_START_MS, recoverDelay * 1.6));
    emit({
      online: failStreak < FAIL_STREAK_BEFORE_RED && snapshot.online,
      checking: false,
      status: { state: 'unreachable', message },
    });
    return snapshot;
  } finally {
    inFlight = false;
  }
}

function intervalMs(): number {
  return snapshot.online ? CONNECTED_MS : recoverDelay;
}

function armTimer(): void {
  if (timer != null) window.clearTimeout(timer);
  if (subscribers <= 0) return;
  timer = window.setTimeout(() => {
    void tick().finally(() => armTimer());
  }, intervalMs());
}

function onVisible(): void {
  if (document.visibilityState === 'visible') void tick(true);
}

function onOnline(): void {
  recoverDelay = RECOVER_START_MS;
  void tick(true);
}

export function bindComfyUiHeartbeat(settings: AppSettings): () => void {
  settingsRef = settings;
  subscribers += 1;
  if (subscribers === 1) {
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    void tick(true).finally(() => armTimer());
  }
  return () => {
    subscribers = Math.max(0, subscribers - 1);
    if (subscribers === 0) {
      if (timer != null) window.clearTimeout(timer);
      timer = null;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
    }
  };
}

export async function refreshComfyUiHeartbeat(): Promise<ComfyUiHeartbeat | null> {
  recoverDelay = RECOVER_START_MS;
  return tick(true);
}
