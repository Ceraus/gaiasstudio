// ---------------------------------------------------------------------------
// TipBanner — a gentle, dismissible one-liner shown at the top of a screen.
//
// Two ways to make it go away:
//   ✕ ("snooze")  — hides it for this session only; it returns next launch.
//   "Got it"      — permanently dismissed (stored in Settings), and can be
//                   brought back from the Help hub's "Reset tips".
// ---------------------------------------------------------------------------
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Lightbulb, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

const snoozeKey = (id: string) => `gaia.tip.snooze.${id}`;

export default function TipBanner({
  id,
  textKey,
  textDefault,
}: {
  /** Stable tip id — also the i18n suffix under `tips.` when textKey is omitted. */
  id: string;
  textKey?: string;
  textDefault: string;
}) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [snoozed, setSnoozed] = useState(() => {
    try {
      return sessionStorage.getItem(snoozeKey(id)) === '1';
    } catch {
      return false;
    }
  });

  if (snoozed || settings.dismissedTips?.includes(id)) return null;

  const snooze = () => {
    try {
      sessionStorage.setItem(snoozeKey(id), '1');
    } catch { /* private mode */ }
    setSnoozed(true);
  };

  const dismissForever = () => {
    const done = new Set(settings.dismissedTips ?? []);
    done.add(id);
    void updateSettings({ dismissedTips: [...done] });
  };

  return (
    <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-gaia-50 px-4 py-2.5 ring-1 ring-gaia-200">
      <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-gaia-600" />
      <p className="flex-1 text-xs leading-snug text-gaia-800">
        {t(textKey ?? `tips.${id}`, textDefault)}
      </p>
      <button
        className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gaia-700 ring-1 ring-gaia-200 transition hover:bg-gaia-100"
        onClick={dismissForever}
      >
        {t('tips.gotIt', 'Got it')}
      </button>
      <button
        className="shrink-0 p-0.5 text-gaia-400 hover:text-gaia-600"
        onClick={snooze}
        title={t('tips.snoozeTitle', 'Hide for now — comes back next time')}
        aria-label={t('tips.snoozeTitle', 'Hide for now — comes back next time')}
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
