import { useEffect, useState } from 'react';
import type { AppSettings } from '@/types';

const MOBILE_MQ = '(max-width: 639px)';

function isStreamlinedSetting(settings: Pick<AppSettings, 'mobileLayout'>): boolean {
  const mode = settings.mobileLayout;
  // Legacy installs used `auto` — treat as streamlined.
  if (mode === 'streamlined' || (mode as string) === 'auto') return true;
  return false;
}

/** True when Settings → Streamlined and viewport is phone-sized. */
export function useStreamlinedMobile(settings: Pick<AppSettings, 'mobileLayout'>): boolean {
  const [viewportMobile, setViewportMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setViewportMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  if (!isStreamlinedSetting(settings)) return false;
  return viewportMobile;
}

/** @deprecated Use useStreamlinedMobile */
export const useMobileLayout = useStreamlinedMobile;

/** Phone viewport regardless of layout mode — for classic responsive tweaks. */
export function usePhoneViewport(): boolean {
  const [viewportMobile, setViewportMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  );

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const onChange = () => setViewportMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return viewportMobile;
}
