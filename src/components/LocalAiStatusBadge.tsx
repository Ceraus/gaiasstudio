import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Loader2 } from 'lucide-react';
import { checkLocalAiStatus, type LocalAiState } from '@/lib/localAi';
import type { AppSettings } from '@/types';

const POLL_MS = 45_000;

function dotClass(state: LocalAiState): string {
  switch (state) {
    case 'connected':
      return 'bg-emerald-500';
    case 'loading':
      return 'bg-amber-400 animate-pulse';
    default:
      return 'bg-rose-400';
  }
}

export default function LocalAiStatusBadge({ settings }: { settings: AppSettings }) {
  const { t } = useTranslation();
  const [state, setState] = useState<LocalAiState>('loading');
  const [message, setMessage] = useState<string | undefined>();
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!settings.localAiEnabled) return;

    let cancelled = false;

    const poll = async () => {
      setChecking(true);
      try {
        const result = await checkLocalAiStatus(settings);
        if (!cancelled) {
          setState(result.state);
          setMessage(result.message);
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    };

    void poll();
    const id = setInterval(() => void poll(), POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [settings.localAiEnabled]);

  if (!settings.localAiEnabled) return null;

  const label =
    state === 'connected'
      ? t('common.aiReady', 'AI Suggestions')
      : state === 'loading' || checking
        ? t('common.aiChecking', 'Checking AI…')
        : t('common.aiOffline', 'AI suggestions off');

  const title = message ?? label;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-slate-600 ring-1 ring-slate-200/80"
      title={title}
    >
      {checking && state !== 'connected' ? (
        <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
      ) : (
        <Bot className="h-3 w-3 text-slate-400" />
      )}
      <span className={`h-1.5 w-1.5 rounded-full ${dotClass(state)}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}
