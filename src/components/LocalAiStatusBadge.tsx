import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Bot, Image as ImageIcon, Loader2 } from 'lucide-react';
import type { LocalAiState } from '@/lib/localAi';
import { useAiActivity } from '@/lib/aiActivity';
import { useLocalAiOnline } from '@/hooks/useLocalAiOnline';
import { useComfyUiOnline, type ComfyUiState } from '@/hooks/useComfyUiOnline';
import type { AppSettings } from '@/types';

/** 75% of the prior 1.15 Saved Designs-matched scale. */
const ICON_SIZE = 'h-[0.8625rem] w-[0.8625rem] shrink-0';
const LOADER_SIZE = 'h-[0.8625rem] w-[0.8625rem] shrink-0';
const DOT_SIZE = 'h-[0.43125rem] w-[0.43125rem] shrink-0';
const CHIP_TEXT = 'text-[0.754rem] leading-[1.078rem]';

function dotClass(state: LocalAiState | ComfyUiState, busy: boolean): string {
  const color =
    state === 'connected' ? 'bg-emerald-500' : state === 'loading' ? 'bg-amber-400' : 'bg-rose-400';
  if (busy) return `${color} animate-ai-busy`;
  if (state === 'loading') return `${color} animate-pulse`;
  return color;
}

export default function LocalAiStatusBadge({ settings }: { settings: AppSettings }) {
  const { t } = useTranslation();

  const ollama = useLocalAiOnline(settings);
  const comfy = useComfyUiOnline(settings);
  const busy = useAiActivity();

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  if (!settings.localAiEnabled && !settings.comfyUiEnabled) return null;

  const ollamaState: LocalAiState =
    ollama.checking && !ollama.online ? 'loading' : ollama.online ? 'connected' : 'unreachable';

  const comfyState: ComfyUiState = comfy.online
    ? 'connected'
    : comfy.status
      ? 'unreachable'
      : 'loading';

  const pingOllama = async () => {
    const result = await ollama.refresh();
    const online = result?.state === 'connected';
    showToast(
      online
        ? t('common.ollamaOnline', 'Ollama is online')
        : t('common.ollamaOffline', 'Ollama is offline'),
    );
  };

  const pingComfy = async () => {
    const result = await comfy.refresh();
    const online = result?.online === true;
    showToast(
      online
        ? t('common.comfyUiOnline', 'ComfyUI is online')
        : t('common.comfyUiOffline', 'ComfyUI is offline'),
    );
  };

  return (
    <>
      <div className="flex shrink-0 flex-nowrap items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 ring-1 ring-slate-200/80 transition hover:bg-white hover:ring-slate-300">
        {settings.localAiEnabled && (
          <button
            type="button"
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1 ${CHIP_TEXT} font-medium text-slate-600 hover:bg-slate-100`}
            title={
              busy.ollama
                ? t('common.ollamaBusy', 'Ollama is working…')
                : (ollama.status?.message ?? t('common.ollamaTitle', 'Ollama Language Model'))
            }
            onClick={() => void pingOllama()}
          >
            {ollama.checking && ollamaState !== 'connected' ? (
              <Loader2 className={`${LOADER_SIZE} animate-spin text-slate-400`} />
            ) : (
              <Bot className={`${ICON_SIZE} text-slate-400`} />
            )}
            <span className={`${DOT_SIZE} rounded-full ${dotClass(ollamaState, busy.ollama)}`} aria-hidden />
            <span>Ollama</span>
          </button>
        )}

        {settings.localAiEnabled && settings.comfyUiEnabled && (
          <span className="h-3.5 w-px shrink-0 bg-slate-200" aria-hidden />
        )}

        {settings.comfyUiEnabled && (
          <button
            type="button"
            className={`inline-flex shrink-0 items-center gap-1 rounded-full px-1 ${CHIP_TEXT} font-medium text-slate-600 hover:bg-slate-100`}
            title={
              busy.comfy
                ? t('common.comfyUiBusy', 'ComfyUI is working…')
                : comfy.status?.message?.startsWith('Heartbeat missed')
                  ? t('common.comfyUiRetrying', 'Heartbeat missed — retrying…')
                  : (comfy.status?.message ?? t('common.comfyUiTitle', 'ComfyUI Image Generator'))
            }
            onClick={() => void pingComfy()}
          >
            {comfy.checking && !comfy.status ? (
              <Loader2 className={`${LOADER_SIZE} animate-spin text-slate-400`} />
            ) : (
              <ImageIcon className={`${ICON_SIZE} text-slate-400`} />
            )}
            <span className={`${DOT_SIZE} rounded-full ${dotClass(comfyState, busy.comfy)}`} aria-hidden />
            <span>ComfyUI</span>
          </button>
        )}
      </div>

      {toast &&
        createPortal(
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 truncate rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg max-sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
          >
            {toast}
          </div>,
          document.body,
        )}
    </>
  );
}
