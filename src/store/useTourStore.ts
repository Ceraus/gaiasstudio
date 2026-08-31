// ---------------------------------------------------------------------------
// Guided-tour state. Deliberately tiny: which tour is running and which step
// is showing. Persistence of "completed" lives in AppSettings so it survives
// restarts; a session-only snooze lives in sessionStorage so "Later" quiets
// the tour until the next launch without nagging forever.
// ---------------------------------------------------------------------------
import { create } from 'zustand';
import { getTour, tourRequiresFullStudio } from '@/components/tour/tours';
import { isTrainingModeActive } from '@/lib/trainingMode';
import { useAppStore } from '@/store/useAppStore';

export const TOUR_SNOOZE_KEY = 'gaia.tour.snoozed';

interface TourState {
  activeTourId: string | null;
  stepIndex: number;
  start: (tourId: string) => void;
  next: () => void;
  back: () => void;
  /** "Later" — hides the tour for this session only. */
  snooze: () => void;
  /** Finish or skip — marks the tour completed in settings. */
  finish: () => void;
  /** Hard stop without marking anything (e.g. screen unmounts). */
  stop: () => void;
}

export const useTourStore = create<TourState>((set, get) => ({
  activeTourId: null,
  stepIndex: 0,

  start: (tourId) => {
    if (!getTour(tourId)) return;
    void (async () => {
      const { settings, setTrainingMode } = useAppStore.getState();
      if (tourRequiresFullStudio(tourId) && isTrainingModeActive(settings)) {
        await setTrainingMode(false);
      }
      set({ activeTourId: tourId, stepIndex: 0 });
    })();
  },

  next: () => {
    const { activeTourId, stepIndex } = get();
    const tour = activeTourId ? getTour(activeTourId) : undefined;
    if (!tour) return;
    if (stepIndex >= tour.steps.length - 1) {
      get().finish();
    } else {
      set({ stepIndex: stepIndex + 1 });
    }
  },

  back: () => {
    const { stepIndex } = get();
    if (stepIndex > 0) set({ stepIndex: stepIndex - 1 });
  },

  snooze: () => {
    try {
      sessionStorage.setItem(TOUR_SNOOZE_KEY, '1');
    } catch { /* private mode — snooze just won't persist */ }
    set({ activeTourId: null, stepIndex: 0 });
  },

  finish: () => {
    const { activeTourId } = get();
    if (activeTourId) {
      const { settings, updateSettings } = useAppStore.getState();
      const done = new Set(settings.completedTours ?? []);
      if (!done.has(activeTourId)) {
        done.add(activeTourId);
        void updateSettings({ completedTours: [...done] });
      }
    }
    set({ activeTourId: null, stepIndex: 0 });
  },

  stop: () => set({ activeTourId: null, stepIndex: 0 }),
}));
