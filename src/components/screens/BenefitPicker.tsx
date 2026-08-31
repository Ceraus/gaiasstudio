import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Blend, Lightbulb, Search, Shuffle, Sparkles, X } from 'lucide-react';
import { BENEFIT_CATEGORIES, MODULAR_BENEFITS, type BenefitEntry } from '@/data/benefits';
import {
  allBenefitLabelVariants,
  displayStoredBenefitLabel,
  getBenefitCategoryLabel,
  getBenefitLabel,
  isBenefitSelected,
  localizeMixPhrases,
} from '@/lib/benefitI18n';
import {
  BENEFIT_MIX_JOINER,
  INGREDIENT_CATEGORY_TO_BENEFITS,
  mixBenefitsForIngredients,
  type BenefitMixIngredient,
} from '@/lib/benefitMix';
import { ingredientsForBenefitCopy } from '@/lib/ingredientSkinFeel';
import type { IngredientCategory } from '@/types';

const MAX_SELECTED = 3;
const JOINER = BENEFIT_MIX_JOINER;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BenefitPickerProps {
  value: string;
  onChange: (val: string) => void;
  /** When Local AI is reachable, hide the offline mix-and-match UI. */
  aiOnline?: boolean;
  /** Categories of active ingredients in the current recipe for quick-pick. */
  ingredientCategories?: IngredientCategory[];
  /** Recipe ingredients — used by the offline mix-max to pick a best combo. */
  ingredients?: BenefitMixIngredient[];
}

function phraseToEntry(phrase: string): BenefitEntry | undefined {
  return MODULAR_BENEFITS.find((b) => b.label === phrase)
    ?? MODULAR_BENEFITS.find((b) => allBenefitLabelVariants(b).includes(phrase));
}

// ---------------------------------------------------------------------------
// BenefitPicker
// ---------------------------------------------------------------------------
export default function BenefitPicker({
  value,
  onChange,
  aiOnline = false,
  ingredientCategories = [],
  ingredients = [],
}: BenefitPickerProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [mixVariant, setMixVariant] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const onChangeRef = useRef(onChange);
  const appliedMixRef = useRef('');
  const skipAutoRef = useRef(false);
  const lastMixSigRef = useRef('');
  onChangeRef.current = onChange;

  // Parse the stored string back into an array of benefit labels
  const selected: string[] = useMemo(
    () => (value ? value.split(JOINER).map((s) => s.trim()).filter(Boolean) : []),
    [value],
  );

  // Commit current selection back to parent
  const commit = (labels: string[]) => onChange(labels.join(JOINER));

  const addBenefit = (b: BenefitEntry) => {
    const label = getBenefitLabel(b, t);
    if (isBenefitSelected(b, selected)) return;
    if (selected.length >= MAX_SELECTED) {
      commit([...selected.slice(1), label]);
    } else {
      commit([...selected, label]);
    }
  };

  const removeBenefit = (b: BenefitEntry) => {
    const variants = new Set(allBenefitLabelVariants(b));
    commit(selected.filter((l) => !variants.has(l)));
  };

  const toggleBenefit = (b: BenefitEntry) => {
    if (isBenefitSelected(b, selected)) removeBenefit(b);
    else addBenefit(b);
  };

  const removeStoredLabel = (stored: string) => commit(selected.filter((l) => l !== stored));
  const clearAll = () => {
    skipAutoRef.current = true;
    appliedMixRef.current = '';
    onChange('');
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Focus search on open
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const mixIngredients = useMemo<BenefitMixIngredient[]>(() => {
    if (ingredients.length) return ingredientsForBenefitCopy(ingredients);
    return ingredientCategories.map((category) => ({ name: category, category }));
  }, [ingredients, ingredientCategories]);

  const mix = useMemo(
    () => mixBenefitsForIngredients(mixIngredients, mixVariant),
    [mixIngredients, mixVariant],
  );

  const mixLabels = useMemo(
    () => localizeMixPhrases(mix.phrases, t),
    [mix.phrases, t, i18n.language],
  );

  const mixLine = mixLabels.join(JOINER);
  const mixSignature = mixIngredients
    .map((item) => `${item.name}\0${item.category ?? ''}`)
    .join('|');
  const mixIsApplied = Boolean(mixLine) && value === mixLine;

  const forceApplyRef = useRef(false);

  const applyMix = (line: string) => {
    if (!line) return;
    skipAutoRef.current = false;
    appliedMixRef.current = line;
    onChangeRef.current(line);
  };

  const shuffleMix = () => {
    skipAutoRef.current = false;
    forceApplyRef.current = true;
    setMixVariant((current) => current + 1);
  };

  // Auto-fill (or refresh) the best generic combo when ingredients change,
  // unless Ollama is online or the user cleared / picked a custom mix.
  useEffect(() => {
    if (aiOnline) return;
    if (!mixLine) return;
    if (mixSignature !== lastMixSigRef.current) {
      lastMixSigRef.current = mixSignature;
      skipAutoRef.current = false;
      if (mixVariant !== 0) {
        setMixVariant(0);
        return;
      }
    }
    if (skipAutoRef.current) return;
    const force = forceApplyRef.current;
    forceApplyRef.current = false;
    const empty = !value.trim();
    const stillAuto = value === appliedMixRef.current;
    if ((force || empty || stillAuto) && value !== mixLine) applyMix(mixLine);
    else if (empty || stillAuto) appliedMixRef.current = mixLine;
  }, [aiOnline, mixLine, mixSignature, mixVariant, value]);

  // Quick-pick suggestions: mix-max phrases first, then category fallbacks.
  const suggestions = useMemo(() => {
    const fromMix = mix.phrases
      .map(phraseToEntry)
      .filter((entry): entry is BenefitEntry => !!entry);
    if (fromMix.length) return fromMix;

    if (!ingredientCategories.length) return [];
    const benefitCats = new Set<string>();
    for (const ic of ingredientCategories) {
      (INGREDIENT_CATEGORY_TO_BENEFITS[ic] ?? []).forEach((bc) => benefitCats.add(bc));
    }
    if (!benefitCats.size) return [];
    const candidates = MODULAR_BENEFITS.filter((b) => benefitCats.has(b.category));
    const scored = candidates.map((b) => ({
      b,
      score: ingredientCategories.filter((ic) => (INGREDIENT_CATEGORY_TO_BENEFITS[ic] ?? []).includes(b.category)).length,
    }));
    scored.sort((a, b_) => b_.score - a.score);
    return scored.slice(0, 5).map((s) => s.b);
  }, [mix.phrases, ingredientCategories]);

  // Filtered benefits list
  const filtered = useMemo(() => {
    let list = MODULAR_BENEFITS;
    if (activeCategory) list = list.filter((b) => b.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((b) => {
        const label = getBenefitLabel(b, t).toLowerCase();
        const category = getBenefitCategoryLabel(b.category, t).toLowerCase();
        return (
          label.includes(q)
          || category.includes(q)
          || b.label.toLowerCase().includes(q)
          || b.category.toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [activeCategory, search, t, i18n.language]);

  const hasSuggestions = !aiOnline && suggestions.length > 0 && !search && !activeCategory;

  return (
    <div ref={containerRef} className="relative">
      {!aiOnline && mixLabels.length > 0 && (
        <div className="mb-2 rounded-xl border border-gaia-100 bg-gaia-50/70 px-3 py-2">
          <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gaia-700">
            <Blend className="h-3 w-3 shrink-0" />
            {t('benefitPicker.bestMix', 'Best mix for these ingredients')}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {mixLabels.map((label, index) => (
              <span
                key={`${label}-${index}`}
                className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
              >
                {label}
              </span>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg bg-gaia-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-gaia-700 disabled:bg-gaia-300"
              onClick={() => applyMix(mixLine)}
              disabled={mixIsApplied}
            >
              <Blend className="h-3 w-3" />
              {mixIsApplied
                ? t('benefitPicker.bestMixApplied', 'Best mix applied')
                : t('benefitPicker.useBestMix', 'Use This Mix')}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-lg border border-gaia-200 bg-white px-2.5 py-1 text-[11px] font-medium text-gaia-800 transition hover:bg-gaia-50"
              onClick={shuffleMix}
            >
              <Shuffle className="h-3 w-3" />
              {t('benefitPicker.shuffleMix', 'Try Another Mix')}
            </button>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-500">
            {t('benefitPicker.bestMixHint', 'Offline mix of up to 3 generic benefits from your ingredients — no AI required.')}
          </p>
        </div>
      )}

      {/* ── Selected chips ────────────────────────────────────────────────── */}
      {selected.length > 0 && (
        <div
          className="flex w-full cursor-pointer flex-wrap items-center gap-1.5"
          onClick={() => setOpen((o) => !o)}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
        >
          {selected.map((stored) => (
            <span
              key={stored}
              className="flex items-center gap-1 rounded-full bg-gaia-100 px-2.5 py-0.5 text-xs font-medium text-gaia-800"
            >
              {displayStoredBenefitLabel(stored, t)}
              <button
                type="button"
                className="ml-0.5 rounded-full text-gaia-500 hover:text-gaia-800"
                onClick={(e) => { e.stopPropagation(); removeStoredLabel(stored); }}
                aria-label={t('benefitPicker.removeBenefit')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="rounded-full p-0.5 text-slate-400 hover:text-slate-600"
            onClick={(e) => { e.stopPropagation(); clearAll(); }}
            aria-label={t('benefitPicker.clearAll')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Hint under trigger ─────────────────────────────────────────────── */}
      {selected.length > 0 && selected.length < MAX_SELECTED && (
        <p className="mt-1 text-[11px] text-slate-400">
          {t('benefitPicker.combineTip', { max: MAX_SELECTED, current: selected.length })}
        </p>
      )}

      {/* ── Dropdown panel ────────────────────────────────────────────────── */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          {/* Search row */}
          <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              ref={searchRef}
              className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none"
              placeholder={t('benefitPicker.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Category pills */}
          <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 px-3 py-2 scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveCategory(null)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                activeCategory === null
                  ? 'bg-gaia-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {t('benefitPicker.allCategories')}
            </button>
            {BENEFIT_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  activeCategory === cat
                    ? 'bg-gaia-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {getBenefitCategoryLabel(cat, t)}
              </button>
            ))}
          </div>

          {/* Benefits list */}
          <div className="max-h-72 overflow-y-auto">
            {/* Quick-pick suggestions */}
            {hasSuggestions && (
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gaia-600">
                  <Lightbulb className="h-3 w-3" />
                  {mix.phrases.length
                    ? t('benefitPicker.bestMix', 'Best mix for these ingredients')
                    : t('benefitPicker.suggestions')}
                </p>
                <ul className="space-y-0.5">
                  {suggestions.map((b) => (
                    <BenefitRow
                      key={b.id}
                      label={getBenefitLabel(b, t)}
                      category={getBenefitCategoryLabel(b.category, t)}
                      isSelected={isBenefitSelected(b, selected)}
                      isSuggestion
                      onClick={() => toggleBenefit(b)}
                    />
                  ))}
                </ul>
              </div>
            )}

            {/* All / filtered benefits */}
            {filtered.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-slate-400">
                {t('benefitPicker.noResults')}
              </p>
            ) : (
              <ul className="divide-y divide-slate-50 py-1">
                {filtered.map((b) => (
                  <BenefitRow
                    key={b.id}
                    label={getBenefitLabel(b, t)}
                    category={getBenefitCategoryLabel(b.category, t)}
                    isSelected={isBenefitSelected(b, selected)}
                    onClick={() => toggleBenefit(b)}
                  />
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2">
            <p className="flex items-center gap-1 text-[11px] text-slate-400">
              <Sparkles className="h-3 w-3 text-gaia-400" />
              {t('benefitPicker.selectUpTo', { max: MAX_SELECTED })}
            </p>
            {selected.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-gaia-700 hover:underline"
                onClick={() => setOpen(false)}
              >
                {t('benefitPicker.done')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row sub-component
// ---------------------------------------------------------------------------
function BenefitRow({
  label,
  category,
  isSelected,
  isSuggestion,
  onClick,
}: {
  label: string;
  category: string;
  isSelected: boolean;
  isSuggestion?: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-start gap-2.5 px-3 py-2 text-left transition hover:bg-gaia-50 ${
          isSelected ? 'bg-gaia-50' : ''
        }`}
      >
        {/* Checkbox-style indicator */}
        <span
          className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition ${
            isSelected
              ? 'border-gaia-500 bg-gaia-500 text-white'
              : 'border-slate-300 bg-white'
          }`}
        >
          {isSelected && (
            <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 fill-current">
              <path d="M1.5 6L4.5 9L10.5 3" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm leading-snug text-slate-800">{label}</span>
          <span
            className={`mt-0.5 inline-block rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              isSuggestion
                ? 'bg-gaia-100 text-gaia-700'
                : 'bg-slate-100 text-slate-500'
            }`}
          >
            {category}
          </span>
        </span>
      </button>
    </li>
  );
}
