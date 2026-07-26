// ---------------------------------------------------------------------------
// InventoryScreen — the "Smart Pantry".
//
// A flat list of 131 unpriced ingredients is paralyzing. This screen fixes it:
//   • Categorized ACCORDIONS — every ingredient lands on one of five shelves
//     (Colorants / Essential & Fragrance Oils / Carrier Oils & Butters /
//     Botanicals & Additives / Soap Bases), each collapsible.
//   • "IN-USE ONLY" — a prominent toggle that hides every ingredient that is
//     not part of a saved recipe, so Rosa only prices what she actually sells.
//   • "QUICK SET" bulk pricing — one baseline price per shelf (e.g. $0.05/g)
//     applied to every Missing-Price ingredient in that shelf, in one click.
//   • AI SUPPLIER URL IMPORTER — paste a supplier product link; the app
//     extracts Total Price + Container Size (local scraper first, Gemini via
//     the stored Google AI Studio key as fallback), previews the detected
//     values, and on confirm auto-calculates the fractional cost ($/g, $/drop).
//     Manual entry always remains as the fallback.
//   • STOCK ON HAND — optional per-ingredient stock that completed Work
//     Orders deduct automatically.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Check, ChevronDown, ChevronUp, Database, DollarSign,
  Link as LinkIcon, Loader2, Package, PackageCheck, PackagePlus, Plus,
  Search, ShoppingBag, Sparkles, Tags, Trash2, X, Zap,
} from 'lucide-react';
import type { Ingredient, IngredientCategory, Recipe, SetPurchase } from '@/types';
import {
  ingredientsRepo,
  recipesRepo,
  setPurchasesRepo,
  calculateFractionalCost,
  isVolumeIngredient,
  baseUnitOf,
  VOLUME_CATEGORIES,
} from '@/db/repositories';
import { importFromSupplierUrl, type SupplierParseResult } from '@/lib/supplierImport';
import IngredientIcon, { CATEGORY_LABELS } from '@/components/common/IngredientIcon';
import Modal from '@/components/common/Modal';
import { useAppStore } from '@/store/useAppStore';

// ---------------------------------------------------------------------------
// Pantry shelves — every IngredientCategory maps to exactly one accordion.
// ---------------------------------------------------------------------------

type PantryGroupId = 'colorants' | 'essential-oils' | 'carrier-oils' | 'botanicals' | 'bases';

interface PantryGroup {
  id: PantryGroupId;
  labelKey: string;
  defaultLabel: string;
  hintKey: string;
  defaultHint: string;
  categories: IngredientCategory[];
  /** Default measurement for the Quick Set dialog ($/g vs $/drop). */
  measurement: 'weight' | 'volume';
  /** Header accent classes. */
  tint: string;
}

const PANTRY_GROUPS: PantryGroup[] = [
  {
    id: 'colorants',
    labelKey: 'inventory.groupColorants', defaultLabel: 'Colorants',
    hintKey: 'inventory.groupColorantsHint', defaultHint: 'Micas, dyes, oxides & pigments',
    categories: ['colorant'],
    measurement: 'weight',
    tint: 'bg-sky-50 text-sky-600',
  },
  {
    id: 'essential-oils',
    labelKey: 'inventory.groupEssentialOils', defaultLabel: 'Essential & Fragrance Oils',
    hintKey: 'inventory.groupEssentialOilsHint', defaultHint: 'Measured in drops (1 ml = 20 drops)',
    categories: ['essential-oil', 'fragrance'],
    measurement: 'volume',
    tint: 'bg-violet-50 text-violet-600',
  },
  {
    id: 'carrier-oils',
    labelKey: 'inventory.groupCarrierOils', defaultLabel: 'Carrier Oils & Butters',
    hintKey: 'inventory.groupCarrierOilsHint', defaultHint: 'Base oils, butters & waxes',
    categories: ['oil', 'butter', 'wax'],
    measurement: 'weight',
    tint: 'bg-amber-50 text-amber-600',
  },
  {
    id: 'botanicals',
    labelKey: 'inventory.groupBotanicals', defaultLabel: 'Botanicals & Additives',
    hintKey: 'inventory.groupBotanicalsHint', defaultHint: 'Herbs, flowers, clays, exfoliants & extras',
    categories: [
      'botanical', 'floral', 'citrus', 'exfoliant', 'clay',
      'milk', 'seed', 'spice', 'additive', 'other',
    ],
    measurement: 'weight',
    tint: 'bg-green-50 text-green-600',
  },
  {
    id: 'bases',
    labelKey: 'inventory.groupBases', defaultLabel: 'Soap Bases',
    hintKey: 'inventory.groupBasesHint', defaultHint: 'Melt & pour / glycerin bases',
    categories: ['base'],
    measurement: 'weight',
    tint: 'bg-slate-100 text-slate-600',
  },
];

/** Assigns an ingredient to its pantry shelf. */
function groupOf(ing: Ingredient): PantryGroupId {
  if (ing.isSoapBase || ing.category === 'base') return 'bases';
  for (const g of PANTRY_GROUPS) {
    if (ing.category && g.categories.includes(ing.category)) return g.id;
  }
  return 'botanicals'; // uncategorized extras live with the additives
}

// ---------------------------------------------------------------------------
// Sample prices bulk-loaded with one click (kept from the previous screen)
// ---------------------------------------------------------------------------
interface SamplePrice {
  name: string;
  measurementType: 'weight' | 'volume';
  purchaseSize: number;
  purchaseUnit: 'oz' | 'lbs' | 'ml' | 'g';
  purchasePrice: number;
}

const SAMPLE_PRICES: SamplePrice[] = [
  { name: 'Sweet Almond Oil',      measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz',  purchasePrice: 12.00 },
  { name: 'Shea Butter',           measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz',  purchasePrice: 14.00 },
  { name: 'Cocoa Butter',          measurementType: 'weight', purchaseSize: 16, purchaseUnit: 'oz',  purchasePrice: 16.00 },
  { name: 'Lavender EO',           measurementType: 'volume', purchaseSize: 10, purchaseUnit: 'ml',  purchasePrice: 8.00  },
  { name: 'Peppermint EO',         measurementType: 'volume', purchaseSize: 10, purchaseUnit: 'ml',  purchasePrice: 6.00  },
  { name: 'Kaolin Clay',           measurementType: 'weight', purchaseSize: 8,  purchaseUnit: 'oz',  purchasePrice: 7.00  },
  { name: 'Activated Charcoal',    measurementType: 'weight', purchaseSize: 4,  purchaseUnit: 'oz',  purchasePrice: 8.00  },
  { name: 'Glycerin Base (Clear)', measurementType: 'weight', purchaseSize: 2,  purchaseUnit: 'lbs', purchasePrice: 12.00 },
];

// ---------------------------------------------------------------------------
// Quick "Set" chips — pre-built set-purchase entries (kept)
// ---------------------------------------------------------------------------
interface QuickSet {
  label: string;
  name: string;
  totalPrice: number;
  itemCount: number;
}

const QUICK_SETS: QuickSet[] = [
  { label: 'YumCraft 20 Dyes',     name: 'YumCraft Soap Dyes 20pk',      totalPrice: 14.99, itemCount: 20 },
  { label: 'Smalltongue 36 Micas', name: 'Smalltongue Mica Powder 36pk', totalPrice: 13.99, itemCount: 36 },
  { label: 'Glycerin Base 5lb',    name: 'Glycerin Base 5lb (bulk)',     totalPrice: 18.00, itemCount: 1  },
];

// ---------------------------------------------------------------------------
// Category-based defaults
// ---------------------------------------------------------------------------
function getCategoryMeasurementType(category?: IngredientCategory): 'weight' | 'volume' {
  return category && VOLUME_CATEGORIES.has(category) ? 'volume' : 'weight';
}

function getCategoryDefaultUnit(category?: IngredientCategory): 'oz' | 'lbs' | 'ml' | 'g' {
  return category && VOLUME_CATEGORIES.has(category) ? 'ml' : 'g';
}

// ---------------------------------------------------------------------------
// Math explanation string ("show your work" — builds trust in the numbers)
// ---------------------------------------------------------------------------
function buildMathHint(
  measurementType: 'weight' | 'volume',
  purchaseSize: number,
  purchaseUnit: 'oz' | 'lbs' | 'ml' | 'g',
  purchasePrice: number,
): string {
  if (measurementType === 'volume') {
    const drops = purchaseSize * 20;
    const cpd = purchasePrice / drops;
    return `${purchaseSize} ml × 20 = ${drops} drops → $${purchasePrice.toFixed(2)} ÷ ${drops} = $${cpd.toFixed(4)}/drop`;
  }
  let grams = purchaseSize;
  let prefix = '';
  if (purchaseUnit === 'oz') {
    grams = purchaseSize * 28.3495;
    prefix = `${purchaseSize} oz × 28.35 = ${grams.toFixed(1)}g total → `;
  } else if (purchaseUnit === 'lbs') {
    grams = purchaseSize * 453.592;
    prefix = `${purchaseSize} lb × 453.59 = ${grams.toFixed(1)}g total → `;
  } else {
    prefix = `${purchaseSize}g total → `;
  }
  const cpg = purchasePrice / grams;
  return `${prefix}$${purchasePrice.toFixed(2)} ÷ ${grams.toFixed(1)}g = $${cpg.toFixed(4)}/g`;
}

/** Converts a purchase container size into base units (grams or drops). */
function containerBaseUnits(ing: Ingredient): number | null {
  if (!ing.purchaseSize || ing.purchaseSize <= 0) return null;
  if (isVolumeIngredient(ing)) return ing.purchaseSize * 20; // ml → drops
  if (ing.purchaseUnit === 'oz') return ing.purchaseSize * 28.3495;
  if (ing.purchaseUnit === 'lbs') return ing.purchaseSize * 453.592;
  return ing.purchaseSize; // grams
}

// Quick size shortcuts
interface SizeShortcut { label: string; size: number; unit: 'oz' | 'lbs' | 'ml' | 'g' }
const WEIGHT_SHORTCUTS: SizeShortcut[] = [
  { label: '100 g',  size: 100,  unit: 'g'  },
  { label: '250 g',  size: 250,  unit: 'g'  },
  { label: '500 g',  size: 500,  unit: 'g'  },
  { label: '1 kg',   size: 1000, unit: 'g'  },
  { label: '1 lb',   size: 1,    unit: 'lbs' },
];
const VOLUME_SHORTCUTS: SizeShortcut[] = [
  { label: '10 ml', size: 10, unit: 'ml' },
  { label: '30 ml', size: 30, unit: 'ml' },
];

const IN_USE_PREF_KEY = 'gaia.pantry.inUseOnly';

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function InventoryScreen() {
  const { t } = useTranslation();
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);

  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [setPurchases, setSetPurchases] = useState<SetPurchase[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  // Filters
  const [inUseOnly, setInUseOnly] = useState(false);
  const [query, setQuery] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const inUseInitialized = useRef(false);

  const reload = async () => {
    const [all, recs, sets] = await Promise.all([
      ingredientsRepo.all(),
      recipesRepo.all(),
      setPurchasesRepo.all(),
    ]);
    setAllIngredients(all);
    setRecipes(recs);
    setSetPurchases(sets);
  };

  const reloadRecipe = async () => {
    if (!activeRecipeId) { setActiveRecipe(null); return; }
    const r = await recipesRepo.get(activeRecipeId);
    setActiveRecipe(r ?? null);
  };

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    void reloadRecipe();
    // reloadRecipe reads activeRecipeId from closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRecipeId]);

  // -- In-Use map: ingredientId → number of saved recipes that use it --------
  const inUseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of recipes) {
      for (const id of r.ingredientIds) counts.set(id, (counts.get(id) ?? 0) + 1);
    }
    return counts;
  }, [recipes]);

  // Initialize the In-Use toggle once: default ON when recipes reference
  // ingredients (that's the focused view Rosa needs), OFF otherwise.
  useEffect(() => {
    if (inUseInitialized.current || recipes.length === 0) return;
    inUseInitialized.current = true;
    const stored = localStorage.getItem(IN_USE_PREF_KEY);
    if (stored !== null) setInUseOnly(stored === 'true');
    else setInUseOnly(inUseCounts.size > 0);
  }, [recipes, inUseCounts]);

  const toggleInUse = () => {
    setInUseOnly((v) => {
      localStorage.setItem(IN_USE_PREF_KEY, String(!v));
      return !v;
    });
  };

  // -- Filtering + grouping ---------------------------------------------------
  const q = query.trim().toLowerCase();
  const visibleIngredients = useMemo(() => {
    return allIngredients.filter((ing) => {
      if (inUseOnly && !inUseCounts.has(ing.id)) return false;
      if (q && !ing.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [allIngredients, inUseOnly, inUseCounts, q]);

  const grouped = useMemo(() => {
    const map = new Map<PantryGroupId, Ingredient[]>();
    for (const g of PANTRY_GROUPS) map.set(g.id, []);
    for (const ing of visibleIngredients) map.get(groupOf(ing))!.push(ing);
    // Missing-price ingredients bubble to the top of every shelf.
    for (const list of map.values()) {
      list.sort((a, b) => {
        const am = a.fractionalCost === undefined ? 0 : 1;
        const bm = b.fractionalCost === undefined ? 0 : 1;
        return am - bm || a.name.localeCompare(b.name);
      });
    }
    return map;
  }, [visibleIngredients]);

  // Stats
  const pricedCount   = visibleIngredients.filter((i) => i.fractionalCost !== undefined).length;
  const missingCount  = visibleIngredients.length - pricedCount;
  const hiddenCount   = allIngredients.length - visibleIngredients.length;

  // Recipe material cost summary with per-ingredient breakdown
  const recipeCostSummary = useMemo(() => {
    if (!activeRecipe) return null;
    const amounts = activeRecipe.ingredientAmounts ?? {};
    let total = 0;
    let costed = 0;
    let missing = 0;
    const lines: { id: string; name: string; amount: number; unit: string; cost: number }[] = [];

    for (const id of activeRecipe.ingredientIds) {
      const amount = amounts[id];
      const ing = allIngredients.find((i) => i.id === id);
      if (!amount || !ing) continue;
      const unit = baseUnitOf(ing);
      if (ing.fractionalCost !== undefined) {
        const lineCost = amount * ing.fractionalCost;
        total += lineCost;
        costed++;
        lines.push({ id, name: ing.name, amount, unit, cost: lineCost });
      } else {
        missing++;
      }
    }
    return { total, costed, missing, recipeName: activeRecipe.name, lines };
  }, [activeRecipe, allIngredients]);

  const loadSamplePrices = async () => {
    setSeeding(true);
    try {
      for (const sample of SAMPLE_PRICES) {
        const ing = allIngredients.find((i) => i.name.toLowerCase() === sample.name.toLowerCase());
        if (ing) await ingredientsRepo.update(ing.id, sample);
      }
      await reload();
      setSeedDone(true);
      setTimeout(() => setSeedDone(false), 3000);
    } catch (err) {
      console.error('[Inventory] Failed to load sample prices:', err);
    } finally {
      setSeeding(false);
    }
  };

  const toggleGroup = (id: PantryGroupId) =>
    setOpenGroups((g) => ({ ...g, [id]: !g[id] }));

  const nonEmptyGroups = PANTRY_GROUPS.filter((g) => (grouped.get(g.id) ?? []).length > 0);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-3xl px-4 py-6">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gaia-900">
                <Package className="h-6 w-6 text-gaia-600" />
                {t('inventory.title', 'Smart Pantry — Inventory & Pricing')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {t('inventory.subtitle', 'Everything is grouped into shelves. Open a shelf, set prices once (or paste a supplier link), and your recipe costs calculate themselves.')}
              </p>
            </div>
            <button
              className="btn-secondary"
              disabled={seeding || allIngredients.length === 0}
              onClick={() => void loadSamplePrices()}
            >
              {seeding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Database className="h-4 w-4" />}
              {seedDone
                ? t('inventory.sampleDone', 'Prices loaded!')
                : t('inventory.loadSample', 'Load Sample Prices')}
            </button>
          </div>

          {/* ── Filter bar: prominent In-Use toggle + search ─────────────────── */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
            <button
              type="button"
              role="switch"
              aria-checked={inUseOnly}
              onClick={toggleInUse}
              className="flex items-center gap-2.5"
            >
              <span
                className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${
                  inUseOnly ? 'bg-gaia-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-[18px] w-[18px] transform rounded-full bg-white shadow transition-transform ${
                    inUseOnly ? 'translate-x-[24px]' : 'translate-x-[3px]'
                  }`}
                />
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {t('inventory.inUseOnly', 'In-Use Only')}
              </span>
            </button>
            <span className="text-xs text-slate-400">
              {inUseOnly
                ? t('inventory.inUseOnlyOn', 'Showing only ingredients used in your saved recipes ({{hidden}} hidden)', { hidden: hiddenCount })
                : t('inventory.inUseOnlyOff', 'Showing every ingredient in your pantry')}
            </span>

            <div className="relative ml-auto w-full sm:w-56">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
              <input
                className="input pl-8 text-sm"
                placeholder={t('inventory.searchPlaceholder', 'Search ingredients…')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <button
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  onClick={() => setQuery('')}
                  aria-label={t('common.clear', 'Clear')}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          {allIngredients.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="font-semibold">{visibleIngredients.length}</span>
                <span className="text-slate-400">{t('inventory.shown', 'shown')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gaia-600 px-4 py-2 text-sm text-white">
                <span className="font-semibold">{pricedCount}</span>
                <span className="opacity-80">{t('inventory.priced', 'priced')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                <span className="font-semibold">{missingCount}</span>
                <span className="opacity-80">{t('inventory.unpriced', 'missing prices')}</span>
              </div>
              {activeRecipe && (
                <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                  <span className="text-amber-500">◆</span>
                  <span className="font-medium">{activeRecipe.name}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Set Purchases Section ─────────────────────────────────────── */}
          <div className="mt-6">
            <SetPurchasesCard
              ingredients={allIngredients}
              setPurchases={setPurchases}
              onChanged={reload}
            />
          </div>

          {/* ── Pantry shelves (accordions) ──────────────────────────────────── */}
          {allIngredients.length === 0 ? (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-gaia-300" />
              <p className="font-medium text-slate-600">
                {t('inventory.noIngredients', 'Your pantry is empty.')}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {t('inventory.noIngredientsHint', 'Go to Ingredients to add some.')}
              </p>
            </div>
          ) : nonEmptyGroups.length === 0 ? (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-12 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-gaia-300" />
              <p className="font-medium text-slate-600">
                {t('inventory.noMatches', 'Nothing matches the current filters.')}
              </p>
              {inUseOnly && (
                <button className="btn-secondary mx-auto mt-3" onClick={toggleInUse}>
                  {t('inventory.showAll', 'Show all ingredients')}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {nonEmptyGroups.map((group) => (
                <PantryGroupAccordion
                  key={group.id}
                  group={group}
                  ingredients={grouped.get(group.id) ?? []}
                  // A search should reveal its matches even in collapsed shelves.
                  open={!!openGroups[group.id] || q.length > 0}
                  onToggle={() => toggleGroup(group.id)}
                  inUseCounts={inUseCounts}
                  recipe={activeRecipe}
                  onSaved={reload}
                  onRecipeUpdated={reloadRecipe}
                />
              ))}
            </div>
          )}

          {/* ── Live Recipe Cost Panel ──────────────────────────────────────── */}
          {recipeCostSummary !== null && (
            <RecipeCostPanel summary={recipeCostSummary} />
          )}

          {/* Footer hint */}
          {allIngredients.length > 0 && (
            <p className="mt-6 text-xs text-slate-400">
              {t('inventory.legend', 'Weight → cost per gram. Volume (EOs) → cost per drop (1 ml = 20 drops). Click a field to edit; press Enter or click away to save.')}
            </p>
          )}

        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pantry shelf accordion — header with counts + "Quick Set" bulk pricing
// ---------------------------------------------------------------------------
interface PantryGroupAccordionProps {
  group: PantryGroup;
  ingredients: Ingredient[];
  open: boolean;
  onToggle: () => void;
  inUseCounts: Map<string, number>;
  recipe: Recipe | null;
  onSaved: () => void;
  onRecipeUpdated: () => void;
}

function PantryGroupAccordion({
  group, ingredients, open, onToggle, inUseCounts, recipe, onSaved, onRecipeUpdated,
}: PantryGroupAccordionProps) {
  const { t } = useTranslation();
  const [quickSetOpen, setQuickSetOpen] = useState(false);

  const missing = ingredients.filter((i) => i.fractionalCost === undefined);

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      {/* Header */}
      <div className="flex w-full items-center gap-3 px-4 py-3.5">
        <button
          className="flex min-w-0 flex-1 items-center gap-3 text-left"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${group.tint}`}>
            <Tags className="h-[18px] w-[18px]" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">{t(group.labelKey, group.defaultLabel)}</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                {ingredients.length}
              </span>
              {missing.length > 0 && (
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  {t('inventory.nMissing', '{{count}} missing price', { count: missing.length })}
                </span>
              )}
            </span>
            <span className="block truncate text-xs text-slate-400">{t(group.hintKey, group.defaultHint)}</span>
          </span>
        </button>

        {/* Quick Set bulk pricing — only relevant while prices are missing */}
        {missing.length > 0 && (
          <button
            className="flex shrink-0 items-center gap-1.5 rounded-lg bg-gaia-50 px-3 py-1.5 text-xs font-semibold text-gaia-700 ring-1 ring-gaia-200 transition hover:bg-gaia-100"
            onClick={() => setQuickSetOpen(true)}
            title={t('inventory.quickSetTitle', 'Apply one baseline price to every missing-price ingredient on this shelf')}
          >
            <Zap className="h-3.5 w-3.5" />
            {t('inventory.quickSet', 'Quick Set')}
          </button>
        )}

        <button className="shrink-0 p-1" onClick={onToggle} aria-label={open ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}>
          {open
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </button>
      </div>

      {/* Body */}
      {open && (
        <div className="space-y-3 border-t border-slate-100 bg-slate-50/60 px-3 pb-3 pt-3">
          {ingredients.map((ing) => (
            <PricingCard
              key={ing.id}
              ing={ing}
              recipe={recipe}
              usedInRecipes={inUseCounts.get(ing.id) ?? 0}
              onSaved={onSaved}
              onRecipeUpdated={onRecipeUpdated}
            />
          ))}
        </div>
      )}

      {/* Quick Set modal */}
      <QuickSetModal
        open={quickSetOpen}
        onClose={() => setQuickSetOpen(false)}
        group={group}
        missing={missing}
        onApplied={onSaved}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Quick Set modal — one baseline price for every missing-price ingredient
// ---------------------------------------------------------------------------
interface QuickSetModalProps {
  open: boolean;
  onClose: () => void;
  group: PantryGroup;
  missing: Ingredient[];
  onApplied: () => void;
}

function QuickSetModal({ open, onClose, group, missing, onApplied }: QuickSetModalProps) {
  const { t } = useTranslation();
  const [price, setPrice] = useState('');
  const [applying, setApplying] = useState(false);

  const perUnitLabel = group.measurement === 'volume'
    ? t('inventory.perDropLong', 'per drop')
    : t('inventory.perGramLong', 'per gram');

  const parsed = parseFloat(price);
  const valid = !isNaN(parsed) && parsed > 0;

  const apply = async () => {
    if (!valid) return;
    setApplying(true);
    try {
      for (const ing of missing) {
        // Each ingredient keeps its own base unit: weight → $X/gram stored as
        // a 1 g purchase; volume → $X/drop stored as a 1 ml purchase at 20×X
        // (1 ml = 20 drops), so calculateFractionalCost lands exactly on X.
        const volume = isVolumeIngredient(ing) || group.measurement === 'volume';
        await ingredientsRepo.update(ing.id, volume
          ? { measurementType: 'volume', purchaseSize: 1, purchaseUnit: 'ml', purchasePrice: parsed * 20 }
          : { measurementType: 'weight', purchaseSize: 1, purchaseUnit: 'g',  purchasePrice: parsed },
        );
      }
      onApplied();
      onClose();
      setPrice('');
    } catch (err) {
      console.error('[Inventory] Quick Set failed:', err);
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-gaia-600" />
          {t('inventory.quickSetHeading', 'Quick Set — {{group}}', { group: t(group.labelKey, group.defaultLabel) })}
        </span>
      }
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onClose}>{t('common.cancel', 'Cancel')}</button>
          <button className="btn-primary" disabled={!valid || applying} onClick={() => void apply()}>
            {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {t('inventory.quickSetApply', 'Apply to {{count}} ingredient(s)', { count: missing.length })}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">
        {t('inventory.quickSetExplain',
          'Give every ingredient on this shelf that is still missing a price the same baseline. You can fine-tune any single ingredient afterwards — this just gets you to a usable cost estimate fast.')}
      </p>

      <div className="mt-4">
        <label className="mb-1 block text-xs font-medium text-slate-500">
          {t('inventory.quickSetPriceLabel', 'Baseline price {{unit}}', { unit: perUnitLabel })}
        </label>
        <div className="relative w-40">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
          <input
            autoFocus
            type="number"
            min={0}
            step={0.01}
            className="input pl-7 text-sm"
            placeholder={group.measurement === 'volume' ? '0.04' : '0.05'}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && valid) void apply(); }}
          />
        </div>
        {valid && (
          <p className="mt-2 text-xs text-emerald-700">
            {t('inventory.quickSetPreview', 'Every missing-price ingredient below gets ${{price}} {{unit}}.', {
              price: parsed.toFixed(4),
              unit: perUnitLabel,
            })}
          </p>
        )}
      </div>

      {/* Affected ingredient preview */}
      <div className="mt-4 max-h-44 overflow-y-auto rounded-xl border border-slate-200">
        {missing.map((ing) => (
          <div key={ing.id} className="flex items-center gap-2.5 border-b border-slate-50 px-3 py-1.5 text-sm last:border-0">
            <IngredientIcon category={ing.category} name={ing.name} size="sm" />
            <span className="flex-1 truncate text-slate-700">{ing.name}</span>
            <span className="text-[11px] text-slate-400">{baseUnitOf(ing) === 'drops' ? '$/drop' : '$/g'}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Set Purchases Card — "bought as a set" entry with quick chips (kept)
// ---------------------------------------------------------------------------
interface SetPurchasesCardProps {
  ingredients: Ingredient[];
  setPurchases: SetPurchase[];
  onChanged: () => void;
}

interface SetForm {
  name: string;
  totalPrice: string;
  itemCount: string;
  assignedIngredientIds: string[];
}

const emptySetForm: SetForm = {
  name: '',
  totalPrice: '',
  itemCount: '',
  assignedIngredientIds: [],
};

function SetPurchasesCard({ ingredients, setPurchases, onChanged }: SetPurchasesCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<SetForm>(emptySetForm);
  const [saving, setSaving] = useState(false);

  const pricePerItem = useMemo(() => {
    const price = parseFloat(form.totalPrice);
    const count = parseInt(form.itemCount, 10);
    if (!price || !count || count <= 0) return null;
    return price / count;
  }, [form.totalPrice, form.itemCount]);

  const applyQuickSet = (qs: QuickSet) => {
    setForm((f) => ({
      ...f,
      name: qs.name,
      totalPrice: String(qs.totalPrice),
      itemCount: String(qs.itemCount),
    }));
    setShowForm(true);
  };

  const toggleIngredient = (id: string) => {
    setForm((f) => ({
      ...f,
      assignedIngredientIds: f.assignedIngredientIds.includes(id)
        ? f.assignedIngredientIds.filter((x) => x !== id)
        : [...f.assignedIngredientIds, id],
    }));
  };

  const handleSave = async () => {
    const price = parseFloat(form.totalPrice);
    const count = parseInt(form.itemCount, 10);
    if (!form.name.trim() || !price || !count || count <= 0) return;

    setSaving(true);
    try {
      const ppi = price / count;

      const record = await setPurchasesRepo.create({
        name: form.name.trim(),
        totalPrice: price,
        itemCount: count,
        pricePerItem: ppi,
        assignedIngredientIds: form.assignedIngredientIds,
      });

      for (const id of record.assignedIngredientIds) {
        const ing = ingredients.find((i) => i.id === id);
        if (!ing) continue;
        await ingredientsRepo.update(id, {
          purchasePrice: ppi,
          purchaseSize: 1,
          purchaseUnit: 'g',
          measurementType: ing.measurementType ?? getCategoryMeasurementType(ing.category),
        });
      }

      setForm(emptySetForm);
      setShowForm(false);
      onChanged();
    } catch (err) {
      console.error('[Inventory] Failed to save set purchase:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await setPurchasesRepo.remove(id);
    onChanged();
  };

  const activeIngredients = ingredients.filter((i) => i.active === true);

  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200 overflow-hidden">
      {/* Header */}
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ShoppingBag className="h-5 w-5 shrink-0 text-gaia-600" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800">
            {t('inventory.setPurchases', 'Set Purchases')}
          </p>
          <p className="text-xs text-slate-400">
            {t('inventory.setPurchasesSubtitle', 'Items bought together — price is split equally across assigned ingredients')}
          </p>
        </div>
        {setPurchases.length > 0 && (
          <span className="rounded-full bg-gaia-100 px-2 py-0.5 text-xs font-semibold text-gaia-700">
            {setPurchases.length}
          </span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4">

          {/* Quick Set chips */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t('inventory.quickSets', 'Quick Sets — tap to auto-fill')}
            </p>
            <div className="flex flex-wrap gap-2">
              {QUICK_SETS.map((qs) => (
                <button
                  key={qs.label}
                  type="button"
                  onClick={() => applyQuickSet(qs)}
                  className="rounded-full border border-gaia-200 bg-gaia-50 px-3 py-1 text-xs font-medium text-gaia-700 transition hover:border-gaia-400 hover:bg-gaia-100"
                >
                  {qs.label} · ${qs.totalPrice}/{qs.itemCount} items · ${(qs.totalPrice / qs.itemCount).toFixed(2)}/ea
                </button>
              ))}
            </div>
          </div>

          {/* Existing set purchases list */}
          {setPurchases.length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t('inventory.savedSets', 'Saved Sets')}
              </p>
              {setPurchases.map((sp) => {
                const assignedNames = sp.assignedIngredientIds
                  .map((id) => ingredients.find((i) => i.id === id)?.name ?? id)
                  .slice(0, 3);
                const extra = sp.assignedIngredientIds.length - 3;
                return (
                  <div key={sp.id} className="flex items-start gap-3 rounded-xl bg-gaia-50 px-4 py-3 ring-1 ring-gaia-100">
                    <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-gaia-500" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800 truncate">{sp.name}</p>
                      <p className="text-xs text-slate-500">
                        ${sp.totalPrice.toFixed(2)} ÷ {sp.itemCount} items = <span className="font-semibold text-emerald-700">${sp.pricePerItem.toFixed(4)}/item</span>
                      </p>
                      {sp.assignedIngredientIds.length > 0 && (
                        <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                          → {assignedNames.join(', ')}{extra > 0 ? ` +${extra} more` : ''}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => void handleDelete(sp.id)}
                      aria-label="Delete set purchase"
                      className="shrink-0 mt-0.5"
                    >
                      <Trash2 className="h-4 w-4 text-slate-300 hover:text-rose-500 transition-colors" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add form toggle */}
          {!showForm ? (
            <button
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gaia-200 py-2.5 text-xs font-medium text-gaia-600 transition hover:border-gaia-400 hover:bg-gaia-50"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('inventory.addSetPurchase', 'Add Set Purchase')}
            </button>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {t('inventory.newSetPurchase', 'New Set Purchase')}
                </p>
                <button
                  onClick={() => { setShowForm(false); setForm(emptySetForm); }}
                  className="text-slate-400 hover:text-slate-600"
                  aria-label="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Set name */}
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">
                  {t('inventory.setName', 'Set name')}
                </label>
                <input
                  className="input text-sm"
                  placeholder={t('inventory.setNamePlaceholder', 'e.g. YumCraft Soap Dyes 20pk')}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>

              {/* Price + Count in one row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {t('inventory.totalPricePaid', 'Total price paid')}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="input pl-7 text-sm"
                      placeholder="14.99"
                      value={form.totalPrice}
                      onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {t('inventory.itemCount', 'Number of items')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="input text-sm"
                    placeholder="20"
                    value={form.itemCount}
                    onChange={(e) => setForm((f) => ({ ...f, itemCount: e.target.value }))}
                  />
                </div>
              </div>

              {/* Auto-calculated per-item cost */}
              {pricePerItem !== null && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                  <p className="text-xs text-emerald-700">
                    {t('inventory.costPerItem', 'Auto-calculated cost per item')}
                  </p>
                  <p className="text-xl font-bold text-emerald-800">
                    ${pricePerItem.toFixed(4)}<span className="ml-1 text-sm font-normal">/item</span>
                  </p>
                </div>
              )}

              {/* Ingredient multi-select */}
              {activeIngredients.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-500">
                    {t('inventory.assignIngredients', 'Apply to ingredients (optional)')}
                  </label>
                  <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                    {activeIngredients.map((ing) => {
                      const checked = form.assignedIngredientIds.includes(ing.id);
                      return (
                        <label
                          key={ing.id}
                          className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm transition ${checked ? 'bg-gaia-50' : 'hover:bg-slate-50'}`}
                        >
                          <input
                            type="checkbox"
                            className="h-3.5 w-3.5 shrink-0 accent-gaia-600"
                            checked={checked}
                            onChange={() => toggleIngredient(ing.id)}
                          />
                          <IngredientIcon category={ing.category} name={ing.name} size="sm" />
                          <span className="flex-1 truncate text-slate-700">{ing.name}</span>
                          {checked && pricePerItem !== null && (
                            <span className="shrink-0 text-xs font-semibold text-emerald-700">
                              ${pricePerItem.toFixed(4)}
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                  {form.assignedIngredientIds.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-slate-400">
                      {t('inventory.setWillUpdate', '{{count}} ingredient(s) will have their price updated to ${{price}}/item when saved.', {
                        count: form.assignedIngredientIds.length,
                        price: pricePerItem?.toFixed(4) ?? '—',
                      })}
                    </p>
                  )}
                </div>
              )}

              <button
                className="btn-primary w-full"
                disabled={!form.name.trim() || !form.totalPrice || !form.itemCount || saving}
                onClick={() => void handleSave()}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
                {t('inventory.saveSet', 'Save Set Purchase')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live Recipe Cost Panel — total at the bottom of the screen (kept)
// ---------------------------------------------------------------------------
interface RecipeCostPanelProps {
  summary: {
    total: number;
    costed: number;
    missing: number;
    recipeName: string;
    lines: { id: string; name: string; amount: number; unit: string; cost: number }[];
  };
}

function RecipeCostPanel({ summary }: RecipeCostPanelProps) {
  const { t } = useTranslation();
  const [barCount, setBarCount] = useState('');
  const bars = parseInt(barCount, 10);
  const costPerBar = !isNaN(bars) && bars > 0 ? summary.total / bars : null;

  return (
    <div className="mt-8 rounded-2xl bg-white px-5 py-5 ring-2 ring-gaia-200 shadow-sm">
      {/* Title row */}
      <div className="flex items-center gap-2 mb-4">
        <DollarSign className="h-5 w-5 text-gaia-600" />
        <h2 className="text-sm font-semibold text-gaia-700 uppercase tracking-wide">
          {t('inventory.liveCostPanel', 'Live Material Cost')}
        </h2>
        <span className="ml-auto rounded-xl bg-gaia-50 px-2.5 py-0.5 text-xs font-medium text-gaia-600 ring-1 ring-gaia-200">
          {summary.recipeName}
        </span>
      </div>

      {/* Per-ingredient breakdown */}
      {summary.lines.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {summary.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
              <span className="text-slate-600 truncate max-w-[55%] font-medium">{line.name}</span>
              <span className="text-slate-400 text-[11px] shrink-0">
                {line.amount} {line.unit}
              </span>
              <span className="font-semibold text-slate-700 shrink-0">
                ${line.cost.toFixed(4)}
              </span>
            </div>
          ))}
        </div>
      )}

      {summary.missing > 0 && (
        <p className="mb-3 text-xs text-amber-600">
          {t('inventory.missingPrices', '{{count}} ingredient(s) are missing prices — total may be incomplete.', { count: summary.missing })}
        </p>
      )}

      {/* Grand total */}
      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
        <span className="text-sm font-semibold text-emerald-800">
          {t('inventory.totalMaterialCost', 'Total raw material cost')}
        </span>
        <span className="text-2xl font-bold text-emerald-700">
          ${summary.total.toFixed(2)}
        </span>
      </div>

      {/* Cost per bar calculator */}
      <div className="mt-4 grid grid-cols-[1fr_auto] items-end gap-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t('inventory.numBars', 'Number of bars in this batch')}
          </label>
          <input
            type="number"
            min={1}
            step={1}
            className="input text-sm"
            placeholder={t('inventory.numBarsPlaceholder', 'e.g. 8')}
            value={barCount}
            onChange={(e) => setBarCount(e.target.value)}
          />
        </div>
        {costPerBar !== null && (
          <div className="rounded-xl bg-gaia-600 px-4 py-2.5 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gaia-200">
              {t('inventory.costPerBar', 'Cost / bar')}
            </p>
            <p className="text-xl font-bold text-white">${costPerBar.toFixed(2)}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Single ingredient pricing card
// ---------------------------------------------------------------------------
interface CardState {
  measurementType: 'weight' | 'volume';
  purchaseSize: string;
  purchaseUnit: 'oz' | 'lbs' | 'ml' | 'g';
  purchasePrice: string;
}

function ingToCard(ing: Ingredient): CardState {
  const measurementType = ing.measurementType ?? getCategoryMeasurementType(ing.category);
  return {
    measurementType,
    purchaseSize:    ing.purchaseSize  !== undefined ? String(ing.purchaseSize)  : '',
    purchaseUnit:    ing.purchaseUnit  ?? getCategoryDefaultUnit(ing.category),
    purchasePrice:   ing.purchasePrice !== undefined ? String(ing.purchasePrice) : '',
  };
}

interface PricingCardProps {
  ing: Ingredient;
  recipe: Recipe | null;
  usedInRecipes: number;
  onSaved: () => void;
  onRecipeUpdated: () => void;
}

function PricingCard({ ing, recipe, usedInRecipes, onSaved, onRecipeUpdated }: PricingCardProps) {
  const { t } = useTranslation();
  const [card, setCard] = useState<CardState>(() => ingToCard(ing));
  const [saving, setSaving] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cardRef = useRef(card);
  cardRef.current = card;

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    setCard(ingToCard(ing));
    // Re-sync only when the persisted purchase fields change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ing.purchaseSize, ing.purchaseUnit, ing.purchasePrice, ing.category]);

  const computedCost = useMemo(() => calculateFractionalCost({
    measurementType: card.measurementType,
    purchaseSize:    parseFloat(card.purchaseSize)  || undefined,
    purchaseUnit:    card.purchaseUnit,
    purchasePrice:   parseFloat(card.purchasePrice) || undefined,
  }), [card]);

  const mathHint = useMemo(() => {
    const size  = parseFloat(card.purchaseSize);
    const price = parseFloat(card.purchasePrice);
    if (!size || !price || size <= 0 || price <= 0) return null;
    return buildMathHint(card.measurementType, size, card.purchaseUnit, price);
  }, [card]);

  const scheduleSave = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const c = cardRef.current;
      setSaving(true);
      await ingredientsRepo.update(ing.id, {
        measurementType: c.measurementType,
        purchaseSize:    parseFloat(c.purchaseSize)  || undefined,
        purchaseUnit:    c.purchaseUnit,
        purchasePrice:   parseFloat(c.purchasePrice) || undefined,
      });
      onSaved();
      setSaving(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') (e.target as HTMLElement).blur();
  };

  const shortcuts = card.measurementType === 'volume' ? VOLUME_SHORTCUTS : WEIGHT_SHORTCUTS;
  const costLabel = card.measurementType === 'volume'
    ? t('inventory.perDrop', '/drop')
    : t('inventory.perGram', '/g');
  const unitOptions: CardState['purchaseUnit'][] = card.measurementType === 'volume'
    ? ['ml']
    : ['g', 'oz', 'lbs'];

  const catLabel  = CATEGORY_LABELS[ing.category ?? 'other'] ?? 'Other';
  const typeLabel = card.measurementType === 'volume'
    ? t('inventory.volume', 'Volume')
    : t('inventory.weight', 'Weight');

  // Color status: green = priced, amber = missing
  const isPriced = computedCost !== undefined;
  const statusRing = isPriced
    ? 'ring-emerald-200'
    : 'ring-amber-200';
  const statusDot = isPriced
    ? 'bg-emerald-400'
    : 'bg-amber-400';

  // ── Recipe usage row ──────────────────────────────────────────────────────
  const isVol = isVolumeIngredient(ing);
  const recipeAmount = recipe?.ingredientAmounts?.[ing.id];

  const [dropsInput, setDropsInput] = useState<string>(
    recipeAmount !== undefined ? String(recipeAmount) : '',
  );

  useEffect(() => {
    setDropsInput(recipeAmount !== undefined ? String(recipeAmount) : '');
  }, [recipeAmount]);

  const saveDrops = async (rawInput: string) => {
    if (!recipe) return;
    const val = parseFloat(rawInput);
    const newAmounts = { ...(recipe.ingredientAmounts ?? {}) };
    if (isNaN(val) || val < 0) {
      delete newAmounts[ing.id];
    } else {
      newAmounts[ing.id] = val;
    }
    await recipesRepo.update(recipe.id, { ingredientAmounts: newAmounts });
    onRecipeUpdated();
  };

  const weightUsageCost =
    !isVol && recipeAmount !== undefined && computedCost !== undefined
      ? recipeAmount * computedCost
      : undefined;

  const dropsVal = parseFloat(dropsInput);
  const dropsUsageCost =
    isVol && !isNaN(dropsVal) && dropsVal > 0 && computedCost !== undefined
      ? dropsVal * computedCost
      : undefined;

  return (
    <div className={`rounded-2xl bg-white px-5 py-4 ring-1 transition ${statusRing} ${saving ? 'opacity-60' : ''}`}>

      {/* Card header: name + status dot + in-use chip + result */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot}`} />
        <IngredientIcon category={ing.category} name={ing.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{ing.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-slate-400">
            {catLabel} · {typeLabel}
            {usedInRecipes > 0 && (
              <span className="rounded-full bg-gaia-50 px-1.5 py-0.5 text-[10px] font-semibold text-gaia-700 ring-1 ring-gaia-200">
                {t('inventory.inNRecipes', 'in {{count}} recipe(s)', { count: usedInRecipes })}
              </span>
            )}
          </p>
        </div>
        {computedCost !== undefined ? (
          <div className="shrink-0 rounded-xl bg-emerald-50 px-3 py-1.5 text-right ring-1 ring-emerald-100">
            <p className="text-base font-bold text-emerald-800">
              ${computedCost.toFixed(4)}
            </p>
            <p className="text-[10px] text-slate-400">{costLabel}</p>
          </div>
        ) : (
          <div className="shrink-0 rounded-xl bg-amber-50 px-3 py-1.5 text-right ring-1 ring-amber-100">
            <p className="text-xs text-amber-600 font-medium">{t('inventory.noData', '—')}</p>
            <p className="text-[10px] text-slate-400">{t('inventory.unpriced', 'missing')}</p>
          </div>
        )}
      </div>

      {/* Two-field entry row */}
      <div className="grid grid-cols-2 gap-3">

        {/* Total purchase cost */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t('inventory.totalCost', 'Total purchase cost')}
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input pl-7 text-sm"
              placeholder="0.00"
              value={card.purchasePrice}
              onChange={(e) => setCard((c) => ({ ...c, purchasePrice: e.target.value }))}
              onBlur={scheduleSave}
              onKeyDown={handleKeyDown}
            />
          </div>
        </div>

        {/* Container size + unit */}
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">
            {t('inventory.containerSize', 'Container size')}
          </label>
          <div className="flex gap-1.5">
            <input
              type="number"
              min={0}
              step={0.1}
              className="input min-w-0 flex-1 text-sm"
              placeholder={t('inventory.sizePlaceholder', 'e.g. 16')}
              value={card.purchaseSize}
              onChange={(e) => setCard((c) => ({ ...c, purchaseSize: e.target.value }))}
              onBlur={scheduleSave}
              onKeyDown={handleKeyDown}
            />
            <select
              className="input w-16 shrink-0 text-sm"
              value={card.purchaseUnit}
              onChange={(e) => {
                setCard((c) => ({ ...c, purchaseUnit: e.target.value as CardState['purchaseUnit'] }));
                scheduleSave();
              }}
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Quick size chips */}
          <div className="mt-2 flex flex-wrap gap-1">
            {shortcuts.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => {
                  setCard((c) => ({ ...c, purchaseSize: String(s.size), purchaseUnit: s.unit }));
                  scheduleSave();
                }}
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:border-gaia-300 hover:bg-gaia-50 hover:text-gaia-700"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Math breakdown hint */}
      {mathHint && (
        <p className="mt-2.5 font-mono text-[11px] text-slate-400">{mathHint}</p>
      )}

      {/* ── AI Supplier link importer ─────────────────────────────────────── */}
      <SupplierImportRow ing={ing} onSaved={onSaved} />

      {/* ── Stock on hand ─────────────────────────────────────────────────── */}
      <StockRow ing={ing} onSaved={onSaved} />

      {/* ── Recipe usage row ────────────────────────────────────────────────── */}
      {recipe && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-xs font-medium text-slate-500">
            {t('inventory.amountInRecipe', 'Amount used in recipe')}
          </p>

          {isVol ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 shrink-0">
                  {t('inventory.dropsUsed', 'Drops used:')}
                </span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  className="input w-24 text-sm"
                  placeholder="0"
                  value={dropsInput}
                  onChange={(e) => setDropsInput(e.target.value)}
                  onBlur={(e) => void saveDrops(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') (e.target as HTMLElement).blur();
                  }}
                />
              </div>
              {dropsUsageCost !== undefined && (
                <p className="text-xs font-semibold text-amber-600">
                  {dropsVal} drops × ${computedCost!.toFixed(4)}/drop = ${dropsUsageCost.toFixed(4)}
                </p>
              )}
              {(isNaN(dropsVal) || dropsInput === '') && computedCost !== undefined && (
                <p className="text-xs text-slate-400">
                  {t('inventory.noDropsSet', 'Enter drops used to see cost')}
                </p>
              )}
            </div>
          ) : (
            recipeAmount !== undefined ? (
              <div className="flex flex-col gap-0.5">
                <p className="text-sm text-slate-700">
                  {t('inventory.used', 'Used:')}
                  {' '}
                  <span className="font-semibold">{recipeAmount}g</span>
                </p>
                {weightUsageCost !== undefined && (
                  <p className="text-xs font-semibold text-amber-600">
                    {recipeAmount}g × ${computedCost!.toFixed(4)}/g = ${weightUsageCost.toFixed(4)}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                {t('inventory.noAmountSet', 'No amount set in recipe')}
              </p>
            )
          )}
        </div>
      )}

    </div>
  );
}

// ---------------------------------------------------------------------------
// Supplier URL importer row — "Paste supplier link to auto-fill pricing."
// ---------------------------------------------------------------------------
interface SupplierImportRowProps {
  ing: Ingredient;
  onSaved: () => void;
}

function SupplierImportRow({ ing, onSaved }: SupplierImportRowProps) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const [url, setUrl] = useState(ing.supplierUrl ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [found, setFound] = useState<SupplierParseResult | null>(null);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  useEffect(() => {
    setUrl(ing.supplierUrl ?? '');
  }, [ing.supplierUrl]);

  const runImport = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    setFound(null);
    setApplied(false);
    try {
      const result = await importFromSupplierUrl(trimmed, settings.googleAiApiKey);
      setFound(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  /** Preview of the fractional cost the detected values would produce. */
  const preview = useMemo(() => {
    if (!found?.price || !found.size || !found.unit) return undefined;
    return calculateFractionalCost({
      measurementType: found.unit === 'ml' ? 'volume' : 'weight',
      purchaseSize: found.size,
      purchaseUnit: found.unit,
      purchasePrice: found.price,
    });
  }, [found]);

  const applyFound = async () => {
    if (!found) return;
    setApplying(true);
    try {
      const patch: Partial<Ingredient> = { supplierUrl: url.trim() };
      if (found.price !== undefined) patch.purchasePrice = found.price;
      if (found.size !== undefined) patch.purchaseSize = found.size;
      if (found.unit !== undefined) {
        patch.purchaseUnit = found.unit;
        // ml bottles are dosed in drops; solid units are weighed in grams.
        patch.measurementType = found.unit === 'ml' ? 'volume' : 'weight';
      }
      await ingredientsRepo.update(ing.id, patch);
      setFound(null);
      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setApplying(false);
    }
  };

  const unitLabel = (r: SupplierParseResult) =>
    r.size !== undefined && r.unit ? `${r.size} ${r.unit}` : null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <label className="mb-1 flex items-center gap-1.5 text-xs font-medium text-slate-500">
        <LinkIcon className="h-3 w-3" />
        {t('inventory.supplierLink', 'Paste supplier link to auto-fill pricing')}
      </label>
      <div className="flex gap-1.5">
        <input
          type="url"
          className="input min-w-0 flex-1 text-sm"
          placeholder="https://…"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(null); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && url.trim() && !busy) void runImport(); }}
        />
        <button
          className="btn-secondary shrink-0 px-3 text-xs"
          disabled={!url.trim() || busy}
          onClick={() => void runImport()}
          title={settings.googleAiApiKey
            ? t('inventory.autoFillTitleAi', 'Reads the page, with Gemini AI as backup (your key from Settings)')
            : t('inventory.autoFillTitle', 'Reads the page locally. Add a Google AI key in Settings for smarter extraction.')}
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {t('inventory.autoFill', 'Auto-fill')}
        </button>
      </div>

      {/* Confirmation box — never write to the DB without an explicit Apply */}
      {found && (
        <div className="mt-2 rounded-xl bg-gaia-50 px-3 py-2.5 ring-1 ring-gaia-200">
          <p className="text-xs font-semibold text-gaia-800">
            {found.source === 'ai'
              ? t('inventory.foundByAi', 'Gemini found on the page:')
              : t('inventory.foundOnPage', 'Found on the page:')}
          </p>
          {found.productName && (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">{found.productName}</p>
          )}
          <p className="mt-1 text-sm text-slate-700">
            {found.price !== undefined && <span className="font-bold">${found.price.toFixed(2)}</span>}
            {found.price !== undefined && unitLabel(found) && ' · '}
            {unitLabel(found)}
            {preview !== undefined && (
              <span className="ml-1.5 text-xs font-semibold text-emerald-700">
                → ${preview.toFixed(4)}{found.unit === 'ml' ? '/drop' : '/g'}
              </span>
            )}
          </p>
          {(found.price === undefined || found.size === undefined) && (
            <p className="mt-1 text-[11px] text-amber-600">
              {t('inventory.partialFind', 'Only part of the info was found — the rest stays as typed below.')}
            </p>
          )}
          <div className="mt-2 flex gap-2">
            <button className="btn-primary px-3 py-1.5 text-xs" disabled={applying} onClick={() => void applyFound()}>
              {applying ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {t('inventory.applyFound', 'Use these values')}
            </button>
            <button className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setFound(null)}>
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      )}

      {applied && (
        <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-emerald-700">
          <Check className="h-3 w-3" />
          {t('inventory.appliedFound', 'Pricing updated from the supplier page!')}
        </p>
      )}

      {error && (
        <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-700">
          <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stock-on-hand row — tracked stock that completed Work Orders deduct
// ---------------------------------------------------------------------------
interface StockRowProps {
  ing: Ingredient;
  onSaved: () => void;
}

function StockRow({ ing, onSaved }: StockRowProps) {
  const { t } = useTranslation();
  const [stock, setStock] = useState(ing.stockOnHand !== undefined ? String(ing.stockOnHand) : '');

  useEffect(() => {
    setStock(ing.stockOnHand !== undefined ? String(ing.stockOnHand) : '');
  }, [ing.stockOnHand]);

  const unit = baseUnitOf(ing);
  const container = containerBaseUnits(ing);

  const save = async (raw: string) => {
    const val = parseFloat(raw);
    await ingredientsRepo.update(ing.id, {
      stockOnHand: isNaN(val) || val < 0 ? undefined : val,
    });
    onSaved();
  };

  const addContainer = async () => {
    if (!container) return;
    const current = parseFloat(stock) || 0;
    const next = Math.round((current + container) * 100) / 100;
    setStock(String(next));
    await save(String(next));
  };

  const tracked = ing.stockOnHand !== undefined;
  const low = tracked && container !== null && (ing.stockOnHand ?? 0) > 0 && (ing.stockOnHand ?? 0) < container * 0.2;
  const out = tracked && (ing.stockOnHand ?? 0) <= 0;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-xs font-medium text-slate-500">
          {t('inventory.stockOnHand', 'Stock on hand')}
        </label>
        <input
          type="number"
          min={0}
          step={1}
          className="input w-24 text-sm"
          placeholder={t('inventory.stockOff', 'off')}
          value={stock}
          onChange={(e) => setStock(e.target.value)}
          onBlur={(e) => void save(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLElement).blur(); }}
        />
        <span className="text-xs text-slate-400">{unit}</span>

        {container !== null && (
          <button
            className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:border-gaia-300 hover:bg-gaia-50 hover:text-gaia-700"
            onClick={() => void addContainer()}
            title={t('inventory.addContainerTitle', 'Add one full container to stock')}
          >
            <PackagePlus className="h-3 w-3" />
            {t('inventory.addContainer', '+1 container ({{n}} {{unit}})', { n: Math.round(container), unit })}
          </button>
        )}

        {out && (
          <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
            {t('inventory.outOfStock', 'out of stock')}
          </span>
        )}
        {low && !out && (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
            {t('inventory.lowStock', 'running low')}
          </span>
        )}
        {!tracked && (
          <span className="text-[11px] text-slate-400">
            {t('inventory.stockHint', 'Leave empty to skip stock tracking. Completed orders deduct automatically.')}
          </span>
        )}
      </div>
    </div>
  );
}
