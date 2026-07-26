import { create } from 'zustand';
import type { AppSettings, AveryTemplate, Draft, LabelContext } from '@/types';
import { DEFAULT_SETTINGS } from '@/db/db';
import { settingsRepo } from '@/db/repositories';
import i18n from '@/i18n';

export type Screen =
  | 'welcome'
  | 'template'
  | 'background'
  | 'editor'
  | 'export'
  | 'recipes'
  | 'ingredients'
  | 'inventory'
  | 'orders'
  | 'settings'
  | 'promptBuilder'
  | 'sets'
  | 'drafts'
  | 'batch'
  | 'finances'
  | 'orders';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `design-${Date.now()}`;

interface AppState {
  screen: Screen;
  previousScreen: Screen;
  template: AveryTemplate | null;
  context: LabelContext;
  designId: string;
  /** Latest serialized canvas so the design survives editor <-> export navigation. */
  designJson: string | null;
  /** Flattened label PNG captured when opening the export screen. */
  labelPng: string | null;
  settings: AppSettings;
  settingsLoaded: boolean;

  /** ID of the draft currently loaded in the editor (null if a fresh design). */
  activeDraftId: string | null;

  /** ID of the recipe the user has selected/is working with (null until a recipe is chosen). */
  activeRecipeId: string | null;

  /** Last prompt generated in the AI Prompt Builder — shared with the in-editor AI tab. */
  promptBuilderOutput: string | null;

  /** Background image URL chosen in the Background step (data URL or remote URL). */
  backgroundImageUrl: string | null;

  /** Designs queued from the Workspace for a mixed (ink-saving) print sheet. */
  batchDraftIds: string[];
  /**
   * Optional per-design starting quantities for the batch queue
   * (draftId → count). Set by the Work Order "Print labels" bridge so the
   * sheet opens pre-filled with exactly what the client ordered.
   */
  batchQuantities: Record<string, number>;

  goto: (screen: Screen) => void;
  setActiveRecipeId: (id: string | null) => void;
  setActiveDraftId: (id: string | null) => void;
  setBatchDraftIds: (ids: string[], quantities?: Record<string, number>) => void;
  setPromptBuilderOutput: (prompt: string | null) => void;
  setBackgroundImageUrl: (url: string | null) => void;
  /** Persist a chosen template + context to the store without navigating to the editor.
   *  Used by the WorkflowNav "Next" button so the workflow stepper gate sees a template. */
  setTemplate: (template: AveryTemplate, context: LabelContext) => void;
  startNewDesign: (template: AveryTemplate, context: LabelContext) => void;
  loadDraft: (draft: Draft, template: AveryTemplate) => void;
  setDesignJson: (json: string | null) => void;
  setLabelPng: (png: string | null) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useAppStore = create<AppState>((set) => ({
  screen: 'welcome',
  previousScreen: 'welcome',
  template: null,
  context: 'front',
  designId: uid(),
  designJson: null,
  labelPng: null,
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  activeDraftId: null,
  activeRecipeId: null,
  promptBuilderOutput: null,
  backgroundImageUrl: null,
  batchDraftIds: [],
  batchQuantities: {},

  goto: (screen) => set((s) => ({ previousScreen: s.screen, screen })),
  setActiveRecipeId: (id) => set({ activeRecipeId: id }),
  setActiveDraftId: (id) => set({ activeDraftId: id }),
  setBatchDraftIds: (ids, quantities = {}) => set({ batchDraftIds: ids, batchQuantities: quantities }),
  setPromptBuilderOutput: (prompt) => set({ promptBuilderOutput: prompt }),
  setBackgroundImageUrl: (url) => set({ backgroundImageUrl: url }),
  setTemplate: (template, context) => set({ template, context }),

  startNewDesign: (template, context) =>
    set((s) => ({
      template,
      context,
      designId: uid(),
      designJson: null,
      labelPng: null,
      activeDraftId: null,
      previousScreen: s.screen,
      screen: 'editor',
    })),

  loadDraft: (draft, template) =>
    set((s) => ({
      template,
      context: draft.context,
      designId: uid(),
      designJson: draft.designJson,
      labelPng: null,
      activeDraftId: draft.id,
      previousScreen: s.screen,
      screen: 'editor',
    })),

  setDesignJson: (designJson) => set({ designJson }),
  setLabelPng: (labelPng) => set({ labelPng }),

  loadSettings: async () => {
    const settings = await settingsRepo.get();
    if (settings.language !== i18n.language) await i18n.changeLanguage(settings.language);
    document.documentElement.lang = settings.language;
    applyUiScale(settings.uiScale);
    set({ settings, settingsLoaded: true });
  },

  updateSettings: async (patch) => {
    const next = await settingsRepo.update(patch);
    if (patch.language && patch.language !== i18n.language) {
      await i18n.changeLanguage(patch.language);
      document.documentElement.lang = patch.language;
    }
    if (patch.uiScale !== undefined) applyUiScale(next.uiScale);
    set({ settings: next });
  },
}));

/** Drives the rem-based interface zoom declared in index.css. */
function applyUiScale(scale: number | undefined) {
  const clamped = Math.min(1.6, Math.max(0.9, scale ?? 1));
  document.documentElement.style.setProperty('--gaia-ui-scale', String(clamped));
}
