import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronRight, History, Layers, SlidersHorizontal, TextCursorInput } from 'lucide-react';
import PropertiesPanel from './PropertiesPanel';
import LayersPanel from './LayersPanel';
import HistoryPanel from './HistoryPanel';
import QuickTextPanel from './QuickTextPanel';

interface SectionProps {
  id: string;
  label: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  minBodyHeight?: string;
}

function CollapsibleSection({ id, label, icon: Icon, children, defaultExpanded = true, minBodyHeight }: SectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border-b border-slate-200">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`panel-body-${id}`}
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between bg-slate-100 px-3 py-2 select-none cursor-pointer hover:bg-slate-200 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
        </div>
        {expanded
          ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
          : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
        }
      </button>

      <div
        id={`panel-body-${id}`}
        className={`overflow-hidden transition-all duration-200 ${expanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}
        style={expanded && minBodyHeight ? { minHeight: minBodyHeight } : undefined}
      >
        {children}
      </div>
    </div>
  );
}

const MIN_WIDTH = 280;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 368;

export default function RightPanel() {
  const { t } = useTranslation();

  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startWidth.current = width;

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = startX.current - ev.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };

    const onUp = () => {
      dragging.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [width]);

  return (
    <aside
      className="relative flex shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white"
      style={{ width }}
    >
      {/* Drag handle — left edge */}
      <div
        onMouseDown={onMouseDown}
        className="absolute left-0 top-0 h-full w-1 cursor-col-resize hover:bg-gaia-300 active:bg-gaia-400 transition-colors z-10"
        title="Drag to resize panel"
      />

      <CollapsibleSection
        id="properties"
        label={t('panels.properties')}
        icon={SlidersHorizontal}
        defaultExpanded={true}
      >
        <PropertiesPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="layers"
        label={t('panels.layers')}
        icon={Layers}
        defaultExpanded={true}
        minBodyHeight="120px"
      >
        <LayersPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="quickText"
        label={t('panels.quickText')}
        icon={TextCursorInput}
        defaultExpanded={false}
      >
        <QuickTextPanel />
      </CollapsibleSection>

      <CollapsibleSection
        id="history"
        label={t('panels.history')}
        icon={History}
        defaultExpanded={false}
      >
        <HistoryPanel />
      </CollapsibleSection>
    </aside>
  );
}
