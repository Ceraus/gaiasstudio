import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, BookOpen, ChevronDown, ClipboardList, FileStack, FlaskConical, HelpCircle, Layers,
  Loader2, Package, Plus, Receipt, Settings as SettingsIcon, ShoppingBag, Sparkles, Store,
} from 'lucide-react';
import brandIcon from '@/assets/icon.png';
import { useAppStore, type Screen } from '@/store/useAppStore';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import OnboardingCoach from '@/components/OnboardingCoach';
import WorkflowStepper from '@/components/WorkflowStepper';
import DebugPanel from '@/components/debug/DebugPanel';
import HelpHub from '@/components/HelpHub';
import TourOverlay from '@/components/tour/TourOverlay';
import { startAutoImport, onAutoImportToast } from '@/lib/autoImport';
import { maybeRunAutoBackup } from '@/lib/backup';
import { pullCloudBackup, runCloudSync } from '@/lib/cloudSync';
import LocalAiStatusBadge from '@/components/LocalAiStatusBadge';
import MobileWorkflowTabs from '@/components/MobileWorkflowTabs';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';
import TrainingModeToggle from '@/components/TrainingModeToggle';
import TrainingBlockModal from '@/components/TrainingBlockModal';
import TrainingModeWelcome from '@/components/TrainingModeWelcome';
import { TRAINING_ALLOWED_SCREENS, isTrainingModeActive } from '@/lib/trainingMode';
import { useStreamlinedMobile } from '@/hooks/useMobileLayout';

const WORKFLOW_TAB_SCREENS: Screen[] = ['template', 'ingredients', 'recipes', 'background', 'editor'];

const TemplateScreen = lazy(() => import('@/components/screens/TemplateScreen'));
const BackgroundScreen = lazy(() => import('@/components/screens/BackgroundScreen'));
const RecipesScreen = lazy(() => import('@/components/screens/RecipesScreen'));
const IngredientsScreen = lazy(() => import('@/components/screens/IngredientsScreen'));
const InventoryScreen = lazy(() => import('@/components/screens/InventoryScreen'));
const SettingsScreen = lazy(() => import('@/components/screens/SettingsScreen'));
const PromptBuilderScreen = lazy(() => import('@/components/screens/PromptBuilderScreen'));
const LabelSetsScreen = lazy(() => import('@/components/screens/LabelSetsScreen'));
const DraftsScreen = lazy(() => import('@/components/screens/DraftsScreen'));

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
// New screens for the Studio expansion
const ShopScreen = lazy(() => import('@/components/screens/ShopScreen'));
const ProductsScreen = lazy(() => import('@/components/screens/ProductsScreen'));
const ReportsScreen = lazy(() => import('@/components/screens/ReportsScreen'));

/** Screens where the WorkflowStepper sub-header bar is shown (all except welcome/settings). */
const STEPPER_SCREENS: Screen[] = [
  'template', 'sets', 'recipes', 'ingredients', 'background', 'editor', 'export', 'drafts', 'batch', 'inventory', 'promptBuilder', 'finances', 'orders', 'shop', 'products', 'reports',
];

/** Library tabs — grouped: Design | Business | Connect */
type NavGroup = 'design' | 'business' | 'connect';

const BASE_LIBRARY_TABS: Array<{
  id: Screen;
  group: NavGroup;
  labelKey: string;
  defaultLabel: string;
  icon: typeof BookOpen;
  optional?: boolean;
}> = [
  { id: 'drafts',      group: 'design',   labelKey: 'nav.workspace',   defaultLabel: 'Workspace',   icon: FileStack    },
  { id: 'ingredients', group: 'design',   labelKey: 'nav.ingredients', defaultLabel: 'Ingredients', icon: FlaskConical },
  { id: 'sets',        group: 'design',   labelKey: 'nav.sets',        defaultLabel: 'Label Sets',  icon: Layers,      optional: true },
  { id: 'products',    group: 'business', labelKey: 'nav.products',    defaultLabel: 'Products',    icon: ShoppingBag  },
  { id: 'recipes',     group: 'business', labelKey: 'nav.recipes',     defaultLabel: 'Recipes',     icon: BookOpen     },
  { id: 'inventory',   group: 'business', labelKey: 'nav.inventory',   defaultLabel: 'Inventory',   icon: Package      },
  { id: 'orders',      group: 'business', labelKey: 'nav.orders',      defaultLabel: 'Orders',      icon: ClipboardList },
  { id: 'finances',    group: 'business', labelKey: 'nav.finances',    defaultLabel: 'Finances',    icon: Receipt      },
  { id: 'reports',     group: 'business', labelKey: 'nav.reports',     defaultLabel: 'Reports',     icon: BarChart3    },
  { id: 'shop',        group: 'connect',  labelKey: 'nav.shop',        defaultLabel: 'Etsy Shop',   icon: Store        },
];

const NAV_GROUPS: Array<{ id: NavGroup; labelKey: string; defaultLabel: string }> = [
  { id: 'design',   labelKey: 'nav.design',   defaultLabel: 'Design'   },
  { id: 'business', labelKey: 'nav.business', defaultLabel: 'Business' },
  { id: 'connect',  labelKey: 'nav.connect',  defaultLabel: 'Connect'  },
];

export default function Shell() {
  const screen         = useAppStore((s) => s.screen);
  const goto           = useAppStore((s) => s.goto);
  const activeDraftId  = useAppStore((s) => s.activeDraftId);
  const settings       = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const { t }          = useTranslation();
  const [helpOpen, setHelpOpen] = useState(false);
  const [openNavGroup, setOpenNavGroup] = useState<NavGroup | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const streamlinedMobile = useStreamlinedMobile(settings);
  const trainingMode = isTrainingModeActive(settings);

  const LIBRARY_TABS = BASE_LIBRARY_TABS.filter((tab) => {
    if (tab.optional && !settings?.showLabelSets) return false;
    if (trainingMode) {
      return tab.group === 'design' && (tab.id === 'drafts' || tab.id === 'sets');
    }
    return true;
  });

  const visibleNavGroups = trainingMode
    ? NAV_GROUPS.filter((g) => g.id === 'design')
    : NAV_GROUPS;

  const tabsByGroup = useMemo(() => {
    const grouped: Record<NavGroup, typeof LIBRARY_TABS> = {
      design: [],
      business: [],
      connect: [],
    };
    for (const tab of LIBRARY_TABS) grouped[tab.group].push(tab);
    return grouped;
  }, [LIBRARY_TABS]);

  const activeNavGroup = useMemo(
    () => LIBRARY_TABS.find((tab) => tab.id === screen)?.group ?? null,
    [LIBRARY_TABS, screen],
  );

  useEffect(() => {
    if (!openNavGroup) return;
    const onPointerDown = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenNavGroup(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenNavGroup(null);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [openNavGroup]);

  useEffect(() => {
    if (!trainingMode) return;
    if (!TRAINING_ALLOWED_SCREENS.includes(screen)) {
      goto('template');
    }
  }, [trainingMode, screen, goto]);

  useEffect(() => {
    const cleanup = startAutoImport();
    void import('@/data/recipeSeed').then(({ seedRecipes }) => seedRecipes());
    void (async () => {
      await maybeRunAutoBackup();
      const s = useAppStore.getState().settings;
      if (!s.cloudSyncEnabled || !s.cloudSyncUrl?.trim() || !s.cloudSyncToken?.trim()) return;
      const result = await runCloudSync(s, { autoPull: false, autoPush: true });
      if (result.status === 'pushed') {
        await updateSettings({
          cloudSyncLastPushedAt: result.remoteExportedAt ?? new Date().toISOString(),
        });
        return;
      }
      if (result.status === 'remote_newer' && result.remoteExportedAt) {
        const when = new Date(result.remoteExportedAt).toLocaleString();
        const ok = window.confirm(
          t('settings.cloudSyncBootConfirm', {
            when,
            defaultValue: `A newer copy exists on the website (${when}). Download it now? Your current data will be replaced.`,
          }),
        );
        if (!ok) return;
        const pull = await pullCloudBackup(s);
        if (pull.status === 'pulled') {
          await updateSettings({
            cloudSyncLastPulledAt: pull.remoteExportedAt ?? new Date().toISOString(),
          });
          window.location.reload();
        }
      }
    })();
    return cleanup;
  }, [t, updateSettings]);

  // Keep in-app navigation on the browser Back/Forward buttons instead of leaving the app.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.history.replaceState({ gaiaScreen: screen }, '', `#/${screen}`);
    const onPopState = (event: PopStateEvent) => {
      const target = (event.state as { gaiaScreen?: Screen } | null)?.gaiaScreen;
      if (target) {
        useAppStore.setState({ screen: target });
      } else {
        useAppStore.setState({ screen: 'welcome' });
        window.history.replaceState({ gaiaScreen: 'welcome' }, '', '#/welcome');
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [screen]);

  const showStepper = STEPPER_SCREENS.includes(screen) && !streamlinedMobile;
  const showMobileTabs = streamlinedMobile && screen !== 'welcome';
  const menuTabActive =
    mobileMenuOpen ||
    (streamlinedMobile && !WORKFLOW_TAB_SCREENS.includes(screen) && screen !== 'welcome');

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

      {/* ── Header (classic responsive + desktop; hidden on streamlined phone) ─ */}
      {!streamlinedMobile && (
      <header className={`relative border-b border-slate-200 bg-white/90 backdrop-blur safe-top ${openNavGroup ? 'z-40' : 'z-20'}`}>
        <div className="flex flex-col gap-0 sm:flex-row sm:flex-nowrap sm:items-center sm:gap-2 sm:px-6 sm:py-2">
        <div className="flex flex-nowrap items-center justify-between gap-2 px-3 py-2 sm:contents">

        {/* Left: Logo */}
        <LogoButton />

        {/* Center: Training Mode toggle (desktop/tablet) */}
        <div className="hidden shrink-0 sm:flex sm:flex-1 sm:justify-center">
          <TrainingModeToggle />
        </div>

        {/* Right cluster on phone — settings row */}
        <div className="flex shrink-0 items-center gap-1 sm:hidden">
          <TrainingModeToggle compact />
          <button
            onClick={() => goto('template')}
            className="btn btn-primary shrink-0 p-2"
            aria-label={t('nav.newLabel', 'New Label')}
          >
            <Plus className="h-4 w-4" />
          </button>
          <button onClick={() => setHelpOpen(true)} className="btn btn-ghost shrink-0 p-2" aria-label={t('nav.help')}>
            <HelpCircle className="h-4 w-4" />
          </button>
          <button onClick={() => goto('settings')} className="btn btn-ghost shrink-0 p-2" aria-label={t('nav.settings')}>
            <SettingsIcon className="h-4 w-4" />
          </button>
          <LangSwitcher />
        </div>
        </div>

        {/* Center: grouped nav — horizontal scroll on phone */}
        <div ref={navRef} className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap no-scrollbar hide-scrollbar border-t border-slate-100 px-2 py-1.5 sm:border-0 sm:px-0 sm:py-0">
          <nav className="inline-flex w-max min-w-full items-center gap-1 sm:w-auto" data-tour="nav-tabs">
            {visibleNavGroups.map(({ id, labelKey, defaultLabel }) => {
              const tabs = tabsByGroup[id];
              if (!tabs.length) return null;

              const isGroupActive = activeNavGroup === id;
              const isOpen = openNavGroup === id;
              const activeTab = tabs.find((tab) => tab.id === screen);

              return (
                <div key={id} className="relative">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-haspopup="menu"
                    onClick={() => setOpenNavGroup(isOpen ? null : id)}
                    className={`flex max-w-[11rem] items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors sm:max-w-none sm:gap-1.5 sm:px-3 ${
                      isGroupActive
                        ? 'bg-gaia-50 text-gaia-700'
                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <span className="truncate">{t(labelKey, defaultLabel)}</span>
                    {activeTab && (
                      <span className="hidden truncate text-xs font-normal text-gaia-600 lg:inline">
                        · {t(activeTab.labelKey, activeTab.defaultLabel)}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    {isGroupActive && (
                      <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gaia-600" />
                    )}
                  </button>

                  {isOpen && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      {tabs.map(({ id: tabId, labelKey: tabLabelKey, defaultLabel: tabDefault, icon: Icon }) => {
                        const isActive = screen === tabId;
                        const hasDraftWip = tabId === 'drafts' && !!activeDraftId;
                        return (
                          <button
                            key={tabId}
                            type="button"
                            role="menuitem"
                            onClick={() => {
                              goto(tabId);
                              setOpenNavGroup(null);
                            }}
                            className={`relative flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                              isActive
                                ? 'bg-gaia-50 font-medium text-gaia-700'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                            }`}
                          >
                            <Icon className="h-4 w-4 shrink-0" />
                            <span className="min-w-0 flex-1 truncate">{t(tabLabelKey, tabDefault)}</span>
                            {hasDraftWip && (
                              <span
                                className="h-2 w-2 shrink-0 rounded-full bg-orange-500"
                                aria-label={t('drafts.ariaActiveDraft', 'Active draft in progress')}
                              />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* Right: desktop / tablet actions */}
        <div className="hidden shrink-0 flex-nowrap items-center justify-end gap-2 whitespace-nowrap sm:flex sm:px-0">
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
          {!trainingMode && (
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
          )}
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
          <div className="shrink-0 max-sm:hidden">
            <LangSwitcher />
          </div>
        </div>
        </div>
      </header>
      )}

      {/* ── Streamlined phone header ───────────────────────────────────────── */}
      {streamlinedMobile && (
        <header className="relative z-20 border-b border-slate-200 bg-white/90 backdrop-blur safe-top">
          <div className="flex items-center justify-between gap-2 px-4 py-2">
            <LogoButton />
            <TrainingModeToggle compact />
            <div className="flex items-center gap-1">
              <button
                onClick={() => setHelpOpen(true)}
                title={t('nav.help', 'Help & walkthroughs')}
                aria-label={t('nav.help', 'Help & walkthroughs')}
                className="btn btn-ghost shrink-0 p-2"
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
              <LangSwitcher />
            </div>
          </div>
        </header>
      )}

      {/* ── Stepper sub-header (all workflow screens, including editor) ───────── */}
      {/* relative + z-30 ensures the stepper's absolutely-positioned tooltips
          (which pop up above the step pills, right at the header boundary)
          stack above BOTH the header (z-20) and the <main> element below. */}
      {showStepper && <div className="relative z-30"><WorkflowStepper /></div>}

      <main className={`relative flex-1 overflow-hidden ${showMobileTabs ? 'pb-mobile-nav' : ''}`}>
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
          {screen === 'shop'          && <ShopScreen />}
          {screen === 'products'      && <ProductsScreen />}
          {screen === 'reports'       && <ReportsScreen />}
        </Suspense>
      </main>

      {showMobileTabs && (
        <>
          <MobileWorkflowTabs
            screen={screen}
            onNavigate={(s) => {
              setMobileMenuOpen(false);
              goto(s);
            }}
            onMenuOpen={() => setMobileMenuOpen(true)}
            menuActive={menuTabActive}
          />
          <MobileMenuDrawer
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
            currentScreen={screen}
            trainingMode={trainingMode}
            onNavigate={(s) => {
              setMobileMenuOpen(false);
              goto(s);
            }}
          />
        </>
      )}

      <OnboardingCoach />
      <TrainingModeWelcome />
      <TrainingBlockModal />
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
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg max-sm:bottom-[calc(4.5rem+env(safe-area-inset-bottom))]"
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
