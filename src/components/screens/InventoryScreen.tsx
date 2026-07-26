import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Check, ChevronDown, ChevronUp, Database, DollarSign,
  ExternalLink, Link as LinkIcon, Loader2, MinusCircle, Package, PackageCheck,
  PackagePlus, Pin, Plus, ShoppingBag, ShoppingCart, Sparkles, Trash2, X,
} from 'lucide-react';
import type { CustomMaterial, Ingredient, IngredientCategory, MaterialCategory, Recipe, SetPurchase } from '@/types';
import { customMaterialsRepo, ingredientsRepo, recipesRepo, setPurchasesRepo } from '@/db/repositories';
import {
  baseUnitOf,
  calculateFractionalCost,
  containerBaseUnits,
  DROPS_PER_ML,
  fractionalCostLabel,
  isVolumeIngredient,
} from '@/lib/inventoryMath';
import { importFromSupplierUrl, type SupplierParseResult } from '@/lib/supplierImport';
import IngredientIcon, { CATEGORY_LABELS } from '@/components/common/IngredientIcon';
import { getCategoryLabel, getIngredientDisplayName } from '@/lib/ingredientI18n';
import Modal from '@/components/common/Modal';
import TipBanner from '@/components/tour/TipBanner';
import { useAppStore } from '@/store/useAppStore';

// ---------------------------------------------------------------------------
// Category tabs — Zero-Math pantry grid
// ---------------------------------------------------------------------------

type InventoryTab = 'bases-butters' | 'essential-oils' | 'botanicals-clays';

const INVENTORY_TABS: { id: InventoryTab; labelKey: string; fallback: string }[] = [
  { id: 'bases-butters', labelKey: 'inventory.tabBasesButters', fallback: 'Bases & Butters' },
  { id: 'essential-oils', labelKey: 'inventory.tabEssentialOils', fallback: 'Essential Oils' },
  { id: 'botanicals-clays', labelKey: 'inventory.tabBotanicalsClays', fallback: 'Botanicals & Clays' },
];

const BASES_BUTTERS = new Set<IngredientCategory>(['base', 'butter', 'oil', 'wax']);
const BOTANICALS_CLAYS = new Set<IngredientCategory>([
  'clay', 'botanical', 'floral', 'exfoliant', 'additive', 'milk', 'seed', 'spice', 'colorant',
]);

function inventoryTabFor(ing: Ingredient): InventoryTab | null {
  const cat = ing.category ?? 'other';
  if (cat === 'essential-oil') return 'essential-oils';
  if (cat === 'fragrance' && isVolumeIngredient(ing)) return 'essential-oils';
  if (BOTANICALS_CLAYS.has(cat)) return 'botanicals-clays';
  if (BASES_BUTTERS.has(cat) || ing.isSoapBase) return 'bases-butters';
  return null;
}

const VOLUME_CATEGORIES = new Set<IngredientCategory>(['essential-oil', 'fragrance']);

function getCategoryMeasurementType(category?: IngredientCategory): 'weight' | 'volume' {
  return category && VOLUME_CATEGORIES.has(category) ? 'volume' : 'weight';
}

function getCategoryDefaultUnit(category?: IngredientCategory): 'oz' | 'lbs' | 'ml' | 'g' {
  return category && VOLUME_CATEGORIES.has(category) ? 'ml' : 'oz';
}

const MATERIAL_CATEGORIES: MaterialCategory[] = ['packaging', 'label', 'bag', 'box', 'container', 'other'];

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

export default function InventoryScreen() {
  const { t } = useTranslation();
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);

  const [activeIngredients, setActiveIngredients] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [allRecipes, setAllRecipes] = useState<Recipe[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [setPurchases, setSetPurchases] = useState<SetPurchase[]>([]);
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [activeTab, setActiveTab] = useState<InventoryTab>('bases-butters');
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);

  const reload = async () => {
    const [all, active, sets, recipes, materials] = await Promise.all([
      ingredientsRepo.all(),
      ingredientsRepo.active(),
      setPurchasesRepo.all(),
      recipesRepo.all(),
      customMaterialsRepo.all(),
    ]);
    setAllIngredients(all);
    setActiveIngredients(active);
    setSetPurchases(sets);
    setAllRecipes(recipes);
    setCustomMaterials(materials);
  };

  // Ingredients referenced by any saved recipe — pinned to the top so Rosa
  // can price what she's actually using before browsing the full pantry.
  const inUseIngredients = useMemo(() => {
    const usedIds = new Set<string>();
    for (const r of allRecipes) {
      for (const id of r.ingredientIds) usedIds.add(id);
    }
    return activeIngredients.filter((ing) => usedIds.has(ing.id));
  }, [allRecipes, activeIngredients]);

  const reloadRecipe = async () => {
    if (!activeRecipeId) { setActiveRecipe(null); return; }
    const r = await recipesRepo.get(activeRecipeId);
    setActiveRecipe(r ?? null);
  };

  useEffect(() => { void reload(); }, []);

  useEffect(() => {
    void reloadRecipe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRecipeId]);

  const pricedCount = useMemo(
    () => activeIngredients.filter((i) => i.fractionalCost !== undefined).length,
    [activeIngredients],
  );

  const tabIngredients = useMemo(
    () => activeIngredients.filter((ing) => inventoryTabFor(ing) === activeTab),
    [activeIngredients, activeTab],
  );

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
      const unit = isVolumeIngredient(ing) ? 'drops' : 'g';
      if (ing.fractionalCost !== undefined) {
        const lineCost = amount * ing.fractionalCost;
        total += lineCost;
        costed++;
        lines.push({ id, name: getIngredientDisplayName(ing.name, t), amount, unit, cost: lineCost });
      } else {
        missing++;
      }
    }
    return { total, costed, missing, recipeName: activeRecipe.name, lines };
  }, [activeRecipe, allIngredients, t]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-5xl px-4 py-6">

          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gaia-900">
                <Package className="h-6 w-6 text-gaia-600" />
                {t('inventory.title', 'Inventory & Pricing')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {t('inventory.subtitleZeroMath', 'Tell us what you paid and bottle size — we handle the rest.')}
              </p>
            </div>
          </div>

          <TipBanner
            id="inventory-supplier-link"
            textDefault="Tap any ingredient, then paste the shop link you bought it from — the price and bottle size fill themselves in."
          />

          {activeIngredients.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                <Package className="h-4 w-4 text-slate-400" />
                <span className="font-semibold">{activeIngredients.length}</span>
                <span className="text-slate-400">{t('inventory.activeIngredients', 'active ingredients')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gaia-600 px-4 py-2 text-sm text-white">
                <span className="font-semibold">{pricedCount}</span>
                <span className="opacity-80">{t('inventory.priced', 'priced')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                <span className="font-semibold">{activeIngredients.length - pricedCount}</span>
                <span className="opacity-80">{t('inventory.unpriced', 'missing prices')}</span>
              </div>
            </div>
          )}

          <ShoppingListCard ingredients={allIngredients} onChanged={reload} />

          <div className="mt-6">
            <SetPurchasesCard ingredients={allIngredients} setPurchases={setPurchases} onChanged={reload} />
          </div>

          <div className="mt-6">
            <CustomMaterialsLibraryCard materials={customMaterials} onChanged={reload} />
          </div>

          <div className="mt-6">
            <CategoryQuickSetCard ingredients={activeIngredients} onChanged={reload} />
          </div>

          {inUseIngredients.length > 0 && (
            <div className="mt-6">
              <InUseIngredientsSection
                ingredients={inUseIngredients}
                onEdit={(ing) => setEditingIngredient(ing)}
              />
            </div>
          )}

          {activeIngredients.length === 0 ? (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-gaia-300" />
              <p className="font-medium text-slate-600">{t('inventory.noActive', 'No active ingredients yet.')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('inventory.noActiveHint', 'Go to Ingredients to activate some.')}</p>
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-2" data-tour="inventory-tabs">
                {INVENTORY_TABS.map((tab) => {
                  const count = activeIngredients.filter((i) => inventoryTabFor(i) === tab.id).length;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        active
                          ? 'bg-gaia-600 text-white shadow-sm'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-gaia-300'
                      }`}
                    >
                      {t(tab.labelKey, tab.fallback)}
                      <span className={`ml-1.5 text-xs ${active ? 'text-gaia-200' : 'text-slate-400'}`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

              {tabIngredients.length === 0 ? (
                <p className="mt-6 text-center text-sm text-slate-400">
                  {t('inventory.emptyTab', 'No active ingredients in this category yet.')}
                </p>
              ) : (
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {tabIngredients.map((ing) => (
                    <InventoryGridItem
                      key={ing.id}
                      ing={ing}
                      onEdit={() => setEditingIngredient(ing)}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {recipeCostSummary !== null && <RecipeCostPanel summary={recipeCostSummary} />}

          {activeIngredients.length > 0 && (
            <p className="mt-6 text-xs text-slate-400">
              {t('inventory.legendZeroMath', 'Tap any item to update what you paid — cost per gram or drop updates automatically.')}
            </p>
          )}
        </div>
      </div>

      {editingIngredient && (
        <PriceEditModal
          ing={editingIngredient}
          onClose={() => setEditingIngredient(null)}
          onSaved={() => { void reload(); setEditingIngredient(null); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shopping List — tracked ingredients that are out or running low, with the
// stored supplier link one click away and a "+1 container" restock action.
// Everything it needs (stockOnHand, containerBaseUnits, supplierUrl) already
// lives on the ingredient — this card just closes the reorder loop.
// ---------------------------------------------------------------------------

function ShoppingListCard({
  ingredients,
  onChanged,
}: {
  ingredients: Ingredient[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
  const [restockingId, setRestockingId] = useState<string | null>(null);

  const entries = useMemo(() => {
    return ingredients
      .filter((ing) => ing.stockOnHand !== undefined)
      .map((ing) => {
        const container = containerBaseUnits(ing);
        const out = (ing.stockOnHand ?? 0) <= 0;
        const low = !out && container !== null && (ing.stockOnHand ?? 0) < container * 0.2;
        return { ing, container, out, low };
      })
      .filter((e) => e.out || e.low)
      .sort((a, b) => Number(b.out) - Number(a.out) || a.ing.name.localeCompare(b.ing.name));
  }, [ingredients]);

  if (entries.length === 0) return null;

  const restock = async (ing: Ingredient, container: number) => {
    setRestockingId(ing.id);
    try {
      const next = Math.round(((ing.stockOnHand ?? 0) + container) * 10) / 10;
      await ingredientsRepo.update(ing.id, { stockOnHand: next });
      onChanged();
    } finally {
      setRestockingId(null);
    }
  };

  return (
    <div className="mt-6 overflow-hidden rounded-2xl bg-white ring-2 ring-amber-300" data-tour="shopping-list">
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ShoppingCart className="h-5 w-5 shrink-0 text-amber-600" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{t('inventory.shoppingList', 'Shopping List')}</p>
          <p className="text-xs text-slate-400">
            {t('inventory.shoppingListSubtitle', 'Tracked ingredients that are out or running low — reorder before the next batch.')}
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
          {entries.length}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-1.5 border-t border-slate-100 px-4 pb-4 pt-3">
          {entries.map(({ ing, container, out }) => {
            const unit = baseUnitOf(ing);
            return (
              <div key={ing.id} className="flex items-center gap-2.5 rounded-xl bg-amber-50/60 px-3 py-2">
                <IngredientIcon category={ing.category} name={ing.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">
                    {getIngredientDisplayName(ing.name, t)}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t('inventory.shoppingListStock', '{{n}} {{unit}} left', {
                      n: Math.round((ing.stockOnHand ?? 0) * 10) / 10,
                      unit,
                    })}
                    {container !== null && ` · ${t('inventory.shoppingListContainer', 'container = {{n}} {{unit}}', { n: Math.round(container), unit })}`}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${
                  out
                    ? 'bg-rose-50 text-rose-700 ring-rose-200'
                    : 'bg-amber-50 text-amber-700 ring-amber-200'
                }`}>
                  {out ? t('inventory.outOfStock', 'out of stock') : t('inventory.lowStock', 'running low')}
                </span>
                {ing.supplierUrl && (
                  <a
                    href={ing.supplierUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                    title={t('inventory.openSupplier', 'Open the saved supplier page')}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {t('inventory.buy', 'Buy')}
                  </a>
                )}
                {container !== null && (
                  <button
                    className="btn-secondary shrink-0 px-2.5 py-1 text-xs"
                    disabled={restockingId === ing.id}
                    onClick={() => void restock(ing, container)}
                    title={t('inventory.restockTitle', 'I bought one — add a full container to stock')}
                  >
                    {restockingId === ing.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <PackagePlus className="h-3.5 w-3.5" />}
                    {t('inventory.restock', 'Restocked')}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Grid item — shows name + calculated unit cost only (zero math)
// ---------------------------------------------------------------------------

function InventoryGridItem({ ing, onEdit }: { ing: Ingredient; onEdit: () => void }) {
  const { t } = useTranslation();
  const isPriced = ing.fractionalCost !== undefined;
  const unitLabel = fractionalCostLabel(ing);
  const displayName = getIngredientDisplayName(ing.name, t);
  const catLabel = getCategoryLabel(ing.category ?? 'other', t);

  // Stock chip — only for tracked ingredients (stockOnHand set).
  const tracked = ing.stockOnHand !== undefined;
  const container = containerBaseUnits(ing);
  const out = tracked && (ing.stockOnHand ?? 0) <= 0;
  const low = tracked && !out && container !== null && (ing.stockOnHand ?? 0) < container * 0.2;

  return (
    <button
      type="button"
      onClick={onEdit}
      className={`rounded-2xl bg-white p-4 text-left ring-1 transition hover:shadow-sm ${
        isPriced ? 'ring-emerald-200 hover:ring-emerald-300' : 'ring-amber-200 hover:ring-amber-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${isPriced ? 'bg-emerald-400' : 'bg-amber-400'}`} />
        <IngredientIcon category={ing.category} name={ing.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-800">{displayName}</p>
          <p className="text-xs text-slate-400">{catLabel}</p>
        </div>
      </div>
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2">
        {isPriced ? (
          <>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {unitLabel === '/drop'
                ? t('inventory.costPerDrop', 'Cost per drop')
                : t('inventory.costPerGram', 'Cost per gram')}
            </p>
            <p className="text-lg font-bold text-emerald-700">
              ${ing.fractionalCost!.toFixed(4)}
              <span className="ml-1 text-xs font-normal text-slate-400">{unitLabel}</span>
            </p>
          </>
        ) : (
          <p className="text-sm font-medium text-amber-600">{t('inventory.tapToPrice', 'Tap to add price')}</p>
        )}
      </div>
      {tracked && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-400">
          {t('inventory.onHand', '{{n}} {{unit}} on hand', {
            n: Math.round((ing.stockOnHand ?? 0) * 10) / 10,
            unit: baseUnitOf(ing),
          })}
          {out && (
            <span className="rounded-full bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700 ring-1 ring-rose-200">
              {t('inventory.outOfStock', 'out of stock')}
            </span>
          )}
          {low && (
            <span className="rounded-full bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-700 ring-1 ring-amber-200">
              {t('inventory.lowStock', 'running low')}
            </span>
          )}
        </p>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Pinned "In-Use Ingredients" — only ingredients referenced by a saved recipe,
// shown above the category tabs so Rosa prices what she's actually using first.
// ---------------------------------------------------------------------------

function InUseIngredientsSection({
  ingredients,
  onEdit,
}: {
  ingredients: Ingredient[];
  onEdit: (ing: Ingredient) => void;
}) {
  const { t } = useTranslation();
  const pricedCount = ingredients.filter((i) => i.fractionalCost !== undefined).length;

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-2 ring-gaia-200">
      <div className="flex items-center gap-3 px-5 py-4">
        <Pin className="h-5 w-5 shrink-0 text-gaia-600" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{t('inventory.inUseTitle', 'In-Use Ingredients')}</p>
          <p className="text-xs text-slate-400">
            {t('inventory.inUseSubtitle', 'Used in your saved recipes — price these first.')}
          </p>
        </div>
        <span className="rounded-full bg-gaia-100 px-2 py-0.5 text-xs font-semibold text-gaia-700">
          {pricedCount}/{ingredients.length} {t('inventory.priced', 'priced')}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3 border-t border-slate-100 p-5 sm:grid-cols-2 lg:grid-cols-3">
        {ingredients.map((ing) => (
          <InventoryGridItem key={ing.id} ing={ing} onEdit={() => onEdit(ing)} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category Quick Set — one price applied to every ingredient in a category
// at once (e.g. "all colorants → $0.05/g" or "all fragrance oils → $0.10/drop").
// ---------------------------------------------------------------------------

function CategoryQuickSetCard({
  ingredients,
  onChanged,
}: {
  ingredients: Ingredient[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<IngredientCategory | ''>('');
  const [price, setPrice] = useState('');
  const [applying, setApplying] = useState(false);
  const [appliedCount, setAppliedCount] = useState<number | null>(null);

  const categoryCounts = useMemo(() => {
    const counts = new Map<IngredientCategory, number>();
    for (const ing of ingredients) {
      const cat = ing.category ?? 'other';
      counts.set(cat, (counts.get(cat) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [ingredients]);

  const targetIngredients = useMemo(
    () => (category ? ingredients.filter((i) => (i.category ?? 'other') === category) : []),
    [ingredients, category],
  );

  const isVolume = targetIngredients.length > 0 ? isVolumeIngredient(targetIngredients[0]) : false;
  const unitLabel = isVolume ? t('inventory.perDrop', '/drop') : t('inventory.perGram', '/g');

  const handleApply = async () => {
    const p = parseFloat(price);
    if (!category || isNaN(p) || p <= 0 || targetIngredients.length === 0) return;
    setApplying(true);
    try {
      await Promise.all(
        targetIngredients.map((ing) => {
          const volume = isVolumeIngredient(ing);
          return ingredientsRepo.update(ing.id, volume
            ? { measurementType: 'volume', purchaseUnit: 'ml', purchaseSize: 1 / DROPS_PER_ML, purchasePrice: p }
            : { measurementType: 'weight', purchaseUnit: 'g', purchaseSize: 1, purchasePrice: p });
        }),
      );
      setAppliedCount(targetIngredients.length);
      setPrice('');
      onChanged();
      setTimeout(() => setAppliedCount(null), 3000);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200" data-tour="quick-set">
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Sparkles className="h-5 w-5 shrink-0 text-gaia-600" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{t('inventory.quickSetTitle', 'Quick Set by Category')}</p>
          <p className="text-xs text-slate-400">
            {t('inventory.quickSetSubtitle', 'Set one price for every ingredient in a category at once.')}
          </p>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
          {categoryCounts.length === 0 ? (
            <p className="text-sm text-slate-400">{t('inventory.quickSetNoIngredients', 'Activate some ingredients first.')}</p>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {t('inventory.quickSetCategoryLabel', 'Category')}
                  </label>
                  <select
                    className="input text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value as IngredientCategory | '')}
                  >
                    <option value="">{t('inventory.quickSetCategoryPlaceholder', 'Choose a category…')}</option>
                    {categoryCounts.map(([cat, count]) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] ?? cat} ({count})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-1">
                  <label className="mb-1 block text-xs font-medium text-slate-500">
                    {t('inventory.quickSetPriceLabel', 'Price per unit')}
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input
                      type="number"
                      min={0}
                      step={0.0001}
                      className="input pl-7 pr-12 text-sm"
                      placeholder="0.05"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      disabled={!category}
                    />
                    {category && (
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                        {unitLabel}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-end sm:col-span-1">
                  <button
                    className="btn-primary w-full py-2 text-sm"
                    disabled={!category || !price || applying || targetIngredients.length === 0}
                    onClick={() => void handleApply()}
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {category
                      ? t('inventory.quickSetApplyButton', 'Apply to {{count}} ingredients', { count: targetIngredients.length })
                      : t('inventory.quickSetApply', 'Apply')}
                  </button>
                </div>
              </div>

              {appliedCount !== null && (
                <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                  <PackageCheck className="h-3.5 w-3.5 shrink-0" />
                  {t('inventory.quickSetApplied', '{{count}} ingredient(s) updated', { count: appliedCount })}
                </p>
              )}

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                {t('inventory.quickSetHint', 'e.g. auto-fill all colorants with $0.05/g, or all fragrance oils with $0.10/drop. This overwrites any existing price for ingredients in the category.')}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Zero-math price modal — only receipt price + bottle size
// ---------------------------------------------------------------------------

interface PriceForm {
  purchasePrice: string;
  purchaseSize: string;
  purchaseUnit: 'oz' | 'lbs' | 'ml' | 'g';
  measurementType: 'weight' | 'volume';
}

function PriceEditModal({
  ing,
  onClose,
  onSaved,
}: {
  ing: Ingredient;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const measurementType = ing.measurementType ?? getCategoryMeasurementType(ing.category);
  const [form, setForm] = useState<PriceForm>({
    purchasePrice: ing.purchasePrice !== undefined ? String(ing.purchasePrice) : '',
    purchaseSize: ing.purchaseSize !== undefined ? String(ing.purchaseSize) : '',
    purchaseUnit: ing.purchaseUnit ?? getCategoryDefaultUnit(ing.category),
    measurementType,
  });
  const [stock, setStock] = useState(ing.stockOnHand !== undefined ? String(ing.stockOnHand) : '');
  const [saving, setSaving] = useState(false);

  // ── Supplier-link importer state ─────────────────────────────────────────
  const [supplierUrl, setSupplierUrl] = useState(ing.supplierUrl ?? '');
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [found, setFound] = useState<SupplierParseResult | null>(null);

  const computedCost = useMemo(
    () =>
      calculateFractionalCost({
        measurementType: form.measurementType,
        purchaseSize: parseFloat(form.purchaseSize) || undefined,
        purchaseUnit: form.purchaseUnit,
        purchasePrice: parseFloat(form.purchasePrice) || undefined,
      }),
    [form],
  );

  const unitOptions: PriceForm['purchaseUnit'][] =
    form.measurementType === 'volume' ? ['ml'] : ['oz', 'lbs', 'g'];

  const runImport = async () => {
    const url = supplierUrl.trim();
    if (!url) return;
    setImportBusy(true);
    setImportError(null);
    setFound(null);
    try {
      setFound(await importFromSupplierUrl(url, settings));
    } catch (err) {
      setImportError(err instanceof Error ? err.message : String(err));
    } finally {
      setImportBusy(false);
    }
  };

  /** Copies the detected values into the form — the user still confirms with Save. */
  const applyFound = () => {
    if (!found) return;
    setForm((f) => ({
      measurementType: found.unit ? (found.unit === 'ml' ? 'volume' : 'weight') : f.measurementType,
      purchasePrice: found.price !== undefined ? String(found.price) : f.purchasePrice,
      purchaseSize: found.size !== undefined ? String(found.size) : f.purchaseSize,
      purchaseUnit: found.unit ?? f.purchaseUnit,
    }));
    setFound(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const stockVal = parseFloat(stock);
      await ingredientsRepo.update(ing.id, {
        measurementType: form.measurementType,
        purchasePrice: parseFloat(form.purchasePrice) || undefined,
        purchaseSize: parseFloat(form.purchaseSize) || undefined,
        purchaseUnit: form.purchaseUnit,
        supplierUrl: supplierUrl.trim() || undefined,
        stockOnHand: !isNaN(stockVal) && stockVal >= 0 ? stockVal : undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  const costLabel = fractionalCostLabel({ measurementType: form.measurementType, category: ing.category });
  const displayName = getIngredientDisplayName(ing.name, t);
  const stockUnit = baseUnitOf({ measurementType: form.measurementType, category: ing.category });
  const container = containerBaseUnits({
    measurementType: form.measurementType,
    category: ing.category,
    purchaseSize: parseFloat(form.purchaseSize) || undefined,
    purchaseUnit: form.purchaseUnit,
  });

  const addContainerToStock = () => {
    if (container === null) return;
    const current = parseFloat(stock) || 0;
    setStock(String(Math.round((current + container) * 10) / 10));
  };

  /** Preview of the fractional cost the detected values would produce. */
  const foundPreview = useMemo(() => {
    if (!found?.price || !found.size || !found.unit) return undefined;
    return calculateFractionalCost({
      measurementType: found.unit === 'ml' ? 'volume' : 'weight',
      purchaseSize: found.size,
      purchaseUnit: found.unit,
      purchasePrice: found.price,
    });
  }, [found]);

  const sourceLabel = (r: SupplierParseResult) =>
    r.source === 'local-ai'
      ? t('inventory.foundByLocalAi', 'Built-in AI read the page:')
      : r.source === 'gemini'
        ? t('inventory.foundByGemini', 'Gemini found on the page:')
        : t('inventory.foundOnPage', 'Found on the page:');

  return (
    <Modal
      open
      onClose={onClose}
      width={440}
      title={displayName}
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-secondary" onClick={onClose}>{t('common.cancel', 'Cancel')}</button>
          <button className="btn-primary" disabled={saving || !form.purchasePrice || !form.purchaseSize} onClick={() => void handleSave()}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t('common.save', 'Save')}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* ── Paste supplier link to auto-fill pricing ─────────────────────── */}
        <div>
          <label className="label flex items-center gap-1.5">
            <LinkIcon className="h-3 w-3" />
            {t('inventory.supplierLink', 'Paste supplier link to auto-fill pricing')}
          </label>
          <div className="flex gap-1.5">
            <input
              type="url"
              className="input min-w-0 flex-1 text-sm"
              placeholder="https://…"
              value={supplierUrl}
              onChange={(e) => { setSupplierUrl(e.target.value); setImportError(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && supplierUrl.trim() && !importBusy) void runImport(); }}
            />
            <button
              className="btn-secondary shrink-0 px-3 text-xs"
              disabled={!supplierUrl.trim() || importBusy}
              onClick={() => void runImport()}
              title={t('inventory.autoFillTitle', 'Reads the page with the built-in offline AI (plus Gemini if a key is saved in Settings).')}
            >
              {importBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
              {t('inventory.autoFill', 'Auto-fill')}
            </button>
          </div>
          {importBusy && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              {t('inventory.autoFillBusy', 'Reading the page… the built-in AI can take up to a minute on big pages.')}
            </p>
          )}
          {found && (
            <div className="mt-2 rounded-xl bg-gaia-50 px-3 py-2.5 ring-1 ring-gaia-200">
              <p className="text-xs font-semibold text-gaia-800">{sourceLabel(found)}</p>
              {found.productName && (
                <p className="mt-0.5 truncate text-[11px] text-slate-500">{found.productName}</p>
              )}
              <p className="mt-1 text-sm text-slate-700">
                {found.price !== undefined && <span className="font-bold">${found.price.toFixed(2)}</span>}
                {found.price !== undefined && found.size !== undefined && ' · '}
                {found.size !== undefined && found.unit && `${found.size} ${found.unit}`}
                {foundPreview !== undefined && (
                  <span className="ml-1.5 text-xs font-semibold text-emerald-700">
                    → ${foundPreview.toFixed(4)}{found.unit === 'ml' ? '/drop' : '/g'}
                  </span>
                )}
              </p>
              {(found.price === undefined || found.size === undefined) && (
                <p className="mt-1 text-[11px] text-amber-600">
                  {t('inventory.partialFind', 'Only part of the info was found — fill in the rest below.')}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                <button className="btn-primary px-3 py-1.5 text-xs" onClick={applyFound}>
                  <Check className="h-3 w-3" />
                  {t('inventory.applyFound', 'Use these values')}
                </button>
                <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setFound(null)}>
                  {t('common.cancel', 'Cancel')}
                </button>
              </div>
            </div>
          )}
          {importError && (
            <p className="mt-1.5 flex items-start gap-1 text-xs text-amber-700">
              <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
              {importError}
            </p>
          )}
        </div>

        <div>
          <label className="label">{t('inventory.whatDidYouPay', 'What did you pay?')}</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input pl-7"
              placeholder="12.00"
              value={form.purchasePrice}
              onChange={(e) => setForm((f) => ({ ...f, purchasePrice: e.target.value }))}
              autoFocus
            />
          </div>
        </div>

        <div>
          <label className="label">{t('inventory.bottleSize', 'What size was the bottle?')}</label>
          <div className="flex gap-2">
            <input
              type="number"
              min={0}
              step={0.1}
              className="input min-w-0 flex-1"
              placeholder={form.measurementType === 'volume' ? '15' : '16'}
              value={form.purchaseSize}
              onChange={(e) => setForm((f) => ({ ...f, purchaseSize: e.target.value }))}
            />
            <select
              className="input w-20 shrink-0"
              value={form.purchaseUnit}
              onChange={(e) =>
                setForm((f) => ({ ...f, purchaseUnit: e.target.value as PriceForm['purchaseUnit'] }))
              }
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        {computedCost !== undefined && (
          <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
            <p className="text-xs text-emerald-700">
              {costLabel === '/drop'
                ? t('inventory.costPerDrop', 'Cost per drop')
                : t('inventory.costPerGram', 'Cost per gram')}
            </p>
            <p className="text-2xl font-bold text-emerald-800">
              ${computedCost.toFixed(4)}
              <span className="ml-1 text-sm font-normal">{costLabel}</span>
            </p>
          </div>
        )}

        {/* ── Stock on hand (optional; completed Work Orders deduct it) ────── */}
        <div>
          <label className="label">{t('inventory.stockOnHand', 'Stock on hand (optional)')}</label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min={0}
              step={1}
              className="input w-28"
              placeholder={t('inventory.stockOff', 'off')}
              value={stock}
              onChange={(e) => setStock(e.target.value)}
            />
            <span className="text-xs text-slate-400">{stockUnit}</span>
            {container !== null && (
              <button
                type="button"
                className="flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-medium text-slate-500 transition hover:border-gaia-300 hover:bg-gaia-50 hover:text-gaia-700"
                onClick={addContainerToStock}
                title={t('inventory.addContainerTitle', 'Add one full container to stock')}
              >
                <PackagePlus className="h-3 w-3" />
                {t('inventory.addContainer', '+1 container ({{n}} {{unit}})', {
                  n: Math.round(container),
                  unit: stockUnit,
                })}
              </button>
            )}
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            {t('inventory.stockHint', 'Leave empty to skip stock tracking. Completed orders deduct automatically.')}
          </p>
        </div>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Set Purchases Card
// ---------------------------------------------------------------------------

interface QuickSet { label: string; name: string; totalPrice: number; itemCount: number }

const QUICK_SETS: QuickSet[] = [
  { label: 'YumCraft 20 Dyes', name: 'YumCraft Soap Dyes 20pk', totalPrice: 14.99, itemCount: 20 },
  { label: 'Smalltongue 36 Micas', name: 'Smalltongue Mica Powder 36pk', totalPrice: 13.99, itemCount: 36 },
  { label: 'Glycerin Base 5lb', name: 'Glycerin Base 5lb (bulk)', totalPrice: 18.0, itemCount: 1 },
];

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

const emptySetForm: SetForm = { name: '', totalPrice: '', itemCount: '', assignedIngredientIds: [] };

function SetPurchasesCard({ ingredients, setPurchases, onChanged }: SetPurchasesCardProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);
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
    setForm((f) => ({ ...f, name: qs.name, totalPrice: String(qs.totalPrice), itemCount: String(qs.itemCount) }));
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
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <ShoppingBag className="h-5 w-5 shrink-0 text-gaia-600" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{t('inventory.setPurchases', 'Set Purchases')}</p>
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
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
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
                  {qs.label}
                </button>
              ))}
            </div>
          </div>

          {setPurchases.length > 0 && (
            <div className="space-y-2">
              {setPurchases.map((sp) => (
                <div key={sp.id} className="flex items-start gap-3 rounded-xl bg-gaia-50 px-4 py-3 ring-1 ring-gaia-100">
                  <PackageCheck className="mt-0.5 h-4 w-4 shrink-0 text-gaia-500" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-800">{sp.name}</p>
                    <p className="text-xs text-slate-500">
                      ${sp.totalPrice.toFixed(2)} · ${sp.pricePerItem.toFixed(4)}/item
                    </p>
                  </div>
                  <button onClick={() => void handleDelete(sp.id)} aria-label="Delete set purchase" className="mt-0.5 shrink-0">
                    <Trash2 className="h-4 w-4 text-slate-300 transition-colors hover:text-rose-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {!showForm ? (
            <button
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gaia-200 py-2.5 text-xs font-medium text-gaia-600 transition hover:border-gaia-400 hover:bg-gaia-50"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('inventory.addSetPurchase', 'Add Set Purchase')}
            </button>
          ) : (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">{t('inventory.newSetPurchase', 'New Set Purchase')}</p>
                <button onClick={() => { setShowForm(false); setForm(emptySetForm); }} className="text-slate-400 hover:text-slate-600" aria-label="Cancel">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">{t('inventory.setName', 'Set name')}</label>
                <input className="input text-sm" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{t('inventory.totalPricePaid', 'Total price paid')}</label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
                    <input type="number" min={0} step={0.01} className="input pl-7 text-sm" value={form.totalPrice} onChange={(e) => setForm((f) => ({ ...f, totalPrice: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">{t('inventory.itemCount', 'Number of items')}</label>
                  <input type="number" min={1} step={1} className="input text-sm" value={form.itemCount} onChange={(e) => setForm((f) => ({ ...f, itemCount: e.target.value }))} />
                </div>
              </div>
              {pricePerItem !== null && (
                <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                  <p className="text-xs text-emerald-700">{t('inventory.costPerItem', 'Auto-calculated cost per item')}</p>
                  <p className="text-xl font-bold text-emerald-800">${pricePerItem.toFixed(4)}<span className="ml-1 text-sm font-normal">/item</span></p>
                </div>
              )}
              {activeIngredients.length > 0 && (
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  {activeIngredients.map((ing) => {
                    const checked = form.assignedIngredientIds.includes(ing.id);
                    return (
                      <label key={ing.id} className={`flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm ${checked ? 'bg-gaia-50' : 'hover:bg-slate-50'}`}>
                        <input type="checkbox" className="h-3.5 w-3.5 accent-gaia-600" checked={checked} onChange={() => toggleIngredient(ing.id)} />
                        <IngredientIcon category={ing.category} name={ing.name} size="sm" />
                        <span className="flex-1 truncate text-slate-700">{getIngredientDisplayName(ing.name, t)}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              <button className="btn-primary w-full" disabled={!form.name.trim() || !form.totalPrice || !form.itemCount || saving} onClick={() => void handleSave()}>
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
// Custom Materials & Packaging — a reusable library of materials costs
// (bags, boxes, labels) shared with the Recipe Builder, following the same
// active/inactive pattern as Ingredients.
// ---------------------------------------------------------------------------

interface MaterialForm {
  name: string;
  category: MaterialCategory;
  cost: string;
  unit: string;
}

const emptyMaterialForm: MaterialForm = { name: '', category: 'packaging', cost: '', unit: '' };

function CustomMaterialsLibraryCard({
  materials,
  onChanged,
}: {
  materials: CustomMaterial[];
  onChanged: () => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [form, setForm] = useState<MaterialForm>(emptyMaterialForm);
  const [saving, setSaving] = useState(false);

  const active = useMemo(() => materials.filter((m) => m.active), [materials]);
  const inactive = useMemo(() => materials.filter((m) => !m.active), [materials]);

  const handleAdd = async () => {
    const cost = parseFloat(form.cost);
    if (!form.name.trim() || isNaN(cost) || cost < 0) return;
    setSaving(true);
    try {
      await customMaterialsRepo.create({
        name: form.name.trim(),
        category: form.category,
        cost,
        unit: form.unit.trim() || undefined,
        active: true,
      });
      setForm({ ...emptyMaterialForm, category: form.category });
      onChanged();
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (id: string) => {
    await customMaterialsRepo.toggleActive(id);
    onChanged();
  };

  const handleDelete = async (id: string) => {
    await customMaterialsRepo.remove(id);
    onChanged();
  };

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <button
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Database className="h-5 w-5 shrink-0 text-violet-600" />
        <div className="flex-1">
          <p className="font-semibold text-slate-800">{t('materials.title', 'Custom Materials & Packaging')}</p>
          <p className="text-xs text-slate-400">
            {t('materials.subtitle', 'Bags, boxes, labels and other packaging you use regularly — priced once, reused in every recipe.')}
          </p>
        </div>
        {active.length > 0 && (
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-700">
            {active.length}
          </span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="space-y-4 border-t border-slate-100 px-5 pb-5 pt-4">
          {active.length === 0 ? (
            <p className="text-xs italic text-slate-400">
              {t('materials.empty', 'No materials yet — add packaging, bags, or labels below.')}
            </p>
          ) : (
            <div className="space-y-1.5">
              {active.map((m) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg bg-violet-50 px-3 py-2 text-xs">
                  <Package className="h-3.5 w-3.5 shrink-0 text-violet-400" />
                  <span className="flex-1 truncate font-medium text-slate-700">{m.name}</span>
                  <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-medium text-violet-600 ring-1 ring-violet-200">
                    {t(`materials.categories.${m.category}`, m.category)}
                  </span>
                  <span className="shrink-0 text-slate-500">
                    ${m.cost.toFixed(2)}
                    <span className="text-slate-400">/{m.unit || t('materials.perItem', 'item')}</span>
                  </span>
                  <button
                    onClick={() => void handleToggleActive(m.id)}
                    title={t('materials.deactivate', 'Move to inactive')}
                    className="shrink-0"
                  >
                    <MinusCircle className="h-3.5 w-3.5 text-slate-300 transition-colors hover:text-amber-500" />
                  </button>
                  <button onClick={() => void handleDelete(m.id)} aria-label="Remove material" className="shrink-0">
                    <Trash2 className="h-3.5 w-3.5 text-slate-300 transition-colors hover:text-rose-500" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {inactive.length > 0 && (
            <div>
              <button
                type="button"
                className="text-xs font-medium text-gaia-700 hover:underline"
                onClick={() => setShowInactive((v) => !v)}
              >
                {showInactive
                  ? t('materials.hideInactive', 'Hide inactive ({{count}})', { count: inactive.length })
                  : t('materials.showInactive', 'Show inactive ({{count}})', { count: inactive.length })}
              </button>
              {showInactive && (
                <div className="mt-2 space-y-1.5">
                  {inactive.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                      <span className="flex-1 truncate text-slate-500">{m.name}</span>
                      <span className="shrink-0 text-slate-400">
                        ${m.cost.toFixed(2)}/{m.unit || t('materials.perItem', 'item')}
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleToggleActive(m.id)}
                        className="shrink-0 text-[11px] font-medium text-gaia-600 hover:underline"
                      >
                        {t('materials.activate', 'Activate')}
                      </button>
                      <button onClick={() => void handleDelete(m.id)} aria-label="Remove material" className="shrink-0">
                        <Trash2 className="h-3.5 w-3.5 text-slate-300 transition-colors hover:text-rose-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                {t('materials.name', 'Item name')}
              </label>
              <input
                className="input text-sm"
                placeholder={t('materials.namePlaceholder', 'e.g. Kraft bag')}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                {t('materials.category', 'Category')}
              </label>
              <select
                className="input text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as MaterialCategory }))}
              >
                {MATERIAL_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{t(`materials.categories.${c}`, c)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                {t('materials.cost', 'Cost ($)')}
              </label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input text-sm"
                placeholder="0.35"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-medium text-slate-500">
                {t('materials.unit', 'Unit')}
              </label>
              <input
                className="input text-sm"
                placeholder={t('materials.unitPlaceholder', 'per bar')}
                value={form.unit}
                onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              />
            </div>
            <button
              type="button"
              className="btn-primary py-2 text-sm"
              onClick={() => void handleAdd()}
              disabled={!form.name.trim() || !form.cost.trim() || saving}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              {t('materials.add', 'Add')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live recipe material cost (no conversion formulas shown)
// ---------------------------------------------------------------------------

function RecipeCostPanel({
  summary,
}: {
  summary: {
    total: number;
    costed: number;
    missing: number;
    recipeName: string;
    lines: { id: string; name: string; amount: number; unit: string; cost: number }[];
  };
}) {
  const { t } = useTranslation();

  return (
    <div className="mt-8 rounded-2xl bg-white px-5 py-5 shadow-sm ring-2 ring-gaia-200">
      <div className="mb-4 flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-gaia-600" />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gaia-700">
          {t('inventory.liveCostPanel', 'Live Material Cost')}
        </h2>
        <span className="ml-auto rounded-xl bg-gaia-50 px-2.5 py-0.5 text-xs font-medium text-gaia-600 ring-1 ring-gaia-200">
          {summary.recipeName}
        </span>
      </div>

      {summary.lines.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {summary.lines.map((line) => (
            <div key={line.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
              <span className="max-w-[55%] truncate font-medium text-slate-600">{line.name}</span>
              <span className="shrink-0 text-slate-400">{line.amount} {line.unit}</span>
              <span className="shrink-0 font-semibold text-slate-700">${line.cost.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {summary.missing > 0 && (
        <p className="mb-3 text-xs text-amber-600">
          {t('inventory.missingPrices', '{{count}} ingredient(s) are missing prices — total may be incomplete.', { count: summary.missing })}
        </p>
      )}

      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
        <span className="text-sm font-semibold text-emerald-800">{t('inventory.totalMaterialCost', 'Total raw material cost')}</span>
        <span className="text-2xl font-bold text-emerald-700">${summary.total.toFixed(2)}</span>
      </div>
    </div>
  );
}
