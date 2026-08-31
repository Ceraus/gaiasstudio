import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Loader2, Plus, RefreshCw, Search, Sparkles, WifiOff, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AppSettings, Ingredient } from '@/types';
import { ingredientsRepo, VOLUME_CATEGORIES } from '@/db/repositories';
import {
  inferCategory,
  rankByQuery,
  searchOfflineIngredientCatalog,
  searchOnlineIngredientCatalogs,
  suggestionIdentityKeys,
  type IngredientCatalogSuggestion,
} from '@/lib/ingredientCatalog';
import {
  canonicalIngredientKey,
  canonicalizeIngredientName,
  resolveIngredientCandidate,
  type IngredientResolution,
} from '@/lib/ingredientResolution';
import { compareIngredientCandidates } from '@/lib/localAi';
import { attachIngredientIcon } from '@/lib/ingredientIconMatch';
import { generateIngredientIcon } from '@/lib/comfyUiApi';
import { requestCustomIngredientIcon } from '@/lib/pendingComfyIcons';
import { ingredientMatchesQuery, getIngredientDisplayName } from '@/lib/ingredientI18n';
import { isRealSpanishIngredientName, resolveIngredientSpanishName } from '@/lib/ingredientNameTranslate';
import {
  isNewlyAddedLibraryIngredient,
  libraryIngredientRowClass,
  newlyAddedLibraryAccent,
  sortLibraryIngredientsForPreview,
} from '@/lib/libraryIngredientAccent';
import IngredientIcon from '@/components/common/IngredientIcon';
import BilingualIngredientName from '@/components/common/BilingualIngredientName';

interface Props {
  ingredients: Ingredient[];
  settings: AppSettings;
  initialQuery?: string;
  selectedIds?: string[];
  generatingIds?: Set<string>;
  onChoose: (ingredient: Ingredient) => void;
  onUnchoose?: (ingredient: Ingredient) => void;
  onRegenerateIcon?: (ingredient: Ingredient) => void;
  onLibraryChanged?: () => void | Promise<void>;
}

interface ReviewState {
  suggestion: IngredientCatalogSuggestion;
  resolution: IngredientResolution;
  name: string;
}

function suggestionToInput(suggestion: IngredientCatalogSuggestion, iconKey = suggestion.iconKey) {
  const nameEs = isRealSpanishIngredientName(suggestion.nameEs, suggestion.name, suggestion.inci)
    ? suggestion.nameEs
    : undefined;
  return {
    name: suggestion.name,
    nameEs,
    benefit: suggestion.description ?? '',
    inci: suggestion.inci ?? '',
    isSoapBase: suggestion.category === 'base',
    active: true,
    category: suggestion.category,
    measurementType: suggestion.category && VOLUME_CATEGORIES.has(suggestion.category)
      ? 'volume' as const
      : 'weight' as const,
    canonicalKey: undefined,
    aliases: suggestion.aliases,
    iconKey,
    sourceRefs: [suggestion.sourceRef],
  };
}

function suggestionRowKey(suggestion: IngredientCatalogSuggestion) {
  return `${suggestion.provider}:${suggestion.sourceId}`;
}

function isBundledCatalogSuggestion(suggestion: IngredientCatalogSuggestion) {
  return suggestion.provider === 'offline' || suggestion.provider === 'seed';
}

function formatCustomIngredientName(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/[A-Z]/.test(trimmed)) return trimmed;
  return trimmed.replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

export default function IngredientAutocomplete({
  ingredients,
  settings,
  initialQuery = '',
  selectedIds = [],
    generatingIds = new Set(),
  onChoose,
  onUnchoose,
  onRegenerateIcon,
  onLibraryChanged,
}: Props) {
  const { t } = useTranslation();
  const [query, setQuery] = useState(initialQuery);
  const [cosmetic, setCosmetic] = useState<IngredientCatalogSuggestion[]>([]);
  const [food, setFood] = useState<IngredientCatalogSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [review, setReview] = useState<ReviewState | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [aiChecking, setAiChecking] = useState(false);
  const [iconOverrides, setIconOverrides] = useState<Record<string, string>>({});
  const [localGenerating, setLocalGenerating] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmedQuery = query.trim();
  const local = useMemo(() => {
    const matched = trimmedQuery.length
      ? ingredients.filter((ingredient) => ingredientMatchesQuery(ingredient, query))
      : ingredients.filter((ingredient) => ingredient.active);
    if (!trimmedQuery.length) {
      return sortLibraryIngredientsForPreview(matched).slice(0, 6);
    }
    return rankByQuery(matched, trimmedQuery).slice(0, 12);
  }, [ingredients, query, trimmedQuery]);
  const localKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const ingredient of ingredients) {
      keys.add(ingredient.canonicalKey || canonicalIngredientKey(ingredient));
      keys.add(canonicalizeIngredientName(ingredient.name));
      if (ingredient.inci) keys.add(canonicalizeIngredientName(ingredient.inci));
      for (const alias of ingredient.aliases ?? []) keys.add(canonicalizeIngredientName(alias));
    }
    return keys;
  }, [ingredients]);
  const bundled = useMemo(
    () => trimmedQuery.length
      ? searchOfflineIngredientCatalog(query, { excludeKeys: localKeys, limit: 24 })
      : [],
    [query, localKeys, trimmedQuery.length],
  );
  const catalogKeys = useMemo(() => {
    const keys = new Set(localKeys);
    for (const suggestion of bundled) {
      for (const key of suggestionIdentityKeys(suggestion)) keys.add(key);
    }
    return keys;
  }, [bundled, localKeys]);
  const cosmeticVisible = useMemo(
    () => cosmetic.filter((row) => !suggestionIdentityKeys(row).some((key) => catalogKeys.has(key))),
    [cosmetic, catalogKeys],
  );
  const foodVisible = useMemo(
    () => food.filter((row) => !suggestionIdentityKeys(row).some((key) => catalogKeys.has(key))),
    [food, catalogKeys],
  );
  const catalogFlattened = useMemo(
    () => [
      ...local.map((ingredient) => ({ type: 'local' as const, ingredient })),
      ...bundled.map((suggestion) => ({ type: 'online' as const, suggestion })),
      ...cosmeticVisible.map((suggestion) => ({ type: 'online' as const, suggestion })),
      ...foodVisible.map((suggestion) => ({ type: 'online' as const, suggestion })),
    ],
    [local, bundled, cosmeticVisible, foodVisible],
  );
  const showCustomAdd = trimmedQuery.length >= 1;
  const showFoodBotanicalHeader = showCustomAdd && (trimmedQuery.length >= 2 || foodVisible.length > 0);
  const customOffset = showCustomAdd ? 1 : 0;
  const flattened = useMemo(
    () => [
      ...(showCustomAdd ? [{ type: 'custom' as const }] : []),
      ...catalogFlattened,
    ],
    [catalogFlattened, showCustomAdd],
  );

  useEffect(() => {
    setActiveIndex(-1);
    setReview(null);
    setAiNote(null);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setCosmetic([]);
      setFood([]);
      setLoading(false);
      setOffline(false);
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setCosmetic([]);
      setFood([]);
      setLoading(false);
      setOffline(true);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await searchOnlineIngredientCatalogs(trimmed, controller.signal);
        setCosmetic(result.cosmetic);
        setFood(result.food);
        setOffline(result.errors.length === 2);
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          setCosmetic([]);
          setFood([]);
          setOffline(true);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const overlayIconKey = (suggestion: IngredientCatalogSuggestion) =>
    iconOverrides[suggestionRowKey(suggestion)] ?? suggestion.iconKey;

  const markGenerating = (key: string, on: boolean) => {
    setLocalGenerating((current) => {
      const next = new Set(current);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });
  };

  const regenerateLibraryIcon = async (ingredient: Ingredient) => {
    if (!settings.comfyUiEnabled) return;
    if (onRegenerateIcon) {
      onRegenerateIcon(ingredient);
      return;
    }
    markGenerating(ingredient.id, true);
    try {
      const iconKey = await generateIngredientIcon(settings, ingredient.name);
      if (iconKey) {
        await ingredientsRepo.update(ingredient.id, { iconKey });
        await onLibraryChanged?.();
      }
    } finally {
      markGenerating(ingredient.id, false);
    }
  };

  const regenerateSuggestionIcon = async (suggestion: IngredientCatalogSuggestion) => {
    if (!settings.comfyUiEnabled) return;
    const key = suggestionRowKey(suggestion);
    markGenerating(key, true);
    try {
      const iconKey = await generateIngredientIcon(settings, suggestion.name);
      if (iconKey) setIconOverrides((current) => ({ ...current, [key]: iconKey }));
    } finally {
      markGenerating(key, false);
    }
  };

  const persistSpanishName = async (ingredient: Ingredient) => {
    const result = await resolveIngredientSpanishName(ingredient.name, settings, {
      nameEs: ingredient.nameEs,
      inci: ingredient.inci,
    });
    if (!result.text || result.text === ingredient.nameEs) return ingredient;
    await ingredientsRepo.update(ingredient.id, { nameEs: result.text });
    return { ...ingredient, nameEs: result.text };
  };

  const chooseSuggestion = async (suggestion: IngredientCatalogSuggestion) => {
    const input = suggestionToInput(suggestion, overlayIconKey(suggestion));
    const resolution = resolveIngredientCandidate(input, ingredients);
    if (resolution.decision === 'reuse' && resolution.match) {
      const resolved = await ingredientsRepo.resolveOrCreate(input);
      await onLibraryChanged?.();
      await emitChosen(resolved.ingredient);
      setQuery('');
      void persistSpanishName(resolved.ingredient).then(async (updated) => {
        if (updated.nameEs !== resolved.ingredient.nameEs) await onLibraryChanged?.();
      });
      return;
    }
    if (isBundledCatalogSuggestion(suggestion) && resolution.decision === 'new') {
      const resolved = await ingredientsRepo.resolveOrCreate(input);
      await onLibraryChanged?.();
      await emitChosen(resolved.ingredient);
      setQuery('');
      void persistSpanishName(resolved.ingredient).then(async (updated) => {
        if (updated.nameEs !== resolved.ingredient.nameEs) await onLibraryChanged?.();
      });
      return;
    }
    setReview({ suggestion, resolution, name: suggestion.name });
    setAiNote(null);
    if (resolution.decision === 'review' && resolution.match && settings.localAiEnabled) {
      setAiChecking(true);
      const result = await compareIngredientCandidates(
        { name: suggestion.name, inci: suggestion.inci },
        [{
          id: resolution.match.id,
          name: resolution.match.name,
          inci: resolution.match.inci,
        }],
        settings,
      );
      if (result.ok) {
        setAiNote(
          result.decision === 'same'
            ? t('recipes.aiLikelyDuplicate', 'Local AI thinks these are the same ingredient. Review before continuing.')
            : result.decision === 'different'
              ? t('recipes.aiLikelyDifferent', 'Local AI thinks these are different forms.')
              : t('recipes.aiUnsureDuplicate', 'Local AI is unsure; choose the correct option.'),
        );
      }
      setAiChecking(false);
    }
  };

  const emitChosen = async (ingredient: Ingredient) => {
    onChoose(ingredient);
    void attachIngredientIcon(ingredient, settings);
  };

  const chooseLocal = (ingredient: Ingredient) => {
    if (selectedIds.includes(ingredient.id) && onUnchoose) {
      onUnchoose(ingredient);
      return;
    }
    void emitChosen(ingredient);
    setQuery('');
  };

  const addCustomFromQuery = async () => {
    const name = formatCustomIngredientName(query);
    if (!name || isProcessing) return;
    setIsProcessing(true);
    try {
      const category = inferCategory(name);
      const resolved = await ingredientsRepo.resolveOrCreate({
        name,
        benefit: '',
        inci: '',
        isSoapBase: false,
        active: true,
        category,
        measurementType: VOLUME_CATEGORIES.has(category) ? 'volume' : 'weight',
        aliases: [],
        sourceRefs: [{ provider: 'manual', id: canonicalizeIngredientName(name) || name }],
      });
      await onLibraryChanged?.();
      onChoose(resolved.ingredient);
      setQuery('');
      void (async () => {
        const withEs = await persistSpanishName(resolved.ingredient);
        await attachIngredientIcon(withEs, settings);
        await requestCustomIngredientIcon(withEs, settings);
        await onLibraryChanged?.();
      })();
    } finally {
      setIsProcessing(false);
    }
  };

  const chooseAtIndex = (index: number) => {
    const item = flattened[index];
    if (!item) return;
    if (item.type === 'custom') {
      void addCustomFromQuery();
      return;
    }
    if (item.type === 'local') {
      chooseLocal(item.ingredient);
    } else {
      void chooseSuggestion(item.suggestion);
    }
  };

  const createReviewed = async () => {
    if (!review?.name.trim()) return;
    setIsProcessing(true);
    try {
      const resolved = await ingredientsRepo.resolveOrCreate({
        ...suggestionToInput(review.suggestion, overlayIconKey(review.suggestion)),
        name: review.name.trim(),
      });
      await onLibraryChanged?.();
      await emitChosen(resolved.ingredient);
      setReview(null);
      setQuery('');
      void persistSpanishName(resolved.ingredient).then(async (updated) => {
        if (updated.nameEs !== resolved.ingredient.nameEs) await onLibraryChanged?.();
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const useExisting = async () => {
    if (!review?.resolution.match) return;
    setIsProcessing(true);
    try {
      await emitChosen(review.resolution.match);
      setReview(null);
      setQuery('');
    } finally {
      setIsProcessing(false);
    }
  };

  const deleteLocal = async (e: React.MouseEvent, ingredient: Ingredient) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm(t('ingredients.confirmDelete', { defaultValue: 'Are you sure you want to delete this ingredient from your library?' }))) return;
    onUnchoose?.(ingredient);
    await ingredientsRepo.remove(ingredient.id);
    await onLibraryChanged?.();
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(flattened.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === 'Enter' && activeIndex >= 0) {
      event.preventDefault();
      chooseAtIndex(activeIndex);
    } else if (event.key === 'Escape') {
      setReview(null);
      setQuery('');
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          role="combobox"
          aria-expanded={catalogFlattened.length > 0 || showCustomAdd}
          aria-autocomplete="list"
          aria-controls="ingredient-autocomplete-results"
          autoComplete="off"
          className="input w-full pl-9 pr-9"
          placeholder={t('recipes.ingredientSearchPlaceholder', 'Search your library, the bundled catalog, or online…')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gaia-500">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}
      </div>

      {offline && (
        <p className="flex items-center gap-1.5 text-xs text-amber-700">
          <WifiOff className="h-3.5 w-3.5" />
          {t('recipes.onlineSearchUnavailable', 'Online search is unavailable. Your library and bundled soap-maker catalog still work.')}
        </p>
      )}

      {review ? (
        <div className="space-y-3 rounded-xl border border-gaia-200 bg-gaia-50/50 p-3">
          <div>
            <p className="ui-label font-semibold uppercase tracking-wide text-gaia-700">
              {t('recipes.reviewIngredient', 'Review Ingredient')}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {t('recipes.reviewCommonNameHint', 'Use a clear common name for your US label. The INCI name is stored separately.')}
            </p>
          </div>
          <label className="block text-xs font-medium text-slate-600">
            {t('ingredients.name', 'Common name')}
            <input
              className="input mt-1 w-full"
              value={review.name}
              onChange={(event) => setReview({ ...review, name: event.target.value })}
            />
          </label>
          {review.suggestion.inci && (
            <p className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-100">
              <strong>INCI:</strong> {review.suggestion.inci}
            </p>
          )}
          {review.resolution.match && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-200">
              <p className="font-semibold">{t('recipes.possibleDuplicate', 'Possible duplicate')}</p>
              <p>{getIngredientDisplayName(review.resolution.match.name, t)}</p>
            </div>
          )}
          {aiChecking && (
            <p className="flex items-center gap-1.5 text-xs text-violet-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('recipes.aiCheckingDuplicate', 'Local AI is comparing the names…')}
            </p>
          )}
          {aiNote && (
            <p className="flex items-start gap-1.5 text-xs text-violet-700">
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {aiNote}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <button className="btn-secondary" onClick={() => setReview(null)} disabled={isProcessing}>
              {t('common.cancel', 'Cancel')}
            </button>
            {review.resolution.match && (
              <button className="btn-secondary" onClick={() => void useExisting()} disabled={isProcessing}>
                {t('recipes.useExistingIngredient', 'Use Existing')}
              </button>
            )}
            <button className="btn-primary" onClick={() => void createReviewed()} disabled={isProcessing}>
              {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" />}
              {t('recipes.addAsNewIngredient', 'Add As New')}
            </button>
          </div>
        </div>
      ) : (
        <div id="ingredient-autocomplete-results" role="listbox" className="max-h-72 overflow-y-auto px-1 py-0.5">
          {(showCustomAdd || showFoodBotanicalHeader) && (
            <div className="sticky top-0 z-10 -mx-1 mb-3 bg-white px-1 pt-0.5">
              {showFoodBotanicalHeader && (
                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  {t('recipes.foodResults', 'Food and botanical ingredients')}
                </p>
              )}
              {showCustomAdd && (
                <button
                  type="button"
                  role="option"
                  aria-selected={activeIndex === 0}
                  className={`add-custom-ingredient-row flex w-full items-center gap-2 rounded-xl border border-dashed px-3 py-2 text-left text-sm font-medium transition ${
                    activeIndex === 0 ? 'is-active' : ''
                  }`}
                  disabled={isProcessing}
                  onClick={() => void addCustomFromQuery()}
                >
                  {isProcessing
                    ? <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                    : <Plus className="h-4 w-4 shrink-0" />}
                  <span className="min-w-0">
                    {t('recipes.addQueryAsCustom', 'Add "{{query}}" as custom', { query: trimmedQuery })}
                  </span>
                </button>
              )}
            </div>
          )}
          <div className="space-y-3">
            <ResultGroup
              title={t('recipes.alreadyInLibrary', 'Already in your library')}
              empty={false}
            >
              {local.map((ingredient, index) => (
                <IngredientRow
                  key={ingredient.id}
                  active={activeIndex === index + customOffset}
                  selected={selectedIds.includes(ingredient.id)}
                  isGenerating={generatingIds.has(ingredient.id) || localGenerating.has(ingredient.id)}
                  ingredient={ingredient}
                  iconKey={iconOverrides[ingredient.id] ?? ingredient.iconKey}
                  onClick={() => chooseLocal(ingredient)}
                  onRegenerate={settings.comfyUiEnabled
                    ? (event) => {
                        event.stopPropagation();
                        event.preventDefault();
                        void regenerateLibraryIcon(ingredient);
                      }
                    : undefined}
                  onDelete={(e) => void deleteLocal(e, ingredient)}
                />
              ))}
            </ResultGroup>
            {query.trim().length >= 1 && (
              <SuggestionGroup
                key={`catalog-${query}`}
                title={t('recipes.bundledCatalogResults', 'Add From Catalog')}
                suggestions={bundled}
                offset={customOffset + local.length}
                activeIndex={activeIndex}
                generatingKeys={localGenerating}
                iconOverrides={iconOverrides}
                onChoose={(suggestion) => void chooseSuggestion(suggestion)}
                onRegenerate={settings.comfyUiEnabled
                  ? (suggestion) => void regenerateSuggestionIcon(suggestion)
                  : undefined}
              />
            )}
            {query.trim().length >= 2 && (
              <>
                <SuggestionGroup
                  key={`cosmetic-${query}`}
                  title={t('recipes.cosmeticResults', 'Cosmetic ingredients')}
                  suggestions={cosmeticVisible}
                  offset={customOffset + local.length + bundled.length}
                  activeIndex={activeIndex}
                  generatingKeys={localGenerating}
                  iconOverrides={iconOverrides}
                  onChoose={(suggestion) => void chooseSuggestion(suggestion)}
                  onRegenerate={settings.comfyUiEnabled
                    ? (suggestion) => void regenerateSuggestionIcon(suggestion)
                    : undefined}
                />
                <SuggestionGroup
                  key={`food-${query}`}
                  title={showFoodBotanicalHeader ? '' : t('recipes.foodResults', 'Food and botanical ingredients')}
                  suggestions={foodVisible}
                  offset={customOffset + local.length + bundled.length + cosmeticVisible.length}
                  activeIndex={activeIndex}
                  generatingKeys={localGenerating}
                  iconOverrides={iconOverrides}
                  onChoose={(suggestion) => void chooseSuggestion(suggestion)}
                  onRegenerate={settings.comfyUiEnabled
                    ? (suggestion) => void regenerateSuggestionIcon(suggestion)
                    : undefined}
                />
              </>
            )}
            {!loading && catalogFlattened.length === 0 && trimmedQuery.length >= 1 && (
              <p className="rounded-xl bg-slate-50 py-6 text-center text-sm text-slate-400">
                {t('ingredients.noResults', 'No ingredients match your search.')}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Name area fills leftover space; NEW + actions stay reserved so ES starts at the same X. */
const LIBRARY_ROW_GRID =
  'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_2.75rem_5.25rem] items-center';

/** Shared tracks: 26px icon | EN badge | EN name | ES badge | ES name */
const AUTOCOMPLETE_NAME_GRID =
  'grid min-w-0 w-full grid-cols-[1.625rem_1.25rem_minmax(0,1fr)_1.25rem_minmax(0,1fr)] items-center gap-x-2 py-[calc(0.5rem*1.08)] pl-3';

function ResultGroup({
  title,
  children,
}: {
  title: string;
  empty?: boolean;
  children: React.ReactNode;
}) {
  if (!children || (Array.isArray(children) && children.length === 0)) return null;
  return (
    <section>
      {title ? (
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{title}</p>
      ) : null}
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function IngredientRow({
  ingredient,
  iconKey,
  active,
  selected,
  isGenerating,
  onClick,
  onRegenerate,
  onDelete,
}: {
  ingredient: Ingredient;
  iconKey?: string;
  active: boolean;
  selected: boolean;
  isGenerating?: boolean;
  onClick: () => void;
  onRegenerate?: (e: React.MouseEvent) => void;
  onDelete?: (e: React.MouseEvent) => void;
}) {
  const { t } = useTranslation();
  const accent = newlyAddedLibraryAccent(ingredient);
  const isNew = isNewlyAddedLibraryIngredient(ingredient);
  return (
    <div
      className={`group ${LIBRARY_ROW_GRID} rounded-xl transition ${
        libraryIngredientRowClass(ingredient, { selected, active })
      }`}
    >
      <button
        type="button"
        id={`ingredient-autocomplete-item-${ingredient.id}`}
        role="option"
        aria-selected={selected || active}
        className={`${AUTOCOMPLETE_NAME_GRID} text-left`}
        onClick={onClick}
      >
        <IngredientIcon category={ingredient.category} name={ingredient.name} iconKey={iconKey ?? ingredient.iconKey} size="sm" loading={isGenerating} />
        <BilingualIngredientName
          layout="contents"
          name={ingredient.name}
          inci={ingredient.inci}
          nameEs={ingredient.nameEs}
          aliases={ingredient.aliases}
          subtitle={ingredient.inci ? (
            <span className="mt-0.5 block break-words text-[11px] leading-4 text-slate-400">{ingredient.inci}</span>
          ) : undefined}
        />
      </button>
      <div className="flex justify-end">
        {isNew && accent && (
          <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${accent.pill}`}>
            {t('ingredients.newBadge', 'New')}
          </span>
        )}
      </div>
      <div className="mr-1.5 flex items-center justify-end gap-0.5">
        <span className="flex w-4 shrink-0 items-center justify-center">
          {selected ? <Check className="h-4 w-4 text-gaia-600" aria-hidden /> : null}
        </span>
        {onRegenerate && (
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-1.5 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
            onClick={onRegenerate}
            disabled={isGenerating}
            title={t('recipes.regenerateIcon', 'Regenerate Icon')}
            aria-label={t('recipes.regenerateIcon', 'Regenerate Icon')}
          >
            <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            className="flex items-center justify-center rounded-lg p-1.5 text-rose-500 transition hover:bg-rose-50 hover:text-rose-700"
            onClick={onDelete}
            title={t('common.delete', 'Delete')}
            aria-label={t('common.delete', 'Delete')}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

function SuggestionGroup({
  title,
  suggestions,
  offset,
  activeIndex,
  generatingKeys,
  iconOverrides,
  onChoose,
  onRegenerate,
}: {
  title: string;
  suggestions: IngredientCatalogSuggestion[];
  offset: number;
  activeIndex: number;
  generatingKeys?: Set<string>;
  iconOverrides?: Record<string, string>;
  onChoose: (suggestion: IngredientCatalogSuggestion) => void;
  onRegenerate?: (suggestion: IngredientCatalogSuggestion) => void;
}) {
  const { t } = useTranslation();
  if (!suggestions.length) return null;
  return (
    <ResultGroup title={title}>
      {suggestions.map((suggestion, index) => {
        const rowKey = suggestionRowKey(suggestion);
        const isGenerating = generatingKeys?.has(rowKey);
        const iconKey = iconOverrides?.[rowKey] ?? suggestion.iconKey;
        return (
          <div
            key={rowKey}
            className={`group ${LIBRARY_ROW_GRID} rounded-xl ring-1 transition ${
              activeIndex === offset + index
                ? 'bg-gaia-50 ring-gaia-300'
                : 'bg-white ring-slate-100 hover:bg-slate-50'
            }`}
          >
            <button
              type="button"
              role="option"
              aria-selected={activeIndex === offset + index}
              className={`${AUTOCOMPLETE_NAME_GRID} text-left text-sm`}
              aria-label={`${suggestion.name} / ${suggestion.nameEs || suggestion.inci || suggestion.name}`}
              onClick={() => onChoose(suggestion)}
            >
              <IngredientIcon category={suggestion.category} name={suggestion.name} iconKey={iconKey} size="sm" loading={isGenerating} />
              <BilingualIngredientName
                layout="contents"
                name={suggestion.name}
                inci={suggestion.inci}
                nameEs={suggestion.nameEs}
                aliases={suggestion.aliases}
                subtitle={
                  <span className="mt-0.5 block break-words text-[11px] leading-4 text-slate-400">
                    {suggestion.inci || suggestion.description || suggestion.provider}
                  </span>
                }
              />
            </button>
            <div aria-hidden="true" />
            <div className="mr-1.5 flex items-center justify-end gap-0.5">
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase text-slate-500">
                {suggestion.provider === 'cosing' ? 'CosIng' : suggestion.provider === 'openfoodfacts' ? 'OFF' : 'Catalog'}
              </span>
              {onRegenerate && (
                <button
                  type="button"
                  className="flex items-center justify-center rounded-lg p-1.5 text-blue-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                  onClick={(event) => {
                    event.stopPropagation();
                    event.preventDefault();
                    onRegenerate(suggestion);
                  }}
                  disabled={isGenerating}
                  title={t('recipes.regenerateIcon', 'Regenerate Icon')}
                  aria-label={t('recipes.regenerateIcon', 'Regenerate Icon')}
                >
                  <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </ResultGroup>
  );
}




