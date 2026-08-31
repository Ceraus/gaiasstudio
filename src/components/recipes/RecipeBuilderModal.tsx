import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, ArrowRight, Check, ClipboardPaste, FlaskConical, Loader2, Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppSettings, Ingredient, Recipe, RecipeAmountUnit } from '@/types';
import { recipesRepo, ingredientsRepo } from '@/db/repositories';
import { parseRecipeIngredientList, suggestBenefitStatement, type ParsedRecipeIngredient } from '@/lib/localAi';
import { runAiTask } from '@/lib/aiTask';
import { resolveRecipeAmountUnit } from '@/lib/inventoryMath';
import RecipeAmountUnitSelect, { recipeAmountUnitLabel } from '@/components/recipes/RecipeAmountUnitSelect';
import { getIngredientDisplayName } from '@/lib/ingredientI18n';
import Modal from '@/components/common/Modal';
import IngredientIcon from '@/components/common/IngredientIcon';
import IngredientAutocomplete from '@/components/common/IngredientAutocomplete';
import RecipeBenefitCopySection from '@/components/recipes/RecipeBenefitCopySection';
import { generateIngredientIconResult } from '@/lib/comfyUiApi';
import { enqueuePendingComfyIcon } from '@/lib/pendingComfyIcons';
import { resolveIngredientIconKey } from '@/data/ingredientIconPaths';
import { resolveBundledIngredientPngSlug } from '@/lib/ingredientCatalog';
import { withDefaultSoapBaseIds } from '@/data/ingredientSeed';
import { formatNetWeightAmount, parseNetWeight } from '@/lib/netWeight';
import { mixBenefitsForIngredients, BENEFIT_MIX_JOINER, type BenefitMixIngredient } from '@/lib/benefitMix';
import { ingredientsForBenefitCopy } from '@/lib/ingredientSkinFeel';
import { benefitTextReplaceable } from '@/lib/benefitI18n';
import { useLocalAiOnline } from '@/hooks/useLocalAiOnline';
import {
  clearRecipeBuilderDraft,
  draftHasContent,
  loadRecipeBuilderDraft,
  saveRecipeBuilderDraft,
} from '@/lib/recipeBuilderDraft';

interface Props {
  open: boolean;
  recipe?: Recipe | null;
  ingredients: Ingredient[];
  defaultSoapBase?: Ingredient;
  settings: AppSettings;
  onClose: () => void;
  onCreated: (recipe: Recipe) => void | Promise<void>;
}

export default function RecipeBuilderModal({
  open,
  recipe = null,
  ingredients,
  defaultSoapBase,
  settings,
  onClose,
  onCreated,
}: Props) {
  const { t, i18n } = useTranslation();
  const { ollamaOnline, checking: aiChecking, refresh: refreshAiStatus } = useLocalAiOnline(settings);
  const ollamaUp = settings.localAiEnabled && ollamaOnline;
  const aiOnline = settings.localAiEnabled && (ollamaUp || aiChecking);
  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [netWeight, setNetWeight] = useState('100g');
  const [barsPerBatch, setBarsPerBatch] = useState('1');
  const [catalog, setCatalog] = useState<Ingredient[]>(ingredients);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [units, setUnits] = useState<Record<string, RecipeAmountUnit>>({});
  const [pasteOpen] = useState(true);
  const [pasteText, setPasteText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [unresolved, setUnresolved] = useState<ParsedRecipeIngredient[]>([]);
  const [requestedQuery, setRequestedQuery] = useState('');
  const [resolvingName, setResolvingName] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generatingIcons, setGeneratingIcons] = useState<Set<string>>(new Set());
  const [restoredDraft, setRestoredDraft] = useState(false);
  const [benefit, setBenefit] = useState('');
  const [benefitEn, setBenefitEn] = useState('');
  const [benefitEs, setBenefitEs] = useState('');
  const [suggestingBenefit, setSuggestingBenefit] = useState(false);
  const [benefitSuggestError, setBenefitSuggestError] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const skipPersistRef = useRef(false);
  const benefitSuggestVariant = useRef(0);
  const priorBenefitDrafts = useRef<Array<{ en?: string; es?: string }>>([]);
  const autoSuggestSigRef = useRef('');
  const lastAutoAppliedRef = useRef<{ sig: string; en: string; es: string } | null>(null);
  const suggestInFlightRef = useRef(false);
  const suggestPromiseRef = useRef<Promise<void> | null>(null);
  const savedBenefitRef = useRef({ benefit: '', benefitEn: '', benefitEs: '' });

  useEffect(() => {
    const next = [...ingredients];
    if (defaultSoapBase && !next.some((item) => item.id === defaultSoapBase.id)) {
      next.unshift(defaultSoapBase);
    }
    setCatalog(next);
  }, [ingredients, defaultSoapBase]);

  const includeSoapBase = (ids: string[]) => withDefaultSoapBaseIds(ids, defaultSoapBase?.id);
  const isLockedBase = (id: string) => !!defaultSoapBase && id === defaultSoapBase.id;

  const resetNewRecipe = () => {
    setStep(0);
    setName('');
    setNetWeight('100g');
    setBarsPerBatch('1');
    setSelectedIds(includeSoapBase([]));
    setAmounts({});
    setUnits({});
    setPasteText('');
    setParseError(null);
    setUnresolved([]);
    setRequestedQuery('');
    setResolvingName(null);
    setGeneratingIcons(new Set());
    setRestoredDraft(false);
    setBenefit('');
    setBenefitEn('');
    setBenefitEs('');
    setSuggestingBenefit(false);
    setBenefitSuggestError(null);
    benefitSuggestVariant.current = 0;
    priorBenefitDrafts.current = [];
    autoSuggestSigRef.current = '';
    lastAutoAppliedRef.current = null;
    suggestInFlightRef.current = false;
    savedBenefitRef.current = { benefit: '', benefitEn: '', benefitEs: '' };
    setConfirmRemoveId(null);
  };

  useEffect(() => {
    if (!open) return;
    setParseError(null);
    setResolvingName(null);
    setGeneratingIcons(new Set());
    setSuggestingBenefit(false);
    setBenefitSuggestError(null);
    benefitSuggestVariant.current = 0;
    priorBenefitDrafts.current = [];
    suggestInFlightRef.current = false;
    if (recipe) {
      setRestoredDraft(false);
      setStep(0);
      setPasteText('');
      setUnresolved([]);
      setRequestedQuery('');
      setName(recipe.name);
      setNetWeight(recipe.netWeight || '100g');
      setBarsPerBatch(String(recipe.barsPerBatch ?? 1));
      setSelectedIds(includeSoapBase([...recipe.ingredientIds]));
      const nextAmounts: Record<string, string> = {};
      for (const [id, value] of Object.entries(recipe.ingredientAmounts ?? {})) {
        nextAmounts[id] = String(value);
      }
      setAmounts(nextAmounts);
      const nextUnits: Record<string, RecipeAmountUnit> = {};
      for (const [id, value] of Object.entries(recipe.ingredientUnits ?? {})) {
        nextUnits[id] = value;
      }
      setUnits(nextUnits);
      setBenefit(recipe.benefit ?? '');
      setBenefitEn(recipe.benefitEn ?? '');
      setBenefitEs(recipe.benefitEs ?? '');
      autoSuggestSigRef.current = '';
      lastAutoAppliedRef.current = null;
      return;
    }
    skipPersistRef.current = false;
    const draft = loadRecipeBuilderDraft();
    if (draft && draftHasContent(draft, defaultSoapBase?.id)) {
      const restoredIds = includeSoapBase(draft.selectedIds);
      const restoredItems = restoredIds
        .map((id) => ingredients.find((item) => item.id === id) ?? (defaultSoapBase?.id === id ? defaultSoapBase : undefined))
        .filter((item): item is Ingredient => !!item)
        .map((item) => ({ name: item.name, category: item.category, benefit: item.benefit, inci: item.inci }));
      const mixIng = ingredientsForBenefitCopy(restoredItems);
      const restoredBenefit = draft.benefit ?? '';
      const restoredEn = draft.benefitEn ?? '';
      const restoredEs = draft.benefitEs ?? '';
      const keepSuggestion = !benefitTextReplaceable(restoredBenefit, mixIng, t)
        || !benefitTextReplaceable(restoredEn, mixIng, t)
        || !benefitTextReplaceable(restoredEs, mixIng, t);
      setStep(draft.step);
      setName(draft.name);
      setNetWeight(draft.netWeight);
      setBarsPerBatch(draft.barsPerBatch);
      setSelectedIds(restoredIds);
      setAmounts(draft.amounts);
      setUnits(draft.units);
      setPasteText(draft.pasteText);
      setUnresolved(draft.unresolved);
      setRequestedQuery('');
      setBenefit(restoredBenefit);
      setBenefitEn(restoredEn);
      setBenefitEs(restoredEs);
      setRestoredDraft(true);
      const sig = [...restoredIds].sort().join(',');
      autoSuggestSigRef.current = keepSuggestion ? sig : '';
      lastAutoAppliedRef.current = keepSuggestion
        ? { sig, en: restoredEn, es: restoredEs }
        : null;
      return;
    }
    resetNewRecipe();
  }, [open, recipe]);

  const persistDraft = () => {
    if (recipe || skipPersistRef.current) return;
    saveRecipeBuilderDraft(
      { step, name, netWeight, barsPerBatch, selectedIds, amounts, units, pasteText, unresolved, benefit, benefitEn, benefitEs },
      defaultSoapBase?.id,
    );
  };

  useEffect(() => {
    if (!open || recipe) return;
    const timer = window.setTimeout(persistDraft, 250);
    return () => window.clearTimeout(timer);
  }, [open, recipe, step, name, netWeight, barsPerBatch, selectedIds, amounts, units, pasteText, unresolved, benefit, benefitEn, benefitEs, defaultSoapBase?.id]);

  const handleClose = () => {
    setConfirmRemoveId(null);
    persistDraft();
    onClose();
  };

  const startOver = () => {
    skipPersistRef.current = true;
    clearRecipeBuilderDraft();
    resetNewRecipe();
    skipPersistRef.current = false;
  };

  useEffect(() => {
    if (!open || !defaultSoapBase) return;
    setSelectedIds((current) => withDefaultSoapBaseIds(current, defaultSoapBase.id));
    setCatalog((current) => (
      current.some((item) => item.id === defaultSoapBase.id)
        ? current
        : [defaultSoapBase, ...current]
    ));
  }, [open, defaultSoapBase]);

  const selected = useMemo(() => {
    const byId = new Map(catalog.map((ingredient) => [ingredient.id, ingredient]));
    return selectedIds.map((id) => byId.get(id)).filter((ingredient): ingredient is Ingredient => !!ingredient);
  }, [catalog, selectedIds]);

  const pendingRemove = selected.find((ingredient) => ingredient.id === confirmRemoveId);
  const pendingRemoveName = pendingRemove
    ? getIngredientDisplayName(pendingRemove.name, t)
    : '';

  const confirmRemoveFromRecipe = () => {
    if (!confirmRemoveId || isLockedBase(confirmRemoveId)) {
      setConfirmRemoveId(null);
      return;
    }
    const id = confirmRemoveId;
    setConfirmRemoveId(null);
    setSelectedIds((current) => current.filter((itemId) => itemId !== id));
    setUnits((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  };

  const mixIngredientsForSuggest = useMemo<BenefitMixIngredient[]>(
    () => selected.map((item) => ({
      name: item.name,
      category: item.category,
      benefit: item.benefit,
      inci: item.inci,
    })),
    [selected],
  );
  const mixIngredientsForCopy = useMemo(
    () => ingredientsForBenefitCopy(mixIngredientsForSuggest),
    [mixIngredientsForSuggest],
  );
  const benefitMix = useMemo(
    () => mixBenefitsForIngredients(mixIngredientsForCopy),
    [mixIngredientsForCopy],
  );
  const mixBenefit = benefitMix.phrases.join(BENEFIT_MIX_JOINER);
  const autoSuggestSig = [...selectedIds].sort().join(',');
  const langEs = i18n.language.startsWith('es');
  savedBenefitRef.current = { benefit, benefitEn, benefitEs };

  const applyBenefitPair = (en: string, es: string, sig = autoSuggestSig) => {
    const nextEn = en.trim();
    const nextEs = es.trim();
    const nextBenefit = langEs ? (nextEs || nextEn) : (nextEn || nextEs);
    lastAutoAppliedRef.current = { sig, en: nextEn, es: nextEs };
    savedBenefitRef.current = { benefit: nextBenefit, benefitEn: nextEn, benefitEs: nextEs };
    setBenefitEn(nextEn);
    setBenefitEs(nextEs);
    setBenefit(nextBenefit);
  };

  const handleBenefitFieldChange = (lang: 'en' | 'es', value: string) => {
    lastAutoAppliedRef.current = null;
    const nextEn = lang === 'en' ? value : benefitEn;
    const nextEs = lang === 'es' ? value : benefitEs;
    const nextBenefit = langEs ? (nextEs.trim() || nextEn.trim()) : (nextEn.trim() || nextEs.trim());
    if (lang === 'en') setBenefitEn(value);
    else setBenefitEs(value);
    setBenefit(nextBenefit);
    savedBenefitRef.current = { benefit: nextBenefit, benefitEn: nextEn, benefitEs: nextEs };
  };

  const handleSuggestBenefit = async () => {
    if (suggestInFlightRef.current) return;
    if (mixIngredientsForSuggest.length === 0) return;
    setBenefitSuggestError(null);
    setSuggestingBenefit(true);
    suggestInFlightRef.current = true;
    const work = (async () => {
      try {
        const suggestInput = {
          recipeName: name,
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
          applyBenefitPair(next.en, next.es);
        } else {
          setBenefitSuggestError(result.error ?? t('recipes.benefitSuggestGenericError', "Couldn't generate a suggestion."));
          void refreshAiStatus();
        }
      } finally {
        suggestInFlightRef.current = false;
        setSuggestingBenefit(false);
        suggestPromiseRef.current = null;
      }
    })();
    suggestPromiseRef.current = work;
    await work;
  };

  const handleSuggestBenefitRef = useRef(handleSuggestBenefit);
  handleSuggestBenefitRef.current = handleSuggestBenefit;

  useEffect(() => {
    if (!open || step !== 2) return;
    if (!ollamaUp) return;
    if (mixIngredientsForSuggest.length === 0) return;
    if (autoSuggestSigRef.current === autoSuggestSig) return;
    if (suggestInFlightRef.current) return;

    const last = lastAutoAppliedRef.current;
    const stillOurs = Boolean(
      last
      && last.en === benefitEn
      && last.es === benefitEs,
    );
    const replaceable = stillOurs
      || (
        benefitTextReplaceable(benefit, mixIngredientsForCopy, t)
        && benefitTextReplaceable(benefitEn, mixIngredientsForCopy, t)
        && benefitTextReplaceable(benefitEs, mixIngredientsForCopy, t)
      );
    if (!replaceable) {
      autoSuggestSigRef.current = autoSuggestSig;
      return;
    }

    const timer = window.setTimeout(() => {
      if (autoSuggestSigRef.current === autoSuggestSig) return;
      autoSuggestSigRef.current = autoSuggestSig;
      void handleSuggestBenefitRef.current();
    }, 450);
    return () => window.clearTimeout(timer);
  }, [
    open,
    step,
    ollamaUp,
    autoSuggestSig,
    benefit,
    benefitEn,
    benefitEs,
    mixIngredientsForCopy,
    mixIngredientsForSuggest.length,
    t,
  ]);

  const addIngredient = (ingredient: Ingredient) => {
    setCatalog((current) => current.some((item) => item.id === ingredient.id) ? current : [...current, ingredient]);
    setSelectedIds((current) => current.includes(ingredient.id) ? current : [...current, ingredient.id]);
    if (resolvingName) {
      const parsed = unresolved.find((item) => item.name === resolvingName);
      if (parsed?.amount) {
        setAmounts((current) => ({ ...current, [ingredient.id]: String(parsed.amount) }));
      }
      if (parsed?.unit) {
        setUnits((current) => ({ ...current, [ingredient.id]: parsed.unit as RecipeAmountUnit }));
      }
      setUnresolved((current) => current.filter((item) => item.name !== resolvingName));
      setResolvingName(null);
    }

    void generateIconFor(ingredient, false);
  };

  const generateIconFor = (ingredient: Ingredient, force: boolean) => {
    const pngSlug = resolveBundledIngredientPngSlug(ingredient.name, ingredient.iconKey);
    const svgKey = resolveIngredientIconKey(ingredient.name);
    const bundled = pngSlug || (svgKey && !svgKey.startsWith('asset_') ? svgKey : undefined);
    if (bundled && !force) {
      if (ingredient.iconKey !== bundled) {
        void ingredientsRepo.update(ingredient.id, { iconKey: bundled });
        setCatalog((current) =>
          current.map((item) => (item.id === ingredient.id ? { ...item, iconKey: bundled } : item)),
        );
      }
      return;
    }
    if (!settings.comfyUiEnabled) return;
    if (!force && ingredient.iconKey?.startsWith('asset_')) return;
    setGeneratingIcons((current) => new Set(current).add(ingredient.id));
    void (async () => {
      try {
        const result = await generateIngredientIconResult(settings, ingredient.name);
        if (result.status === 'ok') {
          await ingredientsRepo.update(ingredient.id, { iconKey: result.iconKey });
          setCatalog((current) =>
            current.map((item) => (item.id === ingredient.id ? { ...item, iconKey: result.iconKey } : item)),
          );
        } else if (result.status === 'network') {
          await enqueuePendingComfyIcon(ingredient.id, ingredient.name);
        }
      } catch (error) {
        console.error('[RecipeBuilder] Icon generation failed:', error);
      } finally {
        setGeneratingIcons((current) => {
          const next = new Set(current);
          next.delete(ingredient.id);
          return next;
        });
      }
    })();
  };

  const parsePaste = async () => {
    setParsing(true);
    setParseError(null);
    const task = await runAiTask(
      'recipe-ingredient-list',
      pasteText,
      () => parseRecipeIngredientList(pasteText, settings),
      { bypassCache: true },
    );
    setParsing(false);
    if (!task.ok || !task.data.ok || !task.data.ingredients) {
      setParseError(task.ok ? task.data.error ?? t('recipes.parseListError', 'Could not parse this list.') : task.error);
      return;
    }
    setUnresolved(task.data.ingredients);
  };

  const save = async () => {
    if (!name.trim() || selectedIds.length === 0 || unresolved.length > 0) return;
    setSaving(true);
    try {
      if (suggestPromiseRef.current) await suggestPromiseRef.current;
      const numericAmounts: Record<string, number> = {};
      const ingredientUnits: Record<string, RecipeAmountUnit> = {};
      for (const id of selectedIds) {
        const value = Number.parseFloat(amounts[id] ?? '');
        if (Number.isFinite(value) && value > 0) numericAmounts[id] = value;
        const ingredient = selected.find((item) => item.id === id);
        if (ingredient) ingredientUnits[id] = resolveRecipeAmountUnit(ingredient, units[id]);
      }
      const batch = Number.parseFloat(barsPerBatch);
      const bars = Number.isFinite(batch) && batch > 0 ? batch : 1;
      const snap = savedBenefitRef.current;
      const last = lastAutoAppliedRef.current;
      const latestEn = last ? last.en : snap.benefitEn;
      const latestEs = last ? last.es : snap.benefitEs;
      const latestBenefit = last
        ? (langEs ? (latestEs || latestEn) : (latestEn || latestEs))
        : snap.benefit;
      const primaryBenefit = aiOnline
        ? (latestBenefit.trim() || snap.benefit.trim() || latestEn.trim() || latestEs.trim())
        : (latestBenefit.trim() || snap.benefit.trim() || latestEn.trim() || latestEs.trim() || mixBenefit);
      const nextEn = latestEn.trim() || undefined;
      const nextEs = latestEs.trim() || undefined;
      if (recipe) {
        await recipesRepo.update(recipe.id, {
          name: name.trim(),
          netWeight: netWeight.trim(),
          ingredientIds: includeSoapBase(selectedIds),
          ingredientAmounts: numericAmounts,
          ingredientUnits,
          barsPerBatch: bars,
          benefit: primaryBenefit,
          benefitEn: nextEn,
          benefitEs: nextEs,
        });
        await onCreated({
          ...recipe,
          name: name.trim(),
          netWeight: netWeight.trim(),
          ingredientIds: includeSoapBase(selectedIds),
          ingredientAmounts: numericAmounts,
          ingredientUnits,
          barsPerBatch: bars,
          benefit: primaryBenefit,
          benefitEn: nextEn,
          benefitEs: nextEs,
        });
      } else {
        const created = await recipesRepo.create({
          name: name.trim(),
          benefit: primaryBenefit,
          benefitEn: nextEn,
          benefitEs: nextEs,
          netWeight: netWeight.trim(),
          directions: '',
          warnings: '',
          footer: settings.contact ?? '',
          ingredientIds: includeSoapBase(selectedIds),
          ingredientAmounts: numericAmounts,
          ingredientUnits,
          customCosts: [],
          barsPerBatch: bars,
        });
        await onCreated(created);
        skipPersistRef.current = true;
        clearRecipeBuilderDraft();
      }
      onClose();
    } catch (error) {
      console.error('[RecipeBuilder] Failed to create recipe:', error);
    } finally {
      setSaving(false);
    }
  };

  const footer = (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        className="btn-secondary flex items-center gap-1.5"
        onClick={step === 0 ? handleClose : () => setStep((current) => current - 1)}
      >
        {step > 0 && <ArrowLeft className="h-4 w-4" />}
        {step === 0 ? t('common.cancel', 'Cancel') : t('common.back', 'Back')}
      </button>
      {step < 2 ? (
        <button
          type="button"
          className="btn-primary flex items-center gap-1.5"
          disabled={(step === 0 && !name.trim()) || (step === 1 && selectedIds.length === 0)}
          onClick={() => setStep((current) => current + 1)}
        >
          {t('common.next', 'Next')}
          <ArrowRight className="h-4 w-4" />
        </button>
      ) : (
        <button
          type="button"
          className="btn-primary flex items-center gap-1.5"
          disabled={saving || !name.trim() || selectedIds.length === 0 || unresolved.length > 0}
          onClick={() => void save()}
        >
          {saving || suggestingBenefit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {recipe ? t('recipes.saveRecipe', 'Save Recipe') : t('recipes.createRecipe', 'Create Recipe')}
        </button>
      )}
    </div>
  );

  return (
    <>
    <Modal
      open={open}
      onClose={handleClose}
      width="min(1240px, 90vw)"
      minHeight="min(90vh, 1040px)"
      centerTitle
      title={
        <span className="flex items-center justify-center gap-2">
          <FlaskConical className="h-4 w-4 text-gaia-600" />
          {recipe
            ? t('recipes.editRecipeTitle', 'Edit Recipe')
            : t('recipes.builderDraftTitle', 'Recipe draft')}
          {!recipe && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 ring-1 ring-amber-200">
              {t('recipes.builderDraftBadge', 'Draft')}
            </span>
          )}
        </span>
      }
      footer={footer}
    >
      <form
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (step === 0 && name.trim()) setStep(1);
          else if (step === 2) void save();
        }}
      >
          <div className="mb-2 flex w-full items-center px-2 sm:px-4" aria-label={t('recipes.builderProgress', 'Recipe builder progress')}>
            {[0, 1, 2].map((index) => {
              const isActive = index === step;
              const isPast = index < step;
              const stepLabel = index === 0
                ? t('recipes.builderBasics', 'Basics')
                : index === 1
                  ? t('recipes.ingredients', 'Ingredients')
                  : t('recipes.builderReview', 'Review');
              return (
                <div
                  key={index}
                  className={`flex items-center ${index < 2 ? 'min-w-0 flex-1' : 'shrink-0'}`}
                >
                  <button
                    type="button"
                    data-recipe-builder-step={index}
                    aria-current={isActive ? 'step' : undefined}
                    aria-label={stepLabel}
                    onClick={() => setStep(index)}
                    className={`flex items-center gap-1.5 rounded-xl px-2 py-1.5 sm:gap-2 sm:px-2.5 ${
                      isActive
                        ? 'cursor-default bg-white shadow-sm ring-1 ring-gaia-200'
                        : 'cursor-pointer hover:bg-slate-50/80'
                    }`}
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[calc(0.75rem*1.08)] font-bold ${
                        isActive
                          ? 'bg-gaia-600 text-white'
                          : isPast
                            ? 'bg-gaia-400 text-white'
                            : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {isPast ? <Check className="h-3.5 w-3.5" /> : index + 1}
                    </span>
                    <span
                      className={`whitespace-nowrap text-[calc(0.75rem*1.08)] font-semibold ${
                        isActive ? 'text-gaia-700' : isPast ? 'text-gaia-600' : 'text-slate-400'
                      }`}
                    >
                      {stepLabel}
                    </span>
                  </button>
                  {index < 2 && (
                    <div
                      className={`mx-2 h-0.5 flex-1 rounded-full sm:mx-3 ${
                        isPast ? 'bg-gaia-400' : 'bg-slate-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

        {!recipe && (
          <div className="flex items-center justify-between gap-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
            <p>
              <span className="mr-1.5 inline-flex rounded-full bg-amber-200 px-1.5 py-0 text-[10px] font-bold uppercase tracking-wide text-amber-900">
                {t('recipes.builderDraftBadge', 'Draft')}
              </span>
              {t('recipes.builderDraftRestored', 'This is a recipe draft. Closing this window will not lose your work.')}
            </p>
            {(restoredDraft || draftHasContent(
              { step, name, netWeight, barsPerBatch, selectedIds, amounts, pasteText, unresolved },
              defaultSoapBase?.id,
            )) && (
              <button type="button" className="shrink-0 font-semibold text-amber-800 hover:underline" onClick={startOver}>
                {t('recipes.builderStartOver', 'Start Over')}
              </button>
            )}
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[calc(1.125rem*1.08)] font-semibold text-slate-800">{t('recipes.builderNameTitle', 'What are you making?')}</h4>
              <p className="text-sm text-slate-500">{t('recipes.builderNameHint', 'Start with a name. You can add label copy and pricing later.')}</p>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              {t('recipes.name', 'Recipe name')}
              <input
                autoFocus
                className="input mt-1 w-full"
                placeholder={t('recipes.namePlaceholder', 'e.g. Lavender Oatmeal Soap')}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                {t('recipes.netWeight', 'Net weight')}
                <input
                  className="input mt-1 w-full"
                  placeholder={t('recipes.netWeightPlaceholder', 'e.g. 100 g or 3.5 oz')}
                  value={netWeight}
                  onChange={(event) => setNetWeight(event.target.value)}
                />
                {parseNetWeight(netWeight) && (
                  <p className="mt-1 text-[11px] font-normal text-slate-400">
                    {t('recipes.netWeightDualHint', 'On the label: {{value}}', {
                      value: formatNetWeightAmount(netWeight),
                    })}
                  </p>
                )}
              </label>
              <label className="block text-sm font-medium text-slate-700">
                {t('recipes.barsPerBatch', 'Bars per batch')}
                <input
                  type="number"
                  min={1}
                  className="input mt-1 w-full"
                  value={barsPerBatch}
                  onChange={(event) => setBarsPerBatch(event.target.value)}
                />
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="text-[calc(1.125rem*1.08)] font-semibold text-slate-800">{t('recipes.builderIngredientsTitle', 'Add only what this recipe uses')}</h4>
              <p className="text-sm text-slate-500">{t('recipes.builderIngredientsHint', 'Glycerin base is already included. Add the oils, butters, scents, and extras this bar uses.')}</p>
            </div>

            <IngredientAutocomplete
              key={requestedQuery}
              ingredients={catalog}
              settings={settings}
              initialQuery={requestedQuery}
              selectedIds={selectedIds}
              generatingIds={generatingIcons}
              onChoose={addIngredient}
              onUnchoose={(ingredient) => {
                if (isLockedBase(ingredient.id)) return;
                setSelectedIds((current) => current.filter((id) => id !== ingredient.id));
                setUnits((current) => {
                  const next = { ...current };
                  delete next[ingredient.id];
                  return next;
                });
              }}
              onRegenerateIcon={(ingredient) => generateIconFor(ingredient, true)}
              onLibraryChanged={async () => {
                const next = await ingredientsRepo.all();
                setCatalog(next);
                setSelectedIds((current) => includeSoapBase(current.filter((id) => next.some((ingredient) => ingredient.id === id))));
              }}
            />

            <div className="flex items-center justify-center gap-2 text-[calc(0.75rem*1.08)] font-medium text-violet-700">
              <ClipboardPaste className="h-3.5 w-3.5" />
              {t('recipes.pasteRecipeList', 'Type out your complete ingredients list')}
            </div>
            {pasteOpen && (
              <div className="space-y-2 rounded-xl bg-violet-50 p-3 ring-1 ring-violet-100">
                <textarea
                  className="input min-h-24 w-full resize-y text-sm"
                  placeholder={t('recipes.pasteRecipeListPlaceholder', 'Example: 100 g glycerin base, 10 drops lavender essential oil, 5 g oatmeal')}
                  value={pasteText}
                  onChange={(event) => setPasteText(event.target.value)}
                />
                <div className="flex items-center justify-end gap-2">
                  <button className="btn-secondary flex items-center gap-1.5" disabled={parsing || !pasteText.trim()} onClick={() => void parsePaste()}>
                    {parsing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {t('recipes.parseList', 'Parse List')}
                  </button>
                </div>
                {parseError && <p className="text-xs text-rose-600">{parseError}</p>}
              </div>
            )}

            {unresolved.length > 0 && (
              <div className="space-y-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
                <p className="text-xs font-semibold text-amber-900">{t('recipes.resolveParsedIngredients', 'Confirm each parsed ingredient')}</p>
                {unresolved.map((item) => (
                  <button
                    key={item.name}
                    className="flex w-full items-center justify-between rounded-lg bg-white px-3 py-2 text-left text-sm ring-1 ring-amber-100 hover:ring-amber-300"
                    onClick={() => {
                      setResolvingName(item.name);
                      setRequestedQuery(item.name);
                    }}
                  >
                    <span>{item.name}</span>
                    <span className="text-xs text-amber-700">
                      {item.amount ? `${item.amount} ${item.unit ?? ''} · ` : ''}
                      {t('recipes.findMatch', 'Find Match')}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {selected.length > 0 && (
              <div className="space-y-1">
                <p className="text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">{t('recipes.inThisRecipe', 'In this recipe')}</p>
                {selected.map((ingredient) => (
                  <div key={ingredient.id} className="flex items-center gap-2 rounded-xl bg-gaia-50 px-3 py-2 text-sm ring-1 ring-gaia-100">
                    <IngredientIcon category={ingredient.category} name={ingredient.name} iconKey={ingredient.iconKey} size="sm" loading={generatingIcons.has(ingredient.id)} />
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="truncate">{getIngredientDisplayName(ingredient.name, t)}</span>
                      {isLockedBase(ingredient.id) && (
                        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gaia-700">
                          {t('recipes.defaultBaseLocked', 'Always included')}
                        </span>
                      )}
                    </span>
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      className="w-20 shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                      placeholder="0"
                      value={amounts[ingredient.id] ?? ''}
                      onChange={(event) => setAmounts((current) => ({ ...current, [ingredient.id]: event.target.value }))}
                    />
                    <RecipeAmountUnitSelect
                      value={resolveRecipeAmountUnit(ingredient, units[ingredient.id])}
                      onChange={(unit) => setUnits((current) => ({ ...current, [ingredient.id]: unit }))}
                    />
                    {isLockedBase(ingredient.id) ? (
                      <span className="inline-flex h-9 w-9 shrink-0" aria-hidden />
                    ) : (
                      <button
                        type="button"
                        data-testid={`recipe-builder-remove-${ingredient.id}`}
                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-rose-500 text-white transition hover:bg-rose-600"
                        aria-label={t('recipes.removeFromRecipeAria', 'Remove {{name}} from this recipe', {
                          name: getIngredientDisplayName(ingredient.name, t),
                        })}
                        onClick={() => setConfirmRemoveId(ingredient.id)}
                      >
                        <X className="h-5 w-5" strokeWidth={2.75} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col items-center space-y-4 text-center">
            <div>
              <h4 className="text-[calc(1.125rem*1.08)] font-semibold text-slate-800">{t('recipes.builderReviewTitle', 'Ready to create this recipe?')}</h4>
              <p className="text-sm text-slate-500">{t('recipes.builderReviewHint', 'You can change benefits, plus directions and pricing, in Advanced details.')}</p>
            </div>
            <div className="w-full rounded-xl bg-gaia-50 p-4 text-center ring-1 ring-gaia-100">
              <p className="text-center font-semibold text-gaia-900">{name}</p>
              <p className="mt-1 text-xs text-gaia-700">{formatNetWeightAmount(netWeight)} · {barsPerBatch || 1} {t('recipes.barsPerBatchShort', 'bars per batch')}</p>
              <ul className="mt-3 space-y-1 text-left">
                {selected.map((ingredient) => (
                  <li key={ingredient.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm">
                    <IngredientIcon category={ingredient.category} name={ingredient.name} iconKey={ingredient.iconKey} size="sm" loading={generatingIcons.has(ingredient.id)} />
                    <span className="flex-1">{getIngredientDisplayName(ingredient.name, t)}</span>
                    <span className="text-xs font-medium text-slate-900">
                      {amounts[ingredient.id] || '—'}{' '}
                      {recipeAmountUnitLabel(resolveRecipeAmountUnit(ingredient, units[ingredient.id]), t)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 text-left" data-recipe-builder-review-suggest="">
                {aiOnline ? (
                  <RecipeBenefitCopySection
                    benefit={benefit}
                    benefitEn={benefitEn}
                    benefitEs={benefitEs}
                    onBenefitEnChange={(value) => handleBenefitFieldChange('en', value)}
                    onBenefitEsChange={(value) => handleBenefitFieldChange('es', value)}
                    suggesting={suggestingBenefit}
                    hasIngredients={mixIngredientsForSuggest.length > 0}
                    hasRecipe={!!recipe}
                    onSuggest={() => void handleSuggestBenefit()}
                    suggestTitle={
                      mixIngredientsForSuggest.length === 0
                        ? t('recipes.benefitSuggestNeedsIngredients', 'Add ingredients first so there is something to suggest from.')
                        : t('recipes.benefitSuggestAnotherTooltip', 'Draft another wording from these ingredients.')
                    }
                  >
                    {benefitSuggestError && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-[11px] text-amber-600">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>{benefitSuggestError}</span>
                      </p>
                    )}
                  </RecipeBenefitCopySection>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2" data-recipe-builder-review-benefit-fields="">
                    <div>
                      <label className="label text-[10px]">{t('recipes.benefitEn', 'Benefit (English)')}</label>
                      <textarea
                        className="input min-h-[4.5rem] text-sm"
                        data-recipe-benefit-en=""
                        value={benefitEn}
                        onChange={(event) => handleBenefitFieldChange('en', event.target.value)}
                        placeholder={t('recipes.benefitEnPlaceholder', 'Moisturizing shea and calming lavender…')}
                      />
                    </div>
                    <div>
                      <label className="label text-[10px]">{t('recipes.benefitEs', 'Benefit (Español)')}</label>
                      <textarea
                        className="input min-h-[4.5rem] text-sm"
                        data-recipe-benefit-es=""
                        value={benefitEs}
                        onChange={(event) => handleBenefitFieldChange('es', event.target.value)}
                        placeholder={t('recipes.benefitEsPlaceholder', 'Karité hidratante y lavanda calmante…')}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </form>
    </Modal>
    <Modal
      open={open && confirmRemoveId !== null}
      onClose={() => setConfirmRemoveId(null)}
      width={360}
      title={t('recipes.removeFromRecipeTitle', 'Remove From This Recipe?')}
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="btn-ghost"
            data-testid="cancel-remove-from-recipe"
            onClick={() => setConfirmRemoveId(null)}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            className="btn-danger"
            data-testid="confirm-remove-from-recipe"
            onClick={confirmRemoveFromRecipe}
          >
            {t('common.remove', 'Remove')}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600" data-testid="remove-from-recipe-confirm-body">
        {t('recipes.removeFromRecipeBody', 'Remove {{name}} from this recipe? It stays in your ingredient library.', {
          name: pendingRemoveName,
        })}
      </p>
    </Modal>
    </>
  );
}


