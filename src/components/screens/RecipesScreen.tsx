import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Calculator, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DollarSign, Eye, FlaskConical, Info, Loader2, Package, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { Ingredient, IngredientCategory, Recipe } from '@/types';
import { ingredientsRepo, recipesRepo } from '@/db/repositories';
import {
  calculateProfitMargin,
  calculateRecipeMaterialCogs,
  marginHealth,
  MARGIN_HEALTH_CLASSES,
} from '@/lib/inventoryMath';
import { suggestBenefitStatement } from '@/lib/localAi';
import { useAppStore } from '@/store/useAppStore';
import WorkflowNav from '@/components/WorkflowNav';
import BenefitPicker from '@/components/screens/BenefitPicker';
import IngredientIcon from '@/components/common/IngredientIcon';
import Modal from '@/components/common/Modal';
import { getRecipeHeroIcon } from '@/data/recipeHeroIcons';

// ---------------------------------------------------------------------------
// Recipe color theming
// ---------------------------------------------------------------------------

export interface RecipeColorTheme {
  bg: string;
  border: string;
  text: string;
  dot: string;
  activeBg: string;
  activeBorder: string;
  key: string;
}

const COLOR_THEMES: Record<string, RecipeColorTheme> = {
  fragrance:      { key: 'fragrance',     bg: 'bg-pink-50',   border: 'border-pink-200',   text: 'text-pink-800',   dot: 'bg-pink-400',    activeBg: 'bg-pink-100',   activeBorder: 'border-pink-400' },
  'essential-oil':{ key: 'essential-oil', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-800', dot: 'bg-purple-400',  activeBg: 'bg-purple-100', activeBorder: 'border-purple-400' },
  botanical:      { key: 'botanical',     bg: 'bg-green-50',  border: 'border-green-200',  text: 'text-green-800',  dot: 'bg-green-400',   activeBg: 'bg-green-100',  activeBorder: 'border-green-400' },
  butter:         { key: 'butter',        bg: 'bg-amber-50',  border: 'border-amber-200',  text: 'text-amber-800',  dot: 'bg-amber-400',   activeBg: 'bg-amber-100',  activeBorder: 'border-amber-400' },
  'carrier-oil':  { key: 'carrier-oil',   bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-400',  activeBg: 'bg-yellow-100', activeBorder: 'border-yellow-400' },
  oil:            { key: 'oil',           bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', dot: 'bg-yellow-400',  activeBg: 'bg-yellow-100', activeBorder: 'border-yellow-400' },
  clay:           { key: 'clay',          bg: 'bg-slate-50',  border: 'border-slate-200',  text: 'text-slate-800',  dot: 'bg-slate-400',   activeBg: 'bg-slate-100',  activeBorder: 'border-slate-400' },
  colorant:       { key: 'colorant',      bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', dot: 'bg-violet-400',  activeBg: 'bg-violet-100', activeBorder: 'border-violet-400' },
  base:           { key: 'base',          bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-800',   dot: 'bg-teal-400',    activeBg: 'bg-teal-100',   activeBorder: 'border-teal-400' },
  default:        { key: 'default',       bg: 'bg-gaia-50',   border: 'border-gaia-200',   text: 'text-gaia-800',   dot: 'bg-gaia-400',    activeBg: 'bg-gaia-100',   activeBorder: 'border-gaia-400' },
};

const CATEGORY_PRIORITY: IngredientCategory[] = ['fragrance', 'essential-oil', 'botanical', 'butter', 'oil', 'clay', 'colorant', 'base'];

/** Returns the color theme for a recipe based on dominant ingredient category. */
export function getRecipeColor(recipe: Recipe, ingredients: Ingredient[]): RecipeColorTheme {
  // Manual override wins
  if (recipe.color && COLOR_THEMES[recipe.color]) return COLOR_THEMES[recipe.color];

  const recipeIngredients = ingredients.filter((i) => recipe.ingredientIds.includes(i.id));
  // Count categories (excluding base for dominance)
  const counts: Partial<Record<IngredientCategory, number>> = {};
  for (const ing of recipeIngredients) {
    if (!ing.category || ing.category === 'base') continue;
    counts[ing.category] = (counts[ing.category] ?? 0) + 1;
  }

  if (Object.keys(counts).length === 0) return COLOR_THEMES.default;

  const maxCount = Math.max(...Object.values(counts) as number[]);
  const tied = (Object.keys(counts) as IngredientCategory[]).filter((k) => counts[k] === maxCount);

  // Break ties by priority list
  for (const priority of CATEGORY_PRIORITY) {
    if (tied.includes(priority)) {
      return COLOR_THEMES[priority] ?? COLOR_THEMES.default;
    }
  }

  return COLOR_THEMES.default;
}

// ---------------------------------------------------------------------------
// Color swatch options for the manual override picker
// ---------------------------------------------------------------------------
const COLOR_SWATCHES: Array<{ key: string; dot: string; label: string }> = [
  { key: 'default',       dot: 'bg-gaia-400',   label: 'Gaia' },
  { key: 'fragrance',     dot: 'bg-pink-400',   label: 'Pink' },
  { key: 'essential-oil', dot: 'bg-purple-400', label: 'Purple' },
  { key: 'botanical',     dot: 'bg-green-400',  label: 'Green' },
  { key: 'butter',        dot: 'bg-amber-400',  label: 'Amber' },
  { key: 'oil',           dot: 'bg-yellow-400', label: 'Yellow' },
  { key: 'clay',          dot: 'bg-slate-400',  label: 'Slate' },
  { key: 'colorant',      dot: 'bg-violet-400', label: 'Violet' },
  { key: 'base',          dot: 'bg-teal-400',   label: 'Teal' },
];

interface RecipeForm {
  name: string;
  benefit: string;
  netWeight: string;
  directions: string;
  warnings: string;
  footer: string;
  ingredientIds: string[];
  /** Usage amounts by ingredient ID. Weight → grams. Volume → drops. */
  ingredientAmounts: Record<string, string>;
  color?: string;
  customCosts: Array<{ id: string; name: string; cost: number; unit?: string }>;
  retailPrice: string;
}

/** Max recipe rows shown per page in "Your Recipes" — chosen so the list's
 *  height lines up with the taller stack of cards in the editor column. */
const RECIPES_PER_PAGE = 19;

/** Alternating earth-tone backgrounds for recipe cards so adjacent rows are
 *  easy to tell apart. Selected/editing cards override with stronger cues. */
const EARTH_TONE_ROWS: Array<{ bg: string; border: string }> = [
  { bg: 'bg-amber-50/70',    border: 'border-amber-100' },    // sand
  { bg: 'bg-stone-100/80',   border: 'border-stone-200' },     // clay
  { bg: 'bg-orange-50/70',   border: 'border-orange-100' },   // terracotta
  { bg: 'bg-lime-50/60',     border: 'border-lime-100' },     // sage
  { bg: 'bg-amber-100/50',   border: 'border-amber-200' },    // warm brown
  { bg: 'bg-emerald-50/60',  border: 'border-emerald-100' },  // moss
];

const emptyForm: RecipeForm = {
  name: '',
  benefit: '',
  netWeight: '',
  directions: 'Lather with water and apply to skin. Rinse thoroughly.',
  warnings: 'For external use only. Avoid contact with eyes.',
  footer: '',
  ingredientIds: [],
  ingredientAmounts: {},
  color: undefined,
  customCosts: [],
  retailPrice: '',
};

export default function RecipesScreen() {
  const { t } = useTranslation();
  const goto            = useAppStore((s) => s.goto);
  const setActiveRecipeId = useAppStore((s) => s.setActiveRecipeId);
  const activeRecipeId  = useAppStore((s) => s.activeRecipeId);
  const template        = useAppStore((s) => s.template);
  const settings        = useAppStore((s) => s.settings);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [savedToast, setSavedToast] = useState(false);
  const [suggestingBenefit, setSuggestingBenefit] = useState(false);
  const [benefitSuggestError, setBenefitSuggestError] = useState<string | null>(null);
  /** Pending AI suggestion awaiting accept/edit/reject — never written to `form.benefit` directly. */
  const [benefitSuggestion, setBenefitSuggestion] = useState<string | null>(null);
  const [editingSuggestion, setEditingSuggestion] = useState(false);
  const [suggestionDraft, setSuggestionDraft] = useState('');
  const savedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [recipePage, setRecipePage] = useState(0);

  useEffect(() => {
    return () => {
      if (savedToastTimer.current) clearTimeout(savedToastTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  const reload = async () => {
    setRecipes(await recipesRepo.all());
    setIngredients(await ingredientsRepo.all());
  };
  useEffect(() => {
    void reload();
  }, []);

  const recipeTotalPages = Math.max(1, Math.ceil(recipes.length / RECIPES_PER_PAGE));

  // Keep the current page in range if recipes are deleted out from under it.
  useEffect(() => {
    if (recipePage > recipeTotalPages - 1) setRecipePage(recipeTotalPages - 1);
  }, [recipePage, recipeTotalPages]);

  const pagedRecipes = useMemo(
    () => recipes.slice(recipePage * RECIPES_PER_PAGE, recipePage * RECIPES_PER_PAGE + RECIPES_PER_PAGE),
    [recipes, recipePage],
  );

  const selectRecipe = (r: Recipe) => {
    setEditingId(r.id);
    setActiveRecipeId(r.id);
    const amounts: Record<string, string> = {};
    if (r.ingredientAmounts) {
      for (const [k, v] of Object.entries(r.ingredientAmounts)) {
        amounts[k] = String(v);
      }
    }
    setForm({
      name: r.name,
      benefit: r.benefit,
      netWeight: r.netWeight ?? '',
      directions: r.directions || 'Lather with water and apply to skin. Rinse thoroughly.',
      warnings: r.warnings || 'For external use only. Avoid contact with eyes.',
      footer: r.footer ?? '',
      ingredientIds: r.ingredientIds,
      ingredientAmounts: amounts,
      color: r.color,
      customCosts: r.customCosts ?? [],
      retailPrice: r.retailPrice !== undefined ? String(r.retailPrice) : '',
    });
    setHighlightMissing(false);
    setBenefitSuggestion(null);
    setEditingSuggestion(false);
    setBenefitSuggestError(null);
  };

  const newRecipe = () => {
    setEditingId(null);
    // Pre-select Glycerin Base (Clear) as the default base if it exists in the DB
    const glycerinBase = ingredients.find(
      (i) => i.isSoapBase && i.name.toLowerCase().includes('glycerin')
    );
    setForm({
      ...emptyForm,
      ingredientIds: glycerinBase ? [glycerinBase.id] : [],
      ingredientAmounts: glycerinBase ? { [glycerinBase.id]: '100' } : {},
    });
    setHighlightMissing(false);
    setBenefitSuggestion(null);
    setEditingSuggestion(false);
    setBenefitSuggestError(null);
  };

  const save = async () => {
    if (!form.name.trim()) return;
    const ingredientAmounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(form.ingredientAmounts)) {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) ingredientAmounts[k] = n;
    }
    const payload = {
      name: form.name,
      benefit: form.benefit,
      netWeight: form.netWeight,
      directions: form.directions,
      warnings: form.warnings,
      footer: form.footer,
      ingredientIds: form.ingredientIds,
      ingredientAmounts,
      color: form.color,
      customCosts: form.customCosts,
      retailPrice: (() => {
        const n = parseFloat(form.retailPrice);
        return !isNaN(n) && n > 0 ? n : undefined;
      })(),
    };
    if (editingId) await recipesRepo.update(editingId, payload);
    else {
      const created = await recipesRepo.create(payload);
      setEditingId(created.id);
      // Jump the list to whichever page the freshly-created recipe landed on
      // (the list is sorted by name, so a new recipe rarely lands last).
      const allAfterCreate = await recipesRepo.all();
      const idx = allAfterCreate.findIndex((r) => r.id === created.id);
      if (idx >= 0) setRecipePage(Math.floor(idx / RECIPES_PER_PAGE));
    }
    await reload();
    setSavedToast(true);
    if (savedToastTimer.current) clearTimeout(savedToastTimer.current);
    savedToastTimer.current = setTimeout(() => setSavedToast(false), 2500);
  };

  const remove = (id: string) => setConfirmDeleteId(id);

  const doRemove = async (id: string) => {
    setConfirmDeleteId(null);
    await recipesRepo.remove(id);
    if (editingId === id) newRecipe();
    if (activeRecipeId === id) setActiveRecipeId(null);
    await reload();
  };

  const toggleIngredient = (id: string) => {
    setForm((f) => ({
      ...f,
      ingredientIds: f.ingredientIds.includes(id)
        ? f.ingredientIds.filter((x) => x !== id)
        : [...f.ingredientIds, id],
    }));
  };

  const setIngredientAmount = (id: string, amount: string) => {
    setForm((f) => ({
      ...f,
      ingredientAmounts: { ...f.ingredientAmounts, [id]: amount },
    }));
  };

  const selectedIngredientsForSuggest = useMemo(
    () => ingredients.filter((i) => form.ingredientIds.includes(i.id)),
    [ingredients, form.ingredientIds],
  );

  const handleSuggestBenefit = async () => {
    setBenefitSuggestError(null);
    setBenefitSuggestion(null);
    setEditingSuggestion(false);
    setSuggestingBenefit(true);
    try {
      const result = await suggestBenefitStatement({
        backend: settings.localAiBackend ?? 'bundled',
        baseUrl: settings.localAiBaseUrl || 'http://localhost:11434',
        model: settings.localAiModel || 'llama3.2:3b',
        recipeName: form.name,
        ingredients: selectedIngredientsForSuggest.map((i) => ({
          name: i.name,
          category: i.category,
          benefit: i.benefit,
        })),
      });
      if (result.ok && result.suggestion) {
        setBenefitSuggestion(result.suggestion);
      } else {
        setBenefitSuggestError(result.error ?? t('recipes.benefitSuggestGenericError', "Couldn't generate a suggestion."));
      }
    } finally {
      setSuggestingBenefit(false);
    }
  };

  const acceptBenefitSuggestion = (text: string) => {
    setForm((f) => ({ ...f, benefit: text }));
    setBenefitSuggestion(null);
    setEditingSuggestion(false);
  };

  const startEditingSuggestion = () => {
    setSuggestionDraft(benefitSuggestion ?? '');
    setEditingSuggestion(true);
  };

  const discardBenefitSuggestion = () => {
    setBenefitSuggestion(null);
    setEditingSuggestion(false);
  };

  const genCostId = () => `cc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const handleAddCustomCost = async (item: { name: string; cost: number; unit?: string }) => {
    const newItem = { ...item, id: genCostId() };
    setForm((f) => {
      const updated = [...f.customCosts, newItem];
      if (editingId) void recipesRepo.update(editingId, { customCosts: updated });
      return { ...f, customCosts: updated };
    });
  };

  const handleRemoveCustomCost = (costId: string) => {
    setForm((f) => {
      const updated = f.customCosts.filter((c) => c.id !== costId);
      if (editingId) void recipesRepo.update(editingId, { customCosts: updated });
      return { ...f, customCosts: updated };
    });
  };

  const liveMaterialCogs = useMemo(() => {
    const draft: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'customCosts'> = {
      ingredientIds: form.ingredientIds,
      ingredientAmounts: Object.fromEntries(
        Object.entries(form.ingredientAmounts)
          .map(([k, v]) => [k, parseFloat(v)])
          .filter(([, v]) => !isNaN(v as number) && (v as number) > 0),
      ),
      customCosts: form.customCosts,
    };
    return calculateRecipeMaterialCogs(draft, ingredients);
  }, [ingredients, form.ingredientIds, form.ingredientAmounts, form.customCosts]);

  const liveIngredientTotal = useMemo(() => {
    let total = 0;
    for (const id of form.ingredientIds) {
      const ing = ingredients.find((i) => i.id === id);
      if (!ing?.fractionalCost) continue;
      const amt = parseFloat(form.ingredientAmounts[id] ?? '');
      if (!isNaN(amt) && amt > 0) total += amt * ing.fractionalCost;
    }
    return total;
  }, [ingredients, form.ingredientIds, form.ingredientAmounts]);

  const liveCustomTotal = useMemo(
    () => form.customCosts.reduce((s, c) => s + c.cost, 0),
    [form.customCosts],
  );

  const checklist = useMemo(() => {
    const selected = ingredients.filter((i) => form.ingredientIds.includes(i.id));
    return {
      hasName: !!form.name.trim(),
      hasIngredients: selected.length > 0,
      hasSoapBase: selected.some((i) => i.category === 'base' || i.isSoapBase === true),
      hasBenefit: !!form.benefit.trim(),
    };
  }, [form, ingredients]);

  const handleNext = () => {
    if (!template) { goto('template'); return; }

    const selected = ingredients.filter((i) => form.ingredientIds.includes(i.id));
    const isComplete = form.name.trim() && selected.length > 0;

    if (!isComplete) {
      setHighlightMissing(true);
      setShowIncompleteDialog(true);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightMissing(false), 3000);
      return;
    }

    goto('background');
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto bg-gaia-50">
      {/* Decorative banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gaia-700 via-gaia-600 to-gaia-500 px-6 py-6 text-white shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white" />
          <div className="absolute -bottom-6 left-1/3 h-28 w-28 rounded-full bg-white" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{t('recipes.title')}</h1>
            <p className="mt-1 max-w-2xl text-sm text-gaia-100">{t('recipes.subtitle')}</p>
          </div>
          <button className="shrink-0 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30" onClick={newRecipe}>
            <Plus className="inline-block h-4 w-4 mr-1" /> {t('recipes.new')}
          </button>
        </div>
      </div>

      {/* First-time onboarding hint */}
      <div className="border-b border-gaia-100 bg-gaia-50">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-gaia-200">
            <div className="flex items-start gap-3">
              <FlaskConical className="mt-0.5 h-4 w-4 shrink-0 text-gaia-600" />
              <p className="text-sm text-slate-600">{t('recipes.firstTimeHint')}</p>
            </div>
            <button
              className="shrink-0 rounded-lg bg-gaia-100 px-3 py-1.5 text-xs font-semibold text-gaia-700 transition hover:bg-gaia-200"
              onClick={() => goto('ingredients')}
            >
              {t('recipes.manageIngredients')}
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-6 py-8">
        <div className="mt-2 grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr]">
          {/* Recipe list */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t('recipes.yourRecipes', 'Your Recipes')}
            </p>
            {recipes.length === 0 ? (
              <div className="card text-center text-sm text-slate-500">{t('recipes.empty')}</div>
            ) : (
              pagedRecipes.map((r, i) => {
                const isSelected = activeRecipeId === r.id;
                const isEditing  = editingId === r.id;
                const theme      = getRecipeColor(r, ingredients);
                const earthIdx   = recipePage * RECIPES_PER_PAGE + i;
                const earthTone  = EARTH_TONE_ROWS[earthIdx % EARTH_TONE_ROWS.length];
                // Get up to 3 non-base ingredients first, then base
                const recipeIngredients = ingredients.filter((i) => r.ingredientIds.includes(i.id));
                const nonBase = recipeIngredients.filter((i) => i.category !== 'base' && !i.isSoapBase);
                const bases   = recipeIngredients.filter((i) => i.category === 'base' || i.isSoapBase);
                const iconIngredients = [...nonBase, ...bases].slice(0, 3);
                return (
                  <div
                    key={r.id}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                      isEditing
                        ? `${theme.activeBg} ${theme.activeBorder} border-2 shadow-sm`
                        : isSelected
                          ? `${earthTone.bg} border-2 border-gaia-400 shadow-sm ring-1 ring-gaia-200`
                          : `${earthTone.bg} border ${earthTone.border} hover:border-gaia-300`
                    }`}
                  >
                    <button
                      className="flex flex-1 items-center gap-3 text-left min-w-0"
                      onClick={() => selectRecipe(r)}
                    >
                      {/* Hero ingredient icon */}
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/60 shadow-sm">
                        {getRecipeHeroIcon(r, ingredients)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 truncate text-sm font-medium text-slate-800">
                          <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
                          <span className="truncate">{r.name}</span>
                        </span>
                        {/* Ingredient icons row */}
                        {iconIngredients.length > 0 && (
                          <span className="mt-1 flex items-center gap-0.5">
                            {iconIngredients.map((ing) => (
                              <IngredientIcon key={ing.id} category={ing.category} name={ing.name} size="sm" />
                            ))}
                            <span className="ml-1 text-[10px] text-slate-400">
                              {t('recipes.ingredients_count', '{{count}} ingredients', { count: r.ingredientIds.length })}
                            </span>
                          </span>
                        )}
                        {iconIngredients.length === 0 && (
                          <span className="block truncate text-xs text-slate-400">
                            {t('recipes.ingredients_count', '{{count}} ingredients', { count: r.ingredientIds.length })}
                          </span>
                        )}
                        {isSelected && (
                          <span className="mt-0.5 inline-flex items-center rounded-full bg-gaia-100 px-1.5 py-0 text-[10px] font-semibold text-gaia-700">
                            ✓ {t('recipes.selected', 'selected')}
                          </span>
                        )}
                      </span>
                    </button>
                    <Trash2
                      className="h-4 w-4 shrink-0 text-slate-300 hover:text-rose-500 cursor-pointer"
                      onClick={() => void remove(r.id)}
                    />
                  </div>
                );
              })
            )}

            {/* Pagination — keeps the list to a max of RECIPES_PER_PAGE rows
                so it doesn't grow taller than the cards in the editor column. */}
            {recipeTotalPages > 1 && (
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-gaia-300 hover:text-gaia-700 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setRecipePage((p) => Math.max(0, p - 1))}
                  disabled={recipePage === 0}
                  aria-label={t('common.previous', 'Previous')}
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-medium text-slate-400">
                  {t('recipes.pageOf', 'Page {{page}} of {{total}}', { page: recipePage + 1, total: recipeTotalPages })}
                </span>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-gaia-300 hover:text-gaia-700 disabled:cursor-not-allowed disabled:opacity-40"
                  onClick={() => setRecipePage((p) => Math.min(recipeTotalPages - 1, p + 1))}
                  disabled={recipePage >= recipeTotalPages - 1}
                  aria-label={t('common.next', 'Next')}
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <button
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gaia-200 py-2 text-xs font-medium text-gaia-600 transition hover:border-gaia-400 hover:bg-gaia-50"
              onClick={newRecipe}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('recipes.new')}
            </button>
          </div>

          {/* Editor */}
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {editingId
                ? `${t('recipes.editing', 'Editing')}: ${recipes.find((r) => r.id === editingId)?.name ?? ''}`
                : t('recipes.createNew', 'Create New Recipe')}
            </p>
            <div className="card space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t('recipes.name')}</label>
                  <input
                    className={`input transition ${highlightMissing && !form.name.trim() ? 'border-red-500 bg-red-50 ring-red-300' : ''}`}
                    placeholder={t('recipes.namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('recipes.netWeight')}</label>
                  <input
                    className="input"
                    placeholder={t('recipes.netWeightPlaceholder')}
                    value={form.netWeight}
                    onChange={(e) => setForm({ ...form, netWeight: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2">
                  <label className="label mb-0">{t('recipes.benefit')}</label>
                  {settings.localAiEnabled && (
                    <button
                      type="button"
                      className="mb-1 flex items-center gap-1 rounded-full bg-gaia-100 px-2.5 py-1 text-[11px] font-medium text-gaia-700 transition hover:bg-gaia-200 disabled:cursor-not-allowed disabled:opacity-50"
                      onClick={() => void handleSuggestBenefit()}
                      disabled={suggestingBenefit || selectedIngredientsForSuggest.length === 0}
                      title={
                        selectedIngredientsForSuggest.length === 0
                          ? t('recipes.benefitSuggestNeedsIngredients', 'Add ingredients first so there is something to suggest from.')
                          : t('recipes.benefitSuggestTooltip', 'Draft a benefit statement with local AI — you can edit or reject it.')
                      }
                    >
                      {suggestingBenefit ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {suggestingBenefit ? t('recipes.benefitSuggesting', 'Thinking…') : t('recipes.benefitSuggest', 'Suggest')}
                    </button>
                  )}
                </div>
                <BenefitPicker
                  value={form.benefit}
                  onChange={(val) => setForm({ ...form, benefit: val })}
                  ingredientCategories={
                    ingredients
                      .filter((i) => form.ingredientIds.includes(i.id) && i.category)
                      .map((i) => i.category as IngredientCategory)
                  }
                />
                {settings.localAiEnabled && benefitSuggestError && (
                  <p className="mt-1 flex items-start gap-1.5 text-[11px] text-amber-600">
                    <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>
                      {benefitSuggestError}{' '}
                      <button type="button" className="underline hover:text-amber-800" onClick={() => goto('settings')}>
                        {t('recipes.benefitSuggestSettingsLink', 'Check Local AI settings →')}
                      </button>
                    </span>
                  </p>
                )}

                {/* AI suggestion preview — user must explicitly accept/edit before it touches the recipe. */}
                {settings.localAiEnabled && benefitSuggestion !== null && (
                  <div className="mt-2 rounded-xl border border-gaia-200 bg-gaia-50 p-3">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gaia-600">
                      <Sparkles className="h-3 w-3" />
                      {t('recipes.benefitSuggestionLabel', 'AI suggestion')}
                    </p>
                    {editingSuggestion ? (
                      <div className="space-y-2">
                        <textarea
                          className="input min-h-16 text-sm"
                          value={suggestionDraft}
                          onChange={(e) => setSuggestionDraft(e.target.value)}
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => acceptBenefitSuggestion(suggestionDraft.trim())} disabled={!suggestionDraft.trim()}>
                            <Check className="h-3.5 w-3.5" /> {t('recipes.benefitSuggestUseEdited', 'Use edited text')}
                          </button>
                          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setEditingSuggestion(false)}>
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm italic text-slate-700">&ldquo;{benefitSuggestion}&rdquo;</p>
                        <div className="flex flex-wrap gap-2">
                          <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => acceptBenefitSuggestion(benefitSuggestion)}>
                            <Check className="h-3.5 w-3.5" /> {t('recipes.benefitSuggestAccept', 'Use this')}
                          </button>
                          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={startEditingSuggestion}>
                            {t('recipes.benefitSuggestEdit', 'Edit first')}
                          </button>
                          <button type="button" className="py-1.5 text-xs text-slate-400 hover:text-slate-600" onClick={discardBenefitSuggestion}>
                            {t('recipes.benefitSuggestReject', 'Discard')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">{t('recipes.directions')}</label>
                  <textarea
                    className="input min-h-16"
                    placeholder={t('recipes.directionsPlaceholder')}
                    value={form.directions}
                    onChange={(e) => setForm({ ...form, directions: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">{t('recipes.warnings')}</label>
                  <textarea
                    className="input min-h-16"
                    placeholder={t('recipes.warningsPlaceholder')}
                    value={form.warnings}
                    onChange={(e) => setForm({ ...form, warnings: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="label">{t('recipes.footer')}</label>
                <input
                  className="input"
                  placeholder={t('recipes.footerPlaceholder')}
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                />
              </div>
              {/* Color label picker */}
              <div>
                <label className="label">{t('recipes.colorLabel', 'Label Color')}</label>
                <div className="flex flex-wrap items-center gap-2">
                  {COLOR_SWATCHES.map((swatch) => {
                    const active = (form.color ?? 'default') === swatch.key;
                    return (
                      <button
                        key={swatch.key}
                        title={swatch.label}
                        type="button"
                        className={`flex h-7 w-7 items-center justify-center rounded-full border-2 transition ${active ? 'border-slate-700 scale-110 shadow-sm' : 'border-transparent hover:border-slate-400'}`}
                        onClick={() => setForm({ ...form, color: swatch.key === 'default' ? undefined : swatch.key })}
                      >
                        <span className={`h-5 w-5 rounded-full ${swatch.dot}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {/* Ingredient picker */}
              <IngredientPicker
                ingredients={ingredients}
                selected={form.ingredientIds}
                selectedAmounts={form.ingredientAmounts}
                onToggle={toggleIngredient}
                onAmountChange={setIngredientAmount}
                onGotoIngredients={() => goto('ingredients')}
                highlightMissing={highlightMissing}
              />

              {/* Live checklist */}
              <div className="card">
                <p className="label">{t('recipes.checklist')}</p>
                <ul className="space-y-2 text-sm">
                  <ChecklistRow ok={checklist.hasName} label={t('recipes.hasName')} />
                  <ChecklistRow ok={checklist.hasIngredients} label={t('recipes.hasIngredients')} />
                  <ChecklistRow
                    ok={checklist.hasSoapBase}
                    warn={!checklist.hasSoapBase && checklist.hasIngredients}
                    warnText={t('recipes.soapBaseWarning', 'No soap base ingredient found — add one so this recipe is complete.')}
                    label={t('recipes.hasSoapBase')}
                  />
                  <ChecklistRow ok={checklist.hasBenefit} label={t('recipes.hasBenefit')} />
                </ul>
              </div>
            </div>

            {/* Live Material Cost */}
            <LiveCOGSCard
              ingredients={ingredients}
              selectedIds={form.ingredientIds}
              amounts={form.ingredientAmounts}
              customCosts={form.customCosts}
            />

            {/* Sticky Revenue & Profit */}
            <RevenueTrackerCard
              materialCost={liveMaterialCogs}
              retailPrice={form.retailPrice}
              onRetailPriceChange={(val) => setForm((f) => ({ ...f, retailPrice: val }))}
            />

            {/* Custom Materials & Packaging */}
            <CustomMaterialsCard
              customCosts={form.customCosts}
              onAdd={handleAddCustomCost}
              onRemove={handleRemoveCustomCost}
            />

            {/* Full Recipe Preview */}
            <RecipePreview form={form} ingredients={ingredients} />

            {/* Batch Cost Calculator */}
            <CostCalculatorCard
              ingredientTotal={liveIngredientTotal}
              customCostTotal={liveCustomTotal}
            />

            <div className="flex items-center gap-3">
              <button className="btn-primary" onClick={save} disabled={!form.name.trim()}>
                <Check className="h-4 w-4" /> {t('common.save')}
              </button>
              {savedToast && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" /> {t('recipes.saved', 'Recipe saved!')}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
      <WorkflowNav
        prevScreen="template"
        nextLabel={t('workflow.nextBackground', 'Next: Choose Background')}
        canProceed={!!template}
        hint={!template ? t('workflow.needTemplate') : t('workflow.hintSelectRecipe')}
        onNext={handleNext}
      />

      {/* Incomplete recipe confirmation dialog */}
      <Modal
        open={showIncompleteDialog}
        onClose={() => setShowIncompleteDialog(false)}
        width={420}
        title={
          <span className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {t('recipes.incompleteTitle', 'Recipe is incomplete')}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowIncompleteDialog(false)}>
              {t('recipes.goBack', 'Go Back')}
            </button>
            <button
              className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600"
              onClick={() => { setShowIncompleteDialog(false); goto('background'); }}
            >
              {t('recipes.continueAnyway', 'Continue Anyway')}
            </button>
          </div>
        }
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>{t('recipes.incompleteBodyIntro', 'Your recipe is missing:')}</p>
          <ul className="ml-4 list-disc space-y-1 text-slate-700">
            {!checklist.hasName && <li>{t('recipes.hasName', 'Has a name')}</li>}
            {!checklist.hasIngredients && <li>{t('recipes.hasIngredients', 'Has ingredients')}</li>}
          </ul>
          <p className="mt-2 text-xs text-slate-400">{t('recipes.incompleteProceedNote', 'You can still continue and come back to fill these in later.')}</p>
        </div>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Full recipe preview
// ---------------------------------------------------------------------------
function RecipePreview({ form, ingredients }: { form: RecipeForm; ingredients: Ingredient[] }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  const selected = useMemo(
    () => ingredients.filter((i) => form.ingredientIds.includes(i.id)),
    [form.ingredientIds, ingredients],
  );

  const inciLine = selected
    .map((i) => (i.inci?.trim() ? i.inci : i.name))
    .join(', ');

  const hasContent = form.name || inciLine || form.benefit || form.directions || form.warnings || form.netWeight || form.footer;

  return (
    <div className="card overflow-hidden">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Eye className="h-4 w-4 shrink-0 text-gaia-600" />
        <p className="label mb-0 flex-1">{t('recipes.preview', 'Label Preview')}</p>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          {!hasContent ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {t('recipes.previewEmpty', 'Fill in the recipe fields above to see a preview.')}
            </div>
          ) : (
            <div className="space-y-3 font-serif text-slate-800">
              {/* Product name */}
              {form.name && (
                <p className="text-center text-lg font-bold leading-tight tracking-wide">
                  {form.name}
                </p>
              )}

              {/* Benefit tagline */}
              {form.benefit && (
                <p className="text-center text-xs italic text-slate-500">{form.benefit}</p>
              )}

              {/* Ingredient INCI list */}
              {inciLine && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t('recipes.previewIngredients', 'Ingredients')}
                  </p>
                  <p className="text-[11px] leading-relaxed text-slate-700">{inciLine}.</p>
                </div>
              )}

              {/* Directions */}
              {form.directions?.trim() && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                    {t('recipes.previewDirections', 'Directions')}
                  </p>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
                    {form.directions}
                  </p>
                </div>
              )}

              {/* Warnings */}
              {form.warnings?.trim() && (
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
                    {t('recipes.previewWarnings', 'Warning')}
                  </p>
                  <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-700">
                    {form.warnings}
                  </p>
                </div>
              )}

              {/* Net weight + footer */}
              <div className="flex items-end justify-between border-t border-slate-200 pt-2">
                {form.netWeight?.trim() ? (
                  <p className="text-[10px] text-slate-500">
                    {t('recipes.previewNetWt', 'Net Wt')} {form.netWeight}
                  </p>
                ) : <span />}
                {form.footer?.trim() && (
                  <p className="max-w-[60%] text-right text-[10px] text-slate-400">{form.footer}</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ingredient picker with active/inactive sections + per-ingredient amounts
// ---------------------------------------------------------------------------
function IngredientPicker({
  ingredients,
  selected,
  selectedAmounts,
  onToggle,
  onAmountChange,
  onGotoIngredients,
  highlightMissing,
}: {
  ingredients: Ingredient[];
  selected: string[];
  selectedAmounts: Record<string, string>;
  onToggle: (id: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onGotoIngredients: () => void;
  highlightMissing?: boolean;
}) {
  const { t } = useTranslation();
  const [showInactive, setShowInactive] = useState(false);

  const active = useMemo(() => ingredients.filter((i) => i.active === true), [ingredients]);
  const inactive = useMemo(() => ingredients.filter((i) => i.active !== true), [ingredients]);


  const Row = ({ i }: { i: Ingredient }) => {
    const isSelected = selected.includes(i.id);
    const unit = i.measurementType === 'volume' ? t('inventory.drops', 'drops') : t('inventory.grams', 'g');
    const ingKey = i.name.toLowerCase().replace(/ /g, '_');
    const displayName = t(`ingredientNames.${ingKey}`, i.name);
    return (
      <li>
        <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${isSelected ? 'bg-gaia-50' : 'hover:bg-slate-50'}`}>
          <input
            type="checkbox"
            className="h-4 w-4 shrink-0 accent-gaia-600"
            checked={isSelected}
            onChange={() => onToggle(i.id)}
          />
          <IngredientIcon category={i.category} name={i.name} size="sm" />
          <span className="flex-1 truncate text-slate-700">{displayName}</span>
          {i.isSoapBase && (
            <span className="chip shrink-0 bg-gaia-100 text-gaia-700">{t('ingredients.soapBaseTag')}</span>
          )}
          {isSelected && (
            <div className="flex shrink-0 items-center gap-1">
              <input
                type="number"
                min={0}
                step={0.1}
                className="w-16 rounded-lg border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700 focus:border-gaia-400 focus:outline-none"
                placeholder="0"
                value={selectedAmounts[i.id] ?? ''}
                onChange={(e) => onAmountChange(i.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="text-[10px] text-slate-400">{unit}</span>
            </div>
          )}
        </div>
      </li>
    );
  };

  return (
    <div className={`card space-y-3 transition${highlightMissing && selected.length === 0 ? ' ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="label mb-0">{t('recipes.ingredients')}</p>
        <button className="text-xs text-gaia-700 hover:underline" onClick={onGotoIngredients}>
          {t('recipes.manageIngredients')}
        </button>
      </div>

      {/* Missing field banners */}
      {highlightMissing && selected.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t('recipes.errorNoIngredients', 'Add at least one ingredient')}
        </div>
      )}
      {ingredients.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
          <p>{t('ingredients.empty')}</p>
          <button className="mt-2 text-gaia-600 hover:underline" onClick={onGotoIngredients}>
            {t('ingredients.new')} →
          </button>
        </div>
      ) : (
        <>
          {/* Active section */}
          {active.length > 0 && (
            <div>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gaia-600">
                {t('ingredients.activeTitle')} ({active.length})
              </p>
              <ul className="max-h-64 space-y-0.5 overflow-y-auto pr-1">
                {active.map((i) => <Row key={i.id} i={i} />)}
              </ul>
            </div>
          )}

          {/* Inactive section (collapsed by default) */}
          {inactive.length > 0 && (
            <div>
              <button
                className="flex w-full items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600"
                onClick={() => setShowInactive((s) => !s)}
              >
                {showInactive ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                {t('ingredients.inactiveTitle')} ({inactive.length})
              </button>
              {showInactive && (
                <ul className="mt-1 max-h-64 space-y-0.5 overflow-y-auto pr-1">
                  {inactive.map((i) => <Row key={i.id} i={i} />)}
                </ul>
              )}
            </div>
          )}
        </>
      )}

      {selected.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {t('recipes.amountsHint', 'Enter amounts (grams or drops) next to each ingredient for live cost calculation.')}
        </p>
      )}
    </div>
  );
}

function ChecklistRow({
  ok,
  label,
  warn,
  warnText,
}: {
  ok: boolean;
  label: string;
  warn?: boolean;
  warnText?: string;
}) {
  return (
    <li className="flex items-start gap-2">
      {ok ? (
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
      ) : warn ? (
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
      ) : (
        <span className="mt-1 h-3 w-3 shrink-0 rounded-full border-2 border-slate-300" />
      )}
      <span className={ok ? 'text-slate-700' : 'text-slate-500'}>
        {label}
        {!ok && warn && warnText && <span className="block text-xs text-amber-600">{warnText}</span>}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Custom Materials & Packaging card
// ---------------------------------------------------------------------------
function CustomMaterialsCard({
  customCosts,
  onAdd,
  onRemove,
}: {
  customCosts: Array<{ id: string; name: string; cost: number; unit?: string }>;
  onAdd: (item: { name: string; cost: number; unit?: string }) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newUnit, setNewUnit] = useState('');

  const handleAdd = () => {
    const cost = parseFloat(newCost);
    if (!newName.trim() || isNaN(cost) || cost < 0) return;
    onAdd({ name: newName.trim(), cost, unit: newUnit.trim() || undefined });
    setNewName('');
    setNewCost('');
    setNewUnit('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd();
  };

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
        <Package className="h-4 w-4 shrink-0 text-violet-600" />
        <p className="label mb-0 flex-1">{t('recipes.customCosts', 'Custom Materials & Packaging')}</p>
      </div>

      {customCosts.length === 0 ? (
        <p className="text-xs italic text-slate-400">
          {t('recipes.noCustomCosts', 'No custom costs yet. Add packaging, bags, labels...')}
        </p>
      ) : (
        <div className="space-y-1">
          {customCosts.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-lg bg-violet-50 px-3 py-1.5 text-xs">
              <Package className="h-3.5 w-3.5 shrink-0 text-violet-400" />
              <span className="flex-1 font-medium text-slate-700">{item.name}</span>
              <span className="text-slate-500">
                ${item.cost.toFixed(2)}{item.unit ? `/${item.unit}` : '/bar'}
              </span>
              <button
                className="ml-1 shrink-0"
                onClick={() => onRemove(item.id)}
                aria-label="Remove"
              >
                <Trash2 className="h-3.5 w-3.5 text-slate-300 hover:text-rose-500 transition-colors" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inline add form */}
      <div className="grid grid-cols-[1fr_5rem_5rem_auto] items-end gap-2">
        <div>
          <label className="label text-[11px]">
            {t('recipes.customCostName', 'Item name (e.g. Kraft bag)')}
          </label>
          <input
            className="input text-sm"
            placeholder={t('recipes.customCostName', 'e.g. Kraft bag')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <label className="label text-[11px]">
            {t('recipes.customCostAmount', 'Cost ($)')}
          </label>
          <input
            type="number"
            min={0}
            step={0.01}
            className="input text-sm"
            placeholder="0.35"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <div>
          <label className="label text-[11px]">
            {t('recipes.customCostUnit', 'Unit')}
          </label>
          <input
            className="input text-sm"
            placeholder="per bar"
            value={newUnit}
            onChange={(e) => setNewUnit(e.target.value)}
            onKeyDown={handleKeyDown}
          />
        </div>
        <button
          className="btn-primary py-2 text-sm"
          onClick={handleAdd}
          disabled={!newName.trim() || !newCost.trim()}
        >
          <Plus className="h-3.5 w-3.5" />
          {t('recipes.addCustomCost', 'Add')}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sticky Revenue & Profit widget — zero-math margin guidance
// ---------------------------------------------------------------------------
function RevenueTrackerCard({
  materialCost,
  retailPrice,
  onRetailPriceChange,
}: {
  materialCost: number;
  retailPrice: string;
  onRetailPriceChange: (val: string) => void;
}) {
  const { t } = useTranslation();
  const retail = parseFloat(retailPrice);
  const hasRetail = !isNaN(retail) && retail > 0;
  const grossProfit = hasRetail ? retail - materialCost : undefined;
  const margin = hasRetail ? calculateProfitMargin(retail, materialCost) : undefined;
  const health = marginHealth(margin);

  return (
    <div className="sticky bottom-4 z-10 rounded-2xl bg-white p-4 shadow-lg ring-2 ring-gaia-200">
      <div className="mb-3 flex items-center gap-2">
        <DollarSign className="h-4 w-4 text-gaia-600" />
        <p className="text-sm font-semibold text-slate-800">{t('recipes.revenueTracker', 'Revenue & Profit')}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-emerald-50 px-3 py-2.5 ring-1 ring-emerald-100">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
            {t('recipes.totalMaterialCost', 'Total Material Cost')}
          </p>
          <p className="text-xl font-bold text-emerald-800">${materialCost.toFixed(2)}</p>
        </div>

        <div>
          <label className="label text-[11px]">{t('recipes.retailPrice', 'Retail price per bar')}</label>
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-slate-400">$</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="input pl-7"
              placeholder="8.00"
              value={retailPrice}
              onChange={(e) => onRetailPriceChange(e.target.value)}
            />
          </div>
        </div>
      </div>

      {hasRetail && grossProfit !== undefined && margin !== undefined && (
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 ring-1 ring-slate-200">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
              {t('recipes.grossProfit', 'Gross Profit')}
            </p>
            <p className={`text-xl font-bold ${grossProfit >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
              ${grossProfit.toFixed(2)}
            </p>
          </div>
          <div className={`rounded-xl px-3 py-2.5 ring-1 ${MARGIN_HEALTH_CLASSES[health]}`}>
            <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
              {t('recipes.margin', 'Margin')}
            </p>
            <p className="text-xl font-bold">{margin.toFixed(0)}%</p>
          </div>
        </div>
      )}

      {!hasRetail && (
        <p className="mt-2 text-xs text-slate-400">
          {t('recipes.retailHint', 'Enter a retail price to see profit and margin.')}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Live COGS — material cost calculated from ingredient prices + amounts
// ---------------------------------------------------------------------------
function LiveCOGSCard({
  ingredients,
  selectedIds,
  amounts,
  customCosts,
}: {
  ingredients: Ingredient[];
  selectedIds: string[];
  amounts: Record<string, string>;
  customCosts: Array<{ id: string; name: string; cost: number; unit?: string }>;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  interface LineItem {
    name: string;
    category: Ingredient['category'];
    amount: number;
    fractionalCost: number;
    lineCost: number;
    unit: string;
  }

  const lines = useMemo<LineItem[]>(() => {
    const result: LineItem[] = [];
    for (const id of selectedIds) {
      const ing = ingredients.find((i) => i.id === id);
      if (!ing || ing.fractionalCost === undefined) continue;
      const amt = parseFloat(amounts[id] ?? '');
      if (isNaN(amt) || amt <= 0) continue;
      result.push({
        name: ing.name,
        category: ing.category,
        amount: amt,
        fractionalCost: ing.fractionalCost,
        lineCost: amt * ing.fractionalCost,
        unit: ing.measurementType === 'volume' ? t('inventory.drops', 'drops') : t('inventory.grams', 'g'),
      });
    }
    return result;
  }, [ingredients, selectedIds, amounts, t]);

  const ingredientTotal = useMemo(() => lines.reduce((s, l) => s + l.lineCost, 0), [lines]);
  const customTotal = useMemo(() => customCosts.reduce((s, c) => s + c.cost, 0), [customCosts]);
  const total = ingredientTotal + customTotal;

  const selectedWithPricing = useMemo(() =>
    selectedIds.filter((id) => ingredients.find((i) => i.id === id)?.fractionalCost !== undefined),
    [selectedIds, ingredients],
  );

  const hasMissingPricing = selectedIds.length > 0 && selectedWithPricing.length < selectedIds.length;
  const hasAnyContent = lines.length > 0 || customCosts.length > 0;

  return (
    <div className="card overflow-hidden">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <DollarSign className="h-4 w-4 shrink-0 text-emerald-600" />
        <p className="label mb-0 flex-1">{t('recipes.liveCost', 'Live Material Cost')}</p>
        {hasAnyContent && (
          <span className="mr-2 font-bold text-emerald-700">${total.toFixed(4)}</span>
        )}
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          {!hasAnyContent ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {t('recipes.liveCostHint', 'Add ingredient amounts above and set purchase prices in Inventory to see live costs.')}
            </div>
          ) : (
            <>
              {/* Ingredient lines */}
              {lines.length > 0 && (
                <div className="space-y-1">
                  {lines.length > 0 && customCosts.length > 0 && (
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      {t('recipes.ingredientSubtotal', 'Ingredients')}
                    </p>
                  )}
                  {lines.map((line) => (
                    <div key={line.name} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <IngredientIcon category={line.category} name={line.name} size="sm" />
                        {t(`ingredientNames.${line.name.toLowerCase().replace(/ /g, '_')}`, line.name)}
                      </span>
                      <span className="text-slate-500">{line.amount}{line.unit}</span>
                      <span className="ml-4 font-semibold text-slate-800">${line.lineCost.toFixed(2)}</span>
                    </div>
                  ))}
                  {customCosts.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-slate-100 px-3 py-1.5 text-xs">
                      <span className="font-medium text-slate-600">
                        {t('recipes.ingredientSubtotal', 'Ingredients subtotal')}
                      </span>
                      <span className="font-semibold text-slate-700">${ingredientTotal.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Custom cost lines */}
              {customCosts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500">
                    {t('recipes.customCosts', 'Custom Materials & Packaging')}
                  </p>
                  {customCosts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs">
                      <span className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Package className="h-3.5 w-3.5 text-violet-500" />
                        {item.name}
                      </span>
                      <span className="text-slate-500">
                        ${item.cost.toFixed(2)}{item.unit ? `/${item.unit}` : '/bar'}
                      </span>
                      <span className="ml-4 font-semibold text-violet-700">${item.cost.toFixed(4)}</span>
                    </div>
                  ))}
                  {lines.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg bg-violet-100 px-3 py-1.5 text-xs">
                      <span className="font-medium text-violet-700">
                        {t('recipes.customMaterialsSubtotal', 'Custom materials subtotal')}
                      </span>
                      <span className="font-semibold text-violet-800">${customTotal.toFixed(4)}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5">
                <span className="text-sm font-semibold text-emerald-800">
                  {t('recipes.totalMaterialCost', 'Total Raw Material Cost')}
                </span>
                <span className="text-lg font-bold text-emerald-700">${total.toFixed(4)}</span>
              </div>
            </>
          )}

          {hasMissingPricing && (
            <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {t('recipes.missingPricing', 'Some ingredients are missing purchase prices. Set them in the Inventory screen.')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Batch Cost Calculator
// ---------------------------------------------------------------------------
function CostCalculatorCard({
  ingredientTotal = 0,
  customCostTotal = 0,
}: {
  ingredientTotal?: number;
  customCostTotal?: number;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [materialCost, setMaterialCost] = useState('');
  const [numBars, setNumBars] = useState('');
  const [overhead, setOverhead] = useState('25');
  const [labor, setLabor] = useState('');

  const hasLiveCosts = ingredientTotal > 0 || customCostTotal > 0;
  const bars = parseInt(numBars, 10);
  const liveTotalBatch = hasLiveCosts && bars > 0
    ? ingredientTotal + customCostTotal * bars
    : null;
  const liveCostPerBar = liveTotalBatch !== null && bars > 0
    ? liveTotalBatch / bars
    : null;

  const results = useMemo(() => {
    const mat = parseFloat(materialCost);
    const b = parseInt(numBars, 10);
    const ovh = parseFloat(overhead) / 100;
    const lab = parseFloat(labor) || 0;
    if (!mat || !b || b <= 0) return null;

    const totalCost = mat + mat * ovh + lab;
    const costPerBar = totalCost / b;
    const retail3x = costPerBar * 3;
    const retail4x = costPerBar * 4;
    const margin3x = ((retail3x - costPerBar) / retail3x) * 100;

    return { costPerBar, retail3x, retail4x, margin3x };
  }, [materialCost, numBars, overhead, labor]);

  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="card overflow-hidden">
      <button
        className="flex w-full items-center gap-2 text-left"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <Calculator className="h-4 w-4 shrink-0 text-gaia-600" />
        <p className="label mb-0 flex-1">{t('recipes.costCalc', 'Batch Cost Calculator')}</p>
        {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
      </button>

      {open && (
        <div className="mt-4 space-y-4">
          {/* Live cost summary */}
          {hasLiveCosts && (
            <div className="rounded-xl bg-slate-50 ring-1 ring-slate-200 p-3 space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                {t('recipes.liveCostSummary', 'Live Cost Summary')}
              </p>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>{t('recipes.liveCostIngredients', 'Ingredient costs (batch)')}</span>
                  <span className="font-medium">${ingredientTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-violet-600">
                  <span>{t('recipes.liveCostCustom', 'Custom materials (per bar)')}</span>
                  <span className="font-medium">${customCostTotal.toFixed(2)}/bar</span>
                </div>
                {liveTotalBatch !== null && (
                  <>
                    <div className="flex justify-between border-t border-slate-200 pt-1 text-slate-700 font-semibold">
                      <span>{t('recipes.liveCostTotalBatch', 'Total batch cost')} ({bars} bars)</span>
                      <span>${liveTotalBatch.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span>{t('recipes.liveCostPerBar', 'Cost per bar')}</span>
                      <span>${liveCostPerBar!.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
              <button
                className="mt-1 text-[11px] font-medium text-gaia-600 hover:underline"
                onClick={() => setMaterialCost(
                  bars > 0
                    ? (ingredientTotal + customCostTotal * bars).toFixed(2)
                    : (ingredientTotal + customCostTotal).toFixed(2)
                )}
              >
                {t('recipes.useLiveCosts', 'Use live costs in calculator')} ↑
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <label className="label">{t('recipes.costMaterial', 'Materials ($)')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                placeholder="e.g. 12.50"
                value={materialCost}
                onChange={(e) => setMaterialCost(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('recipes.costBars', 'Number of Bars')}</label>
              <input
                type="number"
                min={1}
                step={1}
                className="input"
                placeholder="e.g. 8"
                value={numBars}
                onChange={(e) => setNumBars(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('recipes.costOverhead', 'Overhead %')}</label>
              <input
                type="number"
                min={0}
                max={200}
                step={5}
                className="input"
                value={overhead}
                onChange={(e) => setOverhead(e.target.value)}
              />
            </div>
            <div>
              <label className="label">{t('recipes.costLabor', 'Labor ($)')}</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className="input"
                placeholder="e.g. 5.00"
                value={labor}
                onChange={(e) => setLabor(e.target.value)}
              />
            </div>
          </div>

          {results ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{t('recipes.costPerBar', 'Cost / Bar')}</p>
                <p className="mt-1 text-xl font-bold text-slate-800">{fmt(results.costPerBar)}</p>
              </div>
              <div className="rounded-xl bg-gaia-50 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gaia-600">{t('recipes.retail3x', 'Retail (3×)')}</p>
                <p className="mt-1 text-xl font-bold text-gaia-700">{fmt(results.retail3x)}</p>
              </div>
              <div className="rounded-xl bg-gaia-50 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gaia-600">{t('recipes.retail4x', 'Retail (4×)')}</p>
                <p className="mt-1 text-xl font-bold text-gaia-700">{fmt(results.retail4x)}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3 text-center">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600">{t('recipes.margin', 'Margin at 3×')}</p>
                <p className="mt-1 text-xl font-bold text-emerald-700">{results.margin3x.toFixed(0)}%</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {t('recipes.costHint', 'Enter batch details above to calculate cost per bar.')}
            </div>
          )}

          <p className="text-xs text-slate-400">
            {t('recipes.costNote', 'Overhead covers packaging, fragrances, colorants, labels, and supplies. Standard handmade soap retail is 3×–4× fully-loaded cost.')}
          </p>
        </div>
      )}
    </div>
  );
}
