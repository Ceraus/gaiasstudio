import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Bug, ChevronDown, ChevronRight, Database, Download, FolderOpen, KeyRound, Languages, Palette, Plus, Ruler, Trash2, X, ZoomIn } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db/db';
import { assetsRepo, ingredientsRepo, recipesRepo } from '@/db/repositories';
import { useLibraryStore } from '@/store/useLibraryStore';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const [savePath, setSavePath] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  useEffect(() => {
    const api = (window as unknown as Record<string, unknown>).electronAPI as
      | { getSavePath?: () => Promise<string> }
      | undefined;
    if (api?.getSavePath) {
      void api.getSavePath().then(setSavePath);
    }
  }, []);
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const loadLibrary = useLibraryStore((s) => s.load);

  const exportBackup = async () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      ingredients: await ingredientsRepo.all(),
      recipes: await recipesRepo.all(),
      assets: await assetsRepo.all(),
      settings,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaia-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  const clearAll = async () => {
    if (!window.confirm(t('settings.clearConfirm'))) return;
    await Promise.all([
      db.ingredients.clear(),
      db.recipes.clear(),
      db.assets.clear(),
      db.versions.clear(),
      db.drafts.clear(),
      db.labelSets.clear(),
    ]);
    await loadLibrary();
    await loadSettings();
  };

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <h1 className="text-2xl font-semibold text-gaia-900">{t('settings.title')}</h1>

        <div className="mt-6 space-y-4">
          <section className="card">
            <p className="label flex items-center gap-2">
              <Languages className="h-4 w-4" /> {t('settings.language')}
            </p>
            <div className="flex gap-2">
              {(['en', 'es'] as const).map((lng) => (
                <button
                  key={lng}
                  onClick={() => void updateSettings({ language: lng })}
                  className={`btn ${settings.language === lng ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {lng === 'en' ? t('settings.english') : t('settings.spanish')}
                </button>
              ))}
            </div>
          </section>

          <section className="card">
            <p className="label flex items-center gap-2">
              <ZoomIn className="h-4 w-4" /> {t('settings.displaySize', 'Display size')}
            </p>
            <p className="mb-3 text-xs text-slate-400">
              {t('settings.displaySizeHint', 'Make the whole app larger for easier reading. The label canvas is unaffected.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {([
                { v: 1, label: t('settings.scale100', '100%') },
                { v: 1.15, label: t('settings.scale115', '115%') },
                { v: 1.25, label: `${t('settings.scale125', '125%')} · ${t('settings.scaleRecommended', 'Larger')}` },
              ] as const).map(({ v, label }) => {
                const active = (settings.uiScale ?? 1) === v;
                return (
                  <button
                    key={v}
                    onClick={() => void updateSettings({ uiScale: v })}
                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card">
            <label className="label">{t('settings.filenamePrefix')}</label>
            <input
              className="input max-w-xs"
              value={settings.filenamePrefix}
              onChange={(e) =>
                void updateSettings({
                  filenamePrefix: e.target.value.replace(/[^\w-]/g, '').toUpperCase().slice(0, 12) || 'ROSA',
                })
              }
            />
            <p className="mt-1 text-xs text-slate-400">{t('settings.filenamePrefixHint')}</p>
          </section>

          <section className="card space-y-3">
            <p className="label flex items-center gap-2">
              <KeyRound className="h-4 w-4" /> {t('settings.keys')}
            </p>
            <p className="text-xs text-slate-400">{t('settings.keysHint')}</p>
            <div>
              <label className="label">{t('settings.googleAiKey')}</label>
              <input
                type="password"
                className="input"
                value={settings.googleAiApiKey ?? ''}
                onChange={(e) => void updateSettings({ googleAiApiKey: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">{t('settings.unsplashKey')}</label>
                <input
                  type="password"
                  className="input"
                  value={settings.unsplashKey ?? ''}
                  onChange={(e) => void updateSettings({ unsplashKey: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('settings.pixabayKey')}</label>
                <input
                  type="password"
                  className="input"
                  value={settings.pixabayKey ?? ''}
                  onChange={(e) => void updateSettings({ pixabayKey: e.target.value })}
                />
              </div>
            </div>
          </section>

          {/* Business / Maker Info — required for FDA-compliant labels */}
          <section className="card space-y-3">
            <p className="label flex items-center gap-2">
              <Building2 className="h-4 w-4" /> {t('settings.businessInfo', 'Business Information')}
            </p>
            <p className="text-xs text-slate-400">
              {t('settings.businessInfoHint', 'Your business name and address are required on FDA-compliant cosmetic labels. They appear in the FDA Label Checker.')}
            </p>
            <div>
              <label className="label">{t('settings.businessName', 'Business / Maker Name')}</label>
              <input
                className="input"
                placeholder="e.g. Gaia's Botanicals by Rosa"
                value={settings.businessName ?? ''}
                onChange={(e) => void updateSettings({ businessName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('settings.businessAddress', 'Business Address')}</label>
              <input
                className="input"
                placeholder="e.g. 123 Main St, Austin TX 78701"
                value={settings.businessAddress ?? ''}
                onChange={(e) => void updateSettings({ businessAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('settings.contact', 'Contact Info')}</label>
              <input
                className="input"
                placeholder="e.g. rosa@gaiasoaps.com · (512) 555-0100"
                value={settings.contact ?? ''}
                onChange={(e) => void updateSettings({ contact: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('settings.contactHint', 'Email, phone, or website — printed on back labels.')}
              </p>
            </div>
          </section>

          {/* Brand Color Palette */}
          <section className="card">
            <p className="label flex items-center gap-2">
              <Palette className="h-4 w-4" /> {t('settings.brandColors', 'Brand Colors')}
            </p>
            <p className="mb-3 text-xs text-slate-400">
              {t('settings.brandColorsHint', 'Save up to 8 brand colors. They appear at the top of every color picker so your labels stay on-brand instantly.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {(settings.brandColors ?? []).map((color, i) => (
                <div key={i} className="group relative">
                  <input
                    type="color"
                    value={color}
                    className="h-9 w-9 cursor-pointer rounded-xl border-2 border-slate-200 p-0.5 transition hover:border-gaia-400"
                    title={color}
                    onChange={(e) => {
                      const next = [...(settings.brandColors ?? [])];
                      next[i] = e.target.value;
                      void updateSettings({ brandColors: next });
                    }}
                  />
                  <button
                    className="absolute -right-1.5 -top-1.5 hidden h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white group-hover:flex"
                    onClick={() => {
                      const next = (settings.brandColors ?? []).filter((_, j) => j !== i);
                      void updateSettings({ brandColors: next });
                    }}
                    title="Remove"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              ))}
              {(settings.brandColors ?? []).length < 8 && (
                <button
                  className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dashed border-slate-300 text-slate-400 transition hover:border-gaia-400 hover:text-gaia-600"
                  title={t('settings.addBrandColor', 'Add a brand color')}
                  onClick={() => {
                    const next = [...(settings.brandColors ?? []), '#a7c4a0'];
                    void updateSettings({ brandColors: next });
                  }}
                >
                  <Plus className="h-4 w-4" />
                </button>
              )}
            </div>
          </section>

          <section className="card">
            <p className="label flex items-center gap-2">
              <Ruler className="h-4 w-4" /> {t('settings.print')}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">
                  {t('settings.bleed')} · {settings.bleedIn}"
                </label>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.0625}
                  className="w-full accent-gaia-600"
                  value={settings.bleedIn}
                  onChange={(e) => void updateSettings({ bleedIn: Number(e.target.value) })}
                />
              </div>
              <div>
                <label className="label">
                  {t('settings.safe')} · {settings.safeIn}"
                </label>
                <input
                  type="range"
                  min={0}
                  max={0.25}
                  step={0.0625}
                  className="w-full accent-gaia-600"
                  value={settings.safeIn}
                  onChange={(e) => void updateSettings({ safeIn: Number(e.target.value) })}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <p className="label flex items-center gap-2">
              <Database className="h-4 w-4" /> {t('settings.data')}
            </p>
            <p className="mb-3 text-xs text-slate-400">{t('settings.dataHint')}</p>
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-gaia-50 px-3 py-2 text-xs text-slate-500">
              <FolderOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gaia-500" />
              <span>
                <span className="font-medium text-slate-600">{t('settings.dataLocation')}: </span>
                <span className="break-all font-mono">
                  {savePath ?? t('settings.dataLocationBrowser')}
                </span>
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => void exportBackup()}>
                <Download className="h-4 w-4" /> {t('settings.exportData')}
              </button>
              <button className="btn-danger" onClick={() => void clearAll()}>
                <Trash2 className="h-4 w-4" /> {t('settings.clearData')}
              </button>
            </div>
          </section>

          {/* Advanced (collapsible) */}
          <section className="card">
            <button
              className="flex w-full items-center justify-between"
              onClick={() => setAdvancedOpen((v) => !v)}
            >
              <p className="label flex items-center gap-2">
                <Bug className="h-4 w-4" /> {t('settings.advanced', 'Advanced')}
              </p>
              {advancedOpen
                ? <ChevronDown className="h-4 w-4 text-slate-400" />
                : <ChevronRight className="h-4 w-4 text-slate-400" />
              }
            </button>
            {advancedOpen && (
              <div className="mt-3 space-y-3">
                {/* Label Sets toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {t('settings.showLabelSets', 'Show Label Sets')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t('settings.showLabelSetsHint', 'Show the Label Sets tab in the navigation bar.')}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={!!settings.showLabelSets}
                    onClick={() => void updateSettings({ showLabelSets: !settings.showLabelSets })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500 ${
                      settings.showLabelSets ? 'bg-gaia-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        settings.showLabelSets ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {t('settings.debugMode', 'Debug Mode')}
                    </p>
                    <p className="text-xs text-slate-400">
                      {t('settings.debugModeHint', 'Shows the floating debug panel (🐛) in production builds.')}
                    </p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={!!settings.debugMode}
                    onClick={() => void updateSettings({ debugMode: !settings.debugMode })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500 ${
                      settings.debugMode ? 'bg-gaia-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        settings.debugMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
