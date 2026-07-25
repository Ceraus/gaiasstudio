import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  Loader2,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { Ingredient, IngredientCategory } from '@/types';
import { ingredientsRepo } from '@/db/repositories';
import { MODULAR_BENEFITS } from '@/data/benefits';
import { INGREDIENT_CATALOG_SIZE, INGREDIENT_SEED, syncIngredientCatalog } from '@/data/ingredientSeed';
import IngredientIcon, { CATEGORY_LABELS } from '@/components/common/IngredientIcon';
import WorkflowNav from '@/components/WorkflowNav';
import Modal from '@/components/common/Modal';
import { useAppStore } from '@/store/useAppStore';

const emptyForm = {
  name: '', benefit: '', inci: '', isSoapBase: false, active: false,
  category: 'other' as IngredientCategory,
};

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
  const cameFromRecipes = previousScreen === 'recipes';
  const [all, setAll] = useState<Ingredient[]>([]);
  const [form, setForm] = useState<typeof emptyForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [inactiveQuery, setInactiveQuery] = useState('');
  const [activeQuery, setActiveQuery] = useState('');
  const [seeding, setSeeding] = useState(false);
  const [syncDone, setSyncDone] = useState(false);
  const [lastSyncAdded, setLastSyncAdded] = useState(0);
  const [catFilter, setCatFilter] = useState<'all' | IngredientCategory>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reload = async () => {
    const items = await ingredientsRepo.all();
    setAll(items);
  };

  useEffect(() => {
    const init = async () => {
      setSeeding(true);
      try {
        const existing = await ingredientsRepo.all();
        if (existing.length < INGREDIENT_CATALOG_SIZE) {
          await syncIngredientCatalog();
        }
        await reload();
      } catch (err) {
        console.error('[Ingredients] Failed to sync catalog on mount:', err);
      } finally {
        setSeeding(false);
      }
    };
    void init();
  }, []);

  const syncCatalog = async () => {
    setSeeding(true);
    setSyncDone(false);
    try {
      const { added } = await syncIngredientCatalog();
      await reload();
      setLastSyncAdded(added);
      setSyncDone(true);
      setTimeout(() => setSyncDone(false), 3000);
    } catch (err) {
      console.error('[Ingredients] Failed to sync catalog:', err);
    } finally {
      setSeeding(false);
    }
  };

  const active   = useMemo(() => all.filter((i) => i.active === true), [all]);
  const inactive = useMemo(() => all.filter((i) => i.active !== true), [all]);

  const catalogMissing = useMemo(() => {
    const existingNames = new Set(all.map((i) => i.name.toLowerCase().trim()));
    return INGREDIENT_SEED.filter((s) => !existingNames.has(s.name.toLowerCase().trim())).length;
  }, [all]);

  const filteredInactive = useMemo(() => {
    const q   = inactiveQuery.toLowerCase().trim();
    const cat = catFilter === 'all' ? inactive : inactive.filter((i) => (i.category ?? 'other') === catFilter);
    return q ? cat.filter((i) => i.name.toLowerCase().includes(q) || i.benefit.toLowerCase().includes(q)) : cat;
  }, [inactive, inactiveQuery, catFilter]);

  const filteredActive = useMemo(() => {
    const q = activeQuery.toLowerCase().trim();
    return q ? active.filter((i) => i.name.toLowerCase().includes(q) || i.benefit.toLowerCase().includes(q)) : active;
  }, [active, activeQuery]);

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
    await ingredientsRepo.toggleActive(id);
    void reload();
  };

  /** Activate all currently visible inactive items */
  const activateAllVisible = async () => {
    await Promise.all(filteredInactive.filter((i) => !i.active).map((i) => ingredientsRepo.toggleActive(i.id)));
    void reload();
  };

  /** One-click quick-activate a named ingredient (auto-seeds if not in DB) */
  const quickActivate = async (name: string) => {
    const existing = all.find((i) => i.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (!existing.active) await ingredientsRepo.toggleActive(existing.id);
    } else {
      // Create as active custom ingredient
      await ingredientsRepo.create({ name, benefit: '', inci: '', isSoapBase: false, active: true, category: 'other' });
    }
    void reload();
  };

  const save = async () => {
    if (!form.name.trim()) return;
    if (editingId) {
      await ingredientsRepo.update(editingId, form);
    } else {
      await ingredientsRepo.create(form);
    }
    setForm(emptyForm);
    setEditingId(null);
    setFormOpen(false);
    void reload();
  };

  const startEdit = (i: Ingredient) => {
    setEditingId(i.id);
    setForm({
      name: i.name, benefit: i.benefit, inci: i.inci ?? '',
      isSoapBase: i.isSoapBase, active: i.active,
      category: (i.category ?? 'other') as IngredientCategory,
    });
    setFormOpen(true);
  };

  const remove = (id: string) => setConfirmDeleteId(id);

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
              className="btn-secondary"
              disabled={seeding}
              title={
                all.length === 0
                  ? t('ingredients.seedHint', 'Adds 670+ popular soap & beauty ingredients as inactive so you can toggle on what you use.')
                  : t('ingredients.syncHint', 'Adds any missing catalog ingredients without duplicating existing entries.')
              }
              onClick={() => void syncCatalog()}
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
              {syncDone
                ? (lastSyncAdded > 0
                  ? t('ingredients.syncDoneAdded', '{{count}} added from catalog', { count: lastSyncAdded })
                  : t('ingredients.syncDone', 'Catalog up to date'))
                : (all.length === 0
                  ? t('ingredients.seed', 'Populate Library')
                  : t('ingredients.syncCatalog', 'Sync library from catalog'))}
              {!seeding && !syncDone && catalogMissing > 0 && (
                <span className="ml-1 rounded-full bg-gaia-100 px-1.5 py-0.5 text-[10px] font-semibold text-gaia-700">
                  {catalogMissing}
                </span>
              )}
            </button>
            <button
              className="btn-primary"
              onClick={() => { setEditingId(null); setForm(emptyForm); setFormOpen(true); }}
            >
              <Plus className="h-4 w-4" /> {t('ingredients.new')}
            </button>
          </div>
        </div>

        {/* ── Stats ──────────────────────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-2 rounded-xl bg-gaia-600 px-4 py-2 text-sm text-white">
            <Star className="h-4 w-4" />
            <span className="font-semibold">{active.length}</span>
            <span className="opacity-80">{t('ingredients.activeCount', 'active')}</span>
          </div>
          <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
            <FlaskConical className="h-4 w-4 text-slate-400" />
            <span className="font-semibold">{inactive.length}</span>
            <span className="text-slate-400">{t('ingredients.inactiveCount', 'in library')}</span>
          </div>
        </div>

        {/* ── Quick-activate chips ────────────────────────────────────────── */}
        {quickChips.length > 0 && inactive.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-slate-100">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gaia-700">
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
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Dual pane ──────────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* INACTIVE pane */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t('ingredients.inactiveTitle', 'Library (inactive)')}
              </h2>
              <div className="flex items-center gap-2">
                <span className="chip">{filteredInactive.length}</span>
                {filteredInactive.length > 0 && catFilter !== 'all' && (
                  <button
                    className="rounded-lg bg-gaia-600 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-gaia-700"
                    onClick={() => void activateAllVisible()}
                    title={t('ingredients.activateAllVisible', 'Activate all shown')}
                  >
                    {t('ingredients.activateAll', 'Activate all')}
                  </button>
                )}
              </div>
            </div>

            {/* Category filter tabs */}
            <div className="flex flex-wrap gap-1">
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
                    {cat === 'all' ? 'All' : CATEGORY_LABELS[cat as IngredientCategory]}
                    <span className={`rounded-full px-1 text-[9px] font-bold ${catFilter === cat ? 'bg-white/20' : 'bg-slate-100'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={t('common.search', 'Search…')}
                value={inactiveQuery}
                onChange={(e) => setInactiveQuery(e.target.value)}
              />
            </div>

            <div className="max-h-[30rem] space-y-1.5 overflow-y-auto pr-1">
              {filteredInactive.length === 0 ? (
                <div className="rounded-xl bg-white py-8 text-center text-sm text-slate-400 ring-1 ring-slate-100">
                  {inactiveQuery ? t('ingredients.noResults', 'No results') : t('ingredients.allActive', 'All seeded — great!')}
                </div>
              ) : (
                filteredInactive.map((i) => (
                  <IngredientRow
                    key={i.id} ing={i}
                    onToggle={() => void toggle(i.id)}
                    onEdit={() => startEdit(i)}
                    onDelete={() => void remove(i.id)}
                    t={t as TFunction} isActive={false}
                  />
                ))
              )}
            </div>
          </div>

          {/* ACTIVE pane */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gaia-700">
                <Star className="h-3.5 w-3.5 fill-gaia-500 text-gaia-500" />
                {t('ingredients.activeTitle', 'My Active Ingredients')}
              </h2>
              <span className="chip bg-gaia-100 text-gaia-700">{filteredActive.length}</span>
            </div>
            {/* Spacer aligns list with inactive pane category-filter row */}
            <div className="min-h-[1.75rem] shrink-0" aria-hidden="true" />
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-9"
                placeholder={t('common.search', 'Search…')}
                value={activeQuery}
                onChange={(e) => setActiveQuery(e.target.value)}
              />
            </div>
            <div className="max-h-[30rem] space-y-1.5 overflow-y-auto pr-1">
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
                    onToggle={() => void toggle(i.id)}
                    onEdit={() => startEdit(i)}
                    onDelete={() => void remove(i.id)}
                    t={t as TFunction} isActive
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
                  <span className="ml-1 font-normal normal-case text-slate-400">— {t('common.optional', 'optional')}</span>
                </label>
                <BenefitCombo value={form.benefit} onChange={(v) => setForm({ ...form, benefit: v })} />
              </div>
              <div>
                <label className="label">
                  {t('ingredients.inci', 'INCI Name')}
                  <span className="ml-1 font-normal normal-case text-slate-400">— {t('common.optional', 'optional')}</span>
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
                  {(Object.entries(CATEGORY_LABELS) as [IngredientCategory, string][]).map(([cat, label]) => (
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
                      {label}
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
      <WorkflowNav
        prevScreen="recipes"
        prevLabel={t('workflow.backToRecipes')}
      />

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
    </div>
  );
}

// ── Ingredient row ────────────────────────────────────────────────────────────

function IngredientRow({
  ing, onToggle, onEdit, onDelete, t, isActive,
}: {
  ing: Ingredient;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  t: TFunction;
  isActive: boolean;
}) {
  const ingKey = ing.name.toLowerCase().replace(/ /g, '_');
  const displayName = t(`ingredientNames.${ingKey}`, ing.name);
  const actionBtn =
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition';
  return (
    <div className={`grid min-h-[3.25rem] grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-2 rounded-xl px-3 py-2 ring-1 transition ${
      isActive ? 'bg-gaia-50 ring-gaia-200' : 'bg-white ring-slate-100 hover:ring-slate-200'
    }`}>
      <IngredientIcon category={ing.category} name={ing.name} className="shrink-0" />

      <button
        type="button"
        className="min-w-0 text-left"
        onClick={onToggle}
        title={isActive ? t('ingredients.deactivate', 'Deactivate') : t('ingredients.activate', 'Activate')}
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate text-sm font-medium text-slate-800">{displayName}</span>
            {ing.isSoapBase && (
              <span className="inline-flex shrink-0 items-center rounded-full bg-gaia-100 px-1.5 py-0.5 text-[10px] font-medium text-gaia-700">
                {t('ingredients.soapBaseTag', 'Base')}
              </span>
            )}
          </span>
          {ing.benefit && (
            <span className="truncate text-xs text-slate-400">{ing.benefit}</span>
          )}
        </span>
      </button>

      <div className="flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onToggle}
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
          onClick={onEdit}
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          className={`${actionBtn} text-rose-400 hover:bg-rose-50`}
          title={t('common.delete', 'Delete')}
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

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
              onClick={() => { onChange(b.label); setOpen(false); }}
            >
              <span className="font-medium text-gaia-700">{b.category}</span>{' — '}{b.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
