import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Settings } from 'lucide-react';
import { editor } from '@/lib/fabric/editorController';
import { useAppStore } from '@/store/useAppStore';

const STATIC_PRESETS = [
  'Net Wt.',
  'Ingredients:',
  'Directions:',
  'Warning:',
  'Made with love by',
];

function Chip({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={`Insert "${label}"`}
      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-xs text-slate-700 transition hover:border-gaia-400 hover:bg-gaia-50 hover:text-gaia-700 active:scale-95"
    >
      {label}
    </button>
  );
}

export default function QuickTextPanel() {
  const { t } = useTranslation();
  const businessName = useAppStore((s) => s.settings.businessName);
  const businessAddress = useAppStore((s) => s.settings.businessAddress);
  const goto = useAppStore((s) => s.goto);

  const [custom, setCustom] = useState('');

  const insert = (text: string) => {
    if (!text.trim()) return;
    editor.addText('body', text.trim());
  };

  const businessSnippets: string[] = [];
  if (businessName?.trim()) businessSnippets.push(businessName.trim());
  if (businessAddress?.trim()) businessSnippets.push(businessAddress.trim());

  const hasBusinessInfo = businessSnippets.length > 0;

  return (
    <div className="space-y-4 p-3">

      {/* Business info snippets */}
      <div>
        <p className="label mb-2">{t('quickText.businessSection')}</p>
        {hasBusinessInfo ? (
          <div className="space-y-1.5">
            {businessSnippets.map((s) => (
              <Chip key={s} label={s} onClick={() => insert(s)} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 text-center">
            <p className="mb-1.5 text-xs text-slate-400">{t('quickText.noBusinessInfo')}</p>
            <button
              onClick={() => goto('settings')}
              className="inline-flex items-center gap-1 text-xs font-medium text-gaia-600 hover:underline"
            >
              <Settings className="h-3 w-3" />
              {t('quickText.goToSettings')}
            </button>
          </div>
        )}
      </div>

      {/* Static label presets */}
      <div>
        <p className="label mb-2">{t('quickText.presetsSection')}</p>
        <div className="space-y-1.5">
          {STATIC_PRESETS.map((preset) => (
            <Chip key={preset} label={preset} onClick={() => insert(preset)} />
          ))}
        </div>
      </div>

      {/* Custom one-off input */}
      <div>
        <p className="label mb-2">{t('quickText.customSection')}</p>
        <div className="flex gap-1.5">
          <input
            type="text"
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                insert(custom);
                setCustom('');
              }
            }}
            placeholder={t('quickText.customPlaceholder')}
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-gaia-400 focus:ring-1 focus:ring-gaia-200"
          />
          <button
            onClick={() => { insert(custom); setCustom(''); }}
            disabled={!custom.trim()}
            title={t('quickText.insertCustom')}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gaia-600 text-white transition hover:bg-gaia-700 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

    </div>
  );
}
