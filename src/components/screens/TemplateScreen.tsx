import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Cylinder, FlipHorizontal, LayoutGrid, Library, RectangleHorizontal, Search, Star, X } from 'lucide-react';
import averyData from '@/data/averyTemplates.json';
import type { AveryDataset, AveryTemplate, LabelContext, LabelShape } from '@/types';
import { describeSize } from '@/lib/units';
import {
  averyQueryDigits,
  isAveryNumberQuery,
  isHighCountSheet,
  isLowCountSheet,
  isTemplateSuggestQuery,
  splitCatalogByPerSheet,
  suggestTemplates,
  templateMatchesQuery,
} from '@/lib/templateCatalogGroups';
import { shapeColorTokens } from '@/lib/shapeColors';
import { useAppStore } from '@/store/useAppStore';
import ShapeThumb from '@/components/common/ShapeThumb';
import SheetMiniPreview from '@/components/common/SheetMiniPreview';
import Modal from '@/components/common/Modal';
import WorkflowNav from '@/components/WorkflowNav';
import TemplateFavoritesSetup from '@/components/screens/TemplateFavoritesSetup';
import {
  consumeTemplatePickerView,
  getFavoriteIds,
  isFavoritesConfigured,
  resolveFavoriteTemplates,
  toggleFavoriteId,
} from '@/lib/templateFavorites';

// ---------------------------------------------------------------------------
// Size helpers
// ---------------------------------------------------------------------------

type SizeCategory = 'all' | 'small' | 'medium' | 'large';

function maxDim(tpl: AveryTemplate): number {
  return Math.max(tpl.labelWidthIn, tpl.labelHeightIn);
}

function getSizeCategory(tpl: AveryTemplate): Exclude<SizeCategory, 'all'> {
  const d = maxDim(tpl);
  if (d < 2) return 'small';
  if (d <= 3.5) return 'medium';
  return 'large';
}

// ---------------------------------------------------------------------------
// Static data
// ---------------------------------------------------------------------------

const SIZE_FILTER_OPTIONS: { id: SizeCategory; labelKey: string; hintKey?: string }[] = [
  { id: 'all',    labelKey: 'template.allSizes' },
  { id: 'small',  labelKey: 'template.smallLabels',  hintKey: 'template.smallHint' },
  { id: 'medium', labelKey: 'template.mediumLabels', hintKey: 'template.mediumHint' },
  { id: 'large',  labelKey: 'template.largeLabels',  hintKey: 'template.largeHint' },
];

const SHAPE_FILTERS: { id: LabelShape | 'all'; labelKey: string }[] = [
  { id: 'all',               labelKey: 'template.allShapes'       },
  { id: 'circle',            labelKey: 'template.circle'          },
  { id: 'oval',              labelKey: 'template.oval'            },
  { id: 'square',            labelKey: 'template.square'          },
  { id: 'rectangle',         labelKey: 'template.rectangle'       },
  { id: 'rounded-rectangle', labelKey: 'template.roundedRectangle'},
];

/** Chip outline matches the Avery shape it filters — readable text beats perfect geometry. */
const SHAPE_FILTER_GEOMETRY: Record<LabelShape | 'all', string> = {
  all: 'rounded-full px-3 py-1.5',
  circle: 'rounded-full min-h-[2.75rem] min-w-[2.75rem] px-3.5 py-2.5',
  oval: 'rounded-full px-6 py-1',
  square: 'rounded-[4px] min-h-[2.5rem] min-w-[2.5rem] px-3 py-2',
  rectangle: 'rounded-[2px] px-6 py-1',
  'rounded-rectangle': 'rounded-2xl px-4 py-2.5',
};

const FACE_ICONS = {
  front: RectangleHorizontal,
  back: FlipHorizontal,
  side: Cylinder,
} as const;

const dataset = averyData as AveryDataset;

/** Uniform 85% of the post-2× detail card (column, type, icon, preview). */
const DETAIL_CARD_SCALE = 0.85;
const DETAIL_THUMB_PX = Math.round(128 * DETAIL_CARD_SCALE);
const DETAIL_PREVIEW_MAX_H = Math.round(380 * DETAIL_CARD_SCALE);
/** Size/shape header (thumb + copy): 15% smaller than the rest of the card. */
const DETAIL_HEADER_THUMB_PX = Math.round(DETAIL_THUMB_PX * 0.85);
/** Catalog list row (icon + three text lines) after equalizing line 3 to line 2. */
const CATALOG_ROW_SCALE = 1.08;
const CATALOG_THUMB_PX = Math.round(56 * CATALOG_ROW_SCALE);
const SUGGEST_THUMB_PX = 36;
const STAR_GOLD = 'fill-amber-400 text-amber-400';
const STAR_GOLD_HEX = '#fbbf24';

function GoldStar({ className }: { className?: string }) {
  return (
    <Star
      className={`${STAR_GOLD} ${className ?? ''}`}
      color={STAR_GOLD_HEX}
      fill={STAR_GOLD_HEX}
      stroke={STAR_GOLD_HEX}
      aria-hidden
    />
  );
}

function highlightAveryCode(code: string, query: string): ReactNode {
  if (!isAveryNumberQuery(query)) return code;
  const digits = averyQueryDigits(query);
  if (!digits || !code.toLowerCase().startsWith(digits.toLowerCase())) return code;
  return (
    <>
      <mark className="rounded-sm bg-gaia-100 px-0.5 font-bold text-gaia-800">{code.slice(0, digits.length)}</mark>
      <span className="font-medium text-slate-500">{code.slice(digits.length)}</span>
    </>
  );
}

function listCardSelector(templateId: string): string {
  return `[data-tour="template-grid"] [data-template-id="${templateId}"], [data-catalog-lane] [data-template-id="${templateId}"]`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TemplateSearchField({
  query,
  onQueryChange,
  suggestions,
  onPick,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  suggestions: AveryTemplate[];
  onPick: (tpl: AveryTemplate) => void;
}) {
  const { t } = useTranslation();
  const wrapRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const canOpen = focused && isTemplateSuggestQuery(query) && suggestions.length > 0;
  const showList = open && canOpen;

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  useEffect(() => {
    if (!showList) return;
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, showList]);

  useEffect(() => {
    if (!showList) return;
    const onPointer = (event: MouseEvent) => {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', onPointer);
    return () => window.removeEventListener('mousedown', onPointer);
  }, [showList]);

  function pick(tpl: AveryTemplate) {
    onPick(tpl);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      if (open) {
        event.preventDefault();
        setOpen(false);
      }
      return;
    }
    if (!canOpen) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (event.key === 'Enter') {
      const tpl = suggestions[activeIndex] ?? suggestions[0];
      if (!tpl) return;
      event.preventDefault();
      pick(tpl);
    }
  }

  return (
    <div className="relative w-full" ref={wrapRef}>
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        data-testid="template-search"
        className="input w-full pl-9"
        placeholder={t('template.searchPlaceholder')}
        value={query}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls="template-search-suggestions"
        aria-activedescendant={showList ? `template-suggest-${suggestions[activeIndex]?.id ?? ''}` : undefined}
        onChange={(e) => {
          onQueryChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => setFocused(false)}
        onKeyDown={onKeyDown}
      />
      {showList && (
        <ul
          id="template-search-suggestions"
          role="listbox"
          data-testid="template-search-suggestions"
          aria-label={t('template.searchSuggestions')}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-80 overflow-y-auto rounded-2xl bg-white py-1 shadow-xl ring-1 ring-slate-200"
        >
          {suggestions.map((tpl, index) => {
            const colors = shapeColorTokens(tpl.shape);
            const active = index === activeIndex;
            return (
              <li key={tpl.id} role="presentation">
                <button
                  type="button"
                  id={`template-suggest-${tpl.id}`}
                  role="option"
                  aria-selected={active}
                  data-testid={`template-suggest-${tpl.id}`}
                  ref={active ? activeRef : undefined}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(tpl)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition ${
                    active ? 'bg-gaia-50' : 'bg-white hover:bg-slate-50'
                  }`}
                >
                  <div className="shrink-0">
                    <ShapeThumb template={tpl} size={SUGGEST_THUMB_PX} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-800">
                      {tpl.averyCode ? (
                        <>
                          <span className="font-medium text-slate-500">Avery </span>
                          {highlightAveryCode(tpl.averyCode, query)}
                        </>
                      ) : (
                        describeSize(tpl)
                      )}
                    </span>
                    <span className="block truncate text-xs leading-snug text-slate-500">
                      <span style={{ color: colors.text }}>{describeSize(tpl)}</span>
                      {' · '}
                      {t('template.perSheet', { count: tpl.perSheet })}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TemplateCard({
  tpl,
  isSelected,
  onClick,
  isFavorite,
  onToggleFavorite,
  favoriteAction,
}: {
  tpl: AveryTemplate;
  isSelected: boolean;
  onClick: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  favoriteAction?: 'star' | 'remove';
}) {
  const { t } = useTranslation();
  const colors = shapeColorTokens(tpl.shape);
  return (
    <button
      type="button"
      data-template-id={tpl.id}
      data-shape-color={colors.hex}
      onClick={onClick}
      className="group relative flex w-full items-center gap-3 rounded-2xl bg-white px-3 py-2.5 text-left transition"
      style={{
        boxShadow: isSelected
          ? `0 0 0 2px ${colors.hex}, 0 1px 2px rgb(0 0 0 / 0.05)`
          : `0 0 0 1px ${colors.border}`,
      }}
    >
      {favoriteAction === 'remove' && (
        <GoldStar className="h-4 w-4 shrink-0" />
      )}
      <div className="shrink-0">
        <ShapeThumb template={tpl} size={CATALOG_THUMB_PX} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="block text-[length:calc(0.875rem*1.08*1.04)] font-bold leading-tight" style={{ color: colors.text }}>
          {describeSize(tpl)}
        </span>
        <span className="block truncate text-[length:calc(11px*1.08*1.04)] leading-snug text-slate-500">
          {tpl.name}
        </span>
        <span className="block truncate text-[length:calc(11px*1.08*1.04)] leading-snug text-slate-500">
          {t('template.perSheet', { count: tpl.perSheet })}
          {tpl.averyCode && ` · Avery ${tpl.averyCode}`}
        </span>
      </div>
      {favoriteAction && onToggleFavorite && (
        <span
          role="button"
          tabIndex={0}
          aria-label={isFavorite ? t('template.removeFavorite') : t('template.addFavorite')}
          data-testid={favoriteAction === 'remove' ? `template-remove-favorite-${tpl.id}` : undefined}
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onToggleFavorite();
            }
          }}
          className={`shrink-0 rounded-full transition ${
            favoriteAction === 'remove'
              ? 'flex h-7 w-7 items-center justify-center bg-rose-600 text-white shadow-md hover:bg-rose-700'
              : `p-1.5 ${
                  isFavorite
                    ? STAR_GOLD
                    : 'text-slate-300 hover:text-amber-400'
                }`
          }`}
        >
          {favoriteAction === 'remove'
            ? <X className="h-4 w-4" />
            : isFavorite
              ? <GoldStar className="h-4 w-4" />
              : <Star className="h-4 w-4" />}
        </span>
      )}
    </button>
  );
}

function ShapeFilterChip({
  id,
  label,
  selected,
  onClick,
}: {
  id: LabelShape | 'all';
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  if (id === 'all') {
    return (
      <button
        type="button"
        data-testid={`shape-filter-${id}`}
        onClick={onClick}
        data-selected={selected ? 'true' : 'false'}
        className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ${
          SHAPE_FILTER_GEOMETRY.all
        } ${
          selected
            ? 'bg-gaia-600 text-white'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
        }`}
      >
        {label}
      </button>
    );
  }

  const colors = shapeColorTokens(id);
  return (
    <button
      type="button"
      data-testid={`shape-filter-${id}`}
      data-shape-color={colors.hex}
      onClick={onClick}
      data-selected={selected ? 'true' : 'false'}
      className={`inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ${
        SHAPE_FILTER_GEOMETRY[id]
      }`}
      style={
        selected
          ? { backgroundColor: colors.hex, color: '#ffffff' }
          : {
              backgroundColor: colors.tint,
              color: colors.text,
              boxShadow: `inset 0 0 0 1px ${colors.border}`,
            }
      }
    >
      {label}
    </button>
  );
}

type SizeGlyphSpec = { w: number; h: number; radius: string };

/** Artwork scales Small < Medium < Large; captions stay readable beside/under the glyph. */
const SIZE_GLYPH: Record<Exclude<SizeCategory, 'all'>, Record<LabelShape | 'all', SizeGlyphSpec>> = {
  small: {
    all: { w: 22, h: 14, radius: '8px' },
    circle: { w: 18, h: 18, radius: '9999px' },
    oval: { w: 26, h: 14, radius: '9999px' },
    square: { w: 16, h: 16, radius: '4px' },
    rectangle: { w: 24, h: 12, radius: '2px' },
    'rounded-rectangle': { w: 24, h: 14, radius: '8px' },
  },
  medium: {
    all: { w: 32, h: 20, radius: '10px' },
    circle: { w: 28, h: 28, radius: '9999px' },
    oval: { w: 38, h: 20, radius: '9999px' },
    square: { w: 26, h: 26, radius: '4px' },
    rectangle: { w: 36, h: 18, radius: '2px' },
    'rounded-rectangle': { w: 36, h: 20, radius: '12px' },
  },
  large: {
    all: { w: 44, h: 28, radius: '12px' },
    circle: { w: 38, h: 38, radius: '9999px' },
    oval: { w: 50, h: 28, radius: '9999px' },
    square: { w: 36, h: 36, radius: '4px' },
    rectangle: { w: 48, h: 24, radius: '2px' },
    'rounded-rectangle': { w: 48, h: 28, radius: '16px' },
  },
};

function SizeFilterChip({
  id,
  label,
  hint,
  shape,
  selected,
  onClick,
}: {
  id: SizeCategory;
  label: string;
  hint: string;
  shape: LabelShape | 'all';
  selected: boolean;
  onClick: () => void;
}) {
  if (id === 'all') {
    return (
      <button
        type="button"
        data-testid="size-filter-all"
        onClick={onClick}
        className={`flex min-h-9 items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition ${
          selected
            ? 'bg-gaia-100 text-gaia-700 ring-1 ring-gaia-300'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
        }`}
      >
        {label}
      </button>
    );
  }

  const glyph = SIZE_GLYPH[id][shape];
  const colors = shape !== 'all' ? shapeColorTokens(shape) : null;
  const selectedStyle = colors
    ? { backgroundColor: colors.tint, color: colors.text, boxShadow: `inset 0 0 0 1px ${colors.border}` }
    : undefined;
  return (
    <button
      type="button"
      data-testid={`size-filter-${id}`}
      data-size-shape={shape}
      onClick={onClick}
      className={`flex min-h-[5.25rem] min-w-[4.75rem] flex-col items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium transition ${
        selected && colors
          ? ''
          : selected
            ? 'bg-gaia-100 text-gaia-700 ring-1 ring-gaia-300'
            : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
      }`}
      style={selected && colors ? selectedStyle : undefined}
    >
      <span className="flex w-full items-center justify-center" aria-hidden="true">
        <span
          data-size-glyph={id}
          className={`box-border border-2 ${
            colors
              ? ''
              : selected
                ? 'border-gaia-600 bg-gaia-200/80'
                : 'border-slate-300 bg-white'
          }`}
          style={{
            width: glyph.w,
            height: glyph.h,
            borderRadius: glyph.radius,
            ...(colors
              ? {
                  borderColor: selected ? colors.hex : colors.border,
                  backgroundColor: selected ? colors.tint : '#ffffff',
                }
              : {}),
          }}
        />
      </span>
      <span className="flex flex-col items-center leading-tight">
        <span>{label}</span>
        {hint && (
          <span
            className={`text-[10px] font-normal ${
              selected && !colors ? 'text-gaia-500' : 'text-slate-400'
            }`}
            style={selected && colors ? { color: colors.text } : undefined}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

export default function TemplateScreen() {
  const settings = useAppStore((s) => s.settings);

  if (!isFavoritesConfigured(settings)) {
    return <TemplateFavoritesSetup />;
  }

  return <TemplatePickerMain />;
}

function TemplatePickerMain() {
  const { t } = useTranslation();
  const setTemplate    = useAppStore((s) => s.setTemplate);
  const setContext     = useAppStore((s) => s.setContext);
  const context        = useAppStore((s) => s.context);
  const storedTemplate = useAppStore((s) => s.template);
  const goto           = useAppStore((s) => s.goto);
  const settings       = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const favoriteIds = useMemo(() => new Set(getFavoriteIds(settings)), [settings]);

  const [viewMode, setViewMode] = useState<'mine' | 'catalog'>(() => consumeTemplatePickerView() ?? 'mine');

  const favoriteTemplates = useMemo(
    () => resolveFavoriteTemplates(dataset.templates, settings),
    [settings],
  );

  const defaultSelectedId = storedTemplate?.id ?? favoriteTemplates[0]?.id ?? 'round-2';

  const [shape,       setShape]       = useState<LabelShape | 'all'>('all');
  const [sizeFilter,  setSizeFilter]  = useState<SizeCategory>('all');
  const [query,       setQuery]       = useState('');
  const [selectedId,  setSelectedId]  = useState<string>(defaultSelectedId);
  const [lowCountOpen, setLowCountOpen] = useState(false);
  const [highCountOpen, setHighCountOpen] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const pendingScrollId = useRef<string | null>(null);

  async function handleToggleFavorite(templateId: string) {
    const patch = toggleFavoriteId(useAppStore.getState().settings, templateId);
    if (Object.keys(patch).length) await updateSettings(patch);
  }

  async function confirmRemoveFavorite() {
    if (!confirmRemoveId) return;
    const id = confirmRemoveId;
    setConfirmRemoveId(null);
    await handleToggleFavorite(id);
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = query.trim();
    const pool = viewMode === 'mine' ? favoriteTemplates : dataset.templates;
    return pool.filter((tpl) => {
      if (viewMode === 'catalog') {
        if (shape !== 'all' && tpl.shape !== shape) return false;
        if (sizeFilter !== 'all' && getSizeCategory(tpl) !== sizeFilter) return false;
      }
      return templateMatchesQuery(tpl, q);
    });
  }, [shape, sizeFilter, query, viewMode, favoriteTemplates]);

  const suggestions = useMemo(
    () => suggestTemplates(dataset.templates, query, { favoriteIds }),
    [query, favoriteIds],
  );

  function pickSuggestion(tpl: AveryTemplate) {
    setQuery(tpl.averyCode ?? describeSize(tpl));
    setSelectedId(tpl.id);
    if (isLowCountSheet(tpl)) setLowCountOpen(true);
    if (isHighCountSheet(tpl)) setHighCountOpen(true);
    pendingScrollId.current = tpl.id;
  }

  useEffect(() => {
    const id = pendingScrollId.current;
    if (!id || selectedId !== id) return;
    pendingScrollId.current = null;
    requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(listCardSelector(id))?.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth',
      });
    });
  }, [selectedId, query, lowCountOpen, highCountOpen, filtered]);

  const { everydayTemplates, lowCountTemplates, highCountTemplates } = useMemo(() => {
    const { everyday, lowCount, highCount } = splitCatalogByPerSheet(filtered);
    return {
      everydayTemplates: everyday,
      lowCountTemplates: lowCount,
      highCountTemplates: highCount,
    };
  }, [filtered]);

  useEffect(() => {
    if (!query.trim()) return;
    if (lowCountTemplates.length > 0) setLowCountOpen(true);
    if (highCountTemplates.length > 0) setHighCountOpen(true);
  }, [query, lowCountTemplates.length, highCountTemplates.length]);

  const selected = useMemo(
    () => dataset.templates.find((tpl) => tpl.id === selectedId) ?? filtered[0] ?? dataset.templates[0],
    [selectedId, filtered],
  );

  // ── Template grid renderer ────────────────────────────────────────────────
  function TemplateGrid({
    templates,
    lane = 'everyday',
  }: {
    templates: AveryTemplate[];
    lane?: 'everyday' | 'low-count' | 'high-count';
  }) {
    return (
      <div
        className="grid grid-cols-1 gap-2"
        data-tour={lane === 'everyday' ? 'template-grid' : undefined}
        data-catalog-lane={lane}
      >
        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            isSelected={selected?.id === tpl.id}
            onClick={() => setSelectedId(tpl.id)}
            favoriteAction={viewMode === 'mine' && favoriteIds.has(tpl.id) ? 'remove' : 'star'}
            isFavorite={favoriteIds.has(tpl.id)}
            onToggleFavorite={() => {
              if (viewMode === 'mine' && favoriteIds.has(tpl.id)) {
                setConfirmRemoveId(tpl.id);
                return;
              }
              void handleToggleFavorite(tpl.id);
            }}
          />
        ))}
      </div>
    );
  }

  function PerSheetLane({
    testId,
    title,
    hint,
    templates,
    lane,
    open,
    onToggle,
  }: {
    testId: string;
    title: string;
    hint: string;
    templates: AveryTemplate[];
    lane: 'low-count' | 'high-count';
    open: boolean;
    onToggle: () => void;
  }) {
    if (templates.length === 0) return null;
    return (
      <section
        className="overflow-hidden rounded-xl border border-dashed border-slate-300 bg-white"
        data-testid={testId}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"
          onClick={onToggle}
          aria-expanded={open}
        >
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
              <LayoutGrid className="h-4 w-4 shrink-0 text-gaia-500" />
              {title}
              <span className="text-xs font-normal text-slate-400">
                {t('template.templateCount', { count: templates.length })}
              </span>
            </span>
            <span className="mt-0.5 block text-xs font-normal text-slate-500">
              {hint}
            </span>
          </span>
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />
        </button>
        {open && (
          <div className="border-t border-slate-100 px-4 pb-4 pt-3">
            <TemplateGrid templates={templates} lane={lane} />
          </div>
        )}
      </section>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-[min(90rem,calc(100vw-2rem))] px-6 py-8">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
            {/* ── Left: Templates grid ────────────────────────────────────── */}
            <div>
              <div className="mb-6 flex flex-col items-center text-center">
                <h1 className="text-3xl font-semibold text-gaia-900">{t('template.title')}</h1>

                {/* My sizes ↔ full catalog */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('mine');
                      setQuery('');
                      setShape('all');
                      setSizeFilter('all');
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      viewMode === 'mine'
                        ? 'bg-gaia-600 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-gaia-300'
                    }`}
                  >
                    <GoldStar className="h-4 w-4" />
                    {t('template.mySizes', { count: favoriteTemplates.length })}
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('catalog')}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      viewMode === 'catalog'
                        ? 'bg-gaia-600 text-white'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-gaia-300'
                    }`}
                  >
                    <Library className="h-4 w-4" />
                    {t('template.browseCatalog', { count: dataset.count })}
                  </button>
                </div>
              </div>
              {viewMode === 'catalog' && (
              <>
              {/* Search, then shape + size filters */}
              <div className="mb-4 space-y-3">
                <TemplateSearchField
                  query={query}
                  onQueryChange={setQuery}
                  suggestions={suggestions}
                  onPick={pickSuggestion}
                />

                {/* Shape + size filter chips — centered as a group */}
                <div className="flex w-full flex-col items-center gap-3">
                  <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
                    {SHAPE_FILTERS.map((f) => (
                      <ShapeFilterChip
                        key={f.id}
                        id={f.id}
                        label={t(f.labelKey)}
                        selected={shape === f.id}
                        onClick={() => setShape(f.id)}
                      />
                    ))}
                  </div>
                  <div className="flex w-full flex-wrap items-center justify-center gap-2">
                    <span className="ui-label font-semibold text-slate-400 uppercase tracking-wide">{t('template.sizeLabel', 'Size:')}</span>
                    {SIZE_FILTER_OPTIONS.map((f) => (
                      <SizeFilterChip
                        key={f.id}
                        id={f.id}
                        label={t(f.labelKey)}
                        hint={f.hintKey ? t(f.hintKey) : ''}
                        shape={shape}
                        selected={sizeFilter === f.id}
                        onClick={() => setSizeFilter(f.id)}
                      />
                    ))}
                  </div>
                </div>
              </div>
              </>
              )}

              {viewMode === 'mine' && (
                <div className="mb-4 w-full">
                  <TemplateSearchField
                    query={query}
                    onQueryChange={setQuery}
                    suggestions={suggestions}
                    onPick={pickSuggestion}
                  />
                </div>
              )}

              {/* Template list: grouped or flat */}
              {viewMode === 'mine' ? (
                filtered.length === 0 ? (
                  <div className="rounded-xl bg-white p-8 text-center ring-1 ring-slate-100">
                    <p className="text-sm text-slate-500">
                      {query.trim() ? t('template.noResults') : t('template.noFavorites')}
                    </p>
                    <button
                      type="button"
                      className="btn-secondary mt-4"
                      onClick={() => setViewMode('catalog')}
                    >
                      {t('template.browseCatalogCta')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {everydayTemplates.length > 0 && (
                      <TemplateGrid templates={everydayTemplates} />
                    )}
                    <PerSheetLane
                      testId="low-count-section"
                      title={t('template.lowCountTitle', 'Fewer Per Sheet')}
                      hint={t('template.lowCountHint', 'Sheets with fewer than 6 labels — larger labels, fewer on a page. Still available if you need them.')}
                      templates={lowCountTemplates}
                      lane="low-count"
                      open={lowCountOpen}
                      onToggle={() => setLowCountOpen((o) => !o)}
                    />
                    <PerSheetLane
                      testId="high-count-section"
                      title={t('template.highCountTitle', 'More Per Sheet')}
                      hint={t('template.highCountHint', 'Sheets with more than 12 labels — handy for tiny stickers, less typical for soap. Still available if you need them.')}
                      templates={highCountTemplates}
                      lane="high-count"
                      open={highCountOpen}
                      onToggle={() => setHighCountOpen((o) => !o)}
                    />
                  </div>
                )
              ) : everydayTemplates.length === 0 && lowCountTemplates.length === 0 && highCountTemplates.length === 0 ? (
                <div className="rounded-xl bg-white p-8 text-center ring-1 ring-slate-100">
                  <p className="text-sm text-slate-500">{t('template.noResults')}</p>
                </div>
              ) : (
                <div className="space-y-8">
                  {everydayTemplates.length > 0 && (
                    <TemplateGrid templates={everydayTemplates} lane="everyday" />
                  )}

                  <PerSheetLane
                    testId="low-count-section"
                    title={t('template.lowCountTitle', 'Fewer Per Sheet')}
                    hint={t('template.lowCountHint', 'Sheets with fewer than 6 labels — larger labels, fewer on a page. Still available if you need them.')}
                    templates={lowCountTemplates}
                    lane="low-count"
                    open={lowCountOpen}
                    onToggle={() => setLowCountOpen((o) => !o)}
                  />
                  <PerSheetLane
                    testId="high-count-section"
                    title={t('template.highCountTitle', 'More Per Sheet')}
                    hint={t('template.highCountHint', 'Sheets with more than 12 labels — handy for tiny stickers, less typical for soap. Still available if you need them.')}
                    templates={highCountTemplates}
                    lane="high-count"
                    open={highCountOpen}
                    onToggle={() => setHighCountOpen((o) => !o)}
                  />
                </div>
              )}
            </div>

            {/* ── Right: Selection panel ──────────────────────────────────── */}
            <aside className="flex w-full min-w-0 flex-col md:sticky md:top-8 md:self-start md:h-[calc(100dvh-13rem)] md:max-h-[calc(100dvh-13rem)] md:overflow-y-auto">
              {/* Equal flex spacers center the card when it fits; they collapse so a tall card scrolls from the top. */}
              <div className="hidden min-h-0 flex-1 md:block" aria-hidden />
              {/* Padding 4% tighter than px-5 (1.25rem) / py-6 (1.5rem). */}
              <div
                className="card w-full px-[1.2rem] py-[1.44rem]"
                data-testid="template-detail-card"
                data-template-id={selected?.id}
              >
                {selected && (
                  <div className="flex w-full flex-col items-stretch">
                    <div
                      className="flex w-full min-w-0 items-center justify-center gap-[0.9rem]"
                      data-testid="template-detail-header"
                    >
                      <div className="shrink-0">
                        <ShapeThumb template={selected} size={Math.round(DETAIL_HEADER_THUMB_PX * 1.08)} />
                      </div>
                      <div className="min-w-0">
                        <p
                          className="text-[length:calc(1.08rem*1.08*1.04)] font-bold leading-tight"
                          style={{ color: shapeColorTokens(selected.shape).text }}
                        >
                          {describeSize(selected)}
                        </p>
                        <p className="text-[length:calc(0.72rem*1.08*1.04)] font-medium text-slate-700">{selected.name}</p>
                        <p className="text-[length:calc(0.72rem*1.08*1.04)] text-slate-500">
                          {t('template.perSheet', { count: selected.perSheet })}
                          {selected.averyCode && ` · Avery ${selected.averyCode}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-[1.7rem] flex justify-center">
                      <SheetMiniPreview
                        template={selected}
                        highlight={selected.perSheet}
                        maxHeight={DETAIL_PREVIEW_MAX_H}
                      />
                    </div>

                    <div className="my-[1.7rem] grid w-full min-w-0 grid-cols-3 gap-[0.6375rem]" data-testid="label-face-tags">
                      {(['front', 'back', 'side'] as LabelContext[]).map((c) => {
                        const FaceIcon = FACE_ICONS[c];
                        const faceColors = shapeColorTokens(selected.shape);
                        const faceOn = context === c;
                        return (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setContext(c)}
                            className={`flex min-w-0 w-full flex-col items-center gap-[0.31875rem] rounded-[0.85rem] px-[0.4rem] py-[0.85rem] text-center text-[0.74375rem] font-medium leading-tight transition ${
                              faceOn ? '' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                            }`}
                            style={
                              faceOn
                                ? { backgroundColor: faceColors.hex, color: '#ffffff' }
                                : undefined
                            }
                          >
                            <FaceIcon className="h-[1.4025rem] w-[1.4025rem] shrink-0" />
                            {t(`template.${c}`)}
                          </button>
                        );
                      })}
                    </div>

                    {favoriteIds.has(selected.id) && (
                      <button
                        type="button"
                        data-testid="remove-from-my-sizes"
                        className="w-full min-w-0 rounded-full bg-rose-500 px-[0.9775rem] py-[0.48875rem] text-[length:calc(0.733125rem*1.13)] font-medium text-white transition hover:bg-rose-600"
                        onClick={() => setConfirmRemoveId(selected.id)}
                      >
                        {t('template.removeFavorite')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              <div className="hidden min-h-0 flex-1 md:block" aria-hidden />
            </aside>
          </div>
        </div>
      </div>

      <WorkflowNav
        nextLabel={t('workflow.nextRecipe', 'Step 2: Choose Recipe')}
        canProceed={!!selected}
        hint={t('workflow.hintSelectTemplate')}
        missingDetail={t('workflow.hintSelectTemplateBody', 'Pick a shape and size first — the editor needs a template to design on.')}
        allowOverride={false}
        onNext={() => {
          if (selected) {
            setTemplate(selected, context);
          }
          goto('recipes');
        }}
      />

      <Modal
        open={confirmRemoveId !== null}
        onClose={() => setConfirmRemoveId(null)}
        width={360}
        title={t('template.removeFavoriteTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              data-testid="cancel-remove-favorite"
              onClick={() => setConfirmRemoveId(null)}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              className="btn-danger"
              data-testid="confirm-remove-favorite"
              onClick={() => void confirmRemoveFavorite()}
            >
              {t('common.remove')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600" data-testid="remove-favorite-confirm-body">
          {t('template.removeFavoriteBody')}
        </p>
      </Modal>
    </div>
  );
}
