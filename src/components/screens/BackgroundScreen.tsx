/**
 * BackgroundScreen — Step 3 of the 5-step workflow.
 *
 * Lets the user pick a background image before entering the editor.
 * Four tabs:
 *   My Photos  — file upload + previously-uploaded assets (kind: photo)
 *   Library    — all saved assets grid
 *   Free Stock — Unsplash / Pixabay search (requires API key in settings)
 *   AI Generated — embedded AI Studio webview (same as PromptBuilderScreen)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Check,
  SquareCheck,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Image as ImageIcon,
  Loader2,
  Search,
  Sparkles,
  Square,
  Trash2,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { assetsRepo } from '@/db/repositories';
import type { AssetRecord } from '@/types';
import WorkflowNav from '@/components/WorkflowNav';
import { searchStock, fetchStockPhotoAsDataUrl, triggerUnsplashDownload, type StockPhoto } from '@/lib/stock';
import { isElectronWithBridge } from '@/lib/autoImport';
import { fileToDataUrl, isImageFile } from '@/lib/files';

type TabId = 'myPhotos' | 'library' | 'stock' | 'ai';

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function BackgroundScreen() {
  const { t } = useTranslation();
  const goto                 = useAppStore((s) => s.goto);
  const setBackgroundImageUrl = useAppStore((s) => s.setBackgroundImageUrl);
  const template             = useAppStore((s) => s.template);
  const settings             = useAppStore((s) => s.settings);

  const [tab, setTab] = useState<TabId>('myPhotos');

  // Redirect to template if none selected
  useEffect(() => {
    if (!template) goto('template');
  }, [template, goto]);

  if (!template) return null;

  const handleSelect = (url: string) => {
    setBackgroundImageUrl(url);
    goto('editor');
  };

  const handleSkip = () => {
    setBackgroundImageUrl(null);
    goto('editor');
  };

  const TABS: { id: TabId; labelKey: string; defaultLabel: string }[] = [
    { id: 'myPhotos', labelKey: 'background.myPhotos',  defaultLabel: 'My Photos'   },
    { id: 'library',  labelKey: 'background.library',   defaultLabel: 'Library'     },
    { id: 'stock',    labelKey: 'background.stock',     defaultLabel: 'Free Stock'  },
    { id: 'ai',       labelKey: 'background.aiPrompt',   defaultLabel: 'AI Prompt Builder' },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Header banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-gaia-700 via-gaia-600 to-gaia-500 px-6 py-5 text-white shadow-sm">
        <div className="pointer-events-none absolute inset-0 opacity-10">
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white" />
          <div className="absolute -bottom-6 left-1/3 h-28 w-28 rounded-full bg-white" />
        </div>
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">
              {t('background.title', 'Choose a Background')}
            </h1>
            <p className="mt-1 text-sm text-gaia-100">
              {t('background.subtitle', 'Pick an image for the background layer of your label, or skip to go straight to the editor.')}
            </p>
          </div>
          <button
            className="shrink-0 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition hover:bg-white/30"
            onClick={handleSkip}
          >
            {t('background.skip', 'Skip, go to editor')}
            <ArrowRight className="ml-1.5 inline-block h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 gap-0.5 border-b border-slate-200 bg-white px-4 pt-2">
        {TABS.map(({ id, labelKey, defaultLabel }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? 'text-gaia-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {t(labelKey, defaultLabel)}
            {tab === id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gaia-600" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'myPhotos' && <MyPhotosTab onSelect={handleSelect} />}
        {tab === 'library'  && <LibraryTab  onSelect={handleSelect} />}
        {tab === 'stock'    && <StockTab    onSelect={handleSelect} settings={settings} />}
        {tab === 'ai'       && <AIPromptTab onSelect={handleSelect} />}
      </div>

      {/* Workflow bottom bar */}
      <WorkflowNav
        prevScreen="recipes"
        nextScreen="editor"
        nextLabel={t('workflow.nextRefine', 'Next: Refine & Design')}
        onNext={() => { setBackgroundImageUrl(null); goto('editor'); }}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helpers shared only within BackgroundScreen
// ---------------------------------------------------------------------------

type BgSortOption = 'newest' | 'oldest' | 'nameAZ' | 'largest';

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ---------------------------------------------------------------------------
// My Photos tab — full photo management
// ---------------------------------------------------------------------------

function MyPhotosTab({ onSelect }: { onSelect: (url: string) => void }) {
  const { t } = useTranslation();
  const [allAssets, setAllAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<BgSortOption>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isElectron = isElectronWithBridge();

  const reload = useCallback(async () => {
    setLoading(true);
    const all = await assetsRepo.all();
    setAllAssets(all.filter((a) => a.kind === 'photo' || a.kind === 'logo'));
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  // Clipboard paste
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []).filter((i) => i.type.startsWith('image/'));
      if (!items.length) return;
      e.preventDefault();
      const files = items.map((i) => i.getAsFile()).filter(Boolean) as File[];
      await uploadFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFiles = async (files: File[]) => {
    const imgs = files.filter(isImageFile);
    if (!imgs.length) return;
    setUploading(true);
    try {
      for (const file of imgs) {
        const dataUrl = await fileToDataUrl(file);
        const img = new Image();
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.src = dataUrl;
        });
        await assetsRepo.create({
          name: file.name,
          kind: 'photo',
          dataUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSize: file.size,
        });
      }
      await reload();
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    await uploadFiles(Array.from(e.target.files ?? []));
    e.target.value = '';
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    await uploadFiles(Array.from(e.dataTransfer.files));
  };

  const handleImportFolder = async () => {
    if (!isElectron) return;
    const api = (window as unknown as { electronAPI?: { pickFiles?: () => Promise<{ dataUrl: string; name: string; size: number }[]> } }).electronAPI;
    const files = await api?.pickFiles?.();
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        const img = new Image();
        await new Promise<void>((res) => { img.onload = () => res(); img.src = f.dataUrl; });
        await assetsRepo.create({ name: f.name, kind: 'photo', dataUrl: f.dataUrl, width: img.naturalWidth, height: img.naturalHeight, fileSize: f.size });
      }
      await reload();
    } finally {
      setUploading(false);
    }
  };

  const doArchive = async (id: string) => {
    await assetsRepo.archive(id);
    setAllAssets((prev) => prev.map((a) => a.id === id ? { ...a, archived: true } : a));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const doUnarchive = async (id: string) => {
    await assetsRepo.unarchive(id);
    setAllAssets((prev) => prev.map((a) => a.id === id ? { ...a, archived: false } : a));
  };

  const doDelete = async (id: string) => {
    if (!window.confirm(t('assets.confirmDeleteOne'))) return;
    await assetsRepo.remove(id);
    setAllAssets((prev) => prev.filter((a) => a.id !== id));
    setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
  };

  const bulkArchive = async () => {
    for (const id of selected) await assetsRepo.archive(id);
    setAllAssets((prev) => prev.map((a) => selected.has(a.id) ? { ...a, archived: true } : a));
    setSelected(new Set());
  };

  const bulkDelete = async () => {
    if (!window.confirm(t('assets.confirmDeleteSelected', { count: selected.size }))) return;
    for (const id of selected) await assetsRepo.remove(id);
    setAllAssets((prev) => prev.filter((a) => !selected.has(a.id)));
    setSelected(new Set());
  };

  const toggleSelect = (id: string) =>
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const photos = allAssets.filter((a) => !a.archived);
  const archived = allAssets.filter((a) => a.archived);

  const filtered = photos
    .filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()))
    .sort((x, y) => {
      if (sort === 'oldest') return x.createdAt - y.createdAt;
      if (sort === 'nameAZ') return x.name.localeCompare(y.name);
      if (sort === 'largest') return (y.fileSize ?? 0) - (x.fileSize ?? 0);
      return y.createdAt - x.createdAt;
    });

  const anySelected = selected.size > 0;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 border-b border-slate-200 bg-white px-5 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input w-full pl-9"
              placeholder={t('common.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <select
            className="input shrink-0 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as BgSortOption)}
          >
            <option value="newest">{t('assets.sortNewest')}</option>
            <option value="oldest">{t('assets.sortOldest')}</option>
            <option value="nameAZ">{t('assets.sortNameAZ')}</option>
            <option value="largest">{t('assets.sortLargest')}</option>
          </select>
          {isElectron && (
            <button
              title={t('assets.importFolder')}
              className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100"
              onClick={() => void handleImportFolder()}
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Bulk bar */}
        {anySelected ? (
          <div className="flex items-center gap-2 rounded-lg bg-gaia-50 px-3 py-1.5 ring-1 ring-gaia-200">
            <span className="flex-1 text-sm font-medium text-gaia-700">
              {t('assets.selectedCount', { count: selected.size })}
            </span>
            <button className="text-xs text-slate-500 hover:text-slate-700" onClick={() => setSelected(new Set())}>{t('common.cancel')}</button>
            <button className="flex items-center gap-1 text-xs text-amber-700 hover:text-amber-900" onClick={() => void bulkArchive()}>
              <Archive className="h-3.5 w-3.5" />{t('assets.archiveSelected')}
            </button>
            <button className="flex items-center gap-1 text-xs text-rose-700 hover:text-rose-900" onClick={() => void bulkDelete()}>
              <Trash2 className="h-3.5 w-3.5" />{t('assets.deleteSelected')}
            </button>
          </div>
        ) : (
          filtered.length > 0 && (
            <button
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600"
              onClick={() => setSelected(new Set(filtered.map((a) => a.id)))}
            >
              <Square className="h-3.5 w-3.5" />
              {t('assets.selectAll')}
            </button>
          )
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-gaia-50 p-5 space-y-5">
        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => void handleDrop(e)}
          onClick={() => fileRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed py-8 text-center transition
            ${dragging ? 'border-gaia-500 bg-gaia-100' : 'border-gaia-300 bg-white hover:border-gaia-500 hover:bg-gaia-50'}`}
        >
          {uploading
            ? <Loader2 className="h-8 w-8 animate-spin text-gaia-500" />
            : <Upload className="h-8 w-8 text-gaia-400" />
          }
          <span className="font-medium text-gaia-700">
            {uploading ? t('common.loading') : t('assets.dropZone')}
          </span>
          <span className="text-xs text-slate-400">JPG · PNG · WEBP · GIF · paste from clipboard</span>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple className="sr-only" onChange={(e) => void handleFileInput(e)} />

        {/* Photo grid */}
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-gaia-400" />
          </div>
        ) : filtered.length === 0 && !loading ? (
          <EmptyState message={t('assets.noPhotos')} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {filtered.map((a) => {
              const isSel = selected.has(a.id);
              return (
                <div
                  key={a.id}
                  className={`group relative overflow-hidden rounded-xl ring-2 transition
                    ${isSel ? 'ring-gaia-500' : 'ring-transparent hover:ring-gaia-300'}`}
                >
                  {/* Checkbox */}
                  <button
                    className={`absolute left-1.5 top-1.5 z-10 rounded p-0.5 transition
                      ${anySelected || isSel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    onClick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}
                  >
                    {isSel
                      ? <SquareCheck className="h-5 w-5 text-gaia-500 drop-shadow-sm" />
                      : <Square className="h-5 w-5 text-white drop-shadow-sm" />
                    }
                  </button>

                  {/* Thumbnail */}
                  <img
                    src={a.dataUrl}
                    alt={a.name}
                    className="aspect-square w-full cursor-pointer object-cover"
                    loading="lazy"
                    onClick={() => onSelect(a.dataUrl)}
                  />

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="flex items-center gap-1.5 rounded-lg bg-gaia-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gaia-600"
                      onClick={() => onSelect(a.dataUrl)}
                    >
                      <Check className="h-3.5 w-3.5" />
                      {t('assets.use')}
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-xs text-white hover:bg-amber-500"
                      onClick={() => void doArchive(a.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      {t('assets.archive')}
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-xs text-white hover:bg-rose-500"
                      onClick={() => void doDelete(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('common.delete')}
                    </button>
                  </div>

                  {/* Meta strip */}
                  <div className="border-t border-slate-100 bg-white px-2 py-1">
                    <p className="truncate text-[11px] font-medium text-slate-700" title={a.name}>{a.name}</p>
                    <p className="text-[10px] text-slate-400">
                      {a.fileSize ? fmtBytes(a.fileSize) + ' · ' : ''}{fmtDate(a.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Archived section */}
        {archived.length > 0 && (
          <div>
            <button
              className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600"
              onClick={() => setShowArchived((v) => !v)}
            >
              {showArchived ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              {t('assets.archived')} ({archived.length})
            </button>
            {showArchived && (
              <div className="mt-3 grid grid-cols-2 gap-3 opacity-60 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {archived.map((a) => (
                  <div key={a.id} className="group relative overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:opacity-100">
                    <img src={a.dataUrl} alt={a.name} className="aspect-square w-full object-cover" loading="lazy" />
                    <div className="border-t border-slate-100 bg-white px-2 py-1">
                      <p className="truncate text-[11px] font-medium text-slate-700">{a.name}</p>
                    </div>
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 opacity-0 transition group-hover:opacity-100">
                      <button
                        className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-xs text-white hover:bg-gaia-500"
                        onClick={() => void doUnarchive(a.id)}
                      >
                        <ArchiveRestore className="h-3.5 w-3.5" />
                        {t('assets.unarchive')}
                      </button>
                      <button
                        className="flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1 text-xs text-white hover:bg-rose-500"
                        onClick={() => void doDelete(a.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {t('common.delete')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Library tab — all saved assets
// ---------------------------------------------------------------------------

function LibraryTab({ onSelect }: { onSelect: (url: string) => void }) {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    assetsRepo.all().then((all) => {
      setAssets(all);
      setLoading(false);
    });
  }, []);

  return (
    <div className="h-full overflow-y-auto bg-gaia-50 p-5">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gaia-400" />
        </div>
      ) : assets.length === 0 ? (
        <EmptyState message={t('background.noAssets', 'Your library is empty. Upload photos or generate AI images.')} />
      ) : (
        <AssetGrid assets={assets} onSelect={(a) => onSelect(a.dataUrl)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Free Stock tab — Unsplash / Pixabay search
// ---------------------------------------------------------------------------

function StockTab({
  onSelect,
  settings,
}: {
  onSelect: (url: string) => void;
  settings: import('@/types').AppSettings;
}) {
  const { t } = useTranslation();
  const hasKey = !!(settings.unsplashKey || settings.pixabayKey);
  const goto   = useAppStore((s) => s.goto);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);

  const [query, setQuery]       = useState('');
  const [results, setResults]   = useState<StockPhoto[]>([]);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    if (!query.trim() || !hasKey) return;
    setLoading(true);
    setError(null);
    setSaveError(null);
    try {
      const photos = await searchStock(query.trim(), settings);
      setResults(photos);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [query, hasKey, settings]);

  const handleUse = useCallback(async (photo: StockPhoto) => {
    setSaveError(null);
    setSavingId(photo.id);
    try {
      triggerUnsplashDownload(photo, settings.unsplashKey);
      const dataUrl = await fetchStockPhotoAsDataUrl(photo);
      const asset = await addFromDataUrl(dataUrl, 'stock', `${photo.photographerName} — ${query.trim()}`.slice(0, 80));
      onSelect(asset.dataUrl);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }, [addFromDataUrl, onSelect, query, settings.unsplashKey]);

  if (!hasKey) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        <ImageIcon className="h-12 w-12 text-slate-300" />
        <p className="max-w-sm text-sm text-slate-600">
          {t('background.stockNoKey', 'Add a free Unsplash and/or Pixabay API key in Settings to search free stock photos.')}
        </p>
        <button className="btn-primary" onClick={() => goto('settings')}>
          {t('nav.settings', 'Settings')}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex shrink-0 gap-2 border-b border-slate-200 bg-white px-5 py-3">
        <input
          type="text"
          className="input flex-1"
          placeholder={t('background.stockSearchPlaceholder', 'Search free stock photos…')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void doSearch()}
        />
        <button className="btn-primary px-4" onClick={() => void doSearch()} disabled={loading || !query.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-gaia-50 p-5">
        {error && (
          <p className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('background.stockSearchError', 'Search failed: {{error}}', { error })}
          </p>
        )}
        {saveError && (
          <p className="mb-3 flex items-start gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t('background.stockUseError', "Couldn't use that photo: {{error}}", { error: saveError })}
          </p>
        )}
        {!searched && !loading ? (
          <EmptyState message={t('background.stockHint', 'Type a search term above and press Enter or Search.')} />
        ) : results.length === 0 && !loading ? (
          !error && <EmptyState message={t('background.stockNoResults', 'No photos found. Try a different search term.')} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {results.map((photo) => {
              const isSaving = savingId === photo.id;
              return (
                <div
                  key={`${photo.source}-${photo.id}`}
                  className="group relative overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-gaia-400"
                >
                  <img
                    src={photo.thumb}
                    alt={t('background.stockPhotoByOn', 'Photo by {{name}} on {{source}}', {
                      name: photo.photographerName,
                      source: photo.source === 'unsplash' ? 'Unsplash' : 'Pixabay',
                    })}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />

                  {/* Hover overlay with "use" action */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="flex items-center gap-1.5 rounded-lg bg-gaia-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gaia-600 disabled:opacity-60"
                      onClick={() => void handleUse(photo)}
                      disabled={isSaving}
                    >
                      {isSaving
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Check className="h-3.5 w-3.5" />
                      }
                      {isSaving ? t('background.stockUsing', 'Adding…') : t('assets.use')}
                    </button>
                  </div>

                  {/* Attribution strip — required by Unsplash API guidelines, shown always */}
                  <div className="flex items-center justify-between gap-1 border-t border-slate-100 bg-white px-2 py-1 text-[10px] text-slate-500">
                    <span className="truncate">
                      <a
                        href={photo.photographerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-gaia-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                        title={photo.photographerName}
                      >
                        {photo.photographerName}
                      </a>
                      {' · '}
                      <a
                        href={photo.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-gaia-600 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {photo.source === 'unsplash' ? 'Unsplash' : 'Pixabay'}
                      </a>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AI Prompt Builder tab — navigates to the full PromptBuilderScreen
// ---------------------------------------------------------------------------

function AIPromptTab({ onSelect }: { onSelect: (url: string) => void }) {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const [recentAssets, setRecentAssets] = useState<AssetRecord[]>([]);

  useEffect(() => {
    assetsRepo.all().then((all) => {
      setRecentAssets(all.slice(-6).reverse());
    });
  }, []);

  return (
    <div className="flex h-full flex-col items-center overflow-y-auto bg-gaia-50 p-8">
      {/* Main CTA card */}
      <div className="w-full max-w-lg rounded-2xl border border-gaia-200 bg-white p-6 shadow-sm">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gaia-100">
            <Sparkles className="h-5 w-5 text-gaia-600" />
          </div>
          <div>
            <h2 className="font-semibold text-slate-800">
              {t('background.aiPrompt', 'AI Prompt Builder')}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {t('background.aiPromptTip', 'Generate a custom background with AI, then import it here.')}
            </p>
          </div>
        </div>
        <button
          onClick={() => goto('promptBuilder')}
          className="btn btn-primary flex w-full items-center justify-center gap-2 py-3 text-sm font-semibold"
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {t('background.openPromptBuilder', 'Open AI Prompt Builder →')}
        </button>
      </div>

      {/* Recent assets preview */}
      {recentAssets.length > 0 && (
        <div className="mt-6 w-full max-w-lg">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Recent Images
          </p>
          <AssetGrid assets={recentAssets} onSelect={(a) => onSelect(a.dataUrl)} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function AssetGrid({
  assets,
  onSelect,
}: {
  assets: AssetRecord[];
  onSelect: (asset: AssetRecord) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {assets.map((asset) => (
        <button
          key={asset.id}
          className="group relative overflow-hidden rounded-xl ring-1 ring-slate-200 transition hover:ring-2 hover:ring-gaia-400"
          onClick={() => onSelect(asset)}
          title={asset.name}
        >
          <img
            src={asset.dataUrl}
            alt={asset.name}
            className="aspect-square w-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/50 px-2 py-1 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
            {asset.name}
          </div>
        </button>
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-slate-200 py-16 text-center">
      <ImageIcon className="h-10 w-10 text-slate-300" />
      <p className="max-w-xs text-sm text-slate-500">{message}</p>
    </div>
  );
}
