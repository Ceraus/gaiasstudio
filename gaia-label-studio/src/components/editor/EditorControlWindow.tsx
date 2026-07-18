import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { History, Layers, SlidersHorizontal } from 'lucide-react';
import FloatingPanel from './FloatingPanel';
import PropertiesPanel from './PropertiesPanel';
import LayersPanel from './LayersPanel';
import HistoryPanel from './HistoryPanel';

type Tab = 'properties' | 'layers' | 'history';

export default function EditorControlWindow() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('properties');

  const tabs: { id: Tab; label: string; icon: typeof Layers }[] = [
    { id: 'properties', label: t('panels.properties'), icon: SlidersHorizontal },
    { id: 'layers', label: t('panels.layers'), icon: Layers },
    { id: 'history', label: t('panels.history'), icon: History },
  ];

  return (
    <FloatingPanel
      defaultY={100}
      title={<span className="text-sm font-semibold text-slate-700">{t('panels.properties')}</span>}
    >
      <div className="grid grid-cols-3 gap-1 border-b border-slate-100 p-1.5">
        {tabs.map((tb) => {
          const Icon = tb.icon;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                tab === tb.id ? 'bg-gaia-100 text-gaia-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="hidden md:inline">{tb.label}</span>
            </button>
          );
        })}
      </div>
      {tab === 'properties' && <PropertiesPanel />}
      {tab === 'layers' && <LayersPanel />}
      {tab === 'history' && <HistoryPanel />}
    </FloatingPanel>
  );
}
