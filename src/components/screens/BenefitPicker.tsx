import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Lightbulb, Search, Sparkles, X } from 'lucide-react';
import { BENEFIT_CATEGORIES, MODULAR_BENEFITS } from '@/data/benefits';
import type { IngredientCategory } from '@/types';

// ---------------------------------------------------------------------------
// Ingredient-category → benefit-category mapping for quick-pick suggestions
// ---------------------------------------------------------------------------
const CATEGORY_MAP: Partial<Record<IngredientCategory, string[]>> = {
  oil:            ['Moisturizing', 'Nourishing', 'Conditioning'],
  butter:         ['Moisturizing', 'Nourishing', 'Conditioning'],
  milk:           ['Conditioning', 'Nourishing', 'Moisturizing', 'Sensitive Skin'],
  clay:           ['Detoxifying', 'Mineral-Rich', 'Balancing', 'Acne & Blemish'],
  botanical:      ['Healing', 'Soothing', 'Anti-aging', 'Natural & Clean'],
  floral:         ['Aromatherapy — Calming', 'Aromatherapy — Romantic', 'Soothing'],
  citrus:         ['Brightening', 'Aromatherapy — Uplifting'],
  exfoliant:      ['Exfoliating'],
  'essential-oil':['Aromatherapy — Calming', 'Aromatherapy — Uplifting', 'Aromatherapy — Grounding'],
  fragrance:      ['Aromatherapy — Calming', 'Aromatherapy — Uplifting'],
  base:           ['Cleansing', 'Conditioning'],
  seed:           ['Nourishing', 'Moisturizing', 'Anti-aging'],
  spice:          ['Warming & Stimulating', 'Detoxifying'],
  wax:            ['Protective', 'Moisturizing'],
  additive:       ['Multi-Benefit'],
  colorant:       [],
  other:          [],
};

const MAX_SELECTED = 3;
const JOINER = ' · ';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
export interface BenefitPickerProps {
  value: string;
  onChange: (val: string) => void;
  /** Categories of active ingredients in the current recipe for quick-pick. */
  ingredientCategories?: IngredientCategory[];
}

// ---------------------------------------------------------------------------
// BenefitPicker
// ---------------------------------------------------------------------------
export default function BenefitPicker({ value, onChange, ingredientCategories = [] }: BenefitPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Parse the stored string back into an array of benefit labels
  const selected: string[] = useMemo(
    () => (value ? value.split(JOINER).map((s) => s.trim()).filter(Boolean) : []),
    [value],
  );

  // Commit current selection back to parent
  const commit = (labels: string[]) => onChange(labels.join(JOINER));

  const addBenefit = (label: string) => {
    if (selected.includes(label)) return;
    if (selected.length >= MAX_SELECTED) {
      commit([...selected.slice(1), label]);
    } else {
      commit([...selected, label]);
    }
  };

  const removeBenefit = (label: string) => commit(selected.filter((l) => l !== label));
  const clearAll = () => onChange('');

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

  // Quick-pick suggestions derived from active ingredient categories
  const suggestions = useMemo(() => {
    if (!ingredientCategories.length) return [];
    const benefitCats = new Set<string>();
    for (const ic of ingredientCategories) {
      (CATEGORY_MAP[ic] ?? []).forEach((bc) => benefitCats.add(bc));
    }
    if (!benefitCats.size) return [];
    const candidates = MODULAR_BENEFITS.filter((b) => benefitCats.has(b.category));
    // Shuffle-ish: sort by how many ingredient categories match, take top 5
    const scored = candidates.map((b) => ({
      b,
      score: (CATEGORY_MAP as Record<string, string[]>)[b.category]
        ? ingredientCategories.filter((ic) => (CATEGORY_MAP[ic] ?? []).includes(b.category)).length
        : 0,
    }));
    scored.sort((a, b_) => b_.score - a.score);
    return scored.slice(0, 5).map((s) => s.b);
  }, [ingredientCategories]);

  // Filtered benefits list
  const filtered = useMemo(() => {
    let list = MODULAR_BENEFITS;
    if (activeCategory) list = list.filter((b) => b.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (b) => b.label.toLowerCase().includes(q) || b.category.toLowerCase().includes(q),
      );
    }
    return list;
  }, [activeCategory, search]);

  const hasSuggestions = suggestions.length > 0 && !search && !activeCategory;

  return (
    <div ref={containerRef} className="relative">
      {/* ── Trigger / selected chips display ──────────────────────────────── */}
      <div
        className={`flex min-h-[38px] w-full cursor-pointer flex-wrap items-center gap-1.5 rounded-xl border bg-white px-3 py-2 text-sm transition focus-within:ring-2 focus-within:ring-gaia-400 ${
          open ? 'border-gaia-400 ring-2 ring-gaia-400' : 'border-slate-200 hover:border-gaia-300'
        }`}
        onClick={() => setOpen((o) => !o)}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {selected.length === 0 ? (
          <span className="flex-1 text-slate-400">{t('benefitPicker.placeholder')}</span>
        ) : (
          selected.map((label) => (
            <span
              key={label}
              className="flex items-center gap-1 rounded-full bg-gaia-100 px-2.5 py-0.5 text-xs font-medium text-gaia-800"
            >
              {label}
              <button
                type="button"
                className="ml-0.5 rounded-full text-gaia-500 hover:text-gaia-800"
                onClick={(e) => { e.stopPropagation(); removeBenefit(label); }}
                aria-label={t('benefitPicker.removeBenefit')}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))
        )}
        <span className="ml-auto flex shrink-0 items-center gap-1 text-slate-400">
          {selected.length > 0 && (
            <button
              type="button"
              className="rounded-full p-0.5 hover:text-slate-600"
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              aria-label={t('benefitPicker.clearAll')}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        </span>
      </div>

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
                {cat}
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
                  {t('benefitPicker.suggestions')}
                </p>
                <ul className="space-y-0.5">
                  {suggestions.map((b) => {
                    const isSelected = selected.includes(b.label);
                    return (
                      <BenefitRow
                        key={b.id}
                        label={b.label}
                        category={b.category}
                        isSelected={isSelected}
                        isSuggestion
                        onClick={() => isSelected ? removeBenefit(b.label) : addBenefit(b.label)}
                      />
                    );
                  })}
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
                {filtered.map((b) => {
                  const isSelected = selected.includes(b.label);
                  return (
                    <BenefitRow
                      key={b.id}
                      label={b.label}
                      category={b.category}
                      isSelected={isSelected}
                      onClick={() => isSelected ? removeBenefit(b.label) : addBenefit(b.label)}
                    />
                  );
                })}
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
