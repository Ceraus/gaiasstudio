import { create } from 'zustand';
import type { Screen } from '@/store/useAppStore';
import type { TrainingGateResult } from '@/lib/trainingMode';

interface TrainingBlockState {
  open: boolean;
  gate: TrainingGateResult | null;
  pendingTarget: Screen | null;
  onProceed: (() => void) | null;
  show: (gate: TrainingGateResult, target: Screen, onProceed: () => void) => void;
  dismiss: () => void;
}

export const useTrainingBlockStore = create<TrainingBlockState>((set) => ({
  open: false,
  gate: null,
  pendingTarget: null,
  onProceed: null,
  show: (gate, target, onProceed) =>
    set({ open: true, gate, pendingTarget: target, onProceed }),
  dismiss: () =>
    set({ open: false, gate: null, pendingTarget: null, onProceed: null }),
}));
