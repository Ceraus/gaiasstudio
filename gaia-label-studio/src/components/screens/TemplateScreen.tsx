import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Circle, Layers, Search, Square, Sticker } from 'lucide-react';
import averyData from '@/data/averyTemplates.json';
import type { AveryDataset, LabelContext, LabelShape } from '@/types';
import { describeSize } from '@/lib/units';
import { useAppStore } from '@/store/useAppStore';
import ShapeThumb from '@/components/common/ShapeThumb';
import SheetMiniPreview from '@/components/common/SheetMiniPreview';

const dataset = averyData as AveryDataset;

const SHAPE_FILTERS: { id: LabelShape | 'all'; labelKey: string }[] = [
  { id: 'all', labelKey: 'template.allShapes' },
  { id: 'circle', labelKey: 'template.circle' },
  { id: 'oval', labelKey: 'template.oval' },
  { id: 'square', labelKey: 'template.square' },
  { id: 'rectangle', labelKey: 'template.rectangle' },
  { id: 'rounded-rectangle', labelKey: 'template.roundedRectangle' },
];

export default function TemplateScreen() {
  const { t } = useTranslation();
  const startNewDesign = useAppStore((s) => s.startNewDesign);

  const [shape, setShape] = useState<LabelShape | 'all'>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('round-2');
  const [context, setContext] = useState<LabelContext>('front');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return dataset.templates.filter((tpl) => {
      if (shape !== 'all' && tpl.shape !== shape) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        (tpl.averyCode ?? '').toLowerCase().includes(q) ||
        describeSize(tpl).toLowerCase().includes(q)
      );
    });
  }, [shape, query]);

  const selected = useMemo(
    () => dataset.templates.find((tpl) => tpl.id === selectedId) ?? filtered[0] ?? dataset.templates[0],
    [selectedId, filtered],
  );

  const quickStarts: { icon: typeof Circle; label: string; hint: string; tpl: string; ctx: LabelContext }[] = [
    { icon: Circle, label: t('template.front'), hint: t('template.frontHint'), tpl: 'round-2', ctx: 'front' },
    { icon: Square, label: t('template.back'), hint: t('template.backHint'), tpl: '6871', ctx: 'back' },
    { icon: Sticker, label: t('template.side'), hint: t('template.sideHint'), tpl: 'ribbon-9x1-2', ctx: 'side' },
  ];

  const open = () => {
    if (!selected) return;
    startNewDesign(selected, selected.contexts.includes(context) ? context : selected.contexts[0]);
  };

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
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
          {/* Templates grid */}
          <div>
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap gap-1.5">
                {SHAPE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setShape(f.id)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
                      shape === f.id
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
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
            </div>

            {filtered.length === 0 ? (
              <p className="rounded-xl bg-white p-8 text-center text-sm text-slate-500 ring-1 ring-slate-100">
                {t('template.noResults')}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {filtered.map((tpl) => (
                  <button
                    key={tpl.id}
                    onClick={() => setSelectedId(tpl.id)}
                    className={`group flex flex-col items-center gap-2 rounded-2xl bg-white p-4 text-center ring-1 transition ${
                      selected?.id === tpl.id
                        ? 'ring-2 ring-gaia-500'
                        : 'ring-slate-100 hover:ring-gaia-200'
                    }`}
                  >
                    <ShapeThumb template={tpl} />
                    <span className="mt-1 line-clamp-2 text-xs font-medium text-slate-700">
                      {tpl.averyCode ? `Avery ${tpl.averyCode}` : tpl.name}
                    </span>
                    <span className="text-[11px] text-slate-400">{describeSize(tpl)}</span>
                    <span className="chip">{t('template.perSheet', { count: tpl.perSheet })}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selection panel */}
          <aside className="lg:sticky lg:top-4 lg:self-start">
            <div className="card">
              {selected && (
                <>
                  <div className="flex items-center gap-3">
                    <ShapeThumb template={selected} size={64} />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{selected.name}</p>
                      <p className="text-xs text-slate-500">
                        {describeSize(selected)} · {t('template.perSheet', { count: selected.perSheet })}
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
  );
}
