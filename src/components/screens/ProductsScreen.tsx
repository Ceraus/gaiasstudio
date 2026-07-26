// ---------------------------------------------------------------------------
// ProductsScreen — the unified Product Catalog for Gaia's Studio.
//
// The central hub linking recipes, label designs, Etsy listings, and pricing
// into a single manageable view. Each "product" is either backed by a
// ProductListing record or synthesized on the fly from a priced Recipe.
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, DollarSign, ImageIcon,
  Loader2, Package, Palette, Plus, Search, ShoppingBag, Store,
  Tag, X,
} from 'lucide-react';
import type { Recipe } from '@/types';
import { draftsRepo, productListingsRepo, recipesRepo, ingredientsRepo } from '@/db/repositories';
import { etsyListingsRepo } from '@/lib/etsyApi';
import { useAppStore } from '@/store/useAppStore';
import { calculateRecipeMaterialCogs, calculateProfitMargin } from '@/lib/inventoryMath';

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface ProductCard {
  id: string;
  name: string;
  recipeId?: string;
  draftId?: string;
  etsyListingId?: string;
  price?: number;
  cogs?: number;
  margin?: number;
  thumbnail?: string;
  description?: string;
  etsyState?: string;
  etsyUrl?: string;
  active: boolean;
  source: 'listing' | 'recipe';
}

export default function ProductsScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);

  const [products, setProducts] = useState<ProductCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'etsy'>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  const reload = async () => {
    setLoading(true);
    const [recipes, listings, etsyListings, drafts, ingredients] = await Promise.all([
      recipesRepo.all(),
      productListingsRepo.all(),
      etsyListingsRepo.all(),
      draftsRepo.all(),
      ingredientsRepo.all(),
    ]);

    const etsyMap = new Map(etsyListings.map((e) => [e.id, e]));
    const draftMap = new Map(drafts.map((d) => [d.id, d]));
    const recipeMap = new Map(recipes.map((r) => [r.id, r]));
    const listingRecipeIds = new Set(listings.map((l) => l.recipeId).filter(Boolean));

    const cards: ProductCard[] = [];

    // 1) Product Listings (explicit products)
    for (const pl of listings) {
      const recipe = pl.recipeId ? recipeMap.get(pl.recipeId) : undefined;
      const etsy = pl.etsyListingId ? etsyMap.get(pl.etsyListingId) : undefined;
      const draft = pl.draftId ? draftMap.get(pl.draftId) : undefined;
      const cogs = recipe ? calculateRecipeMaterialCogs(recipe, ingredients) : undefined;
      const price = pl.price ?? recipe?.retailPrice;
      const margin = price !== undefined && cogs !== undefined
        ? calculateProfitMargin(price, cogs)
        : undefined;

      cards.push({
        id: pl.id,
        name: pl.name,
        recipeId: pl.recipeId,
        draftId: pl.draftId,
        etsyListingId: pl.etsyListingId,
        price,
        cogs,
        margin,
        thumbnail: draft?.thumb,
        description: pl.description ?? recipe?.benefit,
        etsyState: etsy?.state,
        etsyUrl: etsy?.etsyUrl,
        active: pl.active,
        source: 'listing',
      });
    }

    // 2) Recipes with retail prices that aren't already a ProductListing
    for (const recipe of recipes) {
      if (listingRecipeIds.has(recipe.id)) continue;
      if (!recipe.retailPrice) continue;

      const draft = drafts.find((d) => d.recipeId === recipe.id);
      const etsy = etsyListings.find((e) => e.recipeId === recipe.id);
      const cogs = calculateRecipeMaterialCogs(recipe, ingredients);
      const margin = calculateProfitMargin(recipe.retailPrice, cogs);

      cards.push({
        id: `recipe-${recipe.id}`,
        name: recipe.name,
        recipeId: recipe.id,
        draftId: draft?.id,
        etsyListingId: etsy?.id,
        price: recipe.retailPrice,
        cogs,
        margin,
        thumbnail: draft?.thumb,
        description: recipe.benefit,
        etsyState: etsy?.state,
        etsyUrl: etsy?.etsyUrl,
        active: true,
        source: 'recipe',
      });
    }

    cards.sort((a, b) => a.name.localeCompare(b.name));
    setProducts(cards);
    setLoading(false);
  };

  useEffect(() => { void reload(); }, []);

  // Filter & search
  const visible = useMemo(() => {
    let list = products;
    if (filter === 'active') list = list.filter((p) => p.active);
    if (filter === 'etsy') list = list.filter((p) => p.etsyState === 'active');
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false)
      );
    }
    return list;
  }, [products, filter, search]);

  // Summary stats
  const stats = useMemo(() => {
    const total = products.length;
    const onEtsy = products.filter((p) => p.etsyState === 'active').length;
    const margins = products.filter((p) => p.margin !== undefined).map((p) => p.margin!);
    const avgMargin = margins.length > 0
      ? margins.reduce((a, b) => a + b, 0) / margins.length
      : 0;
    return { total, onEtsy, avgMargin };
  }, [products]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-gaia-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <div className="mx-auto w-full max-w-7xl px-6 py-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            <ShoppingBag className="mr-2 inline-block h-6 w-6 text-gaia-600" />
            {t('products.title', 'Product Catalog')}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {t('products.subtitle', 'Your complete product lineup — recipes, labels, pricing, and Etsy status in one place.')}
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gaia-100 text-gaia-700">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
                <p className="text-xs text-slate-500">{t('products.totalProducts', 'Total Products')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700">
                <Store className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900">{stats.onEtsy}</p>
                <p className="text-xs text-slate-500">{t('products.listedOnEtsy', 'Listed on Etsy')}</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {stats.avgMargin > 0 ? `${Math.round(stats.avgMargin)}%` : '—'}
                </p>
                <p className="text-xs text-slate-500">{t('products.avgMargin', 'Avg. Profit Margin')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('products.searchPlaceholder', 'Search products…')}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm focus:border-gaia-400 focus:outline-none focus:ring-1 focus:ring-gaia-400"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex overflow-hidden rounded-lg ring-1 ring-slate-200">
            {(['all', 'active', 'etsy'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 text-xs font-semibold ${
                  filter === f
                    ? 'bg-gaia-600 text-white'
                    : 'bg-white text-slate-500 hover:bg-slate-50'
                }`}
              >
                {f === 'all' ? t('products.filterAll', 'All') :
                 f === 'active' ? t('products.filterActive', 'Active') :
                 t('products.filterEtsy', 'On Etsy')}
              </button>
            ))}
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary flex items-center gap-1.5 text-sm"
          >
            <Plus className="h-4 w-4" />
            {t('products.addProduct', 'Add Product')}
          </button>
        </div>

        {/* Product Grid */}
        {visible.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 py-20 text-center">
            <ShoppingBag className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-lg font-semibold text-slate-600">
              {search ? t('products.noResults', 'No products match your search') :
               t('products.noProducts', 'No products yet')}
            </p>
            <p className="mt-1 max-w-md text-sm text-slate-400">
              {t('products.noProductsHint', 'Set a retail price on a recipe or click "Add Product" to create your first product listing.')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((product) => (
              <ProductCardComponent key={product.id} product={product} goto={goto} />
            ))}
          </div>
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          onClose={() => setShowAddModal(false)}
          onCreated={() => { setShowAddModal(false); void reload(); }}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Product Card
// ---------------------------------------------------------------------------

function ProductCardComponent({
  product,
  goto,
}: {
  product: ProductCard;
  goto: (screen: any) => void;
}) {
  const { t } = useTranslation();

  const marginColor = product.margin !== undefined
    ? product.margin >= 50 ? 'text-emerald-600' : product.margin >= 25 ? 'text-amber-600' : 'text-red-500'
    : 'text-slate-400';

  return (
    <div className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        {product.thumbnail ? (
          <img
            src={product.thumbnail}
            alt={product.name}
            className="h-full w-full object-contain p-4"
            draggable={false}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-300">
            <ImageIcon className="h-10 w-10" />
            <span className="text-xs">{t('products.noLabel', 'No label design')}</span>
          </div>
        )}

        {/* Etsy badge */}
        <span className={`absolute right-2 top-2 flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          product.etsyState === 'active'
            ? 'bg-emerald-100 text-emerald-700'
            : product.etsyState === 'draft'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-slate-100 text-slate-500'
        }`}>
          <Store className="h-3 w-3" />
          {product.etsyState === 'active' ? 'Listed' :
           product.etsyState === 'draft' ? 'Draft' : 'Not Listed'}
        </span>
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-sm font-bold text-slate-900 truncate">{product.name}</h3>
        {product.description && (
          <p className="mt-0.5 text-xs text-slate-500 truncate">{product.description}</p>
        )}

        {/* Pricing row */}
        <div className="mt-3 flex items-baseline gap-3">
          <span className="text-lg font-bold text-slate-900">
            {product.price !== undefined ? fmtMoney(product.price) : '—'}
          </span>
          {product.cogs !== undefined && (
            <span className="text-xs text-slate-400">
              {t('products.cogs', 'COGS')}: {fmtMoney(product.cogs)}
            </span>
          )}
          {product.margin !== undefined && (
            <span className={`ml-auto text-xs font-bold ${marginColor}`}>
              {Math.round(product.margin)}%
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => goto('template')}
            className="flex-1 rounded-lg bg-gaia-50 px-2 py-1.5 text-xs font-medium text-gaia-700 hover:bg-gaia-100 transition-colors"
          >
            <Palette className="mr-1 inline-block h-3 w-3" />
            {t('products.designLabel', 'Label')}
          </button>
          <button
            onClick={() => goto('recipes')}
            className="flex-1 rounded-lg bg-slate-50 px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Tag className="mr-1 inline-block h-3 w-3" />
            {t('products.viewRecipe', 'Recipe')}
          </button>
          <button
            onClick={() => goto('shop')}
            className="flex-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors"
          >
            <Store className="mr-1 inline-block h-3 w-3" />
            {t('products.pushEtsy', 'Etsy')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Add Product Modal
// ---------------------------------------------------------------------------

function AddProductModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    recipesRepo.all().then((r) => {
      setRecipes(r);
      setLoading(false);
    });
  }, []);

  const selectedRecipe = recipes.find((r) => r.id === selectedRecipeId);

  const handleCreate = async () => {
    if (!selectedRecipe) return;
    setSaving(true);
    try {
      await productListingsRepo.create({
        name: selectedRecipe.name,
        recipeId: selectedRecipe.id,
        price: selectedRecipe.retailPrice,
        description: selectedRecipe.benefit,
        active: true,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-bold text-slate-900">
          <Plus className="mr-2 inline-block h-5 w-5 text-gaia-600" />
          {t('products.addProduct', 'Add Product')}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          {t('products.addProductHint', 'Choose a recipe to create a product listing from.')}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gaia-500" />
          </div>
        ) : recipes.length === 0 ? (
          <div className="py-10 text-center text-sm text-slate-400">
            {t('products.noRecipes', 'No recipes found. Create a recipe first.')}
          </div>
        ) : (
          <>
            <label className="mt-4 block text-sm font-medium text-slate-700">
              {t('products.selectRecipe', 'Recipe')}
            </label>
            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-gaia-400 focus:outline-none focus:ring-1 focus:ring-gaia-400"
            >
              <option value="">{t('products.pickRecipe', '— Select a recipe —')}</option>
              {recipes.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} {r.retailPrice ? `(${fmtMoney(r.retailPrice)})` : '(no price)'}
                </option>
              ))}
            </select>

            {selectedRecipe && (
              <div className="mt-4 rounded-lg bg-gaia-50 p-3">
                <p className="text-sm font-semibold text-gaia-800">{selectedRecipe.name}</p>
                {selectedRecipe.benefit && (
                  <p className="mt-0.5 text-xs text-gaia-600">{selectedRecipe.benefit}</p>
                )}
                <div className="mt-2 flex gap-4 text-xs text-slate-500">
                  <span>
                    <DollarSign className="mr-0.5 inline-block h-3 w-3" />
                    {selectedRecipe.retailPrice ? fmtMoney(selectedRecipe.retailPrice) : 'No price'}
                  </span>
                  {selectedRecipe.cogsTotal !== undefined && (
                    <span>COGS: {fmtMoney(selectedRecipe.cogsTotal)}</span>
                  )}
                  {selectedRecipe.profitMargin !== undefined && (
                    <span>Margin: {Math.round(selectedRecipe.profitMargin)}%</span>
                  )}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={onClose} className="btn btn-ghost text-sm">
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                onClick={handleCreate}
                disabled={!selectedRecipeId || saving}
                className="btn btn-primary flex items-center gap-1.5 text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                {t('products.createProduct', 'Create Product')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
