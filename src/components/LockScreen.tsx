import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import logo from '@/assets/logo.png';

/**
 * Basic app lock — a simple local password gate, not real security. It just
 * keeps the studio from opening to a casual glance; the password lives only
 * in this file and the "unlocked" flag is per-session (re-prompts on every
 * fresh launch of the app).
 */
const APP_PASSWORD = 'Purplepenguin11';
const UNLOCK_KEY = 'gaia:unlocked';

export function isUnlocked(): boolean {
  try {
    // Lets the headless smoke test (scripts/smoke.mjs) drive the real UI
    // without needing to know the password.
    if (new URLSearchParams(window.location.search).get('e2e') === '1') return true;
    return sessionStorage.getItem(UNLOCK_KEY) === '1';
  } catch {
    return false;
  }
}

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);

  const submit = () => {
    if (value === APP_PASSWORD) {
      try {
        sessionStorage.setItem(UNLOCK_KEY, '1');
      } catch {
        // ignore — sessionStorage unavailable, unlock still proceeds for this render
      }
      onUnlock();
    } else {
      setWrong(true);
      setValue('');
    }
  };

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gaia-50 px-6 text-center">
      <img src={logo} alt="Gaia's Essences" className="h-32 w-auto select-none object-contain" draggable={false} />
      <div>
        <h1 className="text-xl font-semibold text-gaia-900">{t('lock.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('lock.subtitle')}</p>
      </div>
      <div className="w-full max-w-xs">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            autoFocus
            className="input w-full pl-9 text-center"
            placeholder={t('lock.placeholder')}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setWrong(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
          />
        </div>
        {wrong && <p className="mt-2 text-xs font-medium text-rose-600">{t('lock.wrong')}</p>}
        <button className="btn btn-primary mt-4 w-full justify-center" onClick={submit} disabled={!value}>
          {t('lock.unlock')}
        </button>
      </div>
    </div>
  );
}
