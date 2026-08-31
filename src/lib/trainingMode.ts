import type { AppSettings } from '@/types';
import type { Screen } from '@/store/useAppStore';

export type TrainingBlockReason =
  | 'needTemplate'
  | 'needRecipe'
  | 'needBackground'
  | 'needEditor';

export interface TrainingGateInput {
  target: Screen;
  template: unknown | null;
  activeRecipeId: string | null;
  backgroundImageUrl: string | null;
  /** Workflow step order of the screen the user is currently on (0 if unknown). */
  currentOrder: number;
}

export interface TrainingGateResult {
  reason: TrainingBlockReason;
  messageKey: string;
  defaultMessage: string;
  redirectTo: Screen;
  canOverride: boolean;
  overrideMessageKey?: string;
  overrideDefaultMessage?: string;
}

const TARGET_ORDER: Partial<Record<Screen, number>> = {
  template: 1,
  recipes: 2,
  background: 3,
  'editor-v2': 4,
  export: 5,
};

/** Returns a gate result when Training Mode should block navigation, else null. */
export function checkTrainingGate(input: TrainingGateInput): TrainingGateResult | null {
  const { target, template, activeRecipeId, backgroundImageUrl, currentOrder } = input;
  const targetOrder = TARGET_ORDER[target];
  if (targetOrder == null) return null;

  if (targetOrder >= 2 && !template) {
    return {
      reason: 'needTemplate',
      messageKey: 'trainingMode.blockNeedTemplate',
      defaultMessage: 'Please select a Shape & Size first.',
      redirectTo: 'template',
      canOverride: false,
    };
  }

  if (targetOrder >= 3 && !activeRecipeId) {
    return {
      reason: 'needRecipe',
      messageKey: 'trainingMode.blockNeedRecipe',
      defaultMessage: "You haven't selected a Recipe yet. Would you like to select one, or proceed with a blank label?",
      redirectTo: 'recipes',
      canOverride: true,
      overrideMessageKey: 'trainingMode.proceedBlankRecipe',
      overrideDefaultMessage: 'Proceed With Blank Label',
    };
  }

  if (targetOrder >= 4 && !backgroundImageUrl) {
    return {
      reason: 'needBackground',
      messageKey: 'trainingMode.blockNeedBackground',
      defaultMessage: "You forgot to choose a Background! Pick one, or continue with a blank background.",
      redirectTo: 'background',
      canOverride: true,
      overrideMessageKey: 'trainingMode.proceedBlankBackground',
      overrideDefaultMessage: 'Continue With Blank Background',
    };
  }

  if (target === 'export' && currentOrder < 4) {
    return {
      reason: 'needEditor',
      messageKey: 'trainingMode.blockNeedEditor',
      defaultMessage: 'Refine your design in the Editor before printing.',
      redirectTo: 'editor-v2',
      canOverride: true,
      overrideMessageKey: 'trainingMode.proceedToExport',
      overrideDefaultMessage: 'Go To Print Anyway',
    };
  }

  return null;
}

/** Screens reachable from the library nav while Training Mode is active. */
export const TRAINING_ALLOWED_SCREENS: Screen[] = [
  'welcome',
  'template',
  'ingredients',
  'recipes',
  'background',
  'editor-v2',
  'export',
  'drafts',
  'sets',
  'settings',
];

/** True when Training Mode is explicitly enabled in settings. */
export function isTrainingModeActive(settings: { isTrainingMode?: boolean }): boolean {
  return settings.isTrainingMode === true;
}

/** Migrate legacy setting keys from earlier builds. */
export function migrateTrainingSettings(settings: AppSettings): AppSettings {
  const raw = settings as AppSettings & {
    trainingMode?: boolean;
    trainingModeIntroSeen?: boolean;
  };
  const next = { ...settings };
  if (next.isTrainingMode === undefined && raw.trainingMode !== undefined) {
    next.isTrainingMode = raw.trainingMode;
  }
  if (next.hasSeenTrainingWelcome === undefined && raw.trainingModeIntroSeen !== undefined) {
    next.hasSeenTrainingWelcome = raw.trainingModeIntroSeen;
  }
  return next;
}
