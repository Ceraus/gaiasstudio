import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Building2, Bug, CheckCircle2, ChevronDown, ChevronRight, Cloud, Database, Download, FolderOpen, GraduationCap, Instagram, KeyRound, Languages, Loader2, Palette, Plus, Ruler, Share2, Smartphone, Star, Store, Trash2, Upload, WifiOff, X, ZoomIn } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db/db';
import { useLibraryStore } from '@/store/useLibraryStore';
import { testLocalAiConnection, type LocalAiStatus } from '@/lib/localAi';
import { exportBackup, restoreBackup } from '@/lib/backup';
import {
  fetchCloudSyncMeta,
  pullCloudBackup,
  pushCloudBackup,
  runCloudSync,
} from '@/lib/cloudSync';
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
  verifyPin,
  hasPinConfigured,
} from '@/lib/appLock';
import { activateVaultFromPin, clearVaultKey } from '@/lib/secretVault';

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
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [syncMeta, setSyncMeta] = useState<string | null>(null);
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

  async function refreshSyncMeta() {
    if (!settings.cloudSyncEnabled) {
      setSyncMeta(null);
      return;
    }
    const meta = await fetchCloudSyncMeta(settings);
    setSyncMeta(
      meta?.exportedAt
        ? t('settings.cloudSyncMeta', 'Cloud copy: {{when}}', {
            when: new Date(meta.exportedAt).toLocaleString(),
          })
        : t('settings.cloudSyncMetaEmpty', 'No cloud copy yet.'),
    );
  }

  useEffect(() => {
    void refreshSyncMeta();
  }, [settings.cloudSyncEnabled, settings.cloudSyncUrl, settings.cloudSyncToken]);

  async function handleCloudPush() {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const result = await pushCloudBackup(settings);
      if (result.status === 'pushed') {
        const when = result.remoteExportedAt ?? new Date().toISOString();
        await updateSettings({ cloudSyncLastPushedAt: when });
        setSyncMessage(t('settings.cloudSyncPushed', 'Uploaded to cloud.'));
        void refreshSyncMeta();
      } else {
        setSyncMessage(result.message ?? t('settings.cloudSyncFailed', 'Sync failed.'));
      }
    } finally {
      setSyncBusy(false);
    }
  }

  async function handleCloudPull() {
    if (!window.confirm(t('settings.cloudSyncPullConfirm'))) return;
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const result = await pullCloudBackup(settings);
      if (result.status === 'pulled') {
        await updateSettings({
          cloudSyncLastPulledAt: result.remoteExportedAt ?? new Date().toISOString(),
        });
        setSyncMessage(t('settings.cloudSyncPulled', 'Downloaded from cloud — reloading…'));
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setSyncMessage(result.message ?? t('settings.cloudSyncFailed', 'Sync failed.'));
        setSyncBusy(false);
      }
    } catch (err) {
      setSyncMessage(String(err instanceof Error ? err.message : err));
      setSyncBusy(false);
    }
  }

  async function handleCloudSyncNow() {
    setSyncBusy(true);
    setSyncMessage(null);
    try {
      const result = await runCloudSync(settings, { autoPull: true, autoPush: true });
      if (result.status === 'pushed') {
        await updateSettings({
          cloudSyncLastPushedAt: result.remoteExportedAt ?? new Date().toISOString(),
        });
        setSyncMessage(t('settings.cloudSyncPushed', 'Uploaded to cloud.'));
      } else if (result.status === 'pulled') {
        await updateSettings({
          cloudSyncLastPulledAt: result.remoteExportedAt ?? new Date().toISOString(),
        });
        setSyncMessage(t('settings.cloudSyncPulled', 'Downloaded from cloud — reloading…'));
        setTimeout(() => window.location.reload(), 1200);
        return;
      } else if (result.status === 'in_sync') {
        setSyncMessage(t('settings.cloudSyncInSync', 'Already up to date.'));
      } else if (result.status === 'remote_newer') {
        setSyncMessage(t('settings.cloudSyncRemoteNewer', 'Cloud copy is newer — use Download from cloud.'));
      } else {
        setSyncMessage(result.message ?? t('settings.cloudSyncFailed', 'Sync failed.'));
      }
      void refreshSyncMeta();
    } finally {
      setSyncBusy(false);
    }
  }

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
            <p className="label flex items-center gap-2">
              <Smartphone className="h-4 w-4" /> {t('settings.mobileLayout', 'Phone layout')}
            </p>
            <p className="mb-3 text-xs text-slate-400">
              {t(
                'settings.mobileLayoutHint',
                'Choose how Gaia behaves on a phone. Streamlined focuses on the 5-step label workflow; Classic keeps the full app with responsive layout.',
              )}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                aria-pressed={(settings.mobileLayout ?? 'classic') === 'streamlined' || (settings.mobileLayout as string) === 'auto'}
                className={`btn flex-1 text-left ${
                  (settings.mobileLayout ?? 'classic') === 'streamlined' || (settings.mobileLayout as string) === 'auto'
                    ? 'btn-primary'
                    : 'btn-secondary'
                }`}
                onClick={() => void updateSettings({ mobileLayout: 'streamlined' })}
              >
                <span className="block font-semibold">{t('settings.mobileLayoutStreamlined', 'Streamlined')}</span>
                <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                  {t('settings.mobileLayoutStreamlinedHint', 'Bottom tabs + simple 3-layer editor')}
                </span>
              </button>
              <button
                type="button"
                aria-pressed={(settings.mobileLayout ?? 'classic') === 'classic'}
                className={`btn flex-1 text-left ${
                  (settings.mobileLayout ?? 'classic') === 'classic' ? 'btn-primary' : 'btn-secondary'
                }`}
                onClick={() => void updateSettings({ mobileLayout: 'classic' })}
              >
                <span className="block font-semibold">{t('settings.mobileLayoutClassic', 'Classic')}</span>
                <span className="mt-0.5 block text-[11px] font-normal opacity-80">
                  {t('settings.mobileLayoutClassicHint', 'Full app — scrollable nav & responsive editor')}
                </span>
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
          <AppLockSection />

          <EtsySection />

          <SocialSection />

          <PwaSection />

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
              <label className="label">{t('settings.contact', 'Contact Info')}</label>
              <input
                className="input"
                placeholder={t('settings.contactPlaceholder', 'e.g. Rosa Suarez · customercare@gaiasessences.com · https://www.gaiasessences.com/')}
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
                    title={t('common.remove', 'Remove')}
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
              <Star className="h-4 w-4" /> {t('settings.labelSizes')}
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
              <Cloud className="h-4 w-4" /> {t('settings.cloudSync')}
            </p>
            <p className="mb-3 text-xs text-slate-400">{t('settings.cloudSyncHint')}</p>
            <label className="mb-3 flex cursor-pointer items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-gaia-600 focus:ring-gaia-500"
                checked={settings.cloudSyncEnabled ?? false}
                onChange={(e) => void updateSettings({ cloudSyncEnabled: e.target.checked })}
              />
              {t('settings.cloudSyncEnable')}
            </label>
            <div className="space-y-3">
              <div>
                <label className="label">{t('settings.cloudSyncUrl')}</label>
                <input
                  className="input font-mono text-xs"
                  placeholder={t('settings.cloudSyncUrlPlaceholder', 'https://gaiasessences.com/studio/sync/sync.php')}
                  value={settings.cloudSyncUrl ?? ''}
                  onChange={(e) => void updateSettings({ cloudSyncUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="label">{t('settings.cloudSyncToken')}</label>
                <input
                  type="password"
                  className="input font-mono text-xs"
                  placeholder="••••••••"
                  value={settings.cloudSyncToken ?? ''}
                  onChange={(e) => void updateSettings({ cloudSyncToken: e.target.value })}
                />
              </div>
            </div>
            {syncMeta && (
              <p className="mt-3 text-xs text-slate-500">{syncMeta}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-secondary"
                disabled={syncBusy || !settings.cloudSyncEnabled}
                onClick={() => void handleCloudSyncNow()}
              >
                {syncBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
                {t('settings.cloudSyncNow')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={syncBusy || !settings.cloudSyncEnabled}
                onClick={() => void handleCloudPush()}
              >
                <Upload className="h-4 w-4" /> {t('settings.cloudSyncPush')}
              </button>
              <button
                type="button"
                className="btn-secondary"
                disabled={syncBusy || !settings.cloudSyncEnabled}
                onClick={() => void handleCloudPull()}
              >
                <Download className="h-4 w-4" /> {t('settings.cloudSyncPull')}
              </button>
            </div>
            {syncMessage && (
              <p className="mt-3 text-xs text-slate-500">{syncMessage}</p>
            )}
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
// Local AI — Ollama first (Tailscale HTTPS), bundled ~700MB fallback.
// ---------------------------------------------------------------------------
function LocalAiSection() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const updateSettings = useAppStore((s) => s.updateSettings);

  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<LocalAiStatus | null>(null);
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
    const result = await testLocalAiConnection(settings);

    if (result.effective === 'ollama') {
      setStatus(result.ollama);
      showToast(t('settings.localAiTestOllamaOk', 'Ollama is ready.'));
    } else if (result.effective === 'bundled') {
      setStatus(result.bundled);
      if (settings.ollamaUrl?.trim()) {
        showToast(
          t('settings.localAiTestOllamaFallback', 'Ollama unreachable, but bundled AI is ready.'),
        );
      } else {
        showToast(t('settings.localAiTestBundledOnly', 'Using bundled AI (Ollama URL not set).'));
      }
    } else {
      setStatus({
        state: 'unreachable',
        message: result.ollama.message ?? result.bundled.message,
      });
      showToast(
        t('settings.localAiTestBothFail', 'Neither Ollama nor the bundled model is available.'),
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
          'Adds an optional "✨ Suggest" button in the Recipe Builder that drafts a benefit statement from your selected ingredients. 100% local and offline — nothing is ever sent to the cloud.',
        )}
      </p>

      <p className="text-xs text-slate-400">
        {t(
          'settings.localAiHybridHint',
          'The app tries your Ollama server first for best quality, then falls back to a ~700MB built-in model in the desktop app if Ollama is unreachable.',
        )}
      </p>

      {settings.localAiEnabled && (
        <div className="space-y-3 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-200">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div>
              <label className="label">{t('settings.ollamaUrl', 'Ollama URL')}</label>
              <input
                className="input font-mono text-sm"
                placeholder={t('settings.ollamaUrlPlaceholder', 'https://gaming-pc.tail0123.ts.net')}
                value={settings.ollamaUrl ?? ''}
                onChange={(e) => void updateSettings({ ollamaUrl: e.target.value })}
              />
            </div>
            <div>
              <label className="label">{t('settings.ollamaModel', 'Model')}</label>
              <input
                className="input font-mono text-sm"
                placeholder={t('settings.ollamaModelPlaceholder', 'llama3.1:8b')}
                value={settings.ollamaModel ?? 'llama3.1:8b'}
                onChange={(e) => void updateSettings({ ollamaModel: e.target.value })}
              />
            </div>
            <p className="sm:col-span-2 text-[11px] text-slate-400">
              {t(
                'settings.ollamaTailscaleHint',
                'Enter your Tailscale MagicDNS URL with HTTPS (e.g., https://gaming-pc.tail0123.ts.net). The app will attempt to use this powerful server first. If it is unreachable, it will seamlessly fall back to the bundled 700MB local model.',
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
                {status.backend === 'ollama'
                  ? t('settings.localAiOllamaConnected', 'Ollama is ready.')
                  : settings.ollamaUrl?.trim()
                    ? t('settings.localAiFallbackConnected', 'Using bundled fallback model.')
                    : t('settings.localAiBundledConnected', 'Built-in model is ready.')}
              </span>
            )}
            {status?.state === 'unreachable' && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-rose-600">
                <WifiOff className="h-4 w-4 shrink-0" />
                {status.message ?? t('settings.localAiTestBothFail', 'Neither Ollama nor the bundled model is available.')}
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

  const changePin = async () => {
    if (!hasPinConfigured(settings)) return;
    if (nextPin.length < 4 || nextPin !== confirm) {
      setMessage(t('settings.pinChangeMismatch', 'New PINs must match and be at least 4 characters.'));
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const ok = await verifyPin(current, settings);
      if (!ok) {
        setMessage(t('settings.pinChangeWrong', 'Current PIN is incorrect.'));
        return;
      }
      const { hash, salt, iterations } = await hashPin(nextPin);
      await activateVaultFromPin(current, settings);
      const decrypted = { ...settings };
      await updateSettings({
        lockPinHash: hash,
        lockPinSalt: salt,
        lockPinIterations: iterations,
        googleAiApiKey: decrypted.googleAiApiKey,
        unsplashKey: decrypted.unsplashKey,
        pixabayKey: decrypted.pixabayKey,
        etsyShop: decrypted.etsyShop,
      });
      await activateVaultFromPin(nextPin, { lockPinSalt: salt, lockPinIterations: iterations });
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
      {hasPinConfigured(settings) && (
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
      )}
      <button type="button" className="btn btn-secondary text-sm" onClick={lockNow}>
        {t('settings.lockApp', 'Lock studio now')}
      </button>
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
            : t('settings.etsyConnect', 'Connect to Etsy')}
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

// ---------------------------------------------------------------------------
// PWA — install hint for the browser-hosted Studio on Hostinger.
// ---------------------------------------------------------------------------
function PwaSection() {
  const { t } = useTranslation();
  const isElectron = !!(window as unknown as { electronAPI?: unknown }).electronAPI;
  const [deferredPrompt, setDeferredPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (isElectron) return;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as Navigator & { standalone?: boolean }).standalone;
    setInstalled(!!standalone);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as unknown as { prompt: () => Promise<void> });
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, [isElectron]);

  if (isElectron) return null;

  return (
    <section className="card space-y-3">
      <p className="label flex items-center gap-2">
        <Smartphone className="h-4 w-4" /> {t('settings.pwa', 'Install App')}
      </p>
      <p className="text-xs text-slate-400">
        {t(
          'settings.pwaHint',
          'When hosted on gaiasessences.com, install Gaia\'s Studio on your phone or tablet like a native app. Your data stays in this browser (IndexedDB) and works offline.',
        )}
      </p>
      {installed ? (
        <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <CheckCircle2 className="h-4 w-4" /> {t('settings.pwaInstalled', 'App is installed')}
        </p>
      ) : deferredPrompt ? (
        <button
          type="button"
          className="btn-secondary text-sm"
          onClick={() => void deferredPrompt.prompt()}
        >
          <Smartphone className="h-4 w-4" /> {t('settings.pwaInstall', 'Install Gaia\'s Studio')}
        </button>
      ) : (
        <p className="text-xs text-slate-500">
          {t(
            'settings.pwaManual',
            'Tip: In Chrome or Edge, open the browser menu → "Install Gaia\'s Studio" (or "Add to Home Screen" on mobile).',
          )}
        </p>
      )}
    </section>
  );
}
