import { create } from 'zustand';
import averyData from '@/data/averyTemplates.json';
import type { AppSettings, AveryDataset, AveryTemplate, Draft, LabelContext } from '@/types';
import { DEFAULT_SETTINGS } from '@/db/db';
import { settingsRepo } from '@/db/repositories';
import { uid } from '@/lib/id';
import { touchSessionUnlock } from '@/lib/appLock';
import { bumpTemplateUsage } from '@/lib/templateFavorites';
import { readCanvasLabelLanguage } from '@/lib/fabric/canvasTextJson';
import i18n from '@/i18n';

export type Screen =
  | 'welcome'
  | 'template'
  | 'background'
  | 'editor'
  | 'editor-v2'
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
  | 'shop'
  | 'products'
  | 'reports';

const ALL_SCREENS: Screen[] = [
  'welcome', 'template', 'background', 'editor', 'editor-v2', 'export', 'recipes', 'ingredients',
  'inventory', 'orders', 'settings', 'promptBuilder', 'sets', 'drafts', 'batch',
  'finances', 'shop', 'products', 'reports',
];

const SCREEN_STORAGE_KEY = 'gaia:last-screen';
const TEMPLATE_STORAGE_KEY = 'gaia:last-template';
const LABEL_CONTEXTS: LabelContext[] = ['front', 'back', 'side'];
const averyDataset = averyData as AveryDataset;

export type WorkflowGapKind = 'recipe' | 'recipeIncomplete' | 'background';

export type WorkflowGaps = Record<WorkflowGapKind, boolean>;

export function emptyWorkflowGaps(): WorkflowGaps {
  return { recipe: false, recipeIncomplete: false, background: false };
}

export function canonicalizeScreen(screen: Screen): Screen {
  return screen === 'editor' ? 'editor-v2' : screen;
}

export function isAppScreen(value: string | null | undefined): value is Screen {
  return !!value && ALL_SCREENS.includes(value as Screen);
}

export function screenFromLocation(): Screen | null {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash.replace(/^#\/?/, '').split(/[/?#]/)[0];
  if (isAppScreen(hash)) return canonicalizeScreen(hash);
  try {
    const stored = sessionStorage.getItem(SCREEN_STORAGE_KEY);
    if (isAppScreen(stored)) return canonicalizeScreen(stored);
  } catch {
    // sessionStorage can be blocked in some embedded browsers
  }
  return null;
}

function persistScreen(screen: Screen) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SCREEN_STORAGE_KEY, screen);
  } catch {
    // ignore quota / private-mode failures
  }
}

function persistTemplate(template: AveryTemplate | null, context: LabelContext) {
  if (typeof window === 'undefined') return;
  try {
    if (!template) {
      sessionStorage.removeItem(TEMPLATE_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify({ id: template.id, context }));
  } catch {
    // ignore quota / private-mode failures
  }
}

function templateFromStorage(): { template: AveryTemplate | null; context: LabelContext } {
  if (typeof window === 'undefined') return { template: null, context: 'front' };
  try {
    const raw = sessionStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) return { template: null, context: 'front' };
    const parsed = JSON.parse(raw) as { id?: string; context?: string };
    const template = parsed.id
      ? averyDataset.templates.find((tpl) => tpl.id === parsed.id) ?? null
      : null;
    const context = LABEL_CONTEXTS.includes(parsed.context as LabelContext)
      ? (parsed.context as LabelContext)
      : 'front';
    return { template, context };
  } catch {
    return { template: null, context: 'front' };
  }
}

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
  settingsLoadError: string | null;

  /** ID of the draft currently loaded in the editor (null if a fresh design). */
  activeDraftId: string | null;

  /** ID of the recipe the user has selected/is working with (null until a recipe is chosen). */
  activeRecipeId: string | null;

  /** Last prompt from the AI Prompt Builder. Written by PromptBuilderScreen; the in-editor AI tab that read it is gone. */
  // DEAD-CANDIDATE: write-only after AssetsDrawer delete (2026-08-24). Keep until Prompt Builder has another consumer.
  promptBuilderOutput: string | null;

  /** Background image URL chosen in the Background step (data URL or remote URL). */
  backgroundImageUrl: string | null;

  /** When set, editor re-applies auto-layout in this language then returns to export. */
  pendingExportLang: 'en' | 'es' | null;

  /** Language last applied to label text (not the app EN/ES header toggle). */
  labelLanguage: 'en' | 'es' | null;

  /** Designs queued from the Workspace for a mixed (ink-saving) print sheet. */
  batchDraftIds: string[];

  /** Steps the user skipped via “Continue anyway” — later screens show a reminder. */
  workflowGaps: WorkflowGaps;

  /** Text waiting to drop onto the canvas after Send to Label. */
  pendingAffirmationText: string | null;
  /** Bumps when custom/favorite affirmations change so Welcome can refresh. */
  affirmationLibraryRev: number;

  goto: (screen: Screen) => void;
  setWorkflowGap: (gap: WorkflowGapKind, missing: boolean) => void;
  setActiveRecipeId: (id: string | null) => void;
  setActiveDraftId: (id: string | null) => void;
  setBatchDraftIds: (ids: string[]) => void;
  setPromptBuilderOutput: (prompt: string | null) => void;
  setBackgroundImageUrl: (url: string | null) => void;
  setPendingExportLang: (lang: 'en' | 'es' | null) => void;
  setLabelLanguage: (lang: 'en' | 'es' | null) => void;
  /** Persist a chosen template + context to the store without navigating to the editor.
   *  Used by the WorkflowNav "Next" button so the workflow stepper gate sees a template. */
  setTemplate: (template: AveryTemplate, context: LabelContext) => void;
  /** Tag the current design as front / back / side wrap. Does not change the Avery SKU. */
  setContext: (context: LabelContext) => void;
  startNewDesign: (template: AveryTemplate, context: LabelContext) => void;
  loadDraft: (draft: Draft, template: AveryTemplate) => void;
  setDesignJson: (json: string | null) => void;
  setLabelPng: (png: string | null) => void;
  loadSettings: () => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
  /** Toggle Training Mode (persisted in AppSettings). */
  setTrainingMode: (active: boolean) => Promise<void>;
  setPendingAffirmationText: (text: string | null) => void;
  bumpAffirmationLibrary: () => void;
}

const restoredTemplate = templateFromStorage();

export const useAppStore = create<AppState>((set) => ({
  screen: screenFromLocation() ?? 'welcome',
  previousScreen: 'welcome',
  template: restoredTemplate.template,
  context: restoredTemplate.context,
  designId: uid(),
  designJson: null,
  labelPng: null,
  settings: DEFAULT_SETTINGS,
  settingsLoaded: false,
  settingsLoadError: null,
  activeDraftId: null,
  activeRecipeId: null,
  promptBuilderOutput: null,
  backgroundImageUrl: null,
  pendingExportLang: null,
  labelLanguage: null,
  batchDraftIds: [],
  workflowGaps: emptyWorkflowGaps(),
  pendingAffirmationText: null,
  affirmationLibraryRev: 0,

  goto: (screen) => {
    const next = canonicalizeScreen(screen);
    touchSessionUnlock();
    persistScreen(next);
    if (typeof window !== 'undefined') {
      window.history.pushState({ gaiaScreen: next }, '', `#/${next}`);
    }
    set((s) => ({
      previousScreen: s.screen,
      screen: next,
      ...(next === 'welcome' ? { workflowGaps: emptyWorkflowGaps() } : {}),
    }));
  },
  setWorkflowGap: (gap, missing) =>
    set((s) => ({ workflowGaps: { ...s.workflowGaps, [gap]: missing } })),
  setActiveRecipeId: (id) =>
    set((s) => ({
      activeRecipeId: id,
      workflowGaps: id ? { ...s.workflowGaps, recipe: false } : s.workflowGaps,
    })),
  setActiveDraftId: (id) => set({ activeDraftId: id }),
  setBatchDraftIds: (ids) => set({ batchDraftIds: ids }),
  setPromptBuilderOutput: (prompt) => set({ promptBuilderOutput: prompt }),
  setBackgroundImageUrl: (url) =>
    set((s) => ({
      backgroundImageUrl: url,
      workflowGaps: url ? { ...s.workflowGaps, background: false } : s.workflowGaps,
    })),
  setPendingExportLang: (lang) => set({ pendingExportLang: lang }),
  setLabelLanguage: (lang) => set({ labelLanguage: lang }),
  setTemplate: (template, context) => {
    persistTemplate(template, context);
    set({ template, context });
  },
  setContext: (context) =>
    set((s) => {
      persistTemplate(s.template, context);
      return { context };
    }),

  startNewDesign: (template, context) =>
    set((s) => {
      persistTemplate(template, context);
      persistScreen('editor-v2');
      const usagePatch = bumpTemplateUsage(template.id, s.settings);
      void settingsRepo.update(usagePatch);
      return {
        settings: { ...s.settings, ...usagePatch },
        template,
        context,
        designId: uid(),
        designJson: null,
        labelPng: null,
        labelLanguage: null,
        activeDraftId: null,
        previousScreen: s.screen,
        screen: 'editor-v2',
        workflowGaps: emptyWorkflowGaps(),
      };
    }),

  loadDraft: (draft, template) =>
    set((s) => {
      persistTemplate(template, draft.context);
      persistScreen('editor-v2');
      const usagePatch = bumpTemplateUsage(template.id, s.settings);
      void settingsRepo.update(usagePatch);
      return {
        settings: { ...s.settings, ...usagePatch },
        template,
        context: draft.context,
        designId: uid(),
        designJson: draft.designJson,
        labelPng: null,
        labelLanguage: readCanvasLabelLanguage(draft.designJson),
        activeDraftId: draft.id,
        previousScreen: s.screen,
        screen: 'editor-v2',
        workflowGaps: emptyWorkflowGaps(),
      };
    }),

  setDesignJson: (designJson) => set({ designJson }),
  setLabelPng: (labelPng) => set({ labelPng }),

  loadSettings: async () => {
    try {
      let settings = await settingsRepo.get();
      const copyModel = settings.ollamaModelText || settings.ollamaModel || '';
      if (/gpt-oss|deepseek-r1|\br1\b|qwq/i.test(copyModel)) {
        settings = await settingsRepo.update({ ollamaModelText: 'qwen2.5:7b-instruct' });
      }
      const contactWithoutOwner = (settings.contact ?? '').replace(/^Rosa Suarez\s*·\s*/i, '');
      if (contactWithoutOwner !== (settings.contact ?? '')) {
        settings = await settingsRepo.update({ contact: contactWithoutOwner });
      }
      if (settings.language !== i18n.language) await i18n.changeLanguage(settings.language);
      document.documentElement.lang = settings.language;
      applyUiScale(settings.uiScale);
      set({ settings, settingsLoaded: true, settingsLoadError: null });
    } catch (err) {
      console.error('[gaia] loadSettings failed', err);
      set({
        settings: DEFAULT_SETTINGS,
        settingsLoaded: true,
        settingsLoadError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  updateSettings: async (patch) => {
    try {
      const next = await settingsRepo.update(patch);
      if (patch.language && patch.language !== i18n.language) {
        await i18n.changeLanguage(patch.language);
        document.documentElement.lang = patch.language;
      }
      if (patch.uiScale !== undefined) applyUiScale(next.uiScale);
      set({ settings: next, settingsLoadError: null });
    } catch (err) {
      console.error('[gaia] updateSettings failed', err);
      set({
        settingsLoadError: err instanceof Error ? err.message : String(err),
      });
    }
  },

  setTrainingMode: async (active) => {
    const next = await settingsRepo.update({ isTrainingMode: active });
    set({ settings: next });
  },
  setPendingAffirmationText: (text) => set({ pendingAffirmationText: text }),
  bumpAffirmationLibrary: () => set((s) => ({ affirmationLibraryRev: s.affirmationLibraryRev + 1 })),
}));

/** Drives the rem-based interface zoom declared in index.css. */
function applyUiScale(scale: number | undefined) {
  const clamped = Math.min(1.6, Math.max(0.9, scale ?? 1));
  document.documentElement.style.setProperty('--gaia-ui-scale', String(clamped));
}
