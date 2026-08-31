import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Leaf } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import Shell from '@/components/Shell';
import LockScreen from '@/components/LockScreen';
import { db } from '@/db/db';
import { shouldShowLockGate } from '@/lib/appLock';
import { consumePkceVerifier, exchangeAuthCode } from '@/lib/etsyApi';
import { registerServiceWorker } from '@/lib/pwa';

export default function App() {
  const settingsLoaded = useAppStore((s) => s.settingsLoaded);
  const settingsLoadError = useAppStore((s) => s.settingsLoadError);
  const settings = useAppStore((s) => s.settings);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const goto = useAppStore((s) => s.goto);
  const { t } = useTranslation();
  const [gateReady, setGateReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [oauthMessage, setOauthMessage] = useState<string | null>(null);

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    let cancelled = false;
    void db.settings
      .get('app')
      .then((s) => {
        if (cancelled) return;
        // No PIN is a valid state — skip the lock and enter the studio.
        setUnlocked(!shouldShowLockGate(s));
        setGateReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        setUnlocked(true);
        setGateReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    void loadSettings();
  }, [loadSettings, unlocked]);

  // Complete Etsy OAuth when Etsy redirects back with ?code=
  useEffect(() => {
    if (!settingsLoaded) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    if (!code) return;

    const verifier = consumePkceVerifier(state ?? undefined);
    const shop = settings.etsyShop;
    if (!verifier || !shop?.apiKey) {
      setOauthMessage(t('settings.etsyOAuthFailed', 'Etsy connection failed — try again from Settings.'));
      return;
    }

    void (async () => {
      try {
        const updated = await exchangeAuthCode(shop, code, verifier);
        await updateSettings({ etsyShop: updated });
        setOauthMessage(t('settings.etsyOAuthSuccess', 'Etsy connected successfully!'));
        goto('settings');
      } catch (err) {
        setOauthMessage(
          t('settings.etsyOAuthFailed', 'Etsy connection failed — try again from Settings.')
          + (err instanceof Error ? ` (${err.message})` : ''),
        );
      } finally {
        const clean = `${window.location.pathname}${window.location.hash || '#/settings'}`;
        window.history.replaceState({}, '', clean);
      }
    })();
  }, [settingsLoaded, settings.etsyShop, updateSettings, goto, t]);

  if (!gateReady || !unlocked) {
    if (gateReady && !unlocked) {
      return <LockScreen onUnlock={() => setUnlocked(true)} />;
    }
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gaia-50 text-gaia-700">
        <Leaf className="h-10 w-10 animate-pulse" />
        <p className="text-sm">{t('common.loading')}</p>
      </div>
    );
  }

  if (!settingsLoaded) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gaia-50 text-gaia-700">
        <Leaf className="h-10 w-10 animate-pulse" />
        <p className="text-sm">{t('common.loading')}</p>
        {oauthMessage && <p className="max-w-sm text-center text-xs text-slate-500">{oauthMessage}</p>}
      </div>
    );
  }

  if (settingsLoadError) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 bg-gaia-50 px-6 text-center text-gaia-800">
        <p className="text-sm font-medium">{t('settings.loadFailed', 'Could not load your settings.')}</p>
        <p className="max-w-md text-xs text-slate-500">{settingsLoadError}</p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => window.location.reload()}
        >
          {t('common.retry', 'Retry')}
        </button>
      </div>
    );
  }

  return (
    <>
      {oauthMessage && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {oauthMessage}
        </div>
      )}
      <Shell />
    </>
  );
}
