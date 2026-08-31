import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  MinusCircle,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { Ingredient, IngredientCategory } from '@/types';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import { MODULAR_BENEFITS } from '@/data/benefits';
import { getBenefitCategoryLabel, getBenefitLabel } from '@/lib/benefitI18n';
import { isDefaultSoapBaseName } from '@/data/ingredientSeed';
import { findOfflineIngredientCatalogEntry, resolveBundledIngredientPngSlug } from '@/lib/ingredientCatalog';
import { rankByQuery } from '@/lib/catalogSearchRank';
import { getCategoryLabel, getIngredientDisplayName, ingredientMatchesQuery } from '@/lib/ingredientI18n';
import { backfillMissingIngredientSpanishNames, resolveIngredientSpanishName } from '@/lib/ingredientNameTranslate';
import IngredientIcon, { CATEGORY_LABELS } from '@/components/common/IngredientIcon';
import BilingualIngredientName from '@/components/common/BilingualIngredientName';
import Modal from '@/components/common/Modal';
import SmartPastePanel from '@/components/common/SmartPastePanel';
import { useAppStore } from '@/store/useAppStore';

const emptyForm = {
  name: '', benefit: '', inci: '', isSoapBase: false, active: false,
  category: 'other' as IngredientCategory,
};

/** The catalog runs to 670+ rows, so the library pane pages instead of scrolling forever. */
const INACTIVE_PAGE_SIZE = 25;

/** Categories shown as filter tabs — 'all' is synthetic */
const FILTER_CATS: Array<'all' | IngredientCategory> = [
  'all',
  'base',
  'oil',
  'butter',
  'fragrance',
  'essential-oil',
  'botanical',
  'floral',
  'citrus',
  'clay',
  'exfoliant',
  'milk',
  'wax',
  'colorant',
  'spice',
  'additive',
  'other',
];

/** Top ingredients that most glycerin soap makers use — shown as one-click chips */
const QUICK_ACTIVATE_NAMES = [
  'Glycerin Base (Clear)',
  'Glycerin Base (White)',
  'Shea Butter',
  'Cocoa Butter',
  'Vitamin E Oil',
  'Lavender EO',
  'Peppermint EO',
  'Tea Tree EO',
  'Lavender Fragrance Oil',
  'Vanilla Bean Fragrance Oil',
  'Kaolin Clay',
  'Activated Charcoal',
  'Colloidal Oatmeal',
  'Aloe Vera',
  'Calendula',
  'Honey Powder',
  'Goat Milk Powder',
  'Mica Powder',
  'Fragrance Oil (Custom)',
];

export default function IngredientsScreen() {
  const { t } = useTranslation();
  const previousScreen = useAppStore((s) => s.previousScreen);
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);
  const cameFromRecipes = previousScreen === 'recipes';
  const [all, setAll] = useState<Ingredient[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [inactiveQuery, setInactiveQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [catFilter, setCatFilter] = useState<'all' | IngredientCategory>('all');
  // Arriving from Recipes means the user came here specifically to activate items.
  const [libraryOpen, setLibraryOpen] = useState(cameFromRecipes);
  const [inactivePage, setInactivePage] = useState(1);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [trimConfirmOpen, setTrimConfirmOpen] = useState(false);
  const [trimPreview, setTrimPreview] = useState<{ deactivate: number; keep: number; recipeCount: number } | null>(null);
  const [trimming, setTrimming] = useState(false);
  const [trimDone, setTrimDone] = useState<number | null>(null);
  const [activateToast, setActivateToast] = useState<{ ids: string[]; label: string } | null>(null);
  const activateToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (activateToastTimer.current) clearTimeout(activateToastTimer.current);
  }, []);

  const dismissActivateToast = () => {
    if (activateToastTimer.current) clearTimeout(activateToastTimer.current);
    setActivateToast(null);
  };

  const showActivateToast = (ids: string[], label: string) => {
    if (activateToastTimer.current) clearTimeout(activateToastTimer.current);
    setActivateToast({ ids, label });
    activateToastTimer.current = setTimeout(() => setActivateToast(null), 6000);
  };

  const undoActivate = async () => {
    if (!activateToast) return;
    const { ids } = activateToast;
    dismissActivateToast();
    await Promise.all(ids.map((id) => ingredientsRepo.update(id, { active: false })));
    void reload();
  };

  const reload = async () => {
    const items = await ingredientsRepo.all();
    setAll(items);
    return items;
  };

  const persistSpanishName = async (ingredient: Ingredient) => {
    const result = await resolveIngredientSpanishName(ingredient.name, settings, {
      nameEs: ingredient.nameEs,
      inci: ingredient.inci,
    });
    if (!result.text || result.text === ingredient.nameEs) return ingredient;
    await ingredientsRepo.update(ingredient.id, { nameEs: result.text });
    setAll((prev) => prev.map((row) => (row.id === ingredient.id ? { ...row, nameEs: result.text } : row)));
    return { ...ingredient, nameEs: result.text };
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const items = await ingredientsRepo.all();
      if (cancelled) return;
      setAll(items);
      const currentSettings = useAppStore.getState().settings;
      void backfillMissingIngredientSpanishNames(
        items,
        currentSettings,
        async (id, nameEs) => {
          await ingredientsRepo.update(id, { nameEs });
        },
        (id, nameEs) => {
          if (!cancelled) {
            setAll((prev) => prev.map((row) => (row.id === id ? { ...row, nameEs } : row)));
          }
        },
      );
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const active   = useMemo(() => all.filter((i) => i.active === true), [all]);
  const inactive = useMemo(() => all.filter((i) => i.active !== true), [all]);

  const filteredInactive = useMemo(() => {
    const q   = inactiveQuery.trim();
    const cat = catFilter === 'all' ? inactive : inactive.filter((i) => (i.category ?? 'other') === catFilter);
    if (!q) return cat;
    return rankByQuery(cat.filter((i) => ingredientMatchesQuery(i, q)), q);
  }, [inactive, inactiveQuery, catFilter]);

  const filteredActive = useMemo(() => {
    const q = activeQuery.trim();
    if (!q) return active;
    return rankByQuery(active.filter((i) => ingredientMatchesQuery(i, q)), q);
  }, [active, activeQuery]);

  const inactivePageCount = Math.max(1, Math.ceil(filteredInactive.length / INACTIVE_PAGE_SIZE));

  useEffect(() => { setInactivePage(1); }, [inactiveQuery, catFilter]);

  // Activating or deleting items can shrink the list past the current page.
  useEffect(() => {
    setInactivePage((page) => Math.min(page, inactivePageCount));
  }, [inactivePageCount]);

  const pagedInactive = useMemo(() => {
    const start = (inactivePage - 1) * INACTIVE_PAGE_SIZE;
    return filteredInactive.slice(start, start + INACTIVE_PAGE_SIZE);
  }, [filteredInactive, inactivePage]);

  /** Count per category for the tab badges */
  const catCounts = useMemo<Record<string, number>>(() => {
    const counts: Record<string, number> = { all: inactive.length };
    for (const i of inactive) {
      const cat = i.category ?? 'other';
      counts[cat] = (counts[cat] ?? 0) + 1;
    }
    return counts;
  }, [inactive]);

  const toggle = async (id: string) => {
    const ing = all.find((i) => i.id === id);
    if (!ing) return;
    if (ing.active) {
      await ingredientsRepo.toggleActive(id);
    } else {
      await ingredientsRepo.toggleActive(id);
      showActivateToast(
        [id],
        t('ingredients.activatedToast', '{{name}} added to active ingredients', {
          name: getIngredientDisplayName(ing.name, t),
        }),
      );
    }
    void reload();
  };

  /** Activate all currently visible inactive items */
  const activateAllVisible = async () => {
    const toActivate = filteredInactive.filter((i) => !i.active);
    if (toActivate.length === 0) return;
    await Promise.all(toActivate.map((i) => ingredientsRepo.toggleActive(i.id)));
    showActivateToast(
      toActivate.map((i) => i.id),
      toActivate.length === 1
        ? t('ingredients.activatedToast', '{{name}} added to active ingredients', {
            name: getIngredientDisplayName(toActivate[0].name, t),
          })
        : t('ingredients.activatedBatchToast', '{{count}} ingredients added to active', {
            count: toActivate.length,
          }),
    );
    void reload();
  };

  /** One-click quick-activate a named ingredient (auto-seeds if not in DB) */
  const quickActivate = async (name: string) => {
    const existing = all.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!existing.active) {
        await ingredientsRepo.toggleActive(existing.id);
        showActivateToast(
          [existing.id],
          t('ingredients.activatedToast', '{{name}} added to active ingredients', {
            name: getIngredientDisplayName(existing.name, t),
          }),
        );
      }
      void persistSpanishName(existing);
    } else {
      const entry = findOfflineIngredientCatalogEntry(name);
      const created = await ingredientsRepo.create({
        name,
        benefit: '',
        inci: entry?.inci ?? '',
        nameEs: entry?.nameEs,
        isSoapBase: entry?.category === 'base',
        active: true,
        category: entry?.category ?? 'other',
        iconKey: resolveBundledIngredientPngSlug(name, entry?.iconKey),
      });
      showActivateToast(
        [created.id],
        t('ingredients.activatedToast', '{{name}} added to active ingredients', {
          name: getIngredientDisplayName(name, t),
        }),
      );
      await reload();
      void persistSpanishName(created);
      return;
    }
    await reload();
  };

  const openTrimConfirm = async () => {
    const recipes = await recipesRepo.all();
    const usedIds = new Set<string>();
    for (const r of recipes) {
      for (const id of r.ingredientIds) usedIds.add(id);
    }
    const toKeep = active.filter((i) => usedIds.has(i.id)).length;
    const toDeactivate = active.filter((i) => !usedIds.has(i.id)).length;
    setTrimPreview({ deactivate: toDeactivate, keep: toKeep, recipeCount: recipes.length });
    setTrimConfirmOpen(true);
  };

  const trimToRecipes = async () => {
    setTrimming(true);
    setTrimDone(null);
    try {
      const recipes = await recipesRepo.all();
      const usedIds = new Set<string>();
      for (const r of recipes) {
        for (const id of r.ingredientIds) usedIds.add(id);
      }
      const deactivated = await ingredientsRepo.deactivateExcept(usedIds);
      await reload();
      setTrimConfirmOpen(false);
      setTrimDone(deactivated);
      setTimeout(() => setTrimDone(null), 4000);
    } catch (err) {
      console.error('[Ingredients] Failed to trim active list to recipes:', err);
    } finally {
      setTrimming(false);
    }
  };

  const save = async () => {
    if (!form.name.trim()) return;
    let saved: Ingredient;
    if (editingId) {
      const current = all.find((row) => row.id === editingId);
      await ingredientsRepo.update(editingId, form);
      saved = { ...(current as Ingredient), ...form };
    } else {
      saved = await ingredientsRepo.create(form);
    }
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
    await reload();
    void persistSpanishName(saved);
  };

  const startEdit = useCallback((i: Ingredient) => {
    setEditingId(i.id);
    setForm({
      name: i.name, benefit: i.benefit, inci: i.inci ?? '',
      isSoapBase: i.isSoapBase, active: i.active,
      category: (i.category ?? 'other') as IngredientCategory,
    });
    setFormOpen(true);
  }, []);

  const remove = useCallback((id: string) => setConfirmDeleteId(id), []);

  const doRemove = async (id: string) => {
    setConfirmDeleteId(null);
    await ingredientsRepo.remove(id);
    if (editingId === id) { setEditingId(null); setForm(emptyForm); setFormOpen(false); }
    void reload();
  };

  /** Quick-activate chips — only show those not yet active */
  const quickChips = QUICK_ACTIVATE_NAMES.filter(
    (n) => !active.some((a) => a.name.toLowerCase() === n.toLowerCase()),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-6xl px-4 py-6">

        {/* ── Context banner when arriving from Recipes ───────────────────── */}
        {cameFromRecipes && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gaia-50 px-5 py-4 ring-1 ring-gaia-200">
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-gaia-600" />
              <p className="text-sm text-slate-700">{t('ingredients.activateHint')}</p>
            </div>
            <button
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gaia-300 bg-white px-3 py-1.5 text-xs font-semibold text-gaia-700 transition hover:bg-gaia-50"
              onClick={() => goto('recipes')}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t('ingredients.backToRecipes')}
            </button>
          </div>
        )}

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gaia-900">{t('ingredients.title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">{t('ingredients.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-primary"
              onClick={() => { setEditingId(null); setForm(emptyForm); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4" /> {t('ingredients.new')}
            </button>
          </div>
        </div>

        <div className="card mt-4">
          <SmartPastePanel variant="suggest" onSaved={() => void reload()} />
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-gaia-600 px-4 py-2 text-sm text-white">
            <Star className="h-4 w-4" />
            <span className="font-semibold">{active.length}</span>
            <span className="opacity-80">{t('ingredients.activeCount', 'Active')}</span>
          </div>
          <button
            type="button"
            onClick={() => setLibraryOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 transition hover:ring-gaia-300"
          >
            <FlaskConical className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">{inactive.length}</span>
            <span className="text-slate-400">{t('ingredients.inactiveCount', 'in library')}</span>
          </button>
          {active.length > 0 && (
            <button
              type="button"
              className="btn-secondary py-2 text-xs"
              onClick={() => void openTrimConfirm()}
              title={t('ingredients.trimToRecipesHint', 'Move active ingredients not used in any saved recipe back to the library')}
            >
              <MinusCircle className="h-4 w-4" />
              {t('ingredients.trimToRecipes', 'Trim To Recipes')}
            </button>
          )}
          {trimDone !== null && trimDone > 0 && (
            <span className="text-xs font-medium text-emerald-700">
              {t('ingredients.trimDone', '{{count}} moved to inactive', { count: trimDone })}
            </span>
          )}
        </div>

        {/* ── Quick-activate chips ────────────────────────────────────────── */}
        {quickChips.length > 0 && inactive.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <p className="mb-2 flex items-center gap-1.5 ui-label font-semibold uppercase tracking-wide text-gaia-700">
              <Zap className="h-3.5 w-3.5" />
              {t('ingredients.quickActivate', 'Quick-activate popular ingredients')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {quickChips.slice(0, 15).map((name) => (
                <button
                  key={name}
                  onClick={() => void quickActivate(name)}
                  className="rounded-full border border-gaia-200 bg-gaia-50 px-2.5 py-1 text-xs font-medium text-gaia-700 transition hover:bg-gaia-100 active:scale-95"
                >
                  + {getIngredientDisplayName(name, t)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Dual pane ──────────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:grid-rows-[auto_auto_auto_minmax(12rem,30rem)]">

          {/* INACTIVE pane — collapsed by default so the 670-item catalog stays out of the way */}
          {!libraryOpen ? (
            <button
              type="button"
              onClick={() => setLibraryOpen(true)}
              className="flex items-center justify-between gap-3 self-start rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-left text-slate-400 transition hover:border-gaia-300 hover:bg-white hover:text-slate-600 lg:row-span-4"
            >
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 shrink-0" />
                <span className="text-sm font-semibold uppercase tracking-wide">
                  {t('ingredients.inactiveTitle', 'Library (inactive)')}
                </span>
                <span className="chip bg-slate-200 text-slate-500">{inactive.length}</span>
              </span>
              <span className="flex items-center gap-1 text-xs font-medium">
                {t('ingredients.browseLibrary', 'Browse')}
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          ) : (
          <div className="grid gap-3 lg:row-span-4 lg:grid-rows-subgrid">
            <div className="flex min-h-8 items-center justify-between">
              <button
                type="button"
                onClick={() => setLibraryOpen(false)}
                className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-slate-500 transition hover:text-gaia-700"
              >
                <ChevronDown className="h-4 w-4" />
                {t('ingredients.inactiveTitle', 'Library (inactive)')}
              </button>
              <div className="flex items-center gap-2">
                <span className="chip">{filteredInactive.length}</span>
                {filteredInactive.length > 0 && catFilter !== 'all' && (
                  <button
                    className="rounded-lg bg-gaia-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-gaia-700"
                    onClick={() => void activateAllVisible()}
                    title={t('ingredients.activateAllVisible', 'Activate All Shown')}
                  >
                    {t('ingredients.activateAll', 'Activate All')}
                  </button>
                )}
              </div>
            </div>

            {/* Category filter tabs — row height syncs with active pane via subgrid */}
            <div className="flex flex-wrap content-start gap-1">
              {FILTER_CATS.map((cat) => {
                const count = catCounts[cat] ?? 0;
                if (cat !== 'all' && count === 0) return null;
                return (
                  <button
                    key={cat}
                    onClick={() => setCatFilter(cat)}
                    className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                      catFilter === cat
                        ? 'bg-gaia-600 text-white'
                        : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-gaia-50'
                    }`}
                  >
                    {cat === 'all' ? t('ingredients.categoryAll', 'All') : getCategoryLabel(cat as IngredientCategory, t)}
                    <span className={`rounded-full px-1 text-[9px] font-bold ${catFilter === cat ? 'bg-white/20' : 'bg-slate-100'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={t('common.search', 'Search…')}
                value={inactiveQuery}
                onChange={(e) => setInactiveQuery(e.target.value)}
              />
            </div>

            <div className="flex min-h-0 flex-col gap-2">
              <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {filteredInactive.length === 0 ? (
                  <div className="rounded-xl bg-white py-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
                    {inactiveQuery ? t('ingredients.noResults', 'No results') : t('ingredients.allActive', 'All seeded — great!')}
                  </div>
                ) : (
                  pagedInactive.map((i) => (
                    <IngredientRow
                      key={i.id} ing={i}
                      onToggle={toggle}
                      onEdit={startEdit}
                      onDelete={remove}
                      isActive={false}
                    />
                  ))
                )}
              </div>

              {filteredInactive.length > INACTIVE_PAGE_SIZE && (
                <div className="flex shrink-0 items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 text-xs text-slate-500 ring-1 ring-slate-100">
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={inactivePage <= 1}
                    onClick={() => setInactivePage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    {t('common.previous', 'Previous')}
                  </button>
                  <span className="text-[11px]">
                    {t('ingredients.pageOf', 'Page {{page}} of {{total}}', {
                      page: inactivePage,
                      total: inactivePageCount,
                    })}
                  </span>
                  <button
                    type="button"
                    className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
                    disabled={inactivePage >= inactivePageCount}
                    onClick={() => setInactivePage((p) => Math.min(inactivePageCount, p + 1))}
                  >
                    {t('common.next', 'Next')}
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
          )}

          {/* ACTIVE pane */}
          <div className="grid gap-3 lg:row-span-4 lg:grid-rows-subgrid">
            <div className="flex min-h-8 items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gaia-700">
                <Star className="h-3.5 w-3.5 shrink-0 fill-gaia-500 text-gaia-500" />
                {t('ingredients.activeTitle', 'My Active Ingredients')}
              </h2>
              <span className="chip bg-gaia-100 text-gaia-700">{filteredActive.length}</span>
            </div>

            {/* Empty toolbar row — stretches to match category filters on the left */}
            <div aria-hidden="true" />

            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={t('common.search', 'Search…')}
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
              />
            </div>

            <div className="min-h-0 space-y-1.5 overflow-y-auto pr-1">
              {filteredActive.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gaia-200 bg-gaia-50 py-8 text-center">
                  <Star className="mx-auto mb-2 h-6 w-6 text-gaia-300" />
                  <p className="text-sm text-slate-500">{t('ingredients.emptyActive', 'No active ingredients yet.')}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {t('ingredients.emptyActiveHint', 'Click any ingredient in the library or use the quick-chips above.')}
                  </p>
                </div>
              ) : (
                filteredActive.map((i) => (
                  <IngredientRow
                    key={i.id} ing={i}
                    onToggle={toggle}
                    onEdit={startEdit}
                    onDelete={remove}
                    isActive
                  />
                ))
              )}
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-400">
          {t('ingredients.activeHint', 'Active ingredients appear in recipe building. Toggle them on/off any time.')}
        </p>
      </div>

      {/* ── Add / Edit modal ────────────────────────────────────────────── */}
      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <button
              className="icon-btn absolute right-3 top-3"
              aria-label={t('common.close')}
              onClick={() => { setFormOpen(false); setEditingId(null); setForm(emptyForm); }}
            >
              <X className="h-4 w-4" />
            </button>
            <h2 className="text-base font-semibold text-slate-800">
              {editingId ? t('common.edit') : t('ingredients.new')} {t('ingredients.title', 'Ingredient').toLowerCase()}
            </h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="label">{t('ingredients.name', 'Name')}</label>
                <input
                  className="input" autoFocus
                  placeholder={t('ingredients.namePlaceholder', 'e.g. Lavender EO')}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && void save()}
                />
              </div>
              <div>
                <label className="label">
                  {t('ingredients.benefit', 'Benefit')}
                  <span className="ml-1 font-normal normal-case text-slate-400">— {t('common.optional', 'Optional')}</span>
                </label>
                <BenefitCombo value={form.benefit} onChange={(v) => setForm({ ...form, benefit: v })} />
              </div>
              <div>
                <label className="label">
                  {t('ingredients.inci', 'INCI Name')}
                  <span className="ml-1 font-normal normal-case text-slate-400">— {t('common.optional', 'Optional')}</span>
                </label>
                <input
                  className="input"
                  placeholder={t('ingredients.inciPlaceholder', 'e.g. Lavandula Angustifolia Oil')}
                  value={form.inci}
                  onChange={(e) => setForm({ ...form, inci: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('ingredients.category', 'Category')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {(Object.keys(CATEGORY_LABELS) as IngredientCategory[]).map((cat) => (
                    <button
                      key={cat} type="button"
                      onClick={() => setForm({ ...form, category: cat })}
                      className={`flex items-center gap-1 rounded-lg border px-2 py-1 text-xs font-medium transition ${
                        form.category === cat
                          ? 'border-gaia-500 bg-gaia-50 text-gaia-700'
                          : 'border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <IngredientIcon category={cat} size="sm" />
                      {getCategoryLabel(cat, t)}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox" className="h-4 w-4 accent-gaia-600"
                  checked={form.isSoapBase}
                  onChange={(e) => setForm({ ...form, isSoapBase: e.target.checked })}
                />
                {t('ingredients.isSoapBase', 'This is a soap base (glycerin / M&P)')}
              </label>
              <div className="flex gap-2 pt-1">
                <button className="btn-primary flex-1" disabled={!form.name.trim()} onClick={() => void save()}>
                  {t('common.save', 'Save')}
                </button>
                <button className="btn-secondary" onClick={() => { setFormOpen(false); setEditingId(null); setForm(emptyForm); }}>
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
      <Modal
        open={trimConfirmOpen}
        onClose={() => !trimming && setTrimConfirmOpen(false)}
        width={420}
        title={
          <span className="flex items-center gap-2 text-slate-800">
            <MinusCircle className="h-5 w-5 shrink-0 text-gaia-600" />
            {t('ingredients.trimToRecipesTitle', 'Trim active ingredients?')}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" disabled={trimming} onClick={() => setTrimConfirmOpen(false)}>
              {t('common.cancel')}
            </button>
            <button
              className="btn-primary"
              disabled={trimming || !trimPreview || (trimPreview.recipeCount === 0) || trimPreview.deactivate === 0}
              onClick={() => void trimToRecipes()}
            >
              {trimming ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t('ingredients.trimConfirm', 'Deactivate Unused')}
            </button>
          </div>
        }
      >
        {trimPreview?.recipeCount === 0 ? (
          <p className="text-sm text-slate-600">
            {t('ingredients.trimNoRecipes', 'Create at least one recipe first — there is nothing to match against.')}
          </p>
        ) : trimPreview ? (
          <div className="space-y-2 text-sm text-slate-600">
            <p>{t('ingredients.trimBody', 'Only ingredients used in your saved recipes will stay active. Everything else moves back to the library.')}</p>
            <ul className="list-inside list-disc space-y-1 text-slate-700">
              <li>{t('ingredients.trimKeep', '{{count}} kept active', { count: trimPreview.keep })}</li>
              <li>{t('ingredients.trimRemove', '{{count}} deactivated', { count: trimPreview.deactivate })}</li>
            </ul>
            {trimPreview.deactivate === 0 && (
              <p className="text-xs text-emerald-700">
                {t('ingredients.trimNothingToDo', 'All active ingredients are already used in a recipe.')}
              </p>
            )}
          </div>
        ) : null}
      </Modal>

      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        width={360}
        title={
          <span className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {t('common.confirmDeleteTitle')}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              onClick={() => { if (confirmDeleteId) void doRemove(confirmDeleteId); }}
            >
              {t('common.delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t('common.confirmDeleteBody')}</p>
      </Modal>

      {activateToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] left-1/2 z-50 flex max-w-[min(24rem,calc(100vw-2rem))] -translate-x-1/2 items-center gap-3 rounded-2xl bg-slate-800 px-4 py-3 text-sm text-white shadow-xl ring-1 ring-slate-700"
        >
          <span className="min-w-0 flex-1 truncate">{activateToast.label}</span>
          <button
            type="button"
            className="shrink-0 rounded-lg bg-white/10 px-3 py-1 text-xs font-semibold text-gaia-200 transition hover:bg-white/20 hover:text-white"
            onClick={() => void undoActivate()}
          >
            {t('editor.undo', 'Undo')}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Ingredient row ────────────────────────────────────────────────────────────

const IngredientRow = memo(function IngredientRow({
  ing, onToggle, onEdit, onDelete, isActive,
}: {
  ing: Ingredient;
  onToggle: (id: string) => void;
  onEdit: (ing: Ingredient) => void;
  onDelete: (id: string) => void;
  isActive: boolean;
}) {
  const { t } = useTranslation();
  const lockedBase = isDefaultSoapBaseName(ing.name);
  const actionBtn =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition';
  return (
    <div className={`grid min-h-[3.25rem] w-full min-w-0 grid-cols-[2rem_minmax(0,1fr)_5.5rem] items-center gap-x-2 rounded-xl px-3 py-2 ring-1 transition ${
      isActive ? 'bg-gaia-50 ring-gaia-200' : 'bg-white ring-slate-100 hover:ring-slate-200'
    }`}>
      <IngredientIcon category={ing.category} name={ing.name} iconKey={ing.iconKey} className="shrink-0" />

      <button
        type="button"
        className="grid min-w-0 w-full grid-cols-[1.25rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-center gap-x-2 text-left"
        onClick={() => onToggle(ing.id)}
        title={isActive ? t('ingredients.deactivate', 'Deactivate') : t('ingredients.activate', 'Activate')}
      >
        <BilingualIngredientName
          layout="contents"
          name={ing.name}
          inci={ing.inci}
          nameEs={ing.nameEs}
          aliases={ing.aliases}
          subtitle={(
            <span className="mt-0.5 flex min-w-0 flex-col gap-0.5">
              {ing.isSoapBase && (
                <span className="inline-flex w-fit shrink-0 items-center rounded-full bg-gaia-100 px-1.5 py-0.5 text-[10px] font-medium text-gaia-700">
                  {t('ingredients.soapBaseTag', 'Base')}
                </span>
              )}
              {ing.benefit && (
                <span className="truncate text-xs text-slate-400">{ing.benefit}</span>
              )}
            </span>
          )}
        />
      </button>

      <div className="flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={() => onToggle(ing.id)}
          title={isActive ? t('ingredients.deactivate', 'Deactivate') : t('ingredients.activate', 'Activate')}
          className={`${actionBtn} ${
            isActive ? 'bg-gaia-600 text-white hover:bg-gaia-700' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
          }`}
        >
          {isActive ? <ChevronLeft className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>

        <button
          type="button"
          className={`${actionBtn} text-slate-600 hover:bg-slate-100`}
          title={t('common.edit', 'Edit')}
          onClick={() => onEdit(ing)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        {!lockedBase && (
          <button
            type="button"
            className={`${actionBtn} text-rose-400 hover:bg-rose-50`}
            title={t('common.delete', 'Delete')}
            onClick={() => onDelete(ing.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
});

// ── BenefitCombo ──────────────────────────────────────────────────────────────

function BenefitCombo({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <input
        className="input pr-24"
        placeholder={t('ingredients.benefitPlaceholder', 'e.g. Moisturising, anti-aging')}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      />
      <button
        type="button"
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-[11px] font-medium text-gaia-600 hover:bg-gaia-50"
        onMouseDown={(e) => { e.preventDefault(); setOpen((o) => !o); }}
      >
        {t('ingredients.quickPick', 'Quick-pick')}
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-52 overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
          {MODULAR_BENEFITS.map((b) => (
            <button
              key={b.id} type="button"
              className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-gaia-50"
              onClick={() => { onChange(getBenefitLabel(b, t)); setOpen(false); }}
            >
              <span className="font-medium text-gaia-700">{getBenefitCategoryLabel(b.category, t)}</span>
              {' — '}
              {getBenefitLabel(b, t)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
