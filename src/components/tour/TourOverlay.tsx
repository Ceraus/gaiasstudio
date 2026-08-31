// ---------------------------------------------------------------------------
// TourOverlay — the guided-tour spotlight.
//
// Renders when a tour is active: dims the app, cuts a spotlight around the
// current step's target element (found via its data-tour attribute), and
// shows a small card with the step text and Back / Next controls. If the
// target isn't on screen (empty states, different data), the step falls back
// to a centered card so tours never dead-end.
//
// "Later" snoozes the tour for this session; "Skip Tour" and finishing the
// last step both mark it completed in Settings (revisitable from the Help
// hub any time).
// ---------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ArrowRight, Check, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useTourStore } from '@/store/useTourStore';
import { getTour } from './tours';

const CARD_W = 340;
const CARD_GAP = 12;
const SPOT_PAD = 6;
/** Estimated card height for placement math (actual card may vary slightly). */
const CARD_H_EST = 240;

/** Keep the step card inside the viewport — tall spotlights (recipe list, etc.) used to push it off-screen. */
function placeCard(rect: SpotRect | null): React.CSSProperties {
  if (!rect) {
    return { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: CARD_W };
  }

  const maxTop = window.innerHeight - CARD_H_EST - CARD_GAP;
  const targetTooTall = rect.height > window.innerHeight * 0.45;

  let left = Math.min(
    Math.max(rect.left, CARD_GAP),
    Math.max(CARD_GAP, window.innerWidth - CARD_W - CARD_GAP),
  );
  let top = Math.max(CARD_GAP, Math.min(maxTop, (window.innerHeight - CARD_H_EST) / 2));

  if (targetTooTall) {
    // Sidebar / full-height lists: park the card beside the target when there's room.
    const beside = rect.left + rect.width + CARD_GAP;
    if (beside + CARD_W <= window.innerWidth - CARD_GAP) {
      left = beside;
    }
  } else {
    const belowTop = rect.top + rect.height + SPOT_PAD + CARD_GAP;
    const aboveTop = rect.top - SPOT_PAD - CARD_GAP - CARD_H_EST;
    if (belowTop <= maxTop) {
      top = belowTop;
    } else if (aboveTop >= CARD_GAP) {
      top = aboveTop;
    }
    left = Math.min(
      Math.max(rect.left, CARD_GAP),
      Math.max(CARD_GAP, window.innerWidth - CARD_W - CARD_GAP),
    );
  }

  top = Math.max(CARD_GAP, Math.min(maxTop, top));
  return { left, top, width: CARD_W };
}

interface SpotRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export default function TourOverlay() {
  const { t } = useTranslation();
  const activeTourId = useTourStore((s) => s.activeTourId);
  const stepIndex = useTourStore((s) => s.stepIndex);
  const next = useTourStore((s) => s.next);
  const back = useTourStore((s) => s.back);
  const snooze = useTourStore((s) => s.snooze);
  const finish = useTourStore((s) => s.finish);
  const goto = useAppStore((s) => s.goto);

  const tour = activeTourId ? getTour(activeTourId) : undefined;
  const step = tour?.steps[stepIndex];

  const [rect, setRect] = useState<SpotRect | null>(null);
  const [settled, setSettled] = useState(false);

  // Locate (and keep tracking) the step's target element.
  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    setSettled(false);
    setRect(null);

    if (step.screen && useAppStore.getState().screen !== step.screen) {
      goto(step.screen);
    }

    const measure = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      setRect({ left: r.left, top: r.top, width: r.width, height: r.height });
    };

    const startedAt = Date.now();
    const tryFind = () => {
      if (cancelled) return;
      const el = step.target
        ? (document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null)
        : null;
      if (el) {
        el.scrollIntoView({ block: 'center' });
        requestAnimationFrame(() => {
          if (cancelled) return;
          measure(el);
          setSettled(true);
        });
        return;
      }
      if (!step.target || Date.now() - startedAt > 2500) {
        setSettled(true); // centered fallback
        return;
      }
      window.setTimeout(tryFind, 120);
    };
    // Give a fresh screen a beat to render before searching.
    window.setTimeout(tryFind, 180);

    const onResize = () => {
      if (!step.target) return;
      const el = document.querySelector(`[data-tour="${step.target}"]`) as HTMLElement | null;
      if (el) measure(el);
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelled = true;
      window.removeEventListener('resize', onResize);
    };
    // Re-run whenever the visible step changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTourId, stepIndex]);

  // Keyboard: ← → navigate, Escape snoozes.
  useEffect(() => {
    if (!step) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') snooze();
      else if (e.key === 'ArrowRight') next();
      else if (e.key === 'ArrowLeft') back();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, next, back, snooze]);

  if (!tour || !step || !settled) return null;

  const isLast = stepIndex === tour.steps.length - 1;
  const spotlight = rect !== null;
  const cardStyle = placeCard(spotlight ? rect : null);

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label={t(`tour.${tour.nameKey}`, tour.nameDefault)}>
      {/* Click-catcher: keeps the app quiet while the tour is talking. */}
      <div className="absolute inset-0" onClick={() => { /* guided via buttons */ }} />

      {/* Dimmer / spotlight */}
      {spotlight && rect ? (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-gaia-400 transition-all duration-200"
          style={{
            left: rect.left - SPOT_PAD,
            top: rect.top - SPOT_PAD,
            width: rect.width + SPOT_PAD * 2,
            height: rect.height + SPOT_PAD * 2,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.55)',
          }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-slate-900/55" />
      )}

      {/* Step card */}
      <div
        className="absolute overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={cardStyle}
      >
        <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-gaia-600 to-gaia-500 px-4 py-2.5">
          <p className="ui-label font-semibold uppercase tracking-wide text-gaia-100">
            {t(`tour.${tour.nameKey}`, tour.nameDefault)}
            <span className="ml-2 opacity-75">{stepIndex + 1}/{tour.steps.length}</span>
          </p>
          <button
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30"
            onClick={snooze}
            title={t('tour.snooze', 'Later (Esc)')}
            aria-label={t('tour.snooze', 'Later (Esc)')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="px-4 py-3">
          <p className="text-sm font-semibold text-slate-800">
            {t(`tour.${step.titleKey}`, step.titleDefault)}
          </p>
          <p className="mt-1 text-[13px] leading-snug text-slate-600">
            {t(`tour.${step.bodyKey}`, step.bodyDefault)}
          </p>
        </div>

        <div className="flex items-center gap-1 px-4 pb-3">
          {tour.steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === stepIndex ? 'w-5 bg-gaia-600' : 'w-1.5 bg-slate-200'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2.5">
          <button className="btn-ghost px-2 py-1.5 text-xs text-slate-400" onClick={finish}>
            {t('tour.skip', 'Skip Tour')}
          </button>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button className="btn-secondary px-3 py-1.5 text-xs" onClick={back}>
                <ArrowLeft className="h-3.5 w-3.5" />
                {t('tour.back', 'Back')}
              </button>
            )}
            <button className="btn-primary px-3.5 py-1.5 text-xs" onClick={next} autoFocus>
              {isLast ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
              {isLast ? t('tour.done', 'Done') : t('tour.next', 'Next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
