import { memo, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { AlertTriangle, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, DollarSign, Droplets, Eye, FlaskConical, Heart, Info, Layers, Leaf, Package, Pencil, Plus, RotateCcw, Search, Sparkles, Trash2, Type, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AppSettings, CustomMaterial, Ingredient, IngredientCategory, Recipe, RecipeAmountUnit } from '@/types';
import { customMaterialsRepo, ingredientsRepo, recipesRepo } from '@/db/repositories';
import {
  calculateProfitMargin,
  calculateRecipeMaterialCogs,
  calculateRecipeUnitCogs,
  marginHealth,
  MARGIN_HEALTH_CLASSES,
  recipeLineAmountInBaseUnits,
  resolveRecipeAmountUnit,
} from '@/lib/inventoryMath';
import RecipeAmountUnitSelect, { recipeAmountUnitLabel } from '@/components/recipes/RecipeAmountUnitSelect';
import { suggestBenefitStatement, LABEL_BENEFIT_SOFT_LIMIT } from '@/lib/localAi';
import { runAiTask } from '@/lib/aiTask';
import { useLocalAiOnline } from '@/hooks/useLocalAiOnline';
import { rankByQuery } from '@/lib/catalogSearchRank';
import { getCategoryLabel, getIngredientBilingualNames, getIngredientDisplayName, ingredientMatchesQuery } from '@/lib/ingredientI18n';
import { benefitTextReplaceable } from '@/lib/benefitI18n';
import { AiSuggestFlairButton } from '@/components/common/AiSuggestFlair';
import {
  bilingualRecipeDirections,
  bilingualRecipeWarnings,
  localizeRecipeBenefit,
  relocalizeRecipeFormFields,
} from '@/lib/recipeI18n';
import type { BenefitMixIngredient } from '@/lib/benefitMix';
import { useAppStore } from '@/store/useAppStore';
import { isTrainingModeActive } from '@/lib/trainingMode';
import { WORKFLOW_STEP_ICONS } from '@/lib/workflowStepIcons';
import WorkflowNav from '@/components/WorkflowNav';
import BenefitPicker from '@/components/screens/BenefitPicker';
import IngredientIcon from '@/components/common/IngredientIcon';
import BilingualIngredientName from '@/components/common/BilingualIngredientName';
import AutoResizeTextarea from '@/components/common/AutoResizeTextarea';
import IngredientAutocomplete from '@/components/common/IngredientAutocomplete';
import Modal from '@/components/common/Modal';
import RecipeBuilderModal from '@/components/recipes/RecipeBuilderModal';
import RecipeBenefitCopySection from '@/components/recipes/RecipeBenefitCopySection';
import { BILINGUAL_COL, RECIPE_META_COL } from '@/lib/bilingualUi';
import { pickRecipeHeroIngredient } from '@/lib/recipeHero';
import { getRecipeColor } from '@/lib/recipeColors';
import { formatNetWeightAmount, formatNetWeightLine, parseNetWeight } from '@/lib/netWeight';
import { isDefaultSoapBaseName, withDefaultSoapBaseIds } from '@/data/ingredientSeed';

type RecipeJumpSection = 'name' | 'ingredients' | 'base' | 'benefit' | 'directions' | 'warnings' | 'netWeight' | 'footer';

const RECIPE_JUMP_PAD = 8;

function recipeJumpScroller(el: HTMLElement): HTMLElement | null {
  return el.closest('[data-recipes-scroll]');
}

/** True when any part of `el` is already inside the recipes scroller. */
function recipeSectionIsOnScreen(el: HTMLElement, scroller: HTMLElement): boolean {
  const er = el.getBoundingClientRect();
  const sr = scroller.getBoundingClientRect();
  return er.bottom > sr.top + RECIPE_JUMP_PAD && er.top < sr.bottom - RECIPE_JUMP_PAD;
}

/** Scroll just enough to reveal `el`. No-op when it is already visible so
 *  repeated checklist / preview clicks cannot accumulate extra offset. */
function scrollRecipeSectionIntoView(el: HTMLElement) {
  const scroller = recipeJumpScroller(el);
  if (scroller && recipeSectionIsOnScreen(el, scroller)) return;
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

interface RecipeForm {
  name: string;
  benefit: string;
  benefitEn: string;
  benefitEs: string;
  netWeight: string;
  directions: string;
  directionsEn: string;
  directionsEs: string;
  warnings: string;
  warningsEn: string;
  warningsEs: string;
  footer: string;
  ingredientIds: string[];
  /** Usage amounts by ingredient ID. Interpreted with `ingredientUnits`. */
  ingredientAmounts: Record<string, string>;
  ingredientUnits: Record<string, RecipeAmountUnit>;
  color?: string;
  customCosts: Array<{ id: string; name: string; cost: number; unit?: string }>;
  retailPrice: string;
  /** How many bars one batch of the amounts yields (blank = 1). Work orders divide by this. */
  barsPerBatch: string;
  laborMinutes: string;
}

/** Max recipe rows shown per page in "Your Recipes" — chosen so the list's
 *  height lines up with the taller stack of cards in the editor column. */
const RECIPES_PER_PAGE = 6;

/** Alternating earth-tone backgrounds for recipe cards so adjacent rows are
 *  easy to tell apart. Each stroke is the same hue as the fill, just darker
 *  (selected = deeper ring; unselected = a step lighter). */
const EARTH_TONE_ROWS: Array<{ bg: string; stroke: string; strokeSelected: string }> = [
  { bg: 'bg-amber-100/90',   stroke: '#c9a83a', strokeSelected: '#a07c18' }, // sand → ochre
  { bg: 'bg-stone-200',      stroke: '#a8a29e', strokeSelected: '#78716c' }, // clay → warm stone
  { bg: 'bg-orange-100/90',  stroke: '#d4924a', strokeSelected: '#b46a28' }, // terracotta
  { bg: 'bg-lime-100/80',    stroke: '#8aaa38', strokeSelected: '#6a8620' }, // sage → olive
  { bg: 'bg-amber-200/70',   stroke: '#c9a028', strokeSelected: '#a67c14' }, // warm brown → gold
  { bg: 'bg-emerald-100/80', stroke: '#3d9a6e', strokeSelected: '#2a7a54' }, // moss
];

/** Same earth-tone fill + stroke the recipe card uses at this list index. */
function recipeCardEarthTone(listIndex: number): { bg: string; stroke: string; strokeSelected: string } {
  return EARTH_TONE_ROWS[Math.max(listIndex, 0) % EARTH_TONE_ROWS.length];
}

const BUSINESS_FOOTER =
  'customercare@gaiasessences.com · https://www.gaiasessences.com/';

function RecipeCardHeroIcon({ ingredients }: { ingredients: Ingredient[] }) {
  const hero = pickRecipeHeroIngredient(ingredients);
  if (!hero) {
    return <span className="flex h-12 w-12 shrink-0 rounded-full bg-white shadow-sm" />;
  }
  return (
    <span data-recipe-card-hero="" data-recipe-card-hero-name={hero.name} className="contents">
      <IngredientIcon
        category={hero.category}
        name={hero.name}
        iconKey={hero.iconKey}
        size="lg"
        className="shrink-0 shadow-sm"
      />
    </span>
  );
}

const RecipeRow = memo(function RecipeRow({
  recipe,
  listIndex,
  isSelected,
  isEditing,
  ingredients,
  sectionHighlight,
  dirty,
  onToggle,
  onEdit,
  onRemove,
}: {
  recipe: Recipe;
  listIndex: number;
  isSelected: boolean;
  isEditing: boolean;
  ingredients: Ingredient[];
  sectionHighlight: RecipeJumpSection | null;
  dirty: boolean;
  onToggle: (recipe: Recipe) => void;
  onEdit: (recipe: Recipe) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const theme = getRecipeColor(recipe, ingredients);
  const earthTone = EARTH_TONE_ROWS[listIndex % EARTH_TONE_ROWS.length];
  const recipeIngredients = recipe.ingredientIds
    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
    .filter((ingredient): ingredient is Ingredient => !!ingredient);
  return (
    <div
      data-recipe-card-selected={isSelected ? 'true' : undefined}
      className={`relative flex w-full min-w-0 cursor-pointer flex-col rounded-xl px-3 py-3 transition ${
        isEditing || isSelected
          ? `${earthTone.bg} border-2 shadow-sm`
          : `${earthTone.bg} border`
      } ${
        isSelected ? 'opacity-100' : 'opacity-60 hover:opacity-80'
      } ${
        isSelected && (sectionHighlight === 'ingredients' || sectionHighlight === 'base')
          ? 'ring-4 ring-gaia-600 ring-offset-2'
          : ''
      }`}
      style={{
        borderColor: (isEditing || isSelected) ? earthTone.strokeSelected : earthTone.stroke,
      }}
      onClick={() => onToggle(recipe)}
    >
      <div className="flex w-full min-w-0 items-start gap-3">
        <RecipeCardHeroIcon ingredients={recipeIngredients} />
        <span className="min-w-0 flex-1">
          <span className="flex w-full items-center gap-1.5 text-sm font-medium text-slate-800">
            <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-center">
              <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${theme.dot}`} />
              <span className="break-words">{recipe.name}</span>
            </span>
            <span className="flex shrink-0 items-center">
              <button
                type="button"
                className="rounded-lg p-1 text-blue-500 transition hover:bg-white/70 hover:text-blue-700"
                title={t('common.edit', 'Edit')}
                aria-label={t('recipes.editRecipe', 'Edit Recipe')}
                onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="rounded-lg p-1 text-rose-500 transition hover:bg-white/70 hover:text-rose-700"
                title={t('common.delete', 'Delete')}
                aria-label={t('recipes.deleteRecipe', 'Delete Recipe')}
                onClick={(e) => { e.stopPropagation(); void onRemove(recipe.id); }}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </span>
          </span>
          {recipeIngredients.length > 0 ? (
            <span className="mt-1.5 flex w-full min-w-0 flex-col gap-1">
              {recipeIngredients.map((ing) => {
                const amount = recipe.ingredientAmounts?.[ing.id];
                const unit = recipeAmountUnitLabel(
                  resolveRecipeAmountUnit(ing, recipe.ingredientUnits?.[ing.id]),
                  t,
                );
                const amountLabel =
                  amount !== undefined && Number(amount) > 0 ? `${amount} ${unit}` : '—';
                return (
                  <span key={ing.id} className="flex min-w-0 items-center gap-1.5">
                    <IngredientIcon category={ing.category} name={ing.name} iconKey={ing.iconKey} size="sm" className="shrink-0" />
                    <span className="flex min-h-[26px] min-w-0 flex-1 items-center whitespace-nowrap text-sm font-medium leading-none text-slate-900">
                      {getIngredientDisplayName(ing.name, t)}
                    </span>
                    <span className="shrink-0 text-sm font-medium text-slate-900">{amountLabel}</span>
                  </span>
                );
              })}
            </span>
          ) : (
            <span className="mt-1 block text-[11px] text-slate-500">
              {t('recipes.ingredients_count', '{{count}} ingredients', { count: 0 })}
            </span>
          )}
        </span>
      </div>
      {(isSelected || dirty) && (
        <span className="mt-2 flex items-center justify-center gap-1.5">
          {isSelected && (
            <span className="inline-flex items-center rounded-full bg-white/90 px-[calc(0.375rem*1.15)] py-0 text-[calc(10px*1.15)] font-semibold text-gaia-700 shadow-sm">
              ✓ {t('recipes.selected', 'Selected')}
            </span>
          )}
          {dirty && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-200">
              {t('recipes.unsaved', 'Unsaved')}
            </span>
          )}
        </span>
      )}
    </div>
  );
});

const emptyForm: RecipeForm = {
  name: '',
  benefit: '',
  benefitEn: '',
  benefitEs: '',
  netWeight: '100g',
  directions: bilingualRecipeDirections().en,
  directionsEn: bilingualRecipeDirections().en,
  directionsEs: bilingualRecipeDirections().es,
  warnings: bilingualRecipeWarnings().en,
  warningsEn: bilingualRecipeWarnings().en,
  warningsEs: bilingualRecipeWarnings().es,
  footer: BUSINESS_FOOTER,
  ingredientIds: [],
  ingredientAmounts: {},
  ingredientUnits: {},
  color: undefined,
  customCosts: [],
  retailPrice: '',
  barsPerBatch: '',
  laborMinutes: '',
};

function formFromRecipe(r: Recipe, t: TFunction, soapBaseId?: string): RecipeForm {
  const amounts: Record<string, string> = {};
  if (r.ingredientAmounts) {
    for (const [k, v] of Object.entries(r.ingredientAmounts)) amounts[k] = String(v);
  }
  const units: Record<string, RecipeAmountUnit> = { ...(r.ingredientUnits ?? {}) };
  return {
    name: r.name,
    benefit: localizeRecipeBenefit(r.name, r.benefit, t),
    benefitEn: r.benefitEn ?? r.benefit ?? '',
    benefitEs: r.benefitEs ?? r.benefit ?? '',
    netWeight: r.netWeight ?? '',
    directions: bilingualRecipeDirections(r.directionsEn || r.directions).en,
    directionsEn: r.directionsEn?.trim() || bilingualRecipeDirections(r.directions).en,
    directionsEs: r.directionsEs?.trim() || bilingualRecipeDirections(r.directions).es,
    warnings: bilingualRecipeWarnings(r.warningsEn || r.warnings).en,
    warningsEn: r.warningsEn?.trim() || bilingualRecipeWarnings(r.warnings).en,
    warningsEs: r.warningsEs?.trim() || bilingualRecipeWarnings(r.warnings).es,
    footer: (r.footer ?? '').replace(/^Rosa Suarez\s*·\s*/i, ''),
    ingredientIds: withDefaultSoapBaseIds(r.ingredientIds, soapBaseId),
    ingredientAmounts: amounts,
    ingredientUnits: units,
    color: r.color,
    customCosts: r.customCosts ?? [],
    retailPrice: r.retailPrice !== undefined ? String(r.retailPrice) : '',
    barsPerBatch: r.barsPerBatch !== undefined ? String(r.barsPerBatch) : '',
    laborMinutes: r.laborMinutes !== undefined ? String(r.laborMinutes) : '',
  };
}

function formsEqual(a: RecipeForm, b: RecipeForm): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

interface BilingualBenefitSuggestion {
  en: string;
  es: string;
}

export default function RecipesScreen() {
  const { t, i18n } = useTranslation();
  const goto            = useAppStore((s) => s.goto);
  const setActiveRecipeId = useAppStore((s) => s.setActiveRecipeId);
  const activeRecipeId  = useAppStore((s) => s.activeRecipeId);
  const template        = useAppStore((s) => s.template);
  const settings        = useAppStore((s) => s.settings);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [trashedRecipes, setTrashedRecipes] = useState<Recipe[]>([]);
  const [trashOpen, setTrashOpen] = useState(false);
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [customMaterials, setCustomMaterials] = useState<CustomMaterial[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [savedToast, setSavedToast] = useState(false);
  const [suggestingBenefit, setSuggestingBenefit] = useState(false);
  const [benefitSuggestError, setBenefitSuggestError] = useState<string | null>(null);
  /** Pending AI suggestions awaiting accept/edit/reject — never written to form directly. */
  const [benefitSuggestions, setBenefitSuggestions] = useState<BilingualBenefitSuggestion[]>([]);
  const [benefitSuggestionIndex, setBenefitSuggestionIndex] = useState(0);
  const [editingSuggestion, setEditingSuggestion] = useState(false);
  const [suggestionDraftEn, setSuggestionDraftEn] = useState('');
  const [suggestionDraftEs, setSuggestionDraftEs] = useState('');
  const { online: aiConnected, ollamaOnline, checking: aiChecking, refresh: refreshAiStatus } = useLocalAiOnline(settings);
  const savedToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const nameSectionRef = useRef<HTMLDivElement>(null);
  const ingredientsSectionRef = useRef<HTMLDivElement>(null);
  const benefitSectionRef = useRef<HTMLDivElement>(null);
  const directionsSectionRef = useRef<HTMLDivElement>(null);
  const warningsSectionRef = useRef<HTMLDivElement>(null);
  const netWeightSectionRef = useRef<HTMLDivElement>(null);
  const footerSectionRef = useRef<HTMLDivElement>(null);
  const sectionHighlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sectionHighlight, setSectionHighlight] = useState<RecipeJumpSection | null>(null);
  const benefitSuggestVariant = useRef(0);
  const priorBenefitDrafts = useRef<Array<{ en?: string; es?: string }>>([]);
  const autoSuggestSigRef = useRef('');
  const lastAutoAppliedRef = useRef<{ sig: string; en: string; es: string } | null>(null);
  const suggestInFlightRef = useRef(false);

  const resetBenefitSuggestHistory = () => {
    setBenefitSuggestions([]);
    setBenefitSuggestionIndex(0);
    setEditingSuggestion(false);
    setBenefitSuggestError(null);
    benefitSuggestVariant.current = 0;
    priorBenefitDrafts.current = [];
  };
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showIncompleteDialog, setShowIncompleteDialog] = useState(false);
  const [showNeedShapeDialog, setShowNeedShapeDialog] = useState(false);
  const [highlightMissing, setHighlightMissing] = useState(false);
  const [recipePage, setRecipePage] = useState(0);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [builderRecipe, setBuilderRecipe] = useState<Recipe | null>(null);
  const formRef = useRef(form);
  formRef.current = form;
  const draftsRef = useRef<Record<string, RecipeForm>>({});
  const baselinesRef = useRef<Record<string, RecipeForm>>({});
  const [dirtyById, setDirtyById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    return () => {
      if (savedToastTimer.current) clearTimeout(savedToastTimer.current);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      if (sectionHighlightTimer.current) clearTimeout(sectionHighlightTimer.current);
    };
  }, []);

  const reload = async () => {
    const [live, trash] = await Promise.all([recipesRepo.all(), recipesRepo.trashed()]);
    setRecipes(live);
    setTrashedRecipes(trash);
    setIngredients(await ingredientsRepo.all());
    setCustomMaterials(await customMaterialsRepo.active());
  };
  useEffect(() => {
    void reload();
  }, []);

  const ollamaUp = settings.localAiEnabled && ollamaOnline;
  /** Prefer AI chrome while Ollama is still being pinged so the leftover MAIN BENEFIT mix doesn't flash. */
  const aiOnline = settings.localAiEnabled && (ollamaUp || aiChecking);

  useEffect(() => {
    if (!editingId) return;
    const recipe = recipes.find((r) => r.id === editingId);
    if (!recipe) return;
    setForm((current) => {
      const next = relocalizeRecipeFormFields(
        recipe.name,
        {
          benefit: current.benefit,
          directions: current.directions,
          warnings: current.warnings,
        },
        {
          benefit: recipe.benefit,
          directions: recipe.directions,
          warnings: recipe.warnings,
        },
        t,
      );
      return {
        ...current,
        benefit: next.benefit,
      };
    });
  }, [i18n.language, editingId, recipes, t]);

  const recipeTotalPages = Math.max(1, Math.ceil(recipes.length / RECIPES_PER_PAGE));

  // Keep the current page in range if recipes are deleted out from under it.
  useEffect(() => {
    if (recipePage > recipeTotalPages - 1) setRecipePage(recipeTotalPages - 1);
  }, [recipePage, recipeTotalPages]);

  const pagedRecipes = useMemo(
    () => recipes.slice(recipePage * RECIPES_PER_PAGE, recipePage * RECIPES_PER_PAGE + RECIPES_PER_PAGE),
    [recipes, recipePage],
  );

  const defaultSoapBase = useMemo(
    () =>
      ingredients.find((i) => isDefaultSoapBaseName(i.name))
      ?? ingredients.find((i) => i.isSoapBase && i.name.toLowerCase().includes('glycerin')),
    [ingredients],
  );

  useEffect(() => {
    if (!defaultSoapBase || !editingId) return;
    setForm((current) => {
      const ingredientIds = withDefaultSoapBaseIds(current.ingredientIds, defaultSoapBase.id);
      if (ingredientIds.join('\0') === current.ingredientIds.join('\0')) return current;
      return { ...current, ingredientIds };
    });
  }, [defaultSoapBase, editingId]);

  const payloadFromForm = (next: RecipeForm) => {
    const ingredientAmounts: Record<string, number> = {};
    for (const [k, v] of Object.entries(next.ingredientAmounts)) {
      const n = parseFloat(v);
      if (!isNaN(n) && n > 0) ingredientAmounts[k] = n;
    }
    const ingredientUnits: Record<string, RecipeAmountUnit> = {};
    for (const id of next.ingredientIds) {
      const ing = ingredients.find((item) => item.id === id);
      if (ing) ingredientUnits[id] = resolveRecipeAmountUnit(ing, next.ingredientUnits[id]);
    }
    const primaryBenefit = aiOnline
      ? (next.benefitEn.trim() || next.benefitEs.trim() || next.benefit.trim())
      : (next.benefit.trim() || next.benefitEn.trim() || next.benefitEs.trim());
    return {
      name: next.name,
      benefit: primaryBenefit,
      benefitEn: next.benefitEn.trim() || undefined,
      benefitEs: next.benefitEs.trim() || undefined,
      netWeight: next.netWeight,
      directions: next.directionsEn.trim() || next.directions,
      directionsEn: next.directionsEn.trim() || undefined,
      directionsEs: next.directionsEs.trim() || undefined,
      warnings: next.warningsEn.trim() || next.warnings,
      warningsEn: next.warningsEn.trim() || undefined,
      warningsEs: next.warningsEs.trim() || undefined,
      footer: next.footer,
      ingredientIds: withDefaultSoapBaseIds(next.ingredientIds, defaultSoapBase?.id),
      ingredientAmounts,
      ingredientUnits,
      color: next.color,
      customCosts: next.customCosts,
      retailPrice: (() => {
        const n = parseFloat(next.retailPrice);
        return !isNaN(n) && n > 0 ? n : undefined;
      })(),
      barsPerBatch: (() => {
        const n = parseFloat(next.barsPerBatch);
        return !isNaN(n) && n > 0 ? n : undefined;
      })(),
      laborMinutes: (() => {
        const n = parseFloat(next.laborMinutes);
        return !isNaN(n) && n >= 0 ? n : undefined;
      })(),
    };
  };

  const rememberDraft = (id: string | null, next: RecipeForm) => {
    if (!id) return;
    draftsRef.current[id] = next;
    const baseline = baselinesRef.current[id];
    const dirty = !!baseline && !formsEqual(next, baseline);
    setDirtyById((current) => (current[id] === dirty ? current : { ...current, [id]: dirty }));
  };

  // Persisted activeRecipeId can be set before the editor form is hydrated.
  useEffect(() => {
    if (!activeRecipeId) return;
    const recipe = recipes.find((row) => row.id === activeRecipeId);
    if (!recipe) return;
    const current = formRef.current;
    const formLooksEmpty = !current.name.trim() && current.ingredientIds.length === 0;
    if (editingId === recipe.id && !formLooksEmpty) return;
    const next = draftsRef.current[recipe.id] ?? formFromRecipe(recipe, t, defaultSoapBase?.id);
    if (!baselinesRef.current[recipe.id]) {
      baselinesRef.current[recipe.id] = formFromRecipe(recipe, t, defaultSoapBase?.id);
    }
    rememberDraft(recipe.id, next);
    setEditingId(recipe.id);
    setForm(next);
  }, [activeRecipeId, recipes, editingId, defaultSoapBase?.id, t]);

  const flushDraft = async (id: string | null, next = id ? draftsRef.current[id] : undefined) => {
    if (!id || !next?.name.trim()) return;
    const payload = payloadFromForm(next);
    await recipesRepo.update(id, payload);
    setRecipes((current) => current.map((row) => (
      row.id === id ? { ...row, ...payload, updatedAt: Date.now() } : row
    )));
  };

  const selectRecipe = (r: Recipe) => {
    if (editingId && editingId !== r.id) {
      rememberDraft(editingId, formRef.current);
      void flushDraft(editingId, formRef.current);
    }
    if (!baselinesRef.current[r.id]) {
      baselinesRef.current[r.id] = formFromRecipe(r, t, defaultSoapBase?.id);
    }
    const next = draftsRef.current[r.id] ?? formFromRecipe(r, t, defaultSoapBase?.id);
    rememberDraft(r.id, next);
    setEditingId(r.id);
    setActiveRecipeId(r.id);
    setForm(next);
    setHighlightMissing(false);
    resetBenefitSuggestHistory();
    revealEditor();
  };

  const deselectRecipe = () => {
    if (editingId) {
      rememberDraft(editingId, formRef.current);
      void flushDraft(editingId, formRef.current);
    }
    setActiveRecipeId(null);
    setEditingId(null);
    setForm(emptyForm);
    setHighlightMissing(false);
    resetBenefitSuggestHistory();
  };

  const toggleRecipe = (r: Recipe) => {
    if (activeRecipeId === r.id) {
      deselectRecipe();
      return;
    }
    selectRecipe(r);
  };

  const revertToDefault = () => {
    if (!editingId) return;
    const baseline = baselinesRef.current[editingId];
    if (!baseline) return;
    setForm(baseline);
    rememberDraft(editingId, baseline);
    void flushDraft(editingId, baseline);
  };

  /**
   * The editor is a second column on desktop and sits below the list on narrow
   * screens, so a blank-form reset alone looks like nothing happened.
   */
  const revealEditor = (focusName = false) => {
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (focusName) nameInputRef.current?.focus({ preventScroll: true });
    });
  };

  const newRecipe = () => {
    setBuilderRecipe(null);
    setBuilderOpen(true);
  };

  const editRecipe = (recipe: Recipe) => {
    setBuilderRecipe(recipe);
    setBuilderOpen(true);
  };

  const handleBuilderCreated = async (recipe: Recipe) => {
    await reload();
    const next = formFromRecipe(recipe, t, defaultSoapBase?.id);
    draftsRef.current[recipe.id] = next;
    baselinesRef.current[recipe.id] = next;
    selectRecipe(recipe);
    setSavedToast(true);
    if (savedToastTimer.current) clearTimeout(savedToastTimer.current);
    savedToastTimer.current = setTimeout(() => setSavedToast(false), 2500);
  };

  useEffect(() => {
    rememberDraft(editingId, form);
  }, [editingId, form]);

  const save = async () => {
    if (!form.name.trim()) return;
    const payload = payloadFromForm(form);
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
    if (editingId) {
      rememberDraft(editingId, form);
      baselinesRef.current[editingId] = form;
    }
    await reload();
    setSavedToast(true);
    if (savedToastTimer.current) clearTimeout(savedToastTimer.current);
    savedToastTimer.current = setTimeout(() => setSavedToast(false), 2500);
  };

  const remove = (id: string) => setConfirmDeleteId(id);

  const doRemove = async (id: string) => {
    setConfirmDeleteId(null);
    delete draftsRef.current[id];
    delete baselinesRef.current[id];
    setDirtyById((current) => {
      if (!(id in current)) return current;
      const next = { ...current };
      delete next[id];
      return next;
    });
    await recipesRepo.remove(id);
    if (editingId === id) {
      setEditingId(null);
      setForm({
        ...emptyForm,
        ingredientIds: [],
        ingredientAmounts: {},
        ingredientUnits: {},
      });
    }
    if (activeRecipeId === id) setActiveRecipeId(null);
    if (editingId === id) resetBenefitSuggestHistory();
    await reload();
  };

  const restoreRecipe = async (id: string) => {
    await recipesRepo.restore(id);
    await reload();
  };

  const purgeRecipe = async (id: string) => {
    setConfirmPurgeId(null);
    await recipesRepo.purge(id);
    await reload();
  };

  const toggleIngredient = (id: string) => {
    if (defaultSoapBase && id === defaultSoapBase.id) return;
    setForm((f) => {
      const removing = f.ingredientIds.includes(id);
      const ingredientUnits = { ...f.ingredientUnits };
      if (removing) delete ingredientUnits[id];
      return {
        ...f,
        ingredientIds: removing
          ? f.ingredientIds.filter((x) => x !== id)
          : [...f.ingredientIds, id],
        ingredientUnits,
      };
    });
  };

  const setIngredientAmount = (id: string, amount: string) => {
    setForm((f) => ({
      ...f,
      ingredientAmounts: { ...f.ingredientAmounts, [id]: amount },
    }));
  };

  const setIngredientUnit = (id: string, unit: RecipeAmountUnit) => {
    setForm((f) => ({
      ...f,
      ingredientUnits: { ...f.ingredientUnits, [id]: unit },
    }));
  };

  const selectedIngredientsForSuggest = useMemo(
    () => ingredients.filter((i) => form.ingredientIds.includes(i.id)),
    [ingredients, form.ingredientIds],
  );

  const mixIngredientsForSuggest = useMemo<BenefitMixIngredient[]>(
    () => selectedIngredientsForSuggest.map((i) => ({
      name: i.name,
      category: i.category,
      benefit: i.benefit,
      inci: i.inci,
    })),
    [selectedIngredientsForSuggest],
  );

  const autoSuggestSig = `${editingId ?? 'new'}|${[...form.ingredientIds].sort().join(',')}`;

  const handleSuggestBenefit = async (opts?: { autoApply?: boolean }) => {
    if (suggestInFlightRef.current) return;
    if (selectedIngredientsForSuggest.length === 0) return;
    setBenefitSuggestError(null);
    setEditingSuggestion(false);
    setSuggestingBenefit(true);
    suggestInFlightRef.current = true;
    try {
      const suggestInput = {
        recipeName: form.name,
        ingredients: mixIngredientsForSuggest,
        variant: benefitSuggestVariant.current,
        avoid: priorBenefitDrafts.current,
      };
      benefitSuggestVariant.current += 1;
      const task = await runAiTask(
        'benefit-suggest',
        { ...suggestInput, nonce: Date.now() },
        () => suggestBenefitStatement(suggestInput, settings),
        { bypassCache: true },
      );
      if (!task.ok) {
        setBenefitSuggestError(task.error);
        void refreshAiStatus();
        return;
      }
      const result = task.data;
      if (result.ok && (result.suggestionEn || result.suggestionEs)) {
        const next = {
          en: result.suggestionEn ?? '',
          es: result.suggestionEs ?? '',
        };
        priorBenefitDrafts.current = [...priorBenefitDrafts.current, next].slice(-8);
        if (opts?.autoApply) {
          lastAutoAppliedRef.current = { sig: autoSuggestSig, en: next.en, es: next.es };
          setBenefitSuggestions([]);
          setBenefitSuggestionIndex(0);
          const patch = {
            benefitEn: next.en,
            benefitEs: next.es,
            benefit: settings.language === 'es' ? next.es : next.en,
          };
          const merged = { ...formRef.current, ...patch };
          setForm(merged);
          if (editingId) {
            rememberDraft(editingId, merged);
            void flushDraft(editingId, merged);
          }
        } else {
          setBenefitSuggestions((list) => [...list, next]);
          setBenefitSuggestionIndex(benefitSuggestions.length);
        }
      } else {
        setBenefitSuggestError(result.error ?? t('recipes.benefitSuggestGenericError', "Couldn't generate a suggestion."));
        void refreshAiStatus();
      }
    } finally {
      suggestInFlightRef.current = false;
      setSuggestingBenefit(false);
    }
  };

  const handleSuggestBenefitRef = useRef(handleSuggestBenefit);
  handleSuggestBenefitRef.current = handleSuggestBenefit;

  useEffect(() => {
    if (builderOpen) return;
    if (!ollamaUp) return;
    if (selectedIngredientsForSuggest.length === 0) return;
    if (autoSuggestSigRef.current === autoSuggestSig) return;
    if (suggestInFlightRef.current) return;

    const last = lastAutoAppliedRef.current;
    const stillOurs = Boolean(
      last
      && last.en === form.benefitEn
      && last.es === form.benefitEs,
    );
    const replaceable = stillOurs
      || (
        benefitTextReplaceable(form.benefit, mixIngredientsForSuggest, t)
        && benefitTextReplaceable(form.benefitEn, mixIngredientsForSuggest, t)
        && benefitTextReplaceable(form.benefitEs, mixIngredientsForSuggest, t)
      );
    if (!replaceable) {
      autoSuggestSigRef.current = autoSuggestSig;
      return;
    }

    const timer = window.setTimeout(() => {
      if (autoSuggestSigRef.current === autoSuggestSig) return;
      autoSuggestSigRef.current = autoSuggestSig;
      void handleSuggestBenefitRef.current({ autoApply: true });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    aiOnline,
    ollamaUp,
    autoSuggestSig,
    builderOpen,
    form.benefit,
    form.benefitEn,
    form.benefitEs,
    mixIngredientsForSuggest,
    selectedIngredientsForSuggest.length,
    t,
  ]);

  const benefitSuggestion = benefitSuggestions[benefitSuggestionIndex] ?? null;

  const showBenefitSuggestion = (index: number) => {
    if (index < 0 || index >= benefitSuggestions.length) return;
    setBenefitSuggestionIndex(index);
    setEditingSuggestion(false);
  };

  const acceptBenefitSuggestion = (en: string, es: string) => {
    setForm((f) => ({
      ...f,
      benefitEn: en,
      benefitEs: es,
      benefit: settings.language === 'es' ? es : en,
    }));
    setEditingSuggestion(false);
  };

  const startEditingSuggestion = () => {
    setSuggestionDraftEn(benefitSuggestion?.en ?? '');
    setSuggestionDraftEs(benefitSuggestion?.es ?? '');
    setEditingSuggestion(true);
  };

  const discardBenefitSuggestion = () => {
    setBenefitSuggestions((list) => {
      if (!list.length) return list;
      const next = list.filter((_, index) => index !== benefitSuggestionIndex);
      const nextIndex = Math.min(benefitSuggestionIndex, Math.max(0, next.length - 1));
      setBenefitSuggestionIndex(nextIndex);
      return next;
    });
    setEditingSuggestion(false);
  };

  const genCostId = () => `cc-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const handleAddCustomCost = async (
    item: { name: string; cost: number; unit?: string; materialId?: string },
    saveToLibrary?: boolean,
  ) => {
    let materialId = item.materialId;
    if (saveToLibrary && !materialId) {
      const created = await customMaterialsRepo.create({
        name: item.name,
        category: 'other',
        cost: item.cost,
        unit: item.unit,
        active: true,
      });
      materialId = created.id;
      setCustomMaterials(await customMaterialsRepo.active());
    }
    const newItem = { ...item, materialId, id: genCostId() };
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
    const draft: Pick<Recipe, 'ingredientIds' | 'ingredientAmounts' | 'ingredientUnits' | 'customCosts'> = {
      ingredientIds: form.ingredientIds,
      ingredientAmounts: Object.fromEntries(
        Object.entries(form.ingredientAmounts)
          .map(([k, v]) => [k, parseFloat(v)])
          .filter(([, v]) => !isNaN(v as number) && (v as number) > 0),
      ),
      ingredientUnits: form.ingredientUnits,
      customCosts: form.customCosts,
    };
    return calculateRecipeMaterialCogs(draft, ingredients);
  }, [ingredients, form.ingredientIds, form.ingredientAmounts, form.ingredientUnits, form.customCosts]);

  const checklist = useMemo(() => {
    const selected = ingredients.filter((i) => form.ingredientIds.includes(i.id));
    return {
      hasName: !!form.name.trim(),
      hasIngredients: selected.length > 0,
      hasSoapBase: selected.some((i) => i.category === 'base' || i.isSoapBase === true),
      hasBenefit: !!(form.benefit.trim() || form.benefitEn.trim() || form.benefitEs.trim()),
    };
  }, [form, ingredients]);

  const goToSection = (section: RecipeJumpSection) => {
    const ingredientsEl = ingredientsSectionRef.current
      ?? document.querySelector<HTMLElement>('[data-recipe-card-selected="true"]');
    const soapBaseEl = ingredientsSectionRef.current?.querySelector<HTMLElement>('[data-recipe-soap-base="true"]')
      ?? ingredientsEl;
    const el = section === 'name'
      ? nameSectionRef.current
      : section === 'benefit'
        ? benefitSectionRef.current
        : section === 'directions'
          ? directionsSectionRef.current
          : section === 'warnings'
            ? warningsSectionRef.current
            : section === 'netWeight'
              ? netWeightSectionRef.current
              : section === 'footer'
                ? footerSectionRef.current
                : section === 'base'
                  ? soapBaseEl
                  : ingredientsEl;
    if (el) {
      scrollRecipeSectionIntoView(el);
      if (section !== 'name') {
        const field = el.querySelector<HTMLElement>('input, textarea');
        if (field && document.activeElement !== field) {
          field.focus({ preventScroll: true });
        }
      }
    }
    setSectionHighlight(section);
    if (sectionHighlightTimer.current) clearTimeout(sectionHighlightTimer.current);
    sectionHighlightTimer.current = setTimeout(() => setSectionHighlight(null), 4000);
    if (section === 'name') nameInputRef.current?.focus({ preventScroll: true });
  };

  const handleNext = () => {
    if (!template) {
      setShowNeedShapeDialog(true);
      return;
    }

    if (!activeRecipeId) {
      useAppStore.getState().setWorkflowGap('recipe', true);
      goto('background');
      return;
    }

    const selected = ingredients.filter((i) => form.ingredientIds.includes(i.id));
    const isComplete = form.name.trim() && selected.length > 0;

    if (!isComplete) {
      setHighlightMissing(true);
      setShowIncompleteDialog(true);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightMissing(false), 3000);
      return;
    }

    useAppStore.getState().setWorkflowGap('recipeIncomplete', false);
    goto('background');
  };

  const workingRecipeId = editingId ?? activeRecipeId;
  const workingSaved = workingRecipeId
    ? recipes.find((row) => row.id === workingRecipeId) ?? null
    : null;
  const workingListIndex = workingSaved
    ? recipes.findIndex((row) => row.id === workingSaved.id)
    : recipes.length;
  const previewTone = recipeCardEarthTone(workingListIndex);
  const previewSurface = previewTone.bg;

  return (
    <div className="flex h-full flex-col overflow-hidden">
    <div className="flex-1 overflow-y-auto bg-gaia-50" data-recipes-scroll="">
      <div className="w-full px-6 py-8 lg:px-8">
        <div className="mt-2 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(18.4rem,min(31rem,32vw))_minmax(0,1fr)]">
          <div className="min-w-0 lg:sticky lg:top-6" data-tour="recipe-list">
            <div className="mb-4 flex items-center gap-2">
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full bg-gaia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md ring-1 ring-gaia-500/30 transition hover:bg-gaia-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gaia-400 focus-visible:ring-offset-2 group"
                onClick={newRecipe}
              >
                <Plus className="h-4 w-4 transition-transform group-hover:rotate-90" />
                {t('recipes.new')}
              </button>
              <button
                type="button"
                className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white shadow-md transition hover:bg-rose-700 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:ring-offset-2"
                title={t('recipes.trash', 'Trash')}
                aria-label={t('recipes.trash', 'Trash')}
                onClick={() => setTrashOpen(true)}
              >
                <Trash2 className="h-4 w-4" />
                {trashedRecipes.length > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-rose-700 ring-1 ring-rose-200">
                    {trashedRecipes.length}
                  </span>
                )}
              </button>
            </div>
            <div>
            {recipes.length === 0 ? (
              <div className="card text-center text-sm text-slate-500">{t('recipes.empty')}</div>
            ) : (
              <div className="space-y-2">
              {pagedRecipes.map((r, i) => (
                <RecipeRow
                  key={r.id}
                  recipe={r}
                  listIndex={recipePage * RECIPES_PER_PAGE + i}
                  isSelected={activeRecipeId === r.id}
                  isEditing={editingId === r.id}
                  ingredients={ingredients}
                  sectionHighlight={sectionHighlight}
                  dirty={!!dirtyById[r.id]}
                  onToggle={toggleRecipe}
                  onEdit={editRecipe}
                  onRemove={remove}
                />
              ))
              }
              </div>
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
            </div>
          </div>

          <div className="grid min-w-0 w-full grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)]">
            <div className="min-w-0 w-full">
            {!!(form.name.trim()
              || recipes.find((r) => r.id === editingId)?.name
              || recipes.find((r) => r.id === activeRecipeId)?.name) && (
              <h2 className="mb-4 text-center font-serif text-3xl italic tracking-wide text-gaia-800 sm:text-4xl">
                {form.name.trim()
                  || recipes.find((r) => r.id === editingId)?.name
                  || recipes.find((r) => r.id === activeRecipeId)?.name}
              </h2>
            )}
          <div ref={editorRef} className="card w-full min-w-0 scroll-mt-4 space-y-3">
              <div className="space-y-[2.5%]">
              <div className="grid grid-cols-1 gap-[2.5%] sm:grid-cols-2">
                <div
                  ref={nameSectionRef}
                  id="recipe-section-name"
                  className={`scroll-mt-4 rounded-xl ${sectionHighlight === 'name' ? 'ring-4 ring-gaia-600 ring-offset-2' : ''}`}
                >
                <div className={RECIPE_META_COL.wrap}>
                  <label className={`label text-[10px] ${RECIPE_META_COL.label}`}>{t('recipes.name')}</label>
                  <input
                    ref={nameInputRef}
                    className={`input ${RECIPE_META_COL.input} transition ${highlightMissing && !form.name.trim() ? 'border-red-500 bg-red-50 ring-red-300' : ''}`}
                    placeholder={t('recipes.namePlaceholder')}
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                </div>
                <div
                  ref={netWeightSectionRef}
                  id="recipe-section-net-weight"
                  className={`scroll-mt-4 rounded-xl ${sectionHighlight === 'netWeight' ? 'ring-4 ring-gaia-600 ring-offset-2' : ''}`}
                >
                <div className={RECIPE_META_COL.wrap}>
                  <label className={`label text-[10px] ${RECIPE_META_COL.label}`}>{t('recipes.netWeight')}</label>
                  <input
                    className={`input ${RECIPE_META_COL.input}`}
                    placeholder={t('recipes.netWeightPlaceholder')}
                    value={form.netWeight}
                    onChange={(e) => setForm({ ...form, netWeight: e.target.value })}
                  />
                  {parseNetWeight(form.netWeight) && (
                    <p className="mt-1 text-[11px] text-slate-400">
                      {t('recipes.netWeightDualHint', 'On the label: {{value}}', {
                        value: formatNetWeightAmount(form.netWeight),
                      })}
                    </p>
                  )}
                </div>
                </div>
              </div>
              <div
                ref={benefitSectionRef}
                id="recipe-section-benefit"
                className="scroll-mt-4"
              >
                {aiOnline ? (
                  <RecipeBenefitCopySection
                    benefit={form.benefit}
                    benefitEn={form.benefitEn}
                    benefitEs={form.benefitEs}
                    onBenefitEnChange={(value) => setForm({ ...form, benefitEn: value })}
                    onBenefitEsChange={(value) => setForm({ ...form, benefitEs: value })}
                    suggesting={suggestingBenefit}
                    hasIngredients={selectedIngredientsForSuggest.length > 0}
                    hasRecipe={!!activeRecipeId}
                    onSuggest={() => void handleSuggestBenefit()}
                    suggestTitle={
                      selectedIngredientsForSuggest.length === 0
                        ? t('recipes.benefitSuggestNeedsIngredients', 'Add ingredients first so there is something to suggest from.')
                        : benefitSuggestions.length > 0 || form.benefitEn.trim() || form.benefitEs.trim()
                          ? t('recipes.benefitSuggestAnotherTooltip', 'Draft another wording — earlier suggestions stay so you can compare.')
                          : t('recipes.benefitSuggestTooltip', 'Draft a benefit statement with local AI — you can edit or reject it.')
                    }
                  />
                ) : (
                  <>
                    <div className="mb-[calc(0.25rem*1.08)] flex items-center justify-between gap-2">
                      <label className="label mb-0">{t('recipes.benefit')}</label>
                      <span className="inline-flex shrink-0 items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500 ring-1 ring-slate-200">
                        {t('benefitPicker.offlineBenefitPrompt', 'Offline Benefit Prompt')}
                      </span>
                    </div>
                    {settings.localAiEnabled && (
                      <AiSuggestFlairButton
                        className="mb-3"
                        suggesting={suggestingBenefit}
                        disabled={!aiConnected || selectedIngredientsForSuggest.length === 0}
                        idleLabel={t('recipes.benefitSuggest', 'AI Suggest Benefit')}
                        busyLabel={t('recipes.benefitSuggesting', 'Drafting…')}
                        title={
                          !aiConnected
                            ? t('recipes.benefitSuggestOffline', 'Local AI is offline — the best mix below is filled from your ingredients, or check Settings.')
                            : selectedIngredientsForSuggest.length === 0
                              ? t('recipes.benefitSuggestNeedsIngredients', 'Add ingredients first so there is something to suggest from.')
                              : t('recipes.benefitSuggestTooltip', 'Draft a benefit statement with local AI — you can edit or reject it.')
                        }
                        onClick={() => void handleSuggestBenefit()}
                      />
                    )}
                    <BenefitPicker
                      value={form.benefit}
                      onChange={(val) => setForm({ ...form, benefit: val })}
                      aiOnline={aiOnline}
                      ingredientCategories={
                        ingredients
                          .filter((i) => form.ingredientIds.includes(i.id) && i.category)
                          .map((i) => i.category as IngredientCategory)
                      }
                      ingredients={mixIngredientsForSuggest}
                    />
                  </>
                )}
                {settings.localAiEnabled && !aiConnected && (
                  <p className="mt-1.5 text-[11px] text-slate-500">
                    {t('recipes.benefitManualOfflineHint', 'AI is offline — the best mix above is filled from your ingredients. You can edit the chips or check Settings for AI copy.')}
                  </p>
                )}
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
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gaia-600">
                        <Sparkles className="h-3 w-3" />
                        {t('recipes.benefitSuggestionLabel', 'AI suggestion')}
                      </p>
                      {benefitSuggestions.length > 1 && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1 text-gaia-700 hover:bg-gaia-100 disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() => showBenefitSuggestion(benefitSuggestionIndex - 1)}
                            disabled={benefitSuggestionIndex <= 0}
                            aria-label={t('recipes.benefitSuggestPrev', 'Previous suggestion')}
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </button>
                          <span className="min-w-[3.5rem] text-center text-[10px] font-semibold tabular-nums text-gaia-700">
                            {t('recipes.benefitSuggestionNav', '{{current}} of {{total}}', {
                              current: benefitSuggestionIndex + 1,
                              total: benefitSuggestions.length,
                            })}
                          </span>
                          <button
                            type="button"
                            className="rounded-md p-1 text-gaia-700 hover:bg-gaia-100 disabled:cursor-not-allowed disabled:opacity-30"
                            onClick={() => showBenefitSuggestion(benefitSuggestionIndex + 1)}
                            disabled={benefitSuggestionIndex >= benefitSuggestions.length - 1}
                            aria-label={t('recipes.benefitSuggestNext', 'Next suggestion')}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    {editingSuggestion ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <div className={BILINGUAL_COL.en.wrap}>
                            <AutoResizeTextarea
                              className={`input text-sm ${BILINGUAL_COL.en.input}`}
                              value={suggestionDraftEn}
                              onChange={(e) => setSuggestionDraftEn(e.target.value)}
                              placeholder={t('recipes.benefitEn', 'Benefit (English)')}
                              autoFocus
                            />
                          </div>
                          <div className={BILINGUAL_COL.es.wrap}>
                            <AutoResizeTextarea
                              className={`input text-sm ${BILINGUAL_COL.es.input}`}
                              value={suggestionDraftEs}
                              onChange={(e) => setSuggestionDraftEs(e.target.value)}
                              placeholder={t('recipes.benefitEs', 'Benefit (Español)')}
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="btn-primary py-1.5 text-xs"
                            onClick={() => acceptBenefitSuggestion(suggestionDraftEn.trim(), suggestionDraftEs.trim())}
                            disabled={!suggestionDraftEn.trim() && !suggestionDraftEs.trim()}
                          >
                            <Check className="h-3.5 w-3.5" /> {t('recipes.benefitSuggestUseEdited', 'Use Edited Text')}
                          </button>
                          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setEditingSuggestion(false)}>
                            {t('common.cancel')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="max-h-56 space-y-3 overflow-y-auto text-sm leading-relaxed text-slate-700">
                          {benefitSuggestion.en && (
                            <div className={BILINGUAL_COL.en.wrap}>
                              <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${BILINGUAL_COL.en.label}`}>EN</p>
                              <p className="whitespace-pre-wrap break-words italic">&ldquo;{benefitSuggestion.en}&rdquo;</p>
                            </div>
                          )}
                          {benefitSuggestion.es && (
                            <div className={BILINGUAL_COL.es.wrap}>
                              <p className={`mb-0.5 text-[10px] font-semibold uppercase tracking-wide ${BILINGUAL_COL.es.label}`}>ES</p>
                              <p className="whitespace-pre-wrap break-words italic">&ldquo;{benefitSuggestion.es}&rdquo;</p>
                            </div>
                          )}
                        </div>
                        {(benefitSuggestion.en.length > LABEL_BENEFIT_SOFT_LIMIT
                          || benefitSuggestion.es.length > LABEL_BENEFIT_SOFT_LIMIT) && (
                          <p className="text-[10px] text-amber-700">
                            {t('recipes.benefitSuggestLongHint', 'This is long for a label — edit or shorten before using.')}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="btn-primary py-1.5 text-xs"
                            onClick={() => acceptBenefitSuggestion(benefitSuggestion.en, benefitSuggestion.es)}
                            disabled={!benefitSuggestion.en && !benefitSuggestion.es}
                          >
                            <Check className="h-3.5 w-3.5" /> {t('recipes.benefitSuggestAccept', 'Use This')}
                          </button>
                          <button type="button" className="btn-secondary py-1.5 text-xs" onClick={startEditingSuggestion}>
                            {t('recipes.benefitSuggestEdit', 'Edit First')}
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
              <div
                ref={directionsSectionRef}
                id="recipe-section-directions"
                className={`scroll-mt-4 rounded-xl ${sectionHighlight === 'directions' ? 'ring-4 ring-gaia-600 ring-offset-2' : ''}`}
              >
              <div className="grid grid-cols-1 gap-[2.5%] sm:grid-cols-2">
                <div className={BILINGUAL_COL.en.wrap}>
                  <label className={`label text-[10px] ${BILINGUAL_COL.en.label}`}>{t('recipes.directionsEn', 'Directions (English)')}</label>
                  <AutoResizeTextarea
                    className={`input ${BILINGUAL_COL.en.input}`}
                    placeholder={t('recipes.directionsPlaceholder')}
                    value={form.directionsEn}
                    onChange={(e) => setForm({ ...form, directionsEn: e.target.value, directions: e.target.value })}
                  />
                </div>
                <div className={BILINGUAL_COL.es.wrap}>
                  <label className={`label text-[10px] ${BILINGUAL_COL.es.label}`}>{t('recipes.directionsEs', 'Directions (Español)')}</label>
                  <AutoResizeTextarea
                    className={`input ${BILINGUAL_COL.es.input}`}
                    placeholder={t('recipes.directionsPlaceholder')}
                    value={form.directionsEs}
                    onChange={(e) => setForm({ ...form, directionsEs: e.target.value })}
                  />
                </div>
              </div>
              </div>
              <div
                ref={warningsSectionRef}
                id="recipe-section-warnings"
                className={`scroll-mt-4 rounded-xl ${sectionHighlight === 'warnings' ? 'ring-4 ring-gaia-600 ring-offset-2' : ''}`}
              >
              <div className="grid grid-cols-1 gap-[2.5%] sm:grid-cols-2">
                <div className={BILINGUAL_COL.en.wrap}>
                  <label className={`label text-[10px] ${BILINGUAL_COL.en.label}`}>{t('recipes.warningsEn', 'Warnings (English)')}</label>
                  <AutoResizeTextarea
                    className={`input ${BILINGUAL_COL.en.input}`}
                    placeholder={t('recipes.warningsPlaceholder')}
                    value={form.warningsEn}
                    onChange={(e) => setForm({ ...form, warningsEn: e.target.value, warnings: e.target.value })}
                  />
                </div>
                <div className={BILINGUAL_COL.es.wrap}>
                  <label className={`label text-[10px] ${BILINGUAL_COL.es.label}`}>{t('recipes.warningsEs', 'Warnings (Español)')}</label>
                  <AutoResizeTextarea
                    className={`input ${BILINGUAL_COL.es.input}`}
                    placeholder={t('recipes.warningsPlaceholder')}
                    value={form.warningsEs}
                    onChange={(e) => setForm({ ...form, warningsEs: e.target.value })}
                  />
                </div>
              </div>
              </div>
              <div
                ref={footerSectionRef}
                id="recipe-section-footer"
                className={`scroll-mt-4 rounded-xl ${sectionHighlight === 'footer' ? 'ring-4 ring-gaia-600 ring-offset-2' : ''}`}
              >
                <label className="label">{t('recipes.footer')}</label>
                <input
                  className="input"
                  placeholder={t('recipes.footerPlaceholder')}
                  value={form.footer}
                  onChange={(e) => setForm({ ...form, footer: e.target.value })}
                />
              </div>
              </div>

            {!isTrainingModeActive(settings) && (
              <div
                ref={ingredientsSectionRef}
                id="recipe-section-ingredients"
                className={`scroll-mt-4 py-8 ${(sectionHighlight === 'ingredients' || sectionHighlight === 'base') ? 'rounded-xl ring-4 ring-gaia-600 ring-offset-2' : ''}`}
              >
                <IngredientPicker
                  ingredients={ingredients}
                  settings={settings}
                  selected={form.ingredientIds}
                  selectedAmounts={form.ingredientAmounts}
                  selectedUnits={form.ingredientUnits}
                  onToggle={toggleIngredient}
                  onAmountChange={setIngredientAmount}
                  onUnitChange={setIngredientUnit}
                  lockedId={defaultSoapBase?.id}
                  onGotoIngredients={() => goto('ingredients')}
                  onChooseIngredient={(ingredient) => {
                    setIngredients((current) => current.some((item) => item.id === ingredient.id)
                      ? current
                      : [...current, ingredient]);
                    setForm((current) => current.ingredientIds.includes(ingredient.id)
                      ? current
                      : { ...current, ingredientIds: [...current.ingredientIds, ingredient.id] });
                  }}
                  highlightMissing={highlightMissing}
                />
              </div>
            )}

            {!isTrainingModeActive(settings) && (
              <>
                {/* Revenue, profit, and collapsible cost breakdown */}
                <RevenueTrackerCard
                  materialCost={liveMaterialCogs}
                  retailPrice={form.retailPrice}
                  onRetailPriceChange={(val) => setForm((f) => ({ ...f, retailPrice: val }))}
                  barsPerBatch={form.barsPerBatch}
                  onBarsPerBatchChange={(val) => setForm((f) => ({ ...f, barsPerBatch: val }))}
                  laborMinutes={form.laborMinutes}
                  onLaborMinutesChange={(val) => setForm((f) => ({ ...f, laborMinutes: val }))}
                  baseLaborRate={settings.baseLaborRate ?? 20}
                  ingredients={ingredients}
                  selectedIds={form.ingredientIds}
                  amounts={form.ingredientAmounts}
                  units={form.ingredientUnits}
                  customCosts={form.customCosts}
                />

                {/* Custom Materials & Packaging */}
                <CustomMaterialsCard
                  customCosts={form.customCosts}
                  library={customMaterials}
                  onAdd={handleAddCustomCost}
                  onRemove={handleRemoveCustomCost}
                />
              </>
            )}

            {/* Full Recipe Preview */}
            <RecipePreview
              form={form}
              ingredients={ingredients}
              recipe={workingSaved}
              surfaceClass={previewSurface}
              surfaceStyle={{ borderColor: previewTone.strokeSelected }}
              onJump={goToSection}
            />

            <div className="flex flex-wrap items-center justify-end gap-3">
              <button className="btn-primary" onClick={save} disabled={!form.name.trim()}>
                <Check className="h-4 w-4" /> {t('common.save')}
              </button>
              {editingId && baselinesRef.current[editingId] && !formsEqual(form, baselinesRef.current[editingId]) && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={revertToDefault}
                >
                  {t('recipes.revertToDefault', 'Revert To Default')}
                </button>
              )}
              {savedToast && (
                <span className="flex items-center gap-1 text-sm font-medium text-emerald-600">
                  <Check className="h-4 w-4" /> {t('recipes.saved', 'Recipe saved!')}
                </span>
              )}
            </div>
          </div>
          </div>

          <aside className="min-w-0 w-full self-start lg:sticky lg:top-4">
            <div className="card w-full border-[8px] border-gaia-100 ring-0">
              <p className="label mb-[4%] text-center">{t('recipes.checklist')}</p>
              <ul className="mx-auto w-fit space-y-2 text-left text-sm">
                <ChecklistRow
                  icon={Type}
                  ok={checklist.hasName}
                  label={t('recipes.hasName')}
                  missingText={t('recipes.missingName', 'Add a name so this recipe can be saved.')}
                  onGoTo={() => goToSection('name')}
                />
                <ChecklistRow
                  icon={Leaf}
                  ok={checklist.hasIngredients}
                  label={t('recipes.hasIngredients')}
                  missingText={t('recipes.missingIngredients', 'Add at least one ingredient.')}
                  onGoTo={() => goToSection('ingredients')}
                />
                <ChecklistRow
                  icon={Droplets}
                  ok={checklist.hasSoapBase}
                  warn={!checklist.hasSoapBase && checklist.hasIngredients}
                  missingText={t('recipes.soapBaseWarning', 'No soap base ingredient found — add one so this recipe is complete.')}
                  label={t('recipes.hasSoapBase')}
                  onGoTo={() => goToSection('base')}
                />
                <ChecklistRow
                  icon={Heart}
                  ok={checklist.hasBenefit}
                  label={t('recipes.hasBenefit')}
                  missingText={t('recipes.missingBenefit', 'Add a benefit so the buyer has a reason to buy.')}
                  onGoTo={() => goToSection('benefit')}
                />
              </ul>
            </div>
          </aside>
          </div>
        </div>
      </div>
    </div>

      <WorkflowNav
        prevScreen="template"
        prevLabel={t('workflow.backToShape', 'Back: Choose Shape')}
        nextLabel={t('workflow.nextBackground', 'Step 3: Choose Background')}
        canProceed={!!activeRecipeId}
        hint={t('workflow.hintSelectRecipe')}
        missingDetail={t('workflow.hintSelectRecipeBody', 'Without a recipe, the label won’t include ingredients, benefits, or a product name from your formula.')}
        onOverride={() => useAppStore.getState().setWorkflowGap('recipe', true)}
        onNext={handleNext}
      />

      <RecipeBuilderModal
        open={builderOpen}
        recipe={builderRecipe}
        ingredients={ingredients}
        defaultSoapBase={defaultSoapBase}
        settings={settings}
        onClose={() => {
          setBuilderOpen(false);
          setBuilderRecipe(null);
        }}
        onCreated={handleBuilderCreated}
      />

      <Modal
        open={showNeedShapeDialog}
        onClose={() => setShowNeedShapeDialog(false)}
        width={420}
        title={
          <span className="flex items-center gap-2.5">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${WORKFLOW_STEP_ICONS[1].chip}`}
              aria-hidden="true"
            >
              <Layers className="h-4 w-4" />
            </span>
            {`${t('common.step', 'Step')} 1: ${t('trainingMode.blockTitleTemplate', 'Choose a Shape & Size')}`}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setShowNeedShapeDialog(false)}>
              {t('recipes.goBack', 'Go Back')}
            </button>
            <button
              className="btn-primary"
              onClick={() => { setShowNeedShapeDialog(false); goto('template'); }}
            >
              {t('workflow.goToShape', 'Choose Shape')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {t('workflow.needShapeBody', 'Pick a shape and size before choosing a background.')}
        </p>
      </Modal>

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
              onClick={() => {
                setShowIncompleteDialog(false);
                useAppStore.getState().setWorkflowGap('recipeIncomplete', true);
                goto('background');
              }}
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
            <Trash2 className="h-5 w-5 shrink-0" />
            {t('recipes.moveToTrash', 'Move To Trash?')}
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
              {t('recipes.moveToTrashAction', 'Move To Trash')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {t('recipes.moveToTrashBody', 'This recipe will move to Trash. You can restore it later.')}
        </p>
      </Modal>

      <Modal
        open={trashOpen}
        onClose={() => setTrashOpen(false)}
        width={480}
        centerTitle
        title={
          <span className="flex items-center justify-center gap-2">
            <Trash2 className="h-4 w-4 text-slate-500" />
            {t('recipes.trashTitle', 'Deleted Recipes')}
          </span>
        }
      >
        {trashedRecipes.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">{t('recipes.trashEmpty', 'No deleted recipes.')}</p>
        ) : (
          <ul className="space-y-2">
            {trashedRecipes.map((recipe) => (
              <li key={recipe.id} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <RecipeCardHeroIcon
                  ingredients={recipe.ingredientIds
                    .map((id) => ingredients.find((ingredient) => ingredient.id === id))
                    .filter((ingredient): ingredient is Ingredient => !!ingredient)}
                />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-800">{recipe.name}</span>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-gaia-700 hover:bg-white"
                  onClick={() => void restoreRecipe(recipe.id)}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {t('recipes.restore', 'Restore')}
                </button>
                <button
                  type="button"
                  className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-rose-600"
                  title={t('recipes.deleteForever', 'Delete Forever')}
                  aria-label={t('recipes.deleteForever', 'Delete Forever')}
                  onClick={() => setConfirmPurgeId(recipe.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </Modal>

      <Modal
        open={confirmPurgeId !== null}
        onClose={() => setConfirmPurgeId(null)}
        width={360}
        title={
          <span className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {t('recipes.purgeTitle', 'Delete forever?')}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmPurgeId(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              onClick={() => { if (confirmPurgeId) void purgeRecipe(confirmPurgeId); }}
            >
              {t('recipes.deleteForever', 'Delete Forever')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">
          {t('recipes.purgeBody', 'This permanently deletes "{{name}}". This cannot be undone.', {
            name: trashedRecipes.find((recipe) => recipe.id === confirmPurgeId)?.name ?? '',
          })}
        </p>
      </Modal>
    </div>
  );
}

const PREVIEW_JUMP_CLASS =
  'w-full cursor-pointer rounded-lg px-1 py-0.5 text-center transition hover:ring-2 hover:ring-gaia-400/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500';

function BilingualPreviewSection({
  titleEn,
  titleEs,
  en,
  es,
  titleClassName = 'text-black',
  bodyClassName,
  onJump,
  jumpLabel,
}: {
  titleEn: string;
  titleEs: string;
  en: string;
  es: string;
  titleClassName?: string;
  bodyClassName?: string;
  onJump?: () => void;
  jumpLabel?: string;
}) {
  const body = (
    <>
      <p className={`mb-1 text-center ui-label font-bold uppercase tracking-widest ${titleClassName}`}>
        {titleEn} · {titleEs}
      </p>
      <div className="grid grid-cols-2 items-start gap-x-6">
        <p className={`min-w-0 text-center text-[13.2px] leading-relaxed ${BILINGUAL_COL.en.preview} ${bodyClassName ?? ''}`}>
          {en}
        </p>
        <p className={`min-w-0 text-center text-[13.2px] leading-relaxed ${BILINGUAL_COL.es.preview} ${bodyClassName ?? ''}`}>
          {es}
        </p>
      </div>
    </>
  );

  if (onJump) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onJump();
        }}
        aria-label={jumpLabel}
        className={PREVIEW_JUMP_CLASS}
      >
        {body}
      </button>
    );
  }

  return <div className="w-full">{body}</div>;
}

// ---------------------------------------------------------------------------
// Full recipe preview
// ---------------------------------------------------------------------------
function RecipePreview({
  form,
  ingredients,
  recipe,
  surfaceClass = 'border-slate-100 bg-gaia-100',
  surfaceStyle,
  onJump,
}: {
  form: RecipeForm;
  ingredients: Ingredient[];
  recipe?: Recipe | null;
  surfaceClass?: string;
  surfaceStyle?: CSSProperties;
  onJump?: (section: RecipeJumpSection) => void;
}) {
  const { t, i18n } = useTranslation();
  const enT = i18n.getFixedT('en');
  const esT = i18n.getFixedT('es');

  const name = form.name.trim() || recipe?.name?.trim() || '';
  const benefitEn = form.benefitEn.trim() || recipe?.benefitEn?.trim() || '';
  const benefitEs = form.benefitEs.trim() || recipe?.benefitEs?.trim() || '';
  const benefit = form.benefit.trim() || recipe?.benefit?.trim() || '';
  const ingredientIds = form.ingredientIds.length > 0 ? form.ingredientIds : (recipe?.ingredientIds ?? []);
  const directionsPair = {
    en: form.directionsEn.trim() || bilingualRecipeDirections(form.directions.trim() || recipe?.directions).en,
    es: form.directionsEs.trim() || bilingualRecipeDirections(form.directions.trim() || recipe?.directions).es,
  };
  const warningsPair = {
    en: form.warningsEn.trim() || bilingualRecipeWarnings(form.warnings.trim() || recipe?.warnings).en,
    es: form.warningsEs.trim() || bilingualRecipeWarnings(form.warnings.trim() || recipe?.warnings).es,
  };
  const netWeight = form.netWeight.trim() || recipe?.netWeight?.trim() || '';
  const footer = form.footer.trim() || recipe?.footer?.trim() || '';

  const selected = useMemo(
    () => ingredientIds
      .map((id) => ingredients.find((item) => item.id === id))
      .filter((item): item is Ingredient => !!item),
    [ingredientIds, ingredients],
  );

  const ingredientEn = selected
    .map((item) => getIngredientBilingualNames(item).en)
    .filter(Boolean)
    .join(', ');
  const ingredientEs = selected
    .map((item) => getIngredientBilingualNames(item).es)
    .filter(Boolean)
    .join(', ');

  const hasBenefits = !!(benefitEn || benefitEs || benefit);
  const hasDirections = !!(directionsPair.en || directionsPair.es);
  const hasWarnings = !!(warningsPair.en || warningsPair.es);
  const hasContent = name || ingredientEn || ingredientEs || hasBenefits || hasDirections || hasWarnings || netWeight || footer;

  return (
    <div className="card">
      <div className="flex w-full items-center justify-center gap-2">
        <Eye className="h-4 w-4 shrink-0 text-gaia-600" />
        <p className="label mb-0 text-center">{t('recipes.preview', 'Information Preview')}</p>
      </div>

      <div className={`mt-[calc(0.75rem*1.08)] rounded-xl border p-4 text-center ${surfaceClass}`} style={surfaceStyle}>
          {!hasContent ? (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-center text-xs text-amber-700 ring-1 ring-amber-200">
              <Info className="h-3.5 w-3.5 shrink-0" />
              {t('recipes.previewEmpty', 'Fill in the recipe fields above to see a preview.')}
            </div>
          ) : (
            <div className="mx-auto w-full max-w-2xl space-y-4 text-center font-serif text-slate-800">
              {name && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onJump?.('name');
                  }}
                  aria-label={t('recipes.previewJumpName', 'Edit recipe name')}
                  className={PREVIEW_JUMP_CLASS}
                >
                  <p className="text-[1.35rem] font-bold leading-tight tracking-wide">
                    {name}
                  </p>
                </button>
              )}

              {hasBenefits && (
                <BilingualPreviewSection
                  titleEn="Benefit"
                  titleEs="Beneficio"
                  en={benefitEn || benefit}
                  es={benefitEs || benefit}
                  bodyClassName="italic text-slate-500"
                  onJump={() => onJump?.('benefit')}
                  jumpLabel={t('recipes.previewJumpBenefit', 'Edit benefit')}
                />
              )}

              <BilingualPreviewSection
                titleEn={enT('recipes.previewIngredients')}
                titleEs={esT('recipes.previewIngredients')}
                en={ingredientEn ? `${ingredientEn}.` : enT('recipes.previewIngredientsEmpty')}
                es={ingredientEs ? `${ingredientEs}.` : esT('recipes.previewIngredientsEmpty')}
                onJump={() => onJump?.('ingredients')}
                jumpLabel={t('recipes.previewJumpIngredients', 'Edit ingredients')}
              />

              {hasDirections && (
                <BilingualPreviewSection
                  titleEn={enT('recipes.previewDirections')}
                  titleEs={esT('recipes.previewDirections')}
                  en={directionsPair.en}
                  es={directionsPair.es}
                  bodyClassName="whitespace-pre-wrap"
                  onJump={() => onJump?.('directions')}
                  jumpLabel={t('recipes.previewJumpDirections', 'Edit directions')}
                />
              )}

              {hasWarnings && (
                <BilingualPreviewSection
                  titleEn={enT('recipes.previewWarnings')}
                  titleEs={esT('recipes.previewWarnings')}
                  en={warningsPair.en}
                  es={warningsPair.es}
                  titleClassName="text-amber-600"
                  bodyClassName="whitespace-pre-wrap"
                  onJump={() => onJump?.('warnings')}
                  jumpLabel={t('recipes.previewJumpWarnings', 'Edit warning')}
                />
              )}

              <div className="space-y-1 border-t border-slate-200 pt-2 text-center">
                {netWeight && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onJump?.('netWeight');
                    }}
                    aria-label={t('recipes.previewJumpNetWeight', 'Edit net weight')}
                    className={PREVIEW_JUMP_CLASS}
                  >
                    <p className="text-xs text-slate-500">
                      {formatNetWeightLine(netWeight, t('recipes.previewNetWt', 'Net Wt'))}
                    </p>
                  </button>
                )}
                {footer && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onJump?.('footer');
                    }}
                    aria-label={t('recipes.previewJumpFooter', 'Edit contact footer')}
                    className={PREVIEW_JUMP_CLASS}
                  >
                    <p className="text-xs text-slate-400">{footer}</p>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ingredient picker — the recipe card lists only what's in the recipe; adding
// happens in a searchable modal so the 670-item catalog never floods the form.
// ---------------------------------------------------------------------------
function IngredientPicker({
  ingredients,
  settings,
  selected,
  selectedAmounts,
  selectedUnits,
  onToggle,
  onAmountChange,
  onUnitChange,
  onGotoIngredients,
  onChooseIngredient,
  highlightMissing,
  lockedId,
}: {
  ingredients: Ingredient[];
  settings: AppSettings;
  selected: string[];
  selectedAmounts: Record<string, string>;
  selectedUnits: Record<string, RecipeAmountUnit>;
  onToggle: (id: string) => void;
  onAmountChange: (id: string, amount: string) => void;
  onUnitChange: (id: string, unit: RecipeAmountUnit) => void;
  onGotoIngredients: () => void;
  onChooseIngredient: (ingredient: Ingredient) => void;
  highlightMissing?: boolean;
  lockedId?: string;
}) {
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const trainingMode = isTrainingModeActive(settings);

  const chosen = useMemo(() => {
    const byId = new Map(ingredients.map((i) => [i.id, i]));
    return selected
      .map((id) => byId.get(id))
      .filter((i): i is Ingredient => !!i);
  }, [ingredients, selected]);

  return (
    <div className={`card space-y-3 transition${highlightMissing && selected.length === 0 ? ' ring-2 ring-red-400' : ''}`}>
      <div className="flex items-center justify-between">
        <p className="label mb-0">{t('recipes.ingredients')}</p>
        {!trainingMode && (
          <button className="text-xs text-gaia-700 hover:underline" onClick={onGotoIngredients}>
            {t('recipes.manageIngredients')}
          </button>
        )}
      </div>

      {highlightMissing && selected.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700 ring-1 ring-red-200">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t('recipes.errorNoIngredients', 'Add at least one ingredient')}
        </div>
      )}

      {chosen.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 py-6 text-center text-xs text-slate-400">
          {t('recipes.noIngredientsYet', 'No ingredients in this recipe yet.')}
        </div>
      ) : (
        <ul className="space-y-1">
          {chosen.map((i) => {
            return (
              <li
                key={i.id}
                data-recipe-soap-base={i.isSoapBase || i.category === 'base' ? 'true' : undefined}
                className="flex items-center gap-2 rounded-lg bg-gaia-50/70 px-2 py-1.5 text-sm ring-1 ring-gaia-100"
              >
                <IngredientIcon category={i.category} name={i.name} size="sm" />
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="truncate text-slate-700">{getIngredientDisplayName(i.name, t)}</span>
                  {lockedId && i.id === lockedId && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gaia-700">
                      {t('recipes.defaultBaseLocked', 'Always included')}
                    </span>
                  )}
                  {i.isSoapBase && !(lockedId && i.id === lockedId) && (
                    <span className="chip shrink-0 bg-gaia-100 text-gaia-700">{t('ingredients.soapBaseTag')}</span>
                  )}
                </span>
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  className="w-16 shrink-0 rounded-lg border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700 focus:border-gaia-400 focus:outline-none"
                  placeholder="0"
                  value={selectedAmounts[i.id] ?? ''}
                  onChange={(e) => onAmountChange(i.id, e.target.value)}
                />
                <RecipeAmountUnitSelect
                  value={resolveRecipeAmountUnit(i, selectedUnits[i.id])}
                  onChange={(nextUnit) => onUnitChange(i.id, nextUnit)}
                />
                {lockedId && i.id === lockedId ? (
                  <span className="inline-flex h-7 w-7 shrink-0" aria-hidden />
                ) : (
                  <button
                    type="button"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-300 transition hover:bg-white hover:text-rose-500"
                    onClick={() => onToggle(i.id)}
                    aria-label={t('common.remove', 'Remove')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className="flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gaia-200 py-2.5 text-xs font-semibold text-gaia-700 transition hover:border-gaia-400 hover:bg-gaia-50"
        onClick={() => setPickerOpen(true)}
      >
        <Plus className="h-3.5 w-3.5" />
        {t('recipes.addIngredients', 'Add Ingredients')}
      </button>

      {selected.length > 0 && (
        <p className="text-[10px] text-slate-400">
          {t('recipes.amountsHint', 'Enter amounts next to each ingredient. Oils start in drops; change the unit if you measure another way.')}
        </p>
      )}

      <IngredientPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        ingredients={ingredients}
        settings={settings}
        selected={selected}
        onToggle={onToggle}
        onChooseIngredient={onChooseIngredient}
        onGotoIngredients={onGotoIngredients}
      />
    </div>
  );
}

const PICKER_PAGE_SIZE = 12;

/** Search-first ingredient chooser: your active shortlist by default, catalog on demand. */
function IngredientPickerModal({
  open,
  onClose,
  ingredients,
  settings,
  selected,
  onToggle,
  onChooseIngredient,
  onGotoIngredients,
}: {
  open: boolean;
  onClose: () => void;
  ingredients: Ingredient[];
  settings: AppSettings;
  selected: string[];
  onToggle: (id: string) => void;
  onChooseIngredient: (ingredient: Ingredient) => void;
  onGotoIngredients: () => void;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<'active' | 'all'>('active');
  const [cat, setCat] = useState<'all' | IngredientCategory>('all');
  const [page, setPage] = useState(0);

  const activeCount = useMemo(() => ingredients.filter((i) => i.active === true).length, [ingredients]);

  // Nothing activated yet — searching only the shortlist would show an empty list.
  useEffect(() => {
    if (open && activeCount === 0) setScope('all');
  }, [open, activeCount]);

  useEffect(() => { setPage(0); }, [query, scope, cat]);

  const scoped = useMemo(
    () => (scope === 'active' ? ingredients.filter((i) => i.active === true) : ingredients),
    [ingredients, scope],
  );

  const categories = useMemo(() => {
    const counts = new Map<IngredientCategory, number>();
    for (const i of scoped) {
      const key = (i.category ?? 'other') as IngredientCategory;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [scoped]);

  const results = useMemo(() => {
    const q = query.trim();
    const byCat = cat === 'all' ? scoped : scoped.filter((i) => (i.category ?? 'other') === cat);
    const matched = q ? byCat.filter((i) => ingredientMatchesQuery(i, q)) : byCat;
    if (q) return rankByQuery(matched, q);
    return [...matched].sort((a, b) =>
      getIngredientDisplayName(a.name, t).localeCompare(getIngredientDisplayName(b.name, t)),
    );
  }, [scoped, cat, query, t]);

  const pageCount = Math.max(1, Math.ceil(results.length / PICKER_PAGE_SIZE));
  const paged = results.slice(page * PICKER_PAGE_SIZE, page * PICKER_PAGE_SIZE + PICKER_PAGE_SIZE);

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={520}
      title={
        <span className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-gaia-600" />
          {t('recipes.addIngredients', 'Add Ingredients')}
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          {isTrainingModeActive(settings) ? (
            <span />
          ) : (
            <button className="text-xs text-gaia-700 hover:underline" onClick={onGotoIngredients}>
              {t('recipes.manageIngredients')}
            </button>
          )}
          <button className="btn-primary" onClick={onClose}>
            {t('recipes.doneAdding', 'Done')} ({selected.length})
          </button>
        </div>
      }
    >
      <div className="space-y-3">
        <IngredientAutocomplete
          ingredients={ingredients}
          settings={settings}
          selectedIds={selected}
          onChoose={onChooseIngredient}
          onUnchoose={(ingredient) => onToggle(ingredient.id)}
          onLibraryChanged={() => {}}
        />
        <div className="flex items-center gap-2 py-1">
          <span className="h-px flex-1 bg-slate-100" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            {t('recipes.browseLocalLibrary', 'Browse Local Library')}
          </span>
          <span className="h-px flex-1 bg-slate-100" />
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            autoFocus
            className="input pl-9"
            placeholder={t('recipes.searchIngredients', 'Search ingredients…')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-medium">
          <button
            className={`flex-1 rounded-lg px-3 py-1.5 transition ${scope === 'active' ? 'bg-white text-gaia-700 shadow-sm' : 'text-slate-500'}`}
            onClick={() => setScope('active')}
          >
            {t('recipes.scopeMine', 'My Ingredients')} ({activeCount})
          </button>
          <button
            className={`flex-1 rounded-lg px-3 py-1.5 transition ${scope === 'all' ? 'bg-white text-gaia-700 shadow-sm' : 'text-slate-500'}`}
            onClick={() => setScope('all')}
          >
            {t('recipes.scopeAll', 'Full Library')} ({ingredients.length})
          </button>
        </div>

        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1">
            <button
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                cat === 'all' ? 'bg-gaia-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-gaia-50'
              }`}
              onClick={() => setCat('all')}
            >
              {t('ingredients.categoryAll', 'All')}
            </button>
            {categories.map(([key, count]) => (
              <button
                key={key}
                className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium transition ${
                  cat === key ? 'bg-gaia-600 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-gaia-50'
                }`}
                onClick={() => setCat(key)}
              >
                {getCategoryLabel(key, t)}
                <span className={`rounded-full px-1 text-[9px] font-bold ${cat === key ? 'bg-white/20' : 'bg-slate-100'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        <ul className="min-h-[18rem] space-y-1">
          {paged.length === 0 ? (
            <li className="rounded-xl bg-slate-50 py-10 text-center text-sm text-slate-400">
              {t('ingredients.noResults', 'No ingredients match your search.')}
            </li>
          ) : (
            paged.map((i) => {
              const isSelected = selected.includes(i.id);
              return (
                <li key={i.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(i.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm transition ${
                      isSelected
                        ? 'bg-gaia-50 ring-1 ring-gaia-300'
                        : 'ring-1 ring-slate-100 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                        isSelected ? 'border-gaia-600 bg-gaia-600 text-white' : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <IngredientIcon category={i.category} name={i.name} size="sm" />
                    <span className="min-w-0 flex-1">
                      <BilingualIngredientName
                        name={i.name}
                        inci={i.inci}
                        nameEs={i.nameEs}
                        aliases={i.aliases}
                        subtitle={i.benefit ? (
                          <span className="mt-0.5 block truncate text-[11px] text-slate-400">{i.benefit}</span>
                        ) : undefined}
                      />
                    </span>
                    {i.isSoapBase && (
                      <span className="chip shrink-0 bg-gaia-100 text-gaia-700">{t('ingredients.soapBaseTag')}</span>
                    )}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {pageCount > 1 && (
          <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
            <button
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              {t('common.previous', 'Previous')}
            </button>
            <span className="text-[11px]">
              {t('recipes.pageOf', 'Page {{page}} of {{total}}', { page: page + 1, total: pageCount })}
            </span>
            <button
              className="flex items-center gap-1 rounded-lg px-2 py-1 font-medium transition hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent"
              disabled={page >= pageCount - 1}
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            >
              {t('common.next', 'Next')}
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}

function ChecklistRow({
  icon: Icon,
  ok,
  label,
  warn,
  missingText,
  onGoTo,
}: {
  icon: LucideIcon;
  ok: boolean;
  label: string;
  warn?: boolean;
  missingText?: string;
  onGoTo?: () => void;
}) {
  const iconColor = ok
    ? 'text-gaia-600'
    : warn
      ? 'text-amber-500'
      : 'text-slate-400';
  return (
    <li>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          onGoTo?.();
        }}
        className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-1 py-0.5 text-left no-underline transition hover:bg-gaia-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gaia-400"
      >
        <span
          aria-hidden="true"
          data-checked={ok ? 'true' : 'false'}
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-[5px] ${
            ok
              ? 'bg-gaia-500'
              : warn
                ? 'border-2 border-amber-400 bg-white'
                : 'border-2 border-slate-400 bg-white'
          }`}
        >
          {ok && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
        </span>
        <Icon aria-hidden="true" className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} />
        <span className={ok ? 'text-slate-700' : 'text-slate-600'}>
          {label}
          {!ok && missingText && (
            <span className={`mt-0.5 block text-xs no-underline ${warn ? 'text-amber-600' : 'text-slate-500'}`}>
              {missingText}
            </span>
          )}
        </span>
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Custom Materials & Packaging card
// ---------------------------------------------------------------------------
function CustomMaterialsCard({
  customCosts,
  library,
  onAdd,
  onRemove,
}: {
  customCosts: Array<{ id: string; name: string; cost: number; unit?: string; materialId?: string }>;
  library: CustomMaterial[];
  onAdd: (
    item: { name: string; cost: number; unit?: string; materialId?: string },
    saveToLibrary?: boolean,
  ) => void;
  onRemove: (id: string) => void;
}) {
  const { t } = useTranslation();
  const [newName, setNewName] = useState('');
  const [newCost, setNewCost] = useState('');
  const [newUnit, setNewUnit] = useState('');
  const [saveToLibrary, setSaveToLibrary] = useState(false);

  const usedMaterialIds = useMemo(
    () => new Set(customCosts.map((c) => c.materialId).filter(Boolean)),
    [customCosts],
  );
  const availableLibraryItems = useMemo(
    () => library.filter((m) => !usedMaterialIds.has(m.id)),
    [library, usedMaterialIds],
  );

  const handlePickFromLibrary = (material: CustomMaterial) => {
    onAdd({ name: material.name, cost: material.cost, unit: material.unit, materialId: material.id });
  };

  const handleAdd = () => {
    const cost = parseFloat(newCost);
    if (!newName.trim() || isNaN(cost) || cost < 0) return;
    onAdd({ name: newName.trim(), cost, unit: newUnit.trim() || undefined }, saveToLibrary);
    setNewName('');
    setNewCost('');
    setNewUnit('');
    setSaveToLibrary(false);
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

      {availableLibraryItems.length > 0 && (
        <div>
          <p className="mb-1.5 text-[11px] font-medium text-slate-500">
            {t('materials.chooseFromLibrary', 'Add From Your Library')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {availableLibraryItems.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => handlePickFromLibrary(m)}
                className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700 transition hover:border-violet-400 hover:bg-violet-100"
              >
                {m.name} · ${m.cost.toFixed(2)}
              </button>
            ))}
          </div>
        </div>
      )}

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
                aria-label={t('common.remove')}
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
            placeholder={t('recipes.costPlaceholder', '0.35')}
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
            placeholder={t('recipes.perBar', 'per bar')}
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

      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          className="h-3.5 w-3.5 accent-violet-600"
          checked={saveToLibrary}
          onChange={(e) => setSaveToLibrary(e.target.checked)}
        />
        {t('materials.saveToLibrary', 'Save To Library For Next Time')}
      </label>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Revenue & Profit — total cost, retail price, margin, optional breakdown
// ---------------------------------------------------------------------------
function RevenueTrackerCard({
  materialCost,
  retailPrice,
  onRetailPriceChange,
  ingredients,
  selectedIds,
  amounts,
  units,
  customCosts,
  barsPerBatch,
  onBarsPerBatchChange,
  laborMinutes,
  onLaborMinutesChange,
  baseLaborRate,
}: {
  materialCost: number;
  retailPrice: string;
  onRetailPriceChange: (val: string) => void;
  ingredients: Ingredient[];
  selectedIds: string[];
  amounts: Record<string, string>;
  units: Record<string, RecipeAmountUnit>;
  customCosts: Array<{ id: string; name: string; cost: number; unit?: string }>;
  barsPerBatch: string;
  onBarsPerBatchChange: (val: string) => void;
  laborMinutes: string;
  onLaborMinutesChange: (val: string) => void;
  baseLaborRate: number;
}) {
  const { t } = useTranslation();
  const [breakdownOpen, setBreakdownOpen] = useState(false);

  const draftRecipe = useMemo(() => ({
    ingredientIds: selectedIds,
    ingredientAmounts: Object.fromEntries(
      Object.entries(amounts)
        .map(([k, v]) => [k, parseFloat(v)])
        .filter(([, v]) => !isNaN(v as number) && (v as number) > 0),
    ),
    ingredientUnits: units,
    customCosts,
    barsPerBatch: (() => {
      const n = parseFloat(barsPerBatch);
      return !isNaN(n) && n > 0 ? n : undefined;
    })(),
    laborMinutes: (() => {
      const n = parseFloat(laborMinutes);
      return !isNaN(n) && n >= 0 ? n : undefined;
    })(),
  }), [selectedIds, amounts, units, customCosts, barsPerBatch, laborMinutes]);

  const unitCogs = useMemo(
    () => calculateRecipeUnitCogs(draftRecipe, ingredients, baseLaborRate),
    [draftRecipe, ingredients, baseLaborRate],
  );

  const retail = parseFloat(retailPrice);
  const hasRetail = !isNaN(retail) && retail > 0;
  const grossProfit = hasRetail ? retail - unitCogs : undefined;
  const margin = hasRetail ? calculateProfitMargin(retail, unitCogs) : undefined;
  const health = marginHealth(margin);

  interface LineItem {
    name: string;
    category: Ingredient['category'];
    amount: number;
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
      const unit = resolveRecipeAmountUnit(ing, units[id]);
      result.push({
        name: ing.name,
        category: ing.category,
        amount: amt,
        lineCost: recipeLineAmountInBaseUnits(amt, ing, unit) * ing.fractionalCost,
        unit: recipeAmountUnitLabel(unit, t),
      });
    }
    return result;
  }, [ingredients, selectedIds, amounts, units, t]);

  const hasBreakdown = lines.length > 0 || customCosts.length > 0;
  const selectedWithPricing = useMemo(
    () => selectedIds.filter((id) => ingredients.find((i) => i.id === id)?.fractionalCost !== undefined),
    [selectedIds, ingredients],
  );
  const hasMissingPricing = selectedIds.length > 0 && selectedWithPricing.length < selectedIds.length;

  return (
    <div className="card space-y-3">
      <div className="flex items-center gap-2">
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

      {/* Bars per batch — powers Work Order stock deduction (amounts ÷ this × qty sold) */}
      <div className="flex flex-wrap items-center gap-2">
        <label className="label mb-0 text-[11px]">{t('recipes.barsPerBatch', 'Bars per batch')}</label>
        <input
          type="number"
          min={1}
          step={1}
          className="input w-24"
          placeholder="1"
          value={barsPerBatch}
          onChange={(e) => onBarsPerBatchChange(e.target.value)}
        />
        <span className="text-[11px] text-slate-400">
          {t('recipes.barsPerBatchHint', 'How many bars the ingredient amounts above make. Orders deduct amounts ÷ this per bar sold.')}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="label mb-0 text-[11px]">{t('recipes.laborMinutes', 'Time to produce batch (minutes)')}</label>
        <input
          type="number"
          min={0}
          step={1}
          className="input w-24"
          placeholder="0"
          value={laborMinutes}
          onChange={(e) => onLaborMinutesChange(e.target.value)}
        />
        <span className="text-[11px] text-slate-400">
          {t('recipes.laborMinutesHint', 'Labor COGS uses your hourly rate from Settings ÷ batch yield.')}
        </span>
      </div>

      {unitCogs > 0 && (
        <p className="text-xs text-slate-500">
          {t('recipes.unitCogs', 'COGS per bar (materials + labor)')}: <span className="font-semibold">${unitCogs.toFixed(2)}</span>
        </p>
      )}

      {hasRetail && grossProfit !== undefined && margin !== undefined && (
        <div className="grid grid-cols-2 gap-3">
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
        <p className="text-xs text-slate-400">
          {t('recipes.retailHint', 'Enter a retail price to see profit and margin.')}
        </p>
      )}

      {!hasBreakdown && selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-xs text-amber-700 ring-1 ring-amber-200">
          <Info className="h-3.5 w-3.5 shrink-0" />
          {t('recipes.liveCostHint', 'Add ingredient amounts above and set purchase prices in Inventory to see live costs.')}
        </div>
      )}

      {hasMissingPricing && (
        <p className="flex items-center gap-1.5 text-[11px] text-amber-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {t('recipes.missingPricing', 'Some ingredients are missing purchase prices. Set them in the Inventory screen.')}
        </p>
      )}

      {hasBreakdown && (
        <div className="border-t border-slate-100 pt-3">
          <button
            type="button"
            className="flex w-full items-center gap-2 text-left text-xs font-semibold text-slate-500 hover:text-slate-700"
            onClick={() => setBreakdownOpen((o) => !o)}
            aria-expanded={breakdownOpen}
          >
            {breakdownOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {t('recipes.costBreakdown', 'Cost breakdown')}
          </button>
          {breakdownOpen && (
            <div className="mt-2 space-y-1">
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
              {customCosts.map((item) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg bg-violet-50 px-3 py-1.5 text-xs">
                  <span className="flex items-center gap-1.5 font-medium text-slate-700">
                    <Package className="h-3.5 w-3.5 text-violet-500" />
                    {item.name}
                  </span>
                  <span className="font-semibold text-violet-700">${item.cost.toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
