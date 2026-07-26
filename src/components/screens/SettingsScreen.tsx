import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Building2, Bug, CheckCircle2, ChevronDown, ChevronRight, Database, Download, FolderOpen, KeyRound, Languages, Loader2, Palette, Plus, Ruler, Trash2, Upload, WifiOff, X, ZoomIn } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db/db';
import { useLibraryStore } from '@/store/useLibraryStore';
import { checkBundledAiStatus, type LocalAiStatus } from '@/lib/localAi';
import { exportBackup, restoreBackup } from '@/lib/backup';

/** Interface zoom presets. 100% is the default. */
const UI_SCALES = [1, 1.1, 1.25, 1.4];

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

  // ── Backup & Restore ───────────────────────────────────────────────────────
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const restoreInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const { savedPath, filename } = await exportBackup();
      setBackupMessage(
        savedPath
          ? t('settings.backupSaved', 'Backup saved: {{path}}', { path: savedPath })
          : t('settings.backupDownloaded', 'Backup "{{name}}" downloaded — keep it somewhere safe (USB stick, cloud drive).', { name: filename }),
      );
    } catch (err) {
      setBackupMessage(String(err instanceof Error ? err.message : err));
    } finally {
      setBackupBusy(false);
    }
  };

  const handleRestoreFile = async (file: File) => {
    if (!window.confirm(t('settings.restoreConfirm',
      'Restoring a backup REPLACES everything currently in the app (recipes, ingredients, designs, orders, finances) with the backup contents. Continue?'))) {
      return;
    }
    setBackupBusy(true);
    setBackupMessage(null);
    try {
      const json = await file.text();
      const summary = await restoreBackup(json);
      setBackupMessage(
        t('settings.restoreDone', 'Restored {{rows}} records across {{tables}} tables — reloading…', {
          rows: summary.rows,
          tables: summary.tables,
        }),
      );
      // Reload so every store and screen re-reads the restored database.
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setBackupMessage(
        t('settings.restoreFailed', 'Restore failed: {{msg}}', {
          msg: err instanceof Error ? err.message : String(err),
        }),
      );
      setBackupBusy(false);
    }
  };

  const [maintenanceBusy, setMaintenanceBusy] = useState(false);
  const [maintenanceResult, setMaintenanceResult] = useState<string | null>(null);

  const runRosaMaintenance = async () => {
    if (!window.confirm(t('settings.rosaMaintenanceConfirm'))) return;
    setMaintenanceBusy(true);
    setMaintenanceResult(null);
    try {
      const { runRosaMaintenance: run } = await import('@/lib/maintenance');
      const result = await run();
      await loadLibrary();
      setMaintenanceResult(
        t('settings.rosaMaintenanceDone', {
          deactivated: result.ingredientsDeactivated,
          restored: result.recipesRestored,
        }),
      );
    } catch (err) {
      setMaintenanceResult(String(err));
    } finally {
      setMaintenanceBusy(false);
    }
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
              <ZoomIn className="h-4 w-4" /> {t('settings.uiScale', 'Interface size')}
            </p>
            <p className="mb-3 text-xs text-slate-400">
              {t('settings.uiScaleHint', 'Makes every button and label bigger or smaller. The canvas has its own zoom.')}
            </p>
            <div className="flex flex-wrap gap-2">
              {UI_SCALES.map((scale) => {
                const active = Math.abs((settings.uiScale ?? 1) - scale) < 0.001;
                return (
                  <button
                    key={scale}
                    aria-pressed={active}
                    onClick={() => void updateSettings({ uiScale: scale })}
                    className={`btn ${active ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {Math.round(scale * 100)}%
                    {scale === 1 && (
                      <span className="text-[10px] font-normal opacity-70">
                        {t('settings.uiScaleDefault', 'default')}
                      </span>
                    )}
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
                  filenamePrefix: e.target.value.replace(/[^\w\s-]/g, '').trim().slice(0, 24) || 'Gaia',
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
                <p className="mt-1 text-xs text-slate-400">
                  <a
                    href="https://unsplash.com/oauth/applications"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gaia-600 hover:underline"
                  >
                    {t('settings.getUnsplashKey', 'Get a free Unsplash Access Key →')}
                  </a>
                </p>
              </div>
              <div>
                <label className="label">{t('settings.pixabayKey')}</label>
                <input
                  type="password"
                  className="input"
                  value={settings.pixabayKey ?? ''}
                  onChange={(e) => void updateSettings({ pixabayKey: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">
                  <a
                    href="https://pixabay.com/api/docs/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-gaia-600 hover:underline"
                  >
                    {t('settings.getPixabayKey', 'Get a free Pixabay API key →')}
                  </a>
                </p>
              </div>
            </div>
          </section>

          <LocalAiSection />

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
              <button className="btn-secondary" disabled={backupBusy} onClick={() => void handleExportBackup()}>
                {backupBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {t('settings.exportData')}
              </button>
              <button
                className="btn-secondary"
                disabled={backupBusy}
                onClick={() => restoreInputRef.current?.click()}
              >
                <Upload className="h-4 w-4" /> {t('settings.importData', 'Restore from backup…')}
              </button>
              <input
                ref={restoreInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = ''; // allow picking the same file again
                  if (file) void handleRestoreFile(file);
                }}
              />
              <button
                className="btn-secondary"
                disabled={maintenanceBusy}
                onClick={() => void runRosaMaintenance()}
              >
                {maintenanceBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Database className="h-4 w-4" />}
                {t('settings.rosaMaintenance')}
              </button>
              <button className="btn-danger" onClick={() => void clearAll()}>
                <Trash2 className="h-4 w-4" /> {t('settings.clearData')}
              </button>
            </div>
            {backupMessage && (
              <p className="mt-3 break-all text-xs text-slate-500">{backupMessage}</p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              {t('settings.autoBackupHint', "The desktop app also keeps a daily automatic backup (newest 14) in the backups folder inside Gaia's Save System.")}
            </p>
            {maintenanceResult && (
              <p className="mt-3 text-xs text-slate-500">{maintenanceResult}</p>
            )}
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

// ---------------------------------------------------------------------------
// Local AI (optional) — bundled offline copywriting assist (desktop app only).
// ---------------------------------------------------------------------------
function LocalAiSection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<LocalAiStatus | null>(null);

  useEffect(() => {
    setStatus(null);
  }, [settings.localAiEnabled]);

  const testConnection = async () => {
    setTesting(true);
    setStatus(null);
    const result = await checkBundledAiStatus();
    setStatus(result);
    setTesting(false);
  };

  return (
    <section className="card space-y-3">
      <div className="flex items-center justify-between">
        <p className="label mb-0 flex items-center gap-2">
          <Bot className="h-4 w-4" /> {t('settings.localAi', 'Local AI (optional)')}
        </p>
        <button
          role="switch"
          aria-checked={!!settings.localAiEnabled}
          onClick={() => void updateSettings({ localAiEnabled: !settings.localAiEnabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500 ${
            settings.localAiEnabled ? 'bg-gaia-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              settings.localAiEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-slate-400">
        {t(
          'settings.localAiHint',
          'Adds an optional "✨ Suggest" button in the Recipe Builder that drafts a benefit statement from your selected ingredients. 100% local and offline — nothing is ever sent to the cloud.',
        )}
      </p>

      <p className="text-xs text-slate-400">
        {t(
          'settings.localAiBundledHint',
          'Uses a small model built into the desktop app — nothing to install. In the browser dev preview, AI stays offline until you run the packaged app.',
        )}
      </p>

      {settings.localAiEnabled && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-sm"
              onClick={() => void testConnection()}
              disabled={testing}
            >
              {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
              {t('settings.localAiTest', 'Test Connection')}
            </button>

            {status?.state === 'connected' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {t('settings.localAiBundledConnected', 'Built-in model is ready.')}
              </span>
            )}
            {status?.state === 'unreachable' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <WifiOff className="h-4 w-4 shrink-0" />
                {status.message ?? t('settings.localAiBundledUnreachable', "Couldn't reach the built-in model.")}
              </span>
            )}
            {status?.state === 'loading' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-amber-600">
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                {t('common.aiChecking', 'Checking AI…')}
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
