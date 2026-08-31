import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { AppSettings } from '@/types';
import {
  bindComfyUiHeartbeat,
  getComfyUiHeartbeat,
  refreshComfyUiHeartbeat,
  setComfyUiHeartbeatSettings,
  subscribeComfyUiHeartbeat,
  type ComfyUiHeartbeat,
  type ComfyUiState,
  type ComfyUiStatus,
} from '@/lib/comfyUiHeartbeat';
import { bindPendingComfyIconQueue } from '@/lib/pendingComfyIcons';

export type { ComfyUiState, ComfyUiStatus };

export { checkComfyUiStatus } from '@/lib/comfyUiHeartbeat';

export function useComfyUiOnline(settings: AppSettings) {
  const snap = useSyncExternalStore(
    subscribeComfyUiHeartbeat,
    getComfyUiHeartbeat,
    getComfyUiHeartbeat,
  );
  const settingsKey = `${settings.comfyUiEnabled}|${settings.comfyUiUrl}|${settings.ollamaUrl}`;

  useEffect(() => {
    setComfyUiHeartbeatSettings(settings);
  }, [settings]);

  useEffect(() => bindComfyUiHeartbeat(settings), [settingsKey]);
  useEffect(() => bindPendingComfyIconQueue(), []);

  const refresh = useCallback(async () => refreshComfyUiHeartbeat(), []);

  return {
    online: snap.online,
    status: snap.status,
    checking: snap.checking,
    refresh,
  } satisfies ComfyUiHeartbeat & { refresh: () => Promise<ComfyUiHeartbeat | null> };
}
