import { useTranslation } from 'react-i18next';
import { Database, Download, KeyRound, Languages, Ruler, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { db } from '@/db/db';
import { assetsRepo, ingredientsRepo, recipesRepo } from '@/db/repositories';
import { useLibraryStore } from '@/store/useLibraryStore';

export default function SettingsScreen() {
  const { t } = useTranslation();
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
            <label className="label">{t('settings.filenamePrefix')}</label>
            <input
              className="input max-w-xs"
              value={settings.filenamePrefix}
              onChange={(e) =>
                void updateSettings({
                  filenamePrefix: e.target.value.replace(/[^\w-]/g, '').toUpperCase().slice(0, 12) || 'GAIA',
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
            <div className="flex flex-wrap gap-2">
              <button className="btn-secondary" onClick={() => void exportBackup()}>
                <Download className="h-4 w-4" /> {t('settings.exportData')}
              </button>
              <button className="btn-danger" onClick={() => void clearAll()}>
                <Trash2 className="h-4 w-4" /> {t('settings.clearData')}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
