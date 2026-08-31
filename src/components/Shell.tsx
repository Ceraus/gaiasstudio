import { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, BookOpen, ChevronDown, ClipboardList, FileStack, FlaskConical, FolderOpen, Layers,
  Loader2, Package, Receipt, Settings as SettingsIcon, ShoppingBag, Sparkles, Store,
} from 'lucide-react';
import brandIcon from '@/assets/icon.png';
import { canonicalizeScreen, isAppScreen, screenFromLocation, useAppStore, type Screen } from '@/store/useAppStore';
import WelcomeScreen from '@/components/screens/WelcomeScreen';
import OnboardingCoach from '@/components/OnboardingCoach';
import WorkflowStepper from '@/components/WorkflowStepper';
import DebugPanel from '@/components/debug/DebugPanel';
import HelpHub from '@/components/HelpHub';
import TourOverlay from '@/components/tour/TourOverlay';
import { startAutoImport, onAutoImportToast } from '@/lib/autoImport';
import { maybeRunAutoBackup } from '@/lib/backup';
import LocalAiStatusBadge from '@/components/LocalAiStatusBadge';
import MobileWorkflowTabs from '@/components/MobileWorkflowTabs';
import MobileMenuDrawer from '@/components/MobileMenuDrawer';
import TrainingBlockModal from '@/components/TrainingBlockModal';
import { TRAINING_ALLOWED_SCREENS, isTrainingModeActive } from '@/lib/trainingMode';
import { useStreamlinedMobile } from '@/hooks/useMobileLayout';

const WORKFLOW_TAB_SCREENS: Screen[] = ['template', 'recipes', 'background', 'editor-v2'];

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
const EditorScreenV2 = lazy(() => import('@/components/screens/EditorScreenV2'));
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

/** Screens where the WorkflowStepper sub-header bar is shown (all except welcome/settings/drafts). */
const STEPPER_SCREENS: Screen[] = [
  'template', 'sets', 'recipes', 'ingredients', 'background', 'editor-v2', 'export', 'batch', 'inventory', 'promptBuilder', 'finances', 'orders', 'shop', 'products', 'reports',
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
  { id: 'drafts',      group: 'design',   labelKey: 'nav.workspace',   defaultLabel: 'Saved Designs', icon: FileStack    },
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
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const streamlinedMobile = useStreamlinedMobile(settings);
  const trainingMode = isTrainingModeActive(settings);

  const LIBRARY_TABS = BASE_LIBRARY_TABS.filter((tab) => {
    if (tab.optional && !settings?.showLabelSets) return false;
    return true;
  });

  /** Training Mode hides library nav visually but keeps layout slots reserved. */
  const navInteractionLocked = trainingMode;

  useEffect(() => {
    if (trainingMode) setOpenNavGroup(null);
  }, [trainingMode]);

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
      const target = event.target as Node;
      const insideNav =
        (navRef.current?.contains(target) ?? false) ||
        (mobileNavRef.current?.contains(target) ?? false);
      if (!insideNav) setOpenNavGroup(null);
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
    void maybeRunAutoBackup();
    return cleanup;
  }, []);

  // Keep in-app navigation on the browser Back/Forward buttons instead of leaving the app.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      sessionStorage.setItem('gaia:last-screen', screen);
    } catch {
      // ignore
    }
    window.history.replaceState({ gaiaScreen: screen }, '', `#/${screen}`);
    const onPopState = (event: PopStateEvent) => {
      const fromState = (event.state as { gaiaScreen?: Screen } | null)?.gaiaScreen;
      const target = isAppScreen(fromState) ? canonicalizeScreen(fromState) : screenFromLocation();
      if (target) {
        useAppStore.setState({ screen: target });
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

  /** Language toggle. Locked on bilingual screens that already show both. */
  const bilingualLocked = screen === 'recipes';
  const LangSwitcher = () => (
    <div
      className={`inline-flex rounded-full p-[4.5px] ${
        bilingualLocked
          ? 'bg-transparent'
          : settings.language === 'en'
            ? 'bg-amber-600'
            : 'bg-sky-600'
      }`}
    >
      <div className="flex overflow-hidden rounded-full">
        {(['en', 'es'] as const).map((lng) => (
          <button
            key={lng}
            type="button"
            disabled={bilingualLocked}
            onClick={() => {
              if (bilingualLocked) return;
              void updateSettings({ language: lng });
            }}
            aria-label={lng === 'en' ? t('settings.english', 'English') : t('settings.spanish', 'Español')}
            aria-pressed={bilingualLocked ? true : settings.language === lng}
            title={
              bilingualLocked
                ? t('recipes.bilingualLocked', 'This page already shows English and Spanish together.')
                : undefined
            }
            className={`px-2.5 py-1.5 text-xs font-semibold ${
              lng === 'en'
                ? 'rounded-l-full bg-sky-600 text-white'
                : 'rounded-r-full bg-amber-600 text-white'
            } ${bilingualLocked ? 'cursor-not-allowed' : ''}`}
          >
            {lng.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );

  /** Logo button. */
  const LogoButton = () => (
    <button
      className="flex h-[2.6rem] max-h-[2.6rem] shrink-0 items-center gap-[calc(0.5rem*1.15)] overflow-hidden text-gaia-700"
      aria-label={t('nav.home', 'Home')}
      onClick={() => goto('welcome')}
    >
      <img
        src={brandIcon}
        alt=""
        className="h-9 w-9 max-h-9 max-w-9 shrink-0 select-none rounded-xl object-contain"
        style={{ width: '2.5875rem', height: '2.5875rem', maxWidth: '2.5875rem', maxHeight: '2.5875rem' }}
        draggable={false}
      />
      <span className="hidden whitespace-nowrap text-[calc(1rem*1.15)] font-semibold leading-none tracking-tight sm:inline">
        {t('app.name')}
      </span>
    </button>
  );

  return (
    <div className="flex h-full flex-col">
      {/* ── Header (classic responsive + desktop; hidden on streamlined phone) ─ */}
      {!streamlinedMobile && (
      <header className={`relative overflow-visible border-b border-slate-200 bg-white/90 backdrop-blur safe-top ${openNavGroup ? 'z-40' : 'z-20'}`}>
        {/* ── Phone header row ─────────────────────────────────────────────── */}
        <div className="flex h-[70px] min-h-[70px] flex-nowrap items-center justify-between gap-2 px-3 py-2 sm:hidden">
          <LogoButton />
          <div className="flex shrink-0 items-center gap-1">
            <LangSwitcher />
            <button onClick={() => goto('settings')} className="btn btn-ghost shrink-0 p-2" aria-label={t('nav.settings')}>
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Phone nav — slot kept, hidden in Training Mode */}
        <div
          ref={mobileNavRef}
          className={`overflow-x-auto overflow-y-visible whitespace-nowrap border-t border-slate-100 px-2 py-1.5 no-scrollbar hide-scrollbar sm:hidden ${
            navInteractionLocked ? 'pointer-events-none invisible' : ''
          }`}
          aria-hidden={navInteractionLocked}
        >
          <nav className="inline-flex w-max min-w-full items-center gap-1" data-tour="nav-tabs">
            {NAV_GROUPS.map(({ id, labelKey, defaultLabel }) => {
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
                    className={`flex max-w-[11rem] items-center gap-1 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
                      isGroupActive ? 'bg-gaia-50 text-gaia-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                    }`}
                  >
                    <span className="truncate">{t(labelKey, defaultLabel)}</span>
                    {activeTab && (
                      <span className="truncate text-xs font-normal text-gaia-600">
                        · {t(activeTab.labelKey, activeTab.defaultLabel)}
                      </span>
                    )}
                    <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isOpen && (
                    <div role="menu" className="absolute left-0 top-full z-[100] mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                      {tabs.map(({ id: tabId, labelKey: tabLabelKey, defaultLabel: tabDefault, icon: Icon }) => (
                        <button
                          key={tabId}
                          type="button"
                          role="menuitem"
                          onClick={() => { goto(tabId); setOpenNavGroup(null); }}
                          className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                            screen === tabId ? 'bg-gaia-50 font-medium text-gaia-700' : 'text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{t(tabLabelKey, tabDefault)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>

        {/* ── Desktop header — fixed grid so toggling Training Mode never reflows ── */}
        <div className="hidden sm:grid sm:h-[70px] sm:min-h-[70px] sm:grid-cols-[1fr_auto] sm:items-center sm:gap-x-3 sm:px-6 sm:py-2">
          
          <div className="flex min-w-0 items-center gap-3">
            <LogoButton />
            <div
              ref={navRef}
              className={`min-w-0 overflow-visible ${navInteractionLocked ? 'pointer-events-none invisible' : ''}`}
              aria-hidden={navInteractionLocked}
            >
            <nav className="inline-flex items-center gap-1" data-tour="nav-tabs">
              {NAV_GROUPS.map(({ id, labelKey, defaultLabel }) => {
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
                      className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
                        className="absolute left-0 top-full z-[100] mt-1 min-w-[12rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
                      >
                        {tabs.map(({ id: tabId, labelKey: tabLabelKey, defaultLabel: tabDefault, icon: Icon }) => {
                          const isActive = screen === tabId;
                          const hasDraftWip = tabId === 'drafts' && !!activeDraftId;
                          return (
                            <button
                              key={tabId}
                              type="button"
                              role="menuitem"
                              onClick={() => { goto(tabId); setOpenNavGroup(null); }}
                              className={`relative flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                                isActive
                                  ? 'bg-gaia-50 font-medium text-gaia-700'
                                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                              }`}
                            >
                              <Icon className="h-4 w-4 shrink-0" />
                              <span className="min-w-0 flex-1 truncate">{t(tabLabelKey, tabDefault)}</span>
                              {hasDraftWip && (
                                <span className="h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
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
          </div>

          <div className="flex shrink-0 flex-nowrap items-center justify-end gap-[calc(0.5rem*1.035)] whitespace-nowrap">
            <button
              onClick={() => goto('promptBuilder')}
              title={t('nav.promptBuilder', 'AI Prompt')}
              aria-hidden={navInteractionLocked}
              tabIndex={navInteractionLocked ? -1 : undefined}
              className={`btn flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-2 text-sm font-semibold transition-colors ${
                navInteractionLocked ? 'pointer-events-none invisible' : ''
              } ${
                screen === 'promptBuilder'
                  ? 'bg-gaia-100 text-gaia-700'
                  : 'bg-gaia-50 text-gaia-600 ring-1 ring-gaia-200 hover:bg-gaia-100 hover:text-gaia-700'
              }`}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">{t('nav.promptBuilder', 'AI Prompt')}</span>
            </button>
            <span
              data-nav="hi-rosa"
              className="hidden lg:inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full bg-gaia-50 pl-3 pr-2 py-1.5 font-medium text-gaia-700 ring-1 ring-gaia-100"
            >
              <span className="shrink-0 pr-2 text-[1.00625rem] leading-[1.4375rem]">
                🌹 {t('common.greeting', 'Hi Rosa!')}
              </span>
              <span className="inline-flex shrink-0">
                <LocalAiStatusBadge settings={settings} />
              </span>
            </span>
            <button
              type="button"
              onClick={() => goto('drafts')}
              title={t('welcome.savedDesigns', 'Saved Designs')}
              aria-label={t('welcome.savedDesigns', 'Saved Designs')}
              data-nav="saved-designs"
              className="saved-designs-pill btn inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-white shadow-md hover:shadow-lg"
              style={{ backgroundColor: '#0d9488', color: '#ffffff' }}
            >
              <FolderOpen className="h-5 w-5 shrink-0" />
              <span>{t('welcome.savedDesigns', t('nav.workspace', 'Saved Designs'))}</span>
            </button>
            <div className="shrink-0">
              <LangSwitcher />
            </div>
            <button
              onClick={() => goto('settings')}
              title={t('nav.settings', 'Settings')}
              aria-label={t('nav.settings', 'Settings')}
              className="btn btn-ghost shrink-0 p-2"
            >
              <SettingsIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      )}

      {/* ── Streamlined phone header ───────────────────────────────────────── */}
      {streamlinedMobile && (
        <header className="relative z-20 border-b border-slate-200 bg-white/90 backdrop-blur safe-top">
          <div className="flex h-[70px] min-h-[70px] items-center justify-between gap-2 px-4 py-2">
            <LogoButton />
            <div className="flex items-center gap-1">
              <LangSwitcher />
              <button
                onClick={() => goto('settings')}
                title={t('nav.settings', 'Settings')}
                aria-label={t('nav.settings', 'Settings')}
                className="btn btn-ghost shrink-0 p-2"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>
      )}

      {/* ── Stepper sub-header (all workflow screens, including editor) ───────── */}
      {/* relative + z-30 ensures the stepper's absolutely-positioned tooltips
          (which pop up above the step pills, right at the header boundary)
          stack above BOTH the header (z-20) and the <main> element below. */}
      {showStepper && <div className="relative z-30"><WorkflowStepper /></div>}

      <main className={`relative min-h-0 flex-1 overflow-hidden ${showMobileTabs ? 'pb-mobile-nav' : ''}`}>
        <Suspense fallback={<ScreenLoader label={t('common.loading')} />}>
          {screen === 'welcome'       && <WelcomeScreen />}
          {screen === 'template'      && <TemplateScreen />}
          {screen === 'background'    && <BackgroundScreen />}
          {screen === 'editor-v2'     && <EditorScreenV2 />}
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
