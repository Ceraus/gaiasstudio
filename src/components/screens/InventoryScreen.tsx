import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, ChevronUp, Database, DollarSign, Loader2,
  Package, PackageCheck, Plus, ShoppingBag, Trash2, X,
} from 'lucide-react';
import type { Ingredient, IngredientCategory, Recipe, SetPurchase } from '@/types';
import {
  ingredientsRepo,
  recipesRepo,
  setPurchasesRepo,
  calculateFractionalCost,
} from '@/db/repositories';
import IngredientIcon, { CATEGORY_LABELS } from '@/components/common/IngredientIcon';
import { useAppStore } from '@/store/useAppStore';

// ---------------------------------------------------------------------------
// Sample prices bulk-loaded with one click
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
// Quick "Set" chips — pre-built set entries Rosa can tap to auto-fill
// ---------------------------------------------------------------------------
interface QuickSet {
  label: string;
  name: string;
  totalPrice: number;
  itemCount: number;
}

const QUICK_SETS: QuickSet[] = [
  { label: 'YumCraft 20 Dyes',         name: 'YumCraft Soap Dyes 20pk',     totalPrice: 14.99, itemCount: 20 },
  { label: 'Smalltongue 36 Micas',     name: 'Smalltongue Mica Powder 36pk', totalPrice: 13.99, itemCount: 36 },
  { label: 'Glycerin Base 5lb',        name: 'Glycerin Base 5lb (bulk)',     totalPrice: 18.00, itemCount: 1  },
];

// ---------------------------------------------------------------------------
// Category-based defaults
// ---------------------------------------------------------------------------
const VOLUME_CATEGORIES = new Set<IngredientCategory>(['essential-oil', 'fragrance']);

function getCategoryMeasurementType(category?: IngredientCategory): 'weight' | 'volume' {
  return category && VOLUME_CATEGORIES.has(category) ? 'volume' : 'weight';
}

function getCategoryDefaultUnit(category?: IngredientCategory): 'oz' | 'lbs' | 'ml' | 'g' {
  return category && VOLUME_CATEGORIES.has(category) ? 'ml' : 'g';
}

function isVolumeIngredient(ing: Ingredient): boolean {
  if (ing.measurementType) return ing.measurementType === 'volume';
  return ing.category ? VOLUME_CATEGORIES.has(ing.category) : false;
}

// ---------------------------------------------------------------------------
// Math explanation string
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

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
export default function InventoryScreen() {
  const { t } = useTranslation();
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);

  const [activeIngredients, setActiveIngredients] = useState<Ingredient[]>([]);
  const [allIngredients, setAllIngredients] = useState<Ingredient[]>([]);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [setPurchases, setSetPurchases] = useState<SetPurchase[]>([]);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);

  const reload = async () => {
    const [all, active, sets] = await Promise.all([
      ingredientsRepo.all(),
      ingredientsRepo.active(),
      setPurchasesRepo.all(),
    ]);
    setAllIngredients(all);
    setActiveIngredients(active);
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
    // reloadRecipe is defined inline in component and only reads activeRecipeId from closure
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRecipeId]);

  const pricedCount = useMemo(
    () => activeIngredients.filter((i) => i.fractionalCost !== undefined).length,
    [activeIngredients],
  );

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
      const unit = isVolumeIngredient(ing) ? 'drops' : 'g';
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

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-3xl px-4 py-6">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gaia-900">
                <Package className="h-6 w-6 text-gaia-600" />
                {t('inventory.title', 'Inventory & Pricing')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {t('inventory.subtitle', 'Set purchase prices for your active ingredients to calculate recipe material costs.')}
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

          {/* Stats */}
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

          {/* Empty state */}
          {activeIngredients.length === 0 ? (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-12 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-gaia-300" />
              <p className="font-medium text-slate-600">
                {t('inventory.noActive', 'No active ingredients yet.')}
              </p>
              <p className="mt-1 text-sm text-slate-400">
                {t('inventory.noActiveHint', 'Go to Ingredients to activate some.')}
              </p>
            </div>
          ) : (
            <>
              {/* Section header */}
              <div className="mt-6 mb-3 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {t('inventory.individualPricing', 'Individual Ingredient Pricing')}
                </h2>
                <div className="flex items-center gap-3 text-[11px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                    {t('inventory.legendPriced', 'priced')}
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-400" />
                    {t('inventory.legendMissing', 'missing')}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {activeIngredients.map((ing) => (
                  <PricingCard
                    key={ing.id}
                    ing={ing}
                    recipe={activeRecipe}
                    onSaved={reload}
                    onRecipeUpdated={reloadRecipe}
                  />
                ))}
              </div>
            </>
          )}

          {/* ── Live Recipe Cost Panel ──────────────────────────────────────── */}
          {recipeCostSummary !== null && (
            <RecipeCostPanel summary={recipeCostSummary} />
          )}

          {/* Footer hint */}
          {activeIngredients.length > 0 && (
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
// Set Purchases Card — "bought as a set" entry with quick chips
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
// Live Recipe Cost Panel — sticky total at the bottom of the screen
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
  onSaved: () => void;
  onRecipeUpdated: () => void;
}

function PricingCard({ ing, recipe, onSaved, onRecipeUpdated }: PricingCardProps) {
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

      {/* Card header: name + status dot + result */}
      <div className="flex items-center gap-3 mb-4">
        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${statusDot}`} />
        <IngredientIcon category={ing.category} name={ing.name} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-800 truncate">{ing.name}</p>
          <p className="text-xs text-slate-400">{catLabel} · {typeLabel}</p>
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
