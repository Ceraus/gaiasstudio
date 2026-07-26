// ---------------------------------------------------------------------------
// HelpHub — the dedicated "?" hub for every walkthrough and tip.
//
// From here the user can (re)play any guided tour (completed ones get a
// check), bring back the first-run welcome card, and re-enable every tip
// banner that was dismissed with "Got it". Available in both languages like
// the rest of the app.
// ---------------------------------------------------------------------------
import { useTranslation } from 'react-i18next';
import { CheckCircle2, GraduationCap, Lightbulb, Play, RotateCcw } from 'lucide-react';
import Modal from '@/components/common/Modal';
import { TOURS } from '@/components/tour/tours';
import { useTourStore } from '@/store/useTourStore';
import { useAppStore } from '@/store/useAppStore';

export default function HelpHub({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const startTour = useTourStore((s) => s.start);

  const completed = new Set(settings.completedTours ?? []);
  const dismissedTipCount = settings.dismissedTips?.length ?? 0;

  const play = (tourId: string) => {
    onClose();
    startTour(tourId);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={560}
      title={
        <span className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-gaia-600" />
          {t('helpHub.title', 'Help & walkthroughs')}
        </span>
      }
    >
      <p className="text-sm text-slate-600">
        {t('helpHub.subtitle', 'Short guided tours of every part of the app. Replay them as often as you like — nothing here changes your data.')}
      </p>

      {/* ── Tours ─────────────────────────────────────────────────────────── */}
      <div className="mt-4 space-y-2">
        {TOURS.map((tour) => {
          const done = completed.has(tour.id);
          return (
            <div
              key={tour.id}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 ring-1 transition ${
                done ? 'bg-emerald-50/50 ring-emerald-200' : 'bg-white ring-slate-200'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
                  {t(`tour.${tour.nameKey}`, tour.nameDefault)}
                  {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-slate-500">
                  {t(`tour.${tour.descriptionKey}`, tour.descriptionDefault)}
                </p>
              </div>
              <span className="shrink-0 text-[11px] text-slate-400">
                {t('helpHub.steps', '{{count}} steps', { count: tour.steps.length })}
              </span>
              <button className="btn-secondary shrink-0 px-3 py-1.5 text-xs" onClick={() => play(tour.id)}>
                <Play className="h-3.5 w-3.5" />
                {done ? t('helpHub.replay', 'Replay') : t('helpHub.play', 'Start')}
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Tips ──────────────────────────────────────────────────────────── */}
      <div className="mt-5 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
          <Lightbulb className="h-4 w-4 text-gaia-600" />
          {t('helpHub.tipsTitle', 'Tips around the app')}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {t('helpHub.tipsSubtitle', 'Little hints appear on each screen. ✕ hides one until next time; "Got it" turns it off for good.')}
        </p>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            className="btn-secondary px-3 py-1.5 text-xs"
            disabled={dismissedTipCount === 0}
            onClick={() => void updateSettings({ dismissedTips: [] })}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t('helpHub.resetTips', 'Bring back all tips')}
          </button>
          {dismissedTipCount > 0 && (
            <span className="text-[11px] text-slate-400">
              {t('helpHub.dismissedCount', '{{count}} turned off', { count: dismissedTipCount })}
            </span>
          )}
        </div>
      </div>

      {/* ── First-run card ───────────────────────────────────────────────── */}
      <div className="mt-3 flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
        <p className="text-xs text-slate-500">
          {t('helpHub.welcomeCard', 'Want the very first welcome card again?')}
        </p>
        <button
          className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
          onClick={() => {
            void updateSettings({ onboarded: false });
            onClose();
          }}
        >
          {t('helpHub.showWelcome', 'Show it')}
        </button>
      </div>
    </Modal>
  );
}
