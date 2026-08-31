import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Building2, Bug, CheckCircle2, ChevronDown, ChevronRight, Database, Download, FolderOpen, GraduationCap, Image as ImageIcon, Instagram, KeyRound, Languages, Loader2, Share2, Star, Store, Trash2, Upload, WifiOff, X, ZoomIn } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db/db';
import { useLibraryStore } from '@/store/useLibraryStore';
import { testLocalAiConnection, fetchOllamaTags, type LocalAiStatus } from '@/lib/localAi';
import { exportBackup, restoreBackup } from '@/lib/backup';
import averyData from '@/data/averyTemplates.json';
import type { AveryDataset } from '@/types';
import { describeSize } from '@/lib/units';
import {
  queueTemplatePickerCatalogView,
  resolveFavoriteTemplates,
  toggleFavoriteId,
} from '@/lib/templateFavorites';
import {
  getConnectionStatus,
  startEtsyConnect,
  type EtsyConnectionStatus,
} from '@/lib/etsyApi';
import { getOAuthRedirectUri } from '@/lib/pwa';
import {
  clearSessionUnlock,
  hashPin,
  setSessionUnlocked,
  verifyPin,
  hasPinConfigured,
} from '@/lib/appLock';
import { activateVaultFromPin, clearVaultKey } from '@/lib/secretVault';
import { useComfyUiOnline } from '@/hooks/useComfyUiOnline';
import { getOfflineIngredientIconStats } from '@/lib/ingredientCatalog';

/** Interface zoom presets. 100% is the default. */
const UI_SCALES = [1, 1.1, 1.25, 1.4];
const averyDataset = averyData as AveryDataset;

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
  const setTrainingMode = useAppStore((s) => s.setTrainingMode);
  const loadSettings = useAppStore((s) => s.loadSettings);
  const goto = useAppStore((s) => s.goto);
  const loadLibrary = useLibraryStore((s) => s.load);

  const favoriteTemplates = resolveFavoriteTemplates(averyDataset.templates, settings);
  const usageCounts = settings.templateUsageCounts ?? {};

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

  const resetInitialSetup = async () => {
    if (!window.confirm(t('settings.initialSetupResetConfirm'))) return;
    setMaintenanceBusy(true);
    setMaintenanceResult(null);
    try {
      const { resetInitialSetup: run } = await import('@/lib/maintenance');
      const result = await run();
      await loadLibrary();
      setMaintenanceResult(
        t('settings.initialSetupResetDone', {
          deactivated: result.ingredientsDeactivated,
          removed: result.recipesRemoved,
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
    try {
      await db.transaction('rw', db.tables, async () => {
        await Promise.all(db.tables.map((table) => table.clear()));
      });
      await loadLibrary();
      await loadSettings();
    } catch (err) {
      window.alert(
        t('settings.clearFailed', 'Could not clear all data: {{msg}}', {
          msg: err instanceof Error ? err.message : String(err),
        }),
      );
    }
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
            <p className="label flex items-center gap-2">
              <GraduationCap className="h-4 w-4" /> {t('settings.trainingMode', 'Training Mode')}
            </p>
            <p className="mb-3 text-xs text-slate-400">{t('settings.trainingModeHint')}</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">
                  {settings.isTrainingMode === true
                    ? t('settings.trainingModeOn', 'Training Mode is on')
                    : t('settings.trainingModeOff', 'Full Studio unlocked')}
                </p>
                <p className="text-xs text-slate-400">
                  {settings.isTrainingMode === true
                    ? t('settings.trainingModeOnDetail', 'Business tools hidden · sequential workflow enforced')
                    : t('settings.trainingModeOffDetail', 'All navigation and free step jumping enabled')}
                </p>
              </div>
              <button
                role="switch"
                aria-checked={settings.isTrainingMode === true}
                onClick={() => void setTrainingMode(settings.isTrainingMode !== true)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500 ${
                  settings.isTrainingMode === true ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                    settings.isTrainingMode === true ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </section>

          <section className="card">
            <label className="label">{t('settings.filenamePrefix')}</label>
            <input
              className="input max-w-xs"
              value={settings.filenamePrefix}
              onChange={(e) =>
                void updateSettings({
                  filenamePrefix: e.target.value.replace(/[^\w\s'-]/g, '').trim().slice(0, 24) || "Gaia's Essences",
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
                <label className="label">{t('settings.unsplashSecretKey', 'Unsplash secret key')}</label>
                <input
                  type="password"
                  className="input"
                  value={settings.unsplashSecretKey ?? ''}
                  onChange={(e) => void updateSettings({ unsplashSecretKey: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('settings.unsplashAppId', 'Unsplash application ID')}</label>
                <input
                  className="input"
                  value={settings.unsplashAppId ?? ''}
                  onChange={(e) => void updateSettings({ unsplashAppId: e.target.value })}
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
              <div>
                <label className="label">{t('settings.googleTranslateKey', 'Google Translate API key (optional)')}</label>
                <input
                  type="password"
                  className="input"
                  value={settings.googleTranslateApiKey ?? ''}
                  onChange={(e) => void updateSettings({ googleTranslateApiKey: e.target.value })}
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('settings.googleTranslateKeyHint', 'Optional Cloud Translation key for Export label language. The button still works without it.')}
                </p>
              </div>
            </div>
          </section>

          <LocalAiSection />
          <ComfyUiSection />
          <AppLockSection />

          <EtsySection />

          <SocialSection />

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
                placeholder={t('settings.businessNamePlaceholder', "e.g. Gaia's Essences")}
                value={settings.businessName ?? ''}
                onChange={(e) => void updateSettings({ businessName: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('settings.businessAddress', 'Business Address')}</label>
              <input
                className="input"
                placeholder={t('settings.businessAddressPlaceholder', 'e.g. 1836 Westchester Ave, Unit #282, Bronx, NY 10472')}
                value={settings.businessAddress ?? ''}
                onChange={(e) => void updateSettings({ businessAddress: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('settings.baseLaborRate', 'Labor rate (USD / hour)')}</label>
              <input
                type="number"
                min={0}
                step={0.5}
                className="input"
                placeholder="20"
                value={settings.baseLaborRate ?? 20}
                onChange={(e) => {
                  const n = parseFloat(e.target.value);
                  void updateSettings({ baseLaborRate: !isNaN(n) && n >= 0 ? n : 20 });
                }}
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('settings.baseLaborRateHint', 'Used with recipe production time to calculate labor COGS and profit margins.')}
              </p>
            </div>
            <div>
              <label className="label">{t('settings.contact', 'Contact Info')}</label>
              <input
                className="input"
                placeholder={t('settings.contactPlaceholder', 'e.g. customercare@gaiasessences.com · https://www.gaiasessences.com/')}
                value={settings.contact ?? ''}
                onChange={(e) => void updateSettings({ contact: e.target.value })}
              />
              <p className="mt-1 text-xs text-slate-400">
                {t('settings.contactHint', 'Email, phone, or website — printed on back labels.')}
              </p>
            </div>
          </section>

          <section className="card">
            <p className="label flex items-center gap-2">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> {t('settings.labelSizes')}
            </p>
            <p className="mb-3 text-xs text-slate-400">{t('settings.labelSizesHint')}</p>
            {favoriteTemplates.length === 0 ? (
              <p className="text-sm text-slate-500">{t('settings.labelSizesEmpty')}</p>
            ) : (
              <ul className="mb-3 divide-y divide-slate-100 rounded-xl ring-1 ring-slate-100">
                {favoriteTemplates.map((tpl) => (
                  <li key={tpl.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800">{describeSize(tpl)}</p>
                      <p className="truncate text-xs text-slate-500">
                        {tpl.averyCode ? `Avery ${tpl.averyCode}` : tpl.name}
                        {(usageCounts[tpl.id] ?? 0) > 0 && (
                          <span className="text-slate-400">
                            {' '}
                            · {t('settings.labelSizesUsage', { count: usageCounts[tpl.id] })}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600"
                      title={t('settings.labelSizesRemove')}
                      onClick={() => void updateSettings(toggleFavoriteId(settings, tpl.id))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  queueTemplatePickerCatalogView();
                  goto('template');
                }}
              >
                {t('settings.labelSizesBrowse')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  if (
                    !window.confirm(t('settings.labelSizesEditSetupConfirm'))
                  ) {
                    return;
                  }
                  void updateSettings({ templateFavoritesConfigured: false });
                  goto('template');
                }}
              >
                {t('settings.labelSizesEditSetup')}
              </button>
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
                <Upload className="h-4 w-4" /> {t('settings.importData', 'Restore From Backup…')}
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
                onClick={() => void resetInitialSetup()}
              >
                {maintenanceBusy
                  ? <Loader2 className="h-4 w-4 animate-spin" />
                  : <Database className="h-4 w-4" />}
                {t('settings.initialSetupReset')}
              </button>
              <button className="btn-danger" onClick={() => void clearAll()}>
                <Trash2 className="h-4 w-4" /> {t('settings.clearData')}
              </button>
            </div>
            {backupMessage && (
              <p className="mt-3 break-all text-xs text-slate-500">{backupMessage}</p>
            )}
            <p className="mt-3 text-[11px] text-slate-400">
              {t('settings.autoBackupHint', "The desktop app also keeps a daily automatic backup (newest 14) in the backups folder inside Gaia's Essences Save.")}
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
                      {t('settings.debugModeHint', 'Shows the floating debug panel (🐛). Off unless you turn it on.')}
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
// Local AI — optional external Ollama (Tailscale / LAN / HTTPS).
// ---------------------------------------------------------------------------
function OllamaModelField({
  label,
  hint,
  value,
  tags,
  placeholder,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  tags: string[];
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const listId = `ollama-models-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return (
    <div>
      <label className="label">{label}</label>
      {tags.length > 0 ? (
        <select
          className="input font-mono text-sm"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          {!tags.includes(value) && value ? (
            <option value={value}>{value}</option>
          ) : null}
          {tags.map((tag) => (
            <option key={tag} value={tag}>
              {tag}
            </option>
          ))}
        </select>
      ) : (
        <input
          className="input font-mono text-sm"
          list={listId}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {tags.length > 0 && (
        <datalist id={listId}>
          {tags.map((tag) => (
            <option key={tag} value={tag.split(':')[0]} />
          ))}
        </datalist>
      )}
      {hint ? <p className="mt-1 text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}

function LocalAiSection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
  const [ollamaTags, setOllamaTags] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => {
    setStatus(null);
  }, [settings.localAiEnabled, settings.ollamaUrl, settings.ollamaModel]);

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  const testConnection = async () => {
    setTesting(true);
    setStatus(null);
    const tags = await fetchOllamaTags(settings.ollamaUrl);
    setOllamaTags(tags);
    const result = await testLocalAiConnection(settings);

    if (result.effective === 'ollama') {
      setStatus(result.ollama);
      showToast(t('settings.localAiTestOllamaOk', 'Ollama is ready.'));
    } else {
      setStatus({
        state: 'unreachable',
        message: result.ollama.message,
      });
      showToast(
        t('settings.localAiTestOllamaFail', 'Could not reach Ollama. Check the URL and that the server is running.'),
      );
    }
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
          'Adds an optional "✨ Suggest" button in the Recipe Builder that drafts a benefit statement from your selected ingredients. Uses your Ollama server when configured — nothing is bundled in the app.',
        )}
      </p>

      <p className="text-xs text-slate-400">
        {t(
          'settings.localAiHybridHint',
          'Point the URL at an Ollama server you already run (this PC, LAN, or Tailscale). The app does not ship a built-in language model.',
        )}
      </p>

      {settings.localAiEnabled && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="label">{t('settings.ollamaUrl', 'Ollama URL')}</label>
              <input
                className="input font-mono text-sm"
                placeholder={t('settings.ollamaUrlPlaceholder', 'https://alaster.tail18528d.ts.net')}
                value={settings.ollamaUrl ?? ''}
                onChange={(e) => void updateSettings({ ollamaUrl: e.target.value })}
              />
            </div>
            <OllamaModelField
              label={t('settings.ollamaModelText', 'Copywriting model')}
              hint={t(
                'settings.ollamaModelTextHint',
                'Used for benefit lines and label copy. A 7B instruct model is faster than gpt-oss for this.',
              )}
              value={settings.ollamaModelText ?? settings.ollamaModel ?? 'qwen2.5:7b-instruct'}
              tags={ollamaTags}
              placeholder="qwen2.5:7b-instruct"
              onChange={(v) => void updateSettings({ ollamaModel: v, ollamaModelText: v })}
            />
            <p className="sm:col-span-2 text-[11px] text-slate-400">
              {t(
                'settings.ollamaTailscaleHint',
                'Enter your Tailscale MagicDNS URL with HTTPS (e.g., https://gaming-pc.tail0123.ts.net), or a LAN URL if Ollama is on the same network.',
              )}
            </p>
          </div>

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
                {t('settings.localAiOllamaConnected', 'Ollama is ready.')}
              </span>
            )}
            {status?.state === 'unreachable' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <WifiOff className="h-4 w-4 shrink-0" />
                {status.message ?? t('settings.localAiTestOllamaFail', 'Could not reach Ollama.')}
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

      {toast && (
        <p className="rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-white shadow-lg" role="status">
          {toast}
        </p>
      )}
    </section>
  );
}

function ComfyUiSection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const comfy = useComfyUiOnline(settings);
  const iconStats = getOfflineIngredientIconStats();

  return (
    <section className="card">
      <div className="flex items-center justify-between">
        <p className="label mb-0 flex items-center gap-2">
          <ImageIcon className="h-4 w-4" /> {t('settings.comfyUi', 'ComfyUI Image Generation')}
        </p>
        <button
          role="switch"
          aria-checked={!!settings.comfyUiEnabled}
          onClick={() => void updateSettings({ comfyUiEnabled: !settings.comfyUiEnabled })}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-gaia-500 ${
            settings.comfyUiEnabled ? 'bg-gaia-600' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
              settings.comfyUiEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-slate-400">
        {t(
          'settings.comfyUiHint',
          'Connects to a local ComfyUI server to generate custom icons. On Tailscale, start ComfyUI with --enable-cors-header if you use the browser; the desktop app talks to it directly.',
        )}
      </p>

      <p className="text-sm font-medium text-slate-700">
        {t('settings.offlineCatalogIcons', '{{icons}} of {{names}} catalog icons generated', iconStats)}
      </p>
      <p className="text-[11px] text-slate-400">
        {t(
          'settings.offlineCatalogIconsHint',
          'These names stay in a hidden backlog until you add them from recipe search. They are not imported into inventory.',
        )}
      </p>

      {settings.comfyUiEnabled && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div>
            <label className="label">{t('settings.comfyUiUrl', 'ComfyUI URL')}</label>
            <input
              className="input font-mono text-sm"
              placeholder={t('settings.comfyUiUrlPlaceholder', 'http://127.0.0.1:8188')}
              value={settings.comfyUiUrl ?? ''}
              onChange={(e) => void updateSettings({ comfyUiUrl: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className={`text-[11px] ${comfy.online ? 'text-emerald-700' : 'text-slate-500'}`}>
              {comfy.checking && !comfy.status
                ? t('settings.comfyUiChecking', 'Checking ComfyUI…')
                : (comfy.status?.message
                    ?? t('settings.comfyUiHeartbeatDown', 'Not reachable yet — retrying saved URL and localhost.'))}
            </p>
            <button
              type="button"
              className="btn-secondary px-2.5 py-1 text-[11px]"
              onClick={() => void comfy.refresh()}
              disabled={comfy.checking}
            >
              {comfy.checking
                ? <><Loader2 className="h-3 w-3 animate-spin" /> {t('settings.comfyUiChecking', 'Checking ComfyUI…')}</>
                : t('settings.comfyUiCheckNow', 'Check Now')}
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            {t(
              'settings.comfyUiTailscaleHint',
              'Enter your local API endpoint (e.g., http://127.0.0.1:8188) or a Tailscale URL. ComfyUI must be running with --listen. The app keeps a heartbeat and falls back to localhost if Tailscale drops.',
            )}
          </p>
        </div>
      )}
    </section>
  );
}

function AppLockSection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [current, setCurrent] = useState('');
  const [nextPin, setNextPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const lockNow = () => {
    clearSessionUnlock();
    clearVaultKey();
    window.location.reload();
  };

  const persistPinAndEncrypt = async (pin: string, currentPin?: string) => {
    if (currentPin) {
      const ok = await verifyPin(currentPin, settings);
      if (!ok) {
        setMessage(t('settings.pinChangeWrong', 'Current PIN is incorrect.'));
        return false;
      }
    }
    const { hash, salt, iterations } = await hashPin(pin);
    await activateVaultFromPin(pin, { lockPinSalt: salt, lockPinIterations: iterations });
    const decrypted = { ...settings };
    await updateSettings({
      lockPinHash: hash,
      lockPinSalt: salt,
      lockPinIterations: iterations,
      googleAiApiKey: decrypted.googleAiApiKey,
      googleTranslateApiKey: decrypted.googleTranslateApiKey,
      unsplashKey: decrypted.unsplashKey,
      unsplashSecretKey: decrypted.unsplashSecretKey,
      pixabayKey: decrypted.pixabayKey,
      etsyShop: decrypted.etsyShop,
    });
    setSessionUnlocked();
    return true;
  };

  const setPin = async () => {
    if (hasPinConfigured(settings)) return;
    if (nextPin.length < 4 || nextPin !== confirm) {
      setMessage(t('settings.pinChangeMismatch', 'New PINs must match and be at least 4 characters.'));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const ok = await persistPinAndEncrypt(nextPin);
      if (!ok) return;
      setMessage(t('settings.setPinDone', 'PIN saved. API keys will be encrypted with it.'));
      setNextPin('');
      setConfirm('');
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  const changePin = async () => {
    if (!hasPinConfigured(settings)) return;
    if (nextPin.length < 4 || nextPin !== confirm) {
      setMessage(t('settings.pinChangeMismatch', 'New PINs must match and be at least 4 characters.'));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const ok = await persistPinAndEncrypt(nextPin, current);
      if (!ok) return;
      setMessage(t('settings.pinChangeDone', 'PIN updated. API keys re-encrypted.'));
      setCurrent('');
      setNextPin('');
      setConfirm('');
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card">
      <p className="label flex items-center gap-2">
        <KeyRound className="h-4 w-4" /> {t('settings.appLock', 'App lock & encryption')}
      </p>
      <p className="mb-3 text-xs text-slate-400">{t('settings.appLockHint')}</p>
      {hasPinConfigured(settings) ? (
        <div className="mb-4 space-y-2">
          <input
            type="password"
            className="input w-full"
            placeholder={t('settings.currentPin', 'Current PIN')}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
          <input
            type="password"
            className="input w-full"
            placeholder={t('settings.newPin', 'New PIN')}
            value={nextPin}
            onChange={(e) => setNextPin(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            className="input w-full"
            placeholder={t('settings.confirmPin', 'Confirm new PIN')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="btn btn-secondary text-sm"
            disabled={busy || !current || !nextPin || !confirm}
            onClick={() => void changePin()}
          >
            {t('settings.changePin', 'Change PIN')}
          </button>
        </div>
      ) : (
        <div className="mb-4 space-y-2">
          <input
            type="password"
            className="input w-full"
            placeholder={t('lock.setupPlaceholder')}
            value={nextPin}
            onChange={(e) => setNextPin(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            className="input w-full"
            placeholder={t('lock.confirmPlaceholder')}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="btn btn-secondary text-sm"
            disabled={busy || !nextPin || !confirm}
            onClick={() => void setPin()}
          >
            {t('settings.setPin', 'Set a PIN')}
          </button>
        </div>
      )}
      {hasPinConfigured(settings) && (
        <button type="button" className="btn btn-secondary text-sm" onClick={lockNow}>
          {t('settings.lockApp', 'Lock Studio Now')}
        </button>
      )}
      {message && <p className="mt-2 text-xs text-slate-600">{message}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Etsy Shop — OAuth PKCE connection (add API key now, connect when ready).
// ---------------------------------------------------------------------------
function EtsySection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const [connecting, setConnecting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const shop = settings.etsyShop ?? {};
  const status: EtsyConnectionStatus = getConnectionStatus(shop);
  const redirectUri = getOAuthRedirectUri();

  const patchShop = (patch: Partial<typeof shop>) =>
    void updateSettings({ etsyShop: { ...shop, ...patch } });

  const handleConnect = async () => {
    setMessage(null);
    if (!shop.apiKey?.trim()) {
      setMessage(t('settings.etsyNeedKey', 'Add your Etsy API keystring first.'));
      return;
    }
    if (!shop.shopId?.trim()) {
      setMessage(t('settings.etsyNeedShopId', 'Add your Etsy Shop ID first.'));
      return;
    }
    setConnecting(true);
    try {
      const url = await startEtsyConnect({ ...shop, apiKey: shop.apiKey.trim() });
      if (!url) {
        setMessage(t('settings.etsyConnectFailed', 'Could not start Etsy connection.'));
        return;
      }
      window.location.href = url;
    } catch (err) {
      setMessage(String(err instanceof Error ? err.message : err));
    } finally {
      setConnecting(false);
    }
  };

  const statusLabel =
    status === 'connected'
      ? t('settings.etsyConnected', 'Connected')
      : status === 'configured'
        ? t('settings.etsyConfigured', 'Ready to connect')
        : status === 'expired'
          ? t('settings.etsyExpired', 'Session expired')
          : t('settings.etsyDisconnected', 'Not configured');

  const statusColor =
    status === 'connected'
      ? 'text-emerald-600'
      : status === 'expired'
        ? 'text-amber-600'
        : 'text-slate-500';

  return (
    <section className="card space-y-3">
      <p className="label flex items-center gap-2">
        <Store className="h-4 w-4" /> {t('settings.etsy', 'Etsy Shop')}
      </p>
      <p className="text-xs text-slate-400">
        {t(
          'settings.etsyHint',
          'Connect your Etsy shop to push soap listings and import orders as Work Orders. Add your developer credentials now — you can connect OAuth whenever you are ready.',
        )}
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="label">{t('settings.etsyApiKey', 'API keystring')}</label>
          <input
            type="password"
            className="input font-mono text-sm"
            placeholder={t('settings.etsyApiKeyPlaceholder', 'your-etsy-keystring')}
            value={shop.apiKey ?? ''}
            onChange={(e) => patchShop({ apiKey: e.target.value })}
          />
          <p className="mt-1 text-xs text-slate-400">
            <a
              href="https://www.etsy.com/developers/register"
              target="_blank"
              rel="noreferrer"
              className="text-gaia-600 hover:underline"
            >
              {t('settings.etsyRegister', 'Register as an Etsy developer →')}
            </a>
          </p>
        </div>
        <div>
          <label className="label">{t('settings.etsyShopId', 'Shop ID')}</label>
          <input
            className="input font-mono text-sm"
            placeholder={t('settings.etsyShopIdPlaceholder', '12345678')}
            value={shop.shopId ?? ''}
            onChange={(e) => patchShop({ shopId: e.target.value.replace(/\D/g, '') })}
          />
        </div>
        <div>
          <label className="label">{t('settings.etsyShopName', 'Shop name (display)')}</label>
          <input
            className="input"
            placeholder={t('settings.etsyShopNamePlaceholder', 'GaiasEssences')}
            value={shop.shopName ?? ''}
            onChange={(e) => patchShop({ shopName: e.target.value })}
          />
        </div>
      </div>

      <p className="text-[11px] text-slate-400">
        {t('settings.etsyRedirectHint', 'OAuth redirect URI (register this in your Etsy app):')}{' '}
        <code className="break-all rounded bg-slate-100 px-1 py-0.5">{redirectUri}</code>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-primary text-sm"
          disabled={connecting || status === 'connected'}
          onClick={() => void handleConnect()}
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Store className="h-4 w-4" />}
          {status === 'connected'
            ? t('settings.etsyConnectedBtn', 'Connected')
            : t('settings.etsyConnect', 'Connect To Etsy')}
        </button>
        {status === 'connected' && (
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={() => patchShop({ accessToken: undefined, refreshToken: undefined, tokenExpiresAt: undefined })}
          >
            {t('settings.etsyDisconnect', 'Disconnect')}
          </button>
        )}
        <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
      </div>
      {message && <p className="text-xs text-rose-600">{message}</p>}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Social media handles — used on the public site and marketing copy.
// ---------------------------------------------------------------------------
function SocialSection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <section className="card space-y-3">
      <p className="label flex items-center gap-2">
        <Share2 className="h-4 w-4" /> {t('settings.social', 'Social Media')}
      </p>
      <p className="text-xs text-slate-400">
        {t('settings.socialHint', 'Your Instagram and TikTok usernames — used when we build the public Gaia\'s Essences website.')}
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label flex items-center gap-1.5">
            <Instagram className="h-3.5 w-3.5" /> {t('settings.instagram', 'Instagram')}
          </label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">@</span>
            <input
              className="input rounded-l-none"
              placeholder={t('settings.socialHandlePlaceholder', 'gaiasessences')}
              value={settings.instagramHandle ?? ''}
              onChange={(e) =>
                void updateSettings({ instagramHandle: e.target.value.replace(/^@/, '').trim() })
              }
            />
          </div>
        </div>
        <div>
          <label className="label">{t('settings.tiktok', 'TikTok')}</label>
          <div className="flex">
            <span className="inline-flex items-center rounded-l-xl border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-500">@</span>
            <input
              className="input rounded-l-none"
              placeholder={t('settings.socialHandlePlaceholder', 'gaiasessences')}
              value={settings.tiktokHandle ?? ''}
              onChange={(e) =>
                void updateSettings({ tiktokHandle: e.target.value.replace(/^@/, '').trim() })
              }
            />
          </div>
        </div>
      </div>
    </section>
  );
}

