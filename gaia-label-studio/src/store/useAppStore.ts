import { create } from 'zustand';
import type { AppSettings, AveryTemplate, LabelContext } from '@/types';
import { DEFAULT_SETTINGS } from '@/db/db';
import { settingsRepo } from '@/db/repositories';
import i18n from '@/i18n';

export type Screen =
  | 'welcome'
  | 'template'
  | 'editor'
  | 'export'
  | 'recipes'
  | 'ingredients'
  | 'settings';

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

  goto: (screen: Screen) => void;
  startNewDesign: (template: AveryTemplate, context: LabelContext) => void;
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

  goto: (screen) => set((s) => ({ previousScreen: s.screen, screen })),

  startNewDesign: (template, context) =>
    set((s) => ({
      template,
      context,
      designId: uid(),
      designJson: null,
      labelPng: null,
      previousScreen: s.screen,
      screen: 'editor',
    })),

  setDesignJson: (designJson) => set({ designJson }),
  setLabelPng: (labelPng) => set({ labelPng }),

  loadSettings: async () => {
    const settings = await settingsRepo.get();
    if (settings.language !== i18n.language) await i18n.changeLanguage(settings.language);
    document.documentElement.lang = settings.language;
    set({ settings, settingsLoaded: true });
  },

  updateSettings: async (patch) => {
    const next = await settingsRepo.update(patch);
    if (patch.language && patch.language !== i18n.language) {
      await i18n.changeLanguage(patch.language);
      document.documentElement.lang = patch.language;
    }
    set({ settings: next });
  },
}));
