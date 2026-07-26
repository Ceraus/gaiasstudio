import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, Circle, Layers, Search, Square, Sticker, Zap } from 'lucide-react';
import averyData from '@/data/averyTemplates.json';
import type { AveryDataset, AveryTemplate, LabelContext, LabelShape } from '@/types';
import { describeSize } from '@/lib/units';
import { useAppStore } from '@/store/useAppStore';
import ShapeThumb from '@/components/common/ShapeThumb';
import SheetMiniPreview from '@/components/common/SheetMiniPreview';
import WorkflowNav from '@/components/WorkflowNav';

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

const CONTAINER_GUIDE = [
  { container: '2 oz round jar / tin',          labelSize: '1.5" circle',     tip: 'circle',            ids: ['round-1-5'] },
  { container: '4 oz round jar',                 labelSize: '2" circle',       tip: 'circle',            ids: ['round-2']   },
  { container: '8 oz round jar / mason jar',     labelSize: '3" circle',       tip: 'circle',            ids: ['round-3']   },
  { container: '2 oz lotion / squeeze bottle',   labelSize: '1"×3" rectangle', tip: 'rectangle',         ids: ['6871']      },
  { container: '4–8 oz lotion bottle',           labelSize: '2"×4" rectangle', tip: 'rectangle',         ids: ['22826']     },
  { container: '4 oz bar soap (wrap)',            labelSize: '1.5"×8" ribbon',  tip: 'side ribbon',       ids: ['ribbon-9x1-2'] },
  { container: 'Lip balm tube',                  labelSize: '0.5"×1.75" oval', tip: 'oval',              ids: ['oval-1-3-4'] },
  { container: 'Body butter / whipped soap tub', labelSize: '2"×4" rectangle', tip: 'rectangle',         ids: ['22826']     },
] as const;

/** Popular size presets — clicking one filters the grid to matching templates. */
const COMMON_SIZES: { label: string; sublabel: string; ids: string[] }[] = [
  { label: '2" Round',    sublabel: 'jar top',          ids: ['round-2']      },
  { label: '1.5" Round',  sublabel: '2 oz jar',         ids: ['round-1-5']    },
  { label: '3" Round',    sublabel: '8 oz jar',         ids: ['round-3']      },
  { label: '2"×4"',       sublabel: 'lotion bottle',    ids: ['22826']        },
  { label: '1"×3"',       sublabel: 'squeeze bottle',   ids: ['6871']         },
  { label: 'Ribbon Wrap', sublabel: 'bar soap',         ids: ['ribbon-9x1-2'] },
];

const SIZE_FILTER_OPTIONS: { id: SizeCategory; label: string; hint: string }[] = [
  { id: 'all',    label: 'All sizes',  hint: ''        },
  { id: 'small',  label: 'Small',      hint: '< 2"'    },
  { id: 'medium', label: 'Medium',     hint: '2"–3.5"' },
  { id: 'large',  label: 'Large',      hint: '> 3.5"'  },
];

const SHAPE_FILTERS: { id: LabelShape | 'all'; labelKey: string }[] = [
  { id: 'all',               labelKey: 'template.allShapes'       },
  { id: 'circle',            labelKey: 'template.circle'          },
  { id: 'oval',              labelKey: 'template.oval'            },
  { id: 'square',            labelKey: 'template.square'          },
  { id: 'rectangle',         labelKey: 'template.rectangle'       },
  { id: 'rounded-rectangle', labelKey: 'template.roundedRectangle'},
];

const SIZE_GROUP_DEFS: { key: Exclude<SizeCategory, 'all'>; labelKey: string; hintKey: string }[] = [
  { key: 'small',  labelKey: 'template.smallLabels',  hintKey: 'template.smallHint'  },
  { key: 'medium', labelKey: 'template.mediumLabels', hintKey: 'template.mediumHint' },
  { key: 'large',  labelKey: 'template.largeLabels',  hintKey: 'template.largeHint'  },
];

const dataset = averyData as AveryDataset;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function TemplateCard({
  tpl,
  isSelected,
  onClick,
}: {
  tpl: AveryTemplate;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      className={`group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-3 text-center ring-1 transition ${
        isSelected
          ? 'ring-2 ring-gaia-500 shadow-sm'
          : 'ring-slate-100 hover:ring-gaia-200'
      }`}
    >
      <ShapeThumb template={tpl} />
      {/* Size — most prominent */}
      <span className="mt-0.5 text-sm font-bold leading-tight text-gaia-700">
        {describeSize(tpl)}
      </span>
      {/* Avery / template name */}
      <span className="line-clamp-2 text-[11px] leading-snug text-slate-500">
        {tpl.averyCode ? `Avery ${tpl.averyCode}` : tpl.name}
      </span>
      {/* Per-sheet count */}
      <span className="chip mt-0.5">{t('template.perSheet', { count: tpl.perSheet })}</span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function TemplateScreen() {
  const { t } = useTranslation();
  const startNewDesign = useAppStore((s) => s.startNewDesign);
  const setTemplate    = useAppStore((s) => s.setTemplate);
  const goto           = useAppStore((s) => s.goto);

  const [shape,       setShape]       = useState<LabelShape | 'all'>('all');
  const [sizeFilter,  setSizeFilter]  = useState<SizeCategory>('all');
  const [query,       setQuery]       = useState('');
  const [activePreset, setActivePreset] = useState<number | null>(null);
  const [selectedId,  setSelectedId]  = useState<string>('round-2');
  const [context,     setContext]     = useState<LabelContext>('front');
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);

  // When a preset chip is toggled, clear other filters (or restore them on deactivate)
  function handlePreset(idx: number) {
    if (activePreset === idx) {
      setActivePreset(null);
    } else {
      setActivePreset(idx);
      setShape('all');
      setSizeFilter('all');
      setQuery('');
    }
  }

  function clearPreset() {
    setActivePreset(null);
  }

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    // If a size preset is active, show only its templates
    if (activePreset !== null) {
      const ids = new Set(COMMON_SIZES[activePreset].ids);
      return dataset.templates.filter((t) => ids.has(t.id));
    }

    const q = query.trim().toLowerCase();
    return dataset.templates.filter((tpl) => {
      if (shape !== 'all' && tpl.shape !== shape) return false;
      if (sizeFilter !== 'all' && getSizeCategory(tpl) !== sizeFilter) return false;
      if (!q) return true;
      // Search by size description, name, Avery code, or dimension (e.g. "2x4" or "3 inch")
      const sizeStr = describeSize(tpl).toLowerCase();
      const dimStr  = `${tpl.labelWidthIn}x${tpl.labelHeightIn} ${tpl.labelWidthIn}in ${tpl.labelHeightIn}in`;
      return (
        tpl.name.toLowerCase().includes(q)         ||
        (tpl.averyCode ?? '').toLowerCase().includes(q) ||
        sizeStr.includes(q)                        ||
        dimStr.includes(q)
      );
    });
  }, [shape, sizeFilter, query, activePreset]);

  const selected = useMemo(
    () => dataset.templates.find((tpl) => tpl.id === selectedId) ?? filtered[0] ?? dataset.templates[0],
    [selectedId, filtered],
  );

  // ── Grouped view (only when no filters are active) ────────────────────────
  const showGrouped = shape === 'all' && sizeFilter === 'all' && !query.trim() && activePreset === null;

  const sizeGroups = useMemo(() => {
    if (!showGrouped) return null;
    return SIZE_GROUP_DEFS
      .map((def) => ({
        ...def,
        templates: filtered.filter((t) => getSizeCategory(t) === def.key),
      }))
      .filter((g) => g.templates.length > 0);
  }, [showGrouped, filtered]);

  // ── Quick starts ──────────────────────────────────────────────────────────
  const quickStarts: { icon: typeof Circle; label: string; hint: string; tpl: string; ctx: LabelContext }[] = [
    { icon: Circle,  label: t('template.front'), hint: t('template.frontHint'), tpl: 'round-2',      ctx: 'front' },
    { icon: Square,  label: t('template.back'),  hint: t('template.backHint'),  tpl: '6871',          ctx: 'back'  },
    { icon: Sticker, label: t('template.side'),  hint: t('template.sideHint'),  tpl: 'ribbon-9x1-2', ctx: 'side'  },
  ];

  const open = () => {
    if (!selected) return;
    startNewDesign(selected, selected.contexts.includes(context) ? context : selected.contexts[0]);
  };

  // ── Template grid renderer ────────────────────────────────────────────────
  function TemplateGrid({ templates }: { templates: AveryTemplate[] }) {
    return (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4" data-tour="template-grid">
        {templates.map((tpl) => (
          <TemplateCard
            key={tpl.id}
            tpl={tpl}
            isSelected={selected?.id === tpl.id}
            onClick={() => setSelectedId(tpl.id)}
          />
        ))}
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <h1 className="text-3xl font-semibold text-gaia-900">{t('template.title')}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('template.subtitle')}</p>

          {/* Quick starts */}
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {quickStarts.map((q) => {
              const Icon = q.icon;
              return (
                <button
                  key={q.label}
                  onClick={() => {
                    setSelectedId(q.tpl);
                    setContext(q.ctx);
                    const tpl = dataset.templates.find((x) => x.id === q.tpl);
                    if (tpl) setShape(tpl.shape);
                    clearPreset();
                    setSizeFilter('all');
                    setQuery('');
                  }}
                  className="card flex items-center gap-3 text-left transition hover:ring-gaia-300"
                >
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gaia-100 text-gaia-700">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">{q.label}</span>
                    <span className="block text-xs text-slate-500">{q.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
            {/* ── Left: Templates grid ────────────────────────────────────── */}
            <div>
              {/* Popular sizes quick-pick */}
              <div className="mb-4">
                <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <Zap className="h-3.5 w-3.5 text-gaia-500" />
                  {t('template.popularSizes', 'Popular sizes')}
                </div>
                <div className="flex flex-wrap gap-2">
                  {COMMON_SIZES.map((preset, idx) => (
                    <button
                      key={preset.label}
                      onClick={() => handlePreset(idx)}
                      className={`flex flex-col items-center rounded-xl px-3 py-2 text-center ring-1 transition ${
                        activePreset === idx
                          ? 'bg-gaia-600 text-white ring-gaia-600'
                          : 'bg-white text-slate-700 ring-slate-200 hover:ring-gaia-300'
                      }`}
                    >
                      <span className="text-sm font-semibold leading-tight">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Shape filter + search row */}
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {SHAPE_FILTERS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => { setShape(f.id); clearPreset(); }}
                      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                        shape === f.id && activePreset === null
                          ? 'bg-gaia-600 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {t(f.labelKey)}
                    </button>
                  ))}
                </div>
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9"
                    placeholder={t('template.searchPlaceholder')}
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); clearPreset(); }}
                  />
                </div>
              </div>

              {/* Size filter pills */}
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{t('template.sizeLabel', 'Size:')}</span>
                {SIZE_FILTER_OPTIONS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => { setSizeFilter(f.id); clearPreset(); }}
                    className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium transition ${
                      sizeFilter === f.id && activePreset === null
                        ? 'bg-gaia-100 text-gaia-700 ring-1 ring-gaia-300'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                    {f.hint && (
                      <span className={`text-[10px] ${sizeFilter === f.id && activePreset === null ? 'text-gaia-500' : 'text-slate-400'}`}>
                        {f.hint}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Container size guide accordion */}
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <button
                  className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-slate-700 hover:bg-slate-50"
                  onClick={() => setSizeGuideOpen((o) => !o)}
                  aria-expanded={sizeGuideOpen}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-gaia-500" />
                    {t('template.sizeGuideTitle', 'What size label fits my container?')}
                  </span>
                  <ChevronDown className={`h-4 w-4 text-slate-400 transition ${sizeGuideOpen ? 'rotate-180' : ''}`} />
                </button>
                {sizeGuideOpen && (
                  <div className="border-t border-slate-100 px-4 pb-4 pt-3">
                    <p className="mb-3 text-xs text-slate-500">
                      {t('template.sizeGuideHint', 'Click a row to jump to the right template.')}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-slate-100 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                            <th className="pb-2 pr-4">{t('template.colContainer', 'Container')}</th>
                            <th className="pb-2 pr-4">{t('template.colRecommendedSize', 'Recommended label size')}</th>
                            <th className="pb-2">{t('template.colBestShape', 'Best shape')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {CONTAINER_GUIDE.map((row) => (
                            <tr
                              key={row.container}
                              className="cursor-pointer hover:bg-gaia-50"
                              onClick={() => {
                                const id = row.ids[0];
                                const tpl = dataset.templates.find((x) => x.id === id);
                                if (tpl) {
                                  setSelectedId(id);
                                  setShape(tpl.shape);
                                  setQuery('');
                                  setSizeFilter('all');
                                  clearPreset();
                                  setSizeGuideOpen(false);
                                }
                              }}
                            >
                              <td className="py-2 pr-4 text-slate-700">{row.container}</td>
                              <td className="py-2 pr-4 font-semibold text-gaia-700">{row.labelSize}</td>
                              <td className="py-2 capitalize text-slate-500">{row.tip}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-3 text-[10px] text-slate-400">
                      {t('template.sizeGuideMeasure', "Not sure? Wrap a strip of paper around your container and mark where the edges meet — that's your label width.")}
                    </p>
                  </div>
                )}
              </div>

              {/* Active preset banner */}
              {activePreset !== null && (
                <div className="mb-3 flex items-center justify-between rounded-xl bg-gaia-50 px-4 py-2 ring-1 ring-gaia-200">
                  <span className="text-sm text-gaia-700">
                    {t('template.showingFor', 'Showing templates for')}{' '}
                    <span className="font-semibold">{COMMON_SIZES[activePreset].label}</span>
                  </span>
                  <button
                    onClick={clearPreset}
                    className="text-xs text-gaia-500 hover:text-gaia-700 underline"
                  >
                    {t('template.showAll', 'Show all')}
                  </button>
                </div>
              )}

              {/* Template list: grouped or flat */}
              {filtered.length === 0 ? (
                <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">
                  {t('template.noResults')}
                </p>
              ) : showGrouped && sizeGroups ? (
                <div className="space-y-8">
                  {sizeGroups.map((group) => (
                    <section key={group.key}>
                      <div className="mb-3 flex items-baseline gap-2">
                        <h2 className="text-base font-semibold text-slate-800">{t(group.labelKey)}</h2>
                        <span className="text-xs text-slate-400">{t(group.hintKey)}</span>
                        <span className="ml-auto text-xs text-slate-400">{t('template.templateCount', { count: group.templates.length })}</span>
                      </div>
                      <TemplateGrid templates={group.templates} />
                    </section>
                  ))}
                </div>
              ) : (
                <TemplateGrid templates={filtered} />
              )}
            </div>

            {/* ── Right: Selection panel ──────────────────────────────────── */}
            <aside className="lg:sticky lg:top-4 lg:self-start">
              <div className="card">
                {selected && (
                  <>
                    <div className="flex items-center gap-3">
                      <ShapeThumb template={selected} size={64} />
                      <div>
                        <p className="text-base font-bold text-gaia-700">{describeSize(selected)}</p>
                        <p className="text-sm font-medium text-slate-700">{selected.name}</p>
                        <p className="text-xs text-slate-500">
                          {t('template.perSheet', { count: selected.perSheet })}
                          {selected.averyCode && ` · Avery ${selected.averyCode}`}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4">
                      <SheetMiniPreview template={selected} highlight={selected.perSheet} />
                    </div>

                    <p className="label mt-5">{t('template.context')}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {(['front', 'back', 'side'] as LabelContext[]).map((c) => {
                        const disabled = !selected.contexts.includes(c);
                        return (
                          <button
                            key={c}
                            disabled={disabled}
                            onClick={() => setContext(c)}
                            className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-xs font-medium ring-1 transition disabled:opacity-30 ${
                              context === c && !disabled
                                ? 'bg-gaia-600 text-white ring-gaia-600'
                                : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <Layers className="h-4 w-4" />
                            {t(`template.${c}`)}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{t(`template.${context}Hint`)}</p>

                    <button className="btn-primary mt-5 w-full py-3" onClick={open}>
                      {t('template.openEditor')} <ArrowRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
            </aside>
          </div>
        </div>
      </div>

      <WorkflowNav
        nextLabel={t('workflow.nextRecipe')}
        canProceed={!!selected}
        hint={t('workflow.hintSelectTemplate')}
        onNext={() => {
          if (selected) {
            const ctx = selected.contexts.includes(context) ? context : selected.contexts[0];
            setTemplate(selected, ctx);
          }
          goto('recipes');
        }}
      />
    </div>
  );
}
