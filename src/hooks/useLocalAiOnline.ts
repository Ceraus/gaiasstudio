import { useCallback, useEffect, useState } from 'react';
import { checkLocalAiStatus, type LocalAiStatus } from '@/lib/localAi';
import type { AppSettings } from '@/types';

const POLL_MS = 45_000;

function aiSettingsKey(settings: AppSettings): string {
  return [
    settings.localAiEnabled,
    settings.ollamaUrl,
    settings.ollamaModel,
    settings.ollamaModelText,
    settings.ollamaModelJson,
  ].join('|');
}

/** Shared Local AI reachability — same signal for the header badge and AI buttons. */
export function useLocalAiOnline(settings: AppSettings) {
  const [online, setOnline] = useState(false);
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const settingsKey = aiSettingsKey(settings);

  const refresh = useCallback(async () => {
    if (!settings.localAiEnabled) {
      setOnline(false);
      setStatus(null);
      return null;
    }
    setChecking(true);
    try {
      const result = await checkLocalAiStatus(settings);
      setStatus(result);
      setOnline(result.state === 'connected');
      return result;
    } finally {
      setChecking(false);
    }
    // settingsKey tracks the Local AI fields that affect reachability.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey]);

  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(id);
  }, [refresh]);

  return { online, ollamaOnline: online && status?.backend === 'ollama', status, checking, refresh };
}
