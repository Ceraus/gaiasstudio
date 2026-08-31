import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import logo from '@/assets/logo.png';
import { db } from '@/db/db';
import {
  clearFailedAttempts,
  getLockoutRemainingMs,
  hasPinConfigured,
  isE2EBypass,
  isLockoutActive,
  isSessionUnlocked,
  recordFailedAttempt,
  setSessionUnlocked,
  verifyPin,
  type LockPinRecord,
} from '@/lib/appLock';
import { activateVaultFromPin } from '@/lib/secretVault';

export function isUnlocked(): boolean {
  return isSessionUnlocked();
}

interface LockScreenProps {
  onUnlock: () => void;
}

export default function LockScreen({ onUnlock }: LockScreenProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pinRecord, setPinRecord] = useState<LockPinRecord | null>(null);
  const [lockoutMs, setLockoutMs] = useState(0);

  useEffect(() => {
    void db.settings.get('app').then((s) => {
      const record: LockPinRecord = {
        lockPinHash: s?.lockPinHash,
        lockPinSalt: s?.lockPinSalt,
        lockPinIterations: s?.lockPinIterations,
      };
      if (!hasPinConfigured(record)) {
        setSessionUnlocked();
        onUnlock();
        return;
      }
      setPinRecord(record);
    });
  }, [onUnlock]);

  useEffect(() => {
    const tick = () => setLockoutMs(getLockoutRemainingMs());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [wrong]);

  const finishUnlock = async (pin: string, record: LockPinRecord) => {
    const ok = await activateVaultFromPin(pin, record);
    if (!ok && hasPinConfigured(record)) {
      setWrong(true);
      return;
    }
    clearFailedAttempts();
    setSessionUnlocked();
    onUnlock();
  };

  const submitUnlock = async () => {
    if (!pinRecord || !hasPinConfigured(pinRecord)) return;
    if (isLockoutActive()) {
      setWrong(true);
      return;
    }
    setBusy(true);
    try {
      const ok = await verifyPin(value, pinRecord);
      if (!ok) {
        recordFailedAttempt();
        setWrong(true);
        setValue('');
        return;
      }
      await finishUnlock(value, pinRecord);
    } finally {
      setBusy(false);
    }
  };

  if (pinRecord === null) {
    return (
      <div className="flex h-full items-center justify-center bg-gaia-50">
        <p className="text-sm text-slate-500">{t('common.loading')}</p>
      </div>
    );
  }

  const lockedOut = lockoutMs > 0;
  const lockoutMinutes = Math.ceil(lockoutMs / 60_000);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gaia-50 px-6 text-center">
      <img src={logo} alt="Gaia's Essences" className="h-32 w-auto select-none object-contain" draggable={false} />
      <div>
        <h1 className="text-xl font-semibold text-gaia-900">{t('lock.title')}</h1>
        <p className="mt-1 text-sm text-slate-500">{t('lock.subtitle')}</p>
        {isE2EBypass() && (
          <p className="mt-1 text-[10px] text-amber-600">{t('lock.devBypass')}</p>
        )}
      </div>
      <div className="w-full max-w-xs">
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="password"
            autoFocus
            autoComplete="current-password"
            className="input w-full pl-9 text-center"
            placeholder={t('lock.placeholder')}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setWrong(false);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void submitUnlock();
            }}
            disabled={busy || lockedOut}
          />
        </div>
        {lockedOut && (
          <p className="mt-2 text-xs font-medium text-amber-700">
            {t('lock.lockout', { minutes: lockoutMinutes })}
          </p>
        )}
        {wrong && !lockedOut && (
          <p className="mt-2 text-xs font-medium text-rose-600">{t('lock.wrong')}</p>
        )}
        <button
          className="btn btn-primary mt-4 w-full justify-center"
          onClick={() => void submitUnlock()}
          disabled={busy || lockedOut || !value}
        >
          {t('lock.unlock')}
        </button>
      </div>
    </div>
  );
}
