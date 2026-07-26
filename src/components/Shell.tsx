import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BookOpen, ClipboardList, FileStack, FlaskConical, HelpCircle, Layers,
  Loader2, Package, Plus, Receipt, Settings as SettingsIcon, Sparkles,
} from 'lucide-react';
import brandIcon from '@/assets/icon.png';
import { useAppStore, type Screen } from '@/store/useAppStore';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import TemplateScreen from '@/components/screens/TemplateScreen';
import BackgroundScreen from '@/components/screens/BackgroundScreen';
import RecipesScreen from '@/components/screens/RecipesScreen';
import IngredientsScreen from '@/components/screens/IngredientsScreen';
import InventoryScreen from '@/components/screens/InventoryScreen';
import SettingsScreen from '@/components/screens/SettingsScreen';
import PromptBuilderScreen from '@/components/screens/PromptBuilderScreen';
import LabelSetsScreen from '@/components/screens/LabelSetsScreen';
import DraftsScreen from '@/components/screens/DraftsScreen';
import OnboardingCoach from '@/components/OnboardingCoach';
import WorkflowStepper from '@/components/WorkflowStepper';
import DebugPanel from '@/components/debug/DebugPanel';
import HelpHub from '@/components/HelpHub';
import TourOverlay from '@/components/tour/TourOverlay';
import { startAutoImport, onAutoImportToast } from '@/lib/autoImport';
import { maybeRunAutoBackup } from '@/lib/backup';
import { seedRecipes } from '@/data/recipeSeed';
import LocalAiStatusBadge from '@/components/LocalAiStatusBadge';

// Editor pulls in Fabric.js and Export pulls in pdf-lib — load these heavy
// libraries on demand so the initial bundle stays light.
const EditorScreen = lazy(() => import('@/components/screens/EditorScreen'));
const ExportScreen = lazy(() => import('@/components/screens/ExportScreen'));
// Mixed batch printing pulls in both Fabric (to rasterize each saved design)
// and pdf-lib, so it stays out of the initial bundle too.
const BatchPrintScreen = lazy(() => import('@/components/screens/BatchPrintScreen'));
const FinancesScreen = lazy(() => import('@/components/screens/FinancesScreen'));
// Work Orders builds client receipts with pdf-lib — lazy-loaded like Finances.
const WorkOrdersScreen = lazy(() => import('@/components/screens/WorkOrdersScreen'));

/** Screens where the WorkflowStepper sub-header bar is shown (all except welcome/settings). */
const STEPPER_SCREENS: Screen[] = [
  'template', 'sets', 'recipes', 'ingredients', 'background', 'editor', 'export', 'drafts', 'batch', 'inventory', 'promptBuilder', 'finances', 'orders',
];

/** Library tabs shown in the center of the browsing-mode header. */
const BASE_LIBRARY_TABS: Array<{
  id: Screen;
  labelKey: string;
  defaultLabel: string;
  icon: typeof BookOpen;
  optional?: boolean;
}> = [
  { id: 'drafts',      labelKey: 'drafts.title',   defaultLabel: 'Workspace',   icon: FileStack    },
  { id: 'recipes',     labelKey: 'nav.recipes',     defaultLabel: 'Recipes',     icon: BookOpen     },
  { id: 'ingredients', labelKey: 'nav.ingredients', defaultLabel: 'Ingredients', icon: FlaskConical },
  { id: 'inventory',   labelKey: 'nav.inventory',   defaultLabel: 'Inventory',   icon: Package      },
  { id: 'orders',      labelKey: 'nav.orders',      defaultLabel: 'Orders',      icon: ClipboardList },
  { id: 'finances',    labelKey: 'nav.finances',    defaultLabel: 'Finances',    icon: Receipt      },
  { id: 'sets',        labelKey: 'nav.sets',        defaultLabel: 'Label Sets',  icon: Layers,      optional: true },
];

export default function Shell() {
  const screen         = useAppStore((s) => s.screen);
  const goto           = useAppStore((s) => s.goto);
  const activeDraftId  = useAppStore((s) => s.activeDraftId);
  const settings       = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const { t }          = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);

  const LIBRARY_TABS = BASE_LIBRARY_TABS.filter(
    (tab) => !tab.optional || settings?.showLabelSets
  );

  useEffect(() => {
    const cleanup = startAutoImport();
    void seedRecipes();
    // Desktop-only daily safety net; no-op in the browser build.
    void maybeRunAutoBackup();
    return cleanup;
  }, []);

  const showStepper = STEPPER_SCREENS.includes(screen);

  /** Language toggle. */
  const LangSwitcher = () => (
    <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-200">
      {(['en', 'es'] as const).map((lng) => (
        <button
          key={lng}
          onClick={() => void updateSettings({ language: lng })}
          aria-label={lng === 'en' ? t('settings.english', 'English') : t('settings.spanish', 'Español')}
          aria-pressed={settings.language === lng}
          className={`px-2.5 py-1.5 text-xs font-semibold ${
            settings.language === lng
              ? 'bg-gaia-600 text-white'
              : 'bg-white text-slate-500 hover:bg-slate-50'
          }`}
        >
          {lng.toUpperCase()}
        </button>
      ))}
    </div>
  );

  /** Logo button. */
  const LogoButton = () => (
    <button
      className="flex shrink-0 items-center gap-2 text-gaia-700"
      aria-label={t('nav.home', 'Home')}
      onClick={() => goto('welcome')}
    >
      <img src={brandIcon} alt="" className="h-9 w-9 shrink-0 select-none rounded-xl object-contain" draggable={false} />
      <span className="hidden whitespace-nowrap text-base font-semibold tracking-tight sm:inline">
        {t('app.name')}
      </span>
    </button>
  );

  return (
    <div className="flex h-full flex-col">

      {/* ── Unified header — identical on every screen ────────────────────────── */}
      {/* The inner div shares the same full-width px-6 container as the
          WorkflowStepper below, so the nav tabs and stepper steps share the
          same horizontal reference. It intentionally has no max-w cap — that
          used to force the tabs to fight over a fixed ~1024px budget even on
          wide windows, which is what made a tab's label get scroll-clipped. */}
      <header className="relative z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="flex flex-nowrap items-center gap-2 px-6 py-2">

        {/* Left: Logo */}
        <LogoButton />

        {/* Center: Library tabs — takes the remaining space. No overflow-x-auto
            here: since the header lost its max-w cap, the tabs now have the
            whole window to work with, and a scrolling container was clipping
            the "active draft" dot that intentionally pokes just outside each
            tab's top-right corner (overflow-x-auto forces overflow-y to
            compute as auto too, per the CSS spec, cropping that overhang). */}
        <div className="min-w-0 flex-1">
          <nav className="flex items-center justify-start gap-0.5" data-tour="nav-tabs">
            {LIBRARY_TABS.map(({ id, labelKey, defaultLabel, icon: Icon }) => {
              const isActive    = screen === id;
              const hasDraftWip = id === 'drafts' && !!activeDraftId;
              return (
                <button
                  key={id}
                  onClick={() => goto(id)}
                  className={`relative flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-gaia-50 text-gaia-700'
                      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden md:inline">{t(labelKey, defaultLabel)}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gaia-600" />
                  )}
                  {hasDraftWip && (
                    <span
                      className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-orange-500"
                      aria-label="Active draft in progress"
                    />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Right: Rosa greeting, + New Label CTA, AI Prompt icon, Settings icon, Language.
            shrink-0 + whitespace-nowrap on every item guarantees this cluster
            always renders fully and on one line — it's the nav band (above)
            that gives up space first. */}
        <div className="flex shrink-0 flex-nowrap items-center justify-end gap-2 whitespace-nowrap">
          <span className="hidden shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full bg-gaia-50 px-3 py-1 text-xs font-medium text-gaia-700 ring-1 ring-gaia-100 lg:inline-flex">
            <span>🌹 {t('common.greeting', 'Hi Rosa')}</span>
            <LocalAiStatusBadge settings={settings} />
          </span>
          <button
            onClick={() => goto('template')}
            className="btn btn-primary flex shrink-0 items-center gap-1.5 whitespace-nowrap text-sm"
            data-tour="new-label"
          >
            <Plus className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('nav.newLabel', 'New Label')}</span>
          </button>
          <button
            onClick={() => goto('promptBuilder')}
            title={t('nav.promptBuilder', 'AI Prompt')}
            className={`btn flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors ${
              screen === 'promptBuilder'
                ? 'bg-gaia-100 text-gaia-700'
                : 'bg-gaia-50 text-gaia-600 ring-1 ring-gaia-200 hover:bg-gaia-100 hover:text-gaia-700'
            }`}
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            <span className="hidden sm:inline">{t('nav.promptBuilder', 'AI Prompt')}</span>
          </button>
          <button
            onClick={() => setHelpOpen(true)}
            title={t('nav.help', 'Help & walkthroughs')}
            aria-label={t('nav.help', 'Help & walkthroughs')}
            className="btn btn-ghost shrink-0 p-2"
            data-tour="help"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
          <button
            onClick={() => goto('settings')}
            title={t('nav.settings', 'Settings')}
            aria-label={t('nav.settings', 'Settings')}
            className="btn btn-ghost shrink-0 p-2"
          >
            <SettingsIcon className="h-4 w-4" />
          </button>
          <div className="shrink-0">
            <LangSwitcher />
          </div>
        </div>
        </div>
      </header>

      {/* ── Stepper sub-header (all workflow screens, including editor) ───────── */}
      {/* relative + z-30 ensures the stepper's absolutely-positioned tooltips
          (which pop up above the step pills, right at the header boundary)
          stack above BOTH the header (z-20) and the <main> element below. */}
      {showStepper && <div className="relative z-30"><WorkflowStepper /></div>}

      <main className="relative flex-1 overflow-hidden">
        <Suspense fallback={<ScreenLoader label={t('common.loading')} />}>
          {screen === 'welcome'       && <WelcomeScreen />}
          {screen === 'template'      && <TemplateScreen />}
          {screen === 'background'    && <BackgroundScreen />}
          {screen === 'editor'        && <EditorScreen />}
          {screen === 'export'        && <ExportScreen />}
          {screen === 'recipes'       && <RecipesScreen />}
          {screen === 'ingredients'   && <IngredientsScreen />}
          {screen === 'inventory'     && <InventoryScreen />}
          {screen === 'settings'      && <SettingsScreen />}
          {screen === 'promptBuilder' && <PromptBuilderScreen />}
          {screen === 'sets'          && <LabelSetsScreen />}
          {screen === 'drafts'        && <DraftsScreen />}
          {screen === 'batch'         && <BatchPrintScreen />}
          {screen === 'finances'      && <FinancesScreen />}
          {screen === 'orders'        && <WorkOrdersScreen />}
        </Suspense>
      </main>

      <OnboardingCoach />
      <HelpHub open={helpOpen} onClose={() => setHelpOpen(false)} />
      <TourOverlay />
      <AutoImportToast />
      <DebugPanel />
    </div>
  );
}

function AutoImportToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const unsub = onAutoImportToast((msg) => {
      if (timerRef.current) clearTimeout(timerRef.current);
      setMessage(msg);
      timerRef.current = setTimeout(() => setMessage(null), 3500);
    });
    return () => {
      unsub();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
    >
      {message}
    </div>
  );
}

function ScreenLoader({ label }: { label: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 text-gaia-500">
      <Loader2 className="h-7 w-7 animate-spin" />
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}
