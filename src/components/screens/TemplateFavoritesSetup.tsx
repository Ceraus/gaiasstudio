import { useMemo, useState } from 'react';

import { useTranslation } from 'react-i18next';

import { Check, ChevronDown, Search, Sparkles, Star } from 'lucide-react';

import averyData from '@/data/averyTemplates.json';

import type { AveryDataset, AveryTemplate, LabelShape } from '@/types';

import { describeSize } from '@/lib/units';

import { shapeColorTokens } from '@/lib/shapeColors';

import { useAppStore } from '@/store/useAppStore';

import ShapeThumb from '@/components/common/ShapeThumb';

import {

  MAX_FAVORITES,

  RECOMMENDED_FAVORITE_COUNT,

  SUGGESTED_FAVORITE_IDS,

} from '@/lib/templateFavorites';

import {

  SETUP_SHAPES,

  buildCatalogSections,

  countAlternateSkus,

  countUniqueSizesByShape,

  searchDedupedCatalog,

} from '@/lib/templateCatalogGroups';



const dataset = averyData as AveryDataset;



const SHAPE_LABEL_KEYS: Record<LabelShape, string> = {

  circle: 'template.circle',

  oval: 'template.oval',

  square: 'template.square',

  rectangle: 'template.rectangle',

  'rounded-rectangle': 'template.roundedRectangle',

};

/** Chip outline matches the Avery shape — readable text beats perfect geometry. */
const SHAPE_CHIP_GEOMETRY: Record<LabelShape, string> = {
  circle:
    'h-[6.75rem] w-[6.75rem] shrink-0 items-center justify-center rounded-full px-2 text-center',
  oval:
    'min-h-[3.25rem] min-w-[8.75rem] shrink-0 items-center justify-center rounded-full px-8 py-2 text-center',
  square:
    'h-[6.5rem] w-[6.5rem] shrink-0 items-center justify-center rounded-[3px] px-2 text-center',
  rectangle:
    'min-h-[2.75rem] min-w-[9rem] shrink-0 items-center justify-center rounded-[2px] px-5 py-1.5 text-center',
  'rounded-rectangle':
    'min-h-[3.5rem] min-w-[8.5rem] shrink-0 items-center justify-center rounded-2xl px-5 py-2.5 text-center',
};



function PickCard({

  tpl,

  picked,

  onToggle,

  altSkus,

  shapeBadge,

}: {

  tpl: AveryTemplate;

  picked: boolean;

  onToggle: () => void;

  altSkus?: number;

  shapeBadge?: string;

}) {

  const { t } = useTranslation();

  const colors = shapeColorTokens(tpl.shape);

  return (

    <button

      type="button"

      onClick={onToggle}

      className="relative flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center transition"

      style={{

        boxShadow: picked

          ? `0 0 0 2px ${colors.hex}, 0 1px 2px rgb(0 0 0 / 0.05)`

          : `0 0 0 1px ${colors.border}`,

      }}

    >

      {picked && (

        <span className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-gaia-600 text-white">

          <Check className="h-3.5 w-3.5" />

        </span>

      )}

      {shapeBadge && (

        <span

          className="absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-medium"

          style={{ backgroundColor: colors.tint, color: colors.text }}

        >

          {shapeBadge}

        </span>

      )}

      <ShapeThumb template={tpl} />

      <span className="mt-0.5 text-sm font-bold leading-tight" style={{ color: colors.text }}>{describeSize(tpl)}</span>

      <span className="line-clamp-2 text-[11px] leading-snug text-slate-500">

        {tpl.averyCode ? `Avery ${tpl.averyCode}` : tpl.name}

        {altSkus != null && altSkus > 0 && (

          <span className="text-slate-400"> · {t('template.favoritesAlsoAvery', { count: altSkus })}</span>

        )}

      </span>

    </button>

  );

}



/** First-run: pick everyday label sizes from a categorized catalog. */

export default function TemplateFavoritesSetup() {

  const { t } = useTranslation();

  const settings = useAppStore((s) => s.settings);

  const updateSettings = useAppStore((s) => s.updateSettings);



  const [picked, setPicked] = useState<Set<string>>(

    () => new Set(settings.favoriteTemplateIds ?? []),

  );

  const [shape, setShape] = useState<LabelShape>('circle');

  const [query, setQuery] = useState('');

  const [saving, setSaving] = useState(false);

  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(['circle:medium']));



  const shapeCounts = useMemo(

    () => countUniqueSizesByShape(dataset.templates),

    [],

  );



  const sections = useMemo(

    () => buildCatalogSections(dataset.templates, shape),

    [shape],

  );



  const searchResults = useMemo(

    () => searchDedupedCatalog(dataset.templates, query),

    [query],

  );



  const isSearching = query.trim().length > 0;



  const suggested = useMemo(

    () =>

      SUGGESTED_FAVORITE_IDS.map((id) => dataset.templates.find((tpl) => tpl.id === id)).filter(

        (tpl): tpl is AveryTemplate => !!tpl,

      ),

    [],

  );



  const pickedTemplates = useMemo(

    () =>

      [...picked]

        .map((id) => dataset.templates.find((tpl) => tpl.id === id))

        .filter((tpl): tpl is AveryTemplate => !!tpl),

    [picked],

  );



  function toggle(id: string) {

    setPicked((prev) => {

      const next = new Set(prev);

      if (next.has(id)) next.delete(id);

      else if (next.size < MAX_FAVORITES) next.add(id);

      return next;

    });

  }



  function addSuggested(id: string) {

    setPicked((prev) => {

      if (prev.has(id) || prev.size >= MAX_FAVORITES) return prev;

      const next = new Set(prev);

      next.add(id);

      return next;

    });

  }



  function toggleSection(id: string) {

    setExpanded((prev) => {

      const next = new Set(prev);

      if (next.has(id)) next.delete(id);

      else next.add(id);

      return next;

    });

  }



  function selectShape(next: LabelShape) {
    setShape(next);
    setQuery('');
    const secs = buildCatalogSections(dataset.templates, next);
    const toOpen = new Set(
      secs
        .filter((s) => s.sizeCategory === 'medium' || s.templates.length <= 8)
        .map((s) => s.id),
    );
    if (toOpen.size === 0 && secs[0]) toOpen.add(secs[0].id);
    setExpanded(toOpen);
  }



  async function finish() {

    if (picked.size === 0) return;

    setSaving(true);

    try {

      await updateSettings({

        favoriteTemplateIds: [...picked],

        templateFavoritesConfigured: true,

      });

    } finally {

      setSaving(false);

    }

  }



  const count = picked.size;

  const atMax = count >= MAX_FAVORITES;



  return (

    <div className="flex h-full flex-col overflow-hidden bg-gaia-50">

      <div className="flex-1 overflow-y-auto">

        <div className="mx-auto max-w-4xl px-6 py-10">

          <div className="flex items-start gap-3">

            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gaia-100 text-gaia-700">

              <Star className="h-6 w-6 fill-amber-400 text-amber-400" />

            </span>

            <div>

              <h1 className="text-2xl font-semibold text-gaia-900 sm:text-3xl">

                {t('template.favoritesSetupTitle')}

              </h1>

              <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('template.favoritesSetupBody')}</p>

            </div>

          </div>



          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-xl bg-white px-4 py-3 ring-1 ring-slate-200">

            <span className="text-sm font-semibold text-slate-700">

              {t('template.favoritesSelected', { count, max: MAX_FAVORITES })}

            </span>

            <span className="text-xs text-slate-500">

              {count < RECOMMENDED_FAVORITE_COUNT

                ? t('template.favoritesRecommendMore', { n: RECOMMENDED_FAVORITE_COUNT })

                : t('template.favoritesLooksGood')}

            </span>

          </div>



          {pickedTemplates.length > 0 && (

            <div className="mt-4 flex flex-wrap gap-2">

              {pickedTemplates.map((tpl) => (

                <button

                  key={tpl.id}

                  type="button"

                  onClick={() => toggle(tpl.id)}

                  className="inline-flex items-center gap-1.5 rounded-full bg-gaia-100 px-3 py-1.5 text-sm font-medium text-gaia-800 ring-1 ring-gaia-200 transition hover:bg-gaia-200"

                >

                  {describeSize(tpl)}

                  <span className="text-gaia-500">×</span>

                </button>

              ))}

            </div>

          )}



          {suggested.length > 0 && (

            <div className="mt-6">

              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">

                <Sparkles className="h-3.5 w-3.5 text-gaia-500" />

                {t('template.favoritesSuggested')}

              </div>

              <div className="flex flex-wrap gap-2">

                {suggested.map((tpl) => {

                  const isPicked = picked.has(tpl.id);

                  return (

                    <button

                      key={tpl.id}

                      type="button"

                      disabled={!isPicked && atMax}

                      onClick={() => (isPicked ? toggle(tpl.id) : addSuggested(tpl.id))}

                      className={`rounded-full px-3 py-1.5 text-sm font-medium ring-1 transition disabled:opacity-40 ${

                        isPicked

                          ? 'bg-gaia-600 text-white ring-gaia-600'

                          : 'bg-white text-slate-700 ring-slate-200 hover:ring-gaia-300'

                      }`}

                    >

                      {describeSize(tpl)}

                      {tpl.averyCode ? ` · ${tpl.averyCode}` : ''}

                    </button>

                  );

                })}

              </div>

            </div>

          )}



          <div className="mt-8">

            <p className="ui-label font-semibold uppercase tracking-wide text-slate-400">

              {t('template.favoritesPickShape')}

            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">

              {SETUP_SHAPES.map((s) => {

                const active = !isSearching && shape === s;

                const colors = shapeColorTokens(s);

                return (

                  <button

                    key={s}

                    type="button"

                    data-testid={`shape-filter-${s}`}

                    data-selected={active ? 'true' : 'false'}

                    onClick={() => selectShape(s)}

                    className={`inline-flex flex-col transition ${SHAPE_CHIP_GEOMETRY[s]}`}

                    style={

                      active

                        ? { backgroundColor: colors.hex, color: '#ffffff' }

                        : {

                            backgroundColor: colors.tint,

                            color: colors.text,

                            boxShadow: `inset 0 0 0 1px ${colors.border}`,

                          }

                    }

                  >

                    <span className="whitespace-nowrap text-sm font-semibold leading-tight">{t(SHAPE_LABEL_KEYS[s])}</span>

                    <span

                      className="mt-0.5 whitespace-nowrap text-xs leading-tight"

                      style={{ color: active ? 'rgba(255,255,255,0.8)' : colors.text }}

                    >

                      {t('template.favoritesShapeCount', { count: shapeCounts[s] })}

                    </span>

                  </button>

                );

              })}

            </div>

          </div>



          <div className="relative mt-6 w-full sm:max-w-md">

            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input

              className="input pl-9"

              placeholder={t('template.searchPlaceholder')}

              value={query}

              onChange={(e) => setQuery(e.target.value)}

            />

          </div>



          <p className="mt-3 text-xs text-slate-500">

            {isSearching ? t('template.favoritesSearchHint') : t('template.favoritesBrowseHint')}

          </p>



          {isSearching ? (

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">

              {searchResults.map((tpl) => (

                <PickCard

                  key={tpl.id}

                  tpl={tpl}

                  picked={picked.has(tpl.id)}

                  onToggle={() => toggle(tpl.id)}

                  altSkus={countAlternateSkus(tpl, dataset.templates)}

                  shapeBadge={t(SHAPE_LABEL_KEYS[tpl.shape])}

                />

              ))}

            </div>

          ) : (

            <div className="mt-4 space-y-3">

              {sections.map((section) => {

                const open = expanded.has(section.id);

                const sectionTitle = section.subLabelKey

                  ? t(section.subLabelKey)

                  : t(section.labelKey);

                const sectionHint = section.subLabelKey ? t(section.labelKey) : t(section.hintKey);

                return (

                  <div

                    key={section.id}

                    className="overflow-hidden rounded-xl border border-slate-200 bg-white"

                  >

                    <button

                      type="button"

                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50"

                      onClick={() => toggleSection(section.id)}

                    >

                      <div>

                        <p className="text-sm font-semibold text-slate-800">{sectionTitle}</p>

                        <p className="text-xs text-slate-500">

                          {sectionHint} · {t('template.favoritesSectionCount', { count: section.templates.length })}

                        </p>

                      </div>

                      <ChevronDown

                        className={`h-4 w-4 shrink-0 text-slate-400 transition ${open ? 'rotate-180' : ''}`}

                      />

                    </button>

                    {open && (

                      <div className="border-t border-slate-100 px-4 pb-4 pt-3">

                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">

                          {section.templates.map((tpl) => (

                            <PickCard

                              key={tpl.id}

                              tpl={tpl}

                              picked={picked.has(tpl.id)}

                              onToggle={() => toggle(tpl.id)}

                              altSkus={countAlternateSkus(tpl, dataset.templates)}

                            />

                          ))}

                        </div>

                      </div>

                    )}

                  </div>

                );

              })}

            </div>

          )}



          {isSearching && searchResults.length === 0 && (

            <p className="mt-8 text-center text-sm text-slate-500">{t('template.noResults')}</p>

          )}

        </div>

      </div>



      <div className="border-t border-slate-200 bg-white px-6 py-4">

        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">

          <p className="text-xs text-slate-500">{t('template.favoritesSetupFooter')}</p>

          <button

            type="button"

            className="btn-primary px-6 py-2.5"

            disabled={count === 0 || saving}

            onClick={() => void finish()}

          >

            {saving ? t('common.saving', 'Saving…') : t('template.favoritesSaveContinue', { count })}

          </button>

        </div>

      </div>

    </div>

  );

}

