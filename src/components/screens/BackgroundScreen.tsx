/**
 * BackgroundScreen — Step 3 of the 5-step workflow.
 *
 * Lets the user pick a background image before entering the editor.
 * Four tabs:
 *   My Photos  — file upload + previously-uploaded assets (kind: photo)
 *   Library    — all saved assets grid
 *   Free Stock — Unsplash / Pixabay search (requires API key in settings)
 *   AI Generated — embedded Gemini webview (same as PromptBuilderScreen)
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  Camera,
  Check,
  SquareCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  FolderOpen,
  Heart,
  Image as ImageIcon,
  Images,
  Library,
  Sparkles,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Square,
  Trash2,
  Upload,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { useLibraryStore } from '@/store/useLibraryStore';
import { assetsRepo, ingredientsRepo, recipesRepo } from '@/db/repositories';
import type { AssetRecord, Ingredient } from '@/types';
import PromptBuilderScreen from '@/components/screens/PromptBuilderScreen';
import WorkflowNav from '@/components/WorkflowNav';
import WorkflowGapBanner from '@/components/WorkflowGapBanner';
import { searchStockDetailed, resolveStockUseUrl, STOCK_PER_PAGE, stockQueryForIngredient, stockTotalPages, triggerUnsplashDownload, type StockPhoto, type StockSearchResult } from '@/lib/stock';
import { getIngredientDisplayName, ingredientNameKey } from '@/lib/ingredientI18n';
import { getIngredientLookTheme, getIngredientPillStroke } from '@/lib/recipeColors';
import { isStockFavorite, loadStockFavorites, toggleStockFavorite } from '@/lib/stockFavorites';
import { getCachedStockPage, prefetchStockPage, pruneStockPageCache, setCachedStockPage } from '@/lib/stockPageCache';
import {
  addCustomStockLook,
  loadCustomStockLooks,
  loadRecentStockQueries,
  rememberStockQuery,
  removeCustomStockLook,
  type CustomStockLook,
  type StockSuggestItem,
} from '@/lib/stockLooks';
import { fetchWebStockSuggestions, mergeStockSuggestions, splitSuggestHighlight } from '@/lib/stockSuggest';
import StockAttribution from '@/components/common/StockAttribution';
import Modal from '@/components/common/Modal';
import { isElectronWithBridge } from '@/lib/autoImport';
import { fileToDataUrl, isImageFile } from '@/lib/files';
import { isLibraryDisplayAsset } from '@/lib/assetFilters';

type TabId = 'myPhotos' | 'library' | 'stock' | 'ai';

export type BackgroundScreenProps = {
  /** Tabbed chooser only — used by the editor Image tab modal. */
  embedded?: boolean;
  /** When set (typically with embedded), apply the pick here instead of advancing the workflow. */
  onSelect?: (url: string) => void;
};

// ---------------------------------------------------------------------------
// Root
// ---------------------------------------------------------------------------

export default function BackgroundScreen({ embedded = false, onSelect }: BackgroundScreenProps) {
  const { t } = useTranslation();
  const goto                 = useAppStore((s) => s.goto);
  const setBackgroundImageUrl = useAppStore((s) => s.setBackgroundImageUrl);
  const setWorkflowGap       = useAppStore((s) => s.setWorkflowGap);
  const template             = useAppStore((s) => s.template);
  const settings             = useAppStore((s) => s.settings);
  const backgroundImageUrl   = useAppStore((s) => s.backgroundImageUrl);

  const [tab, setTab] = useState<TabId>('stock');

  // Redirect to template if none selected (workflow step only — editor modal stays put)
  useEffect(() => {
    if (embedded) return;
    if (!template) goto('template');
  }, [embedded, template, goto]);

  if (!embedded && !template) return null;

  const handleSelect = (url: string) => {
    setBackgroundImageUrl(url);
    if (onSelect) onSelect(url);
  };

  const TABS: { id: TabId; labelKey: string; defaultLabel: string; icon: typeof Images }[] = [
    { id: 'stock',    labelKey: 'background.stock',    defaultLabel: 'Free Stock',        icon: Images },
    { id: 'myPhotos', labelKey: 'background.myPhotos', defaultLabel: 'My Photos',         icon: Camera },
    { id: 'library',  labelKey: 'background.library',  defaultLabel: 'Library',           icon: Library },
    { id: 'ai',       labelKey: 'background.aiPrompt', defaultLabel: 'AI Prompt Builder', icon: Sparkles },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex shrink-0 justify-center gap-0.5 border-b border-slate-200 bg-white px-4 pt-2">
        {TABS.map(({ id, labelKey, defaultLabel, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`relative inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
              tab === id
                ? 'text-gaia-700'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {t(labelKey, defaultLabel)}
            {tab === id && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gaia-600" />
            )}
          </button>
        ))}
      </div>

      {!embedded && <WorkflowGapBanner />}

      {/* Tab content */}
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === 'myPhotos' && <MyPhotosTab onSelect={handleSelect} />}
        {tab === 'library'  && <LibraryTab  onSelect={handleSelect} />}
        {tab === 'stock'    && (
          <StockTab
            onSelect={handleSelect}
            settings={settings}
            selectedUrl={backgroundImageUrl}
          />
        )}
        {tab === 'ai'       && (
          <PromptBuilderScreen embedded onBackgroundSelect={handleSelect} />
        )}
      </div>

      {!embedded && (
        <WorkflowNav
          prevScreen="recipes"
          prevLabel={t('workflow.backToRecipes', 'Back To Recipes')}
          nextScreen="editor-v2"
          nextLabel={t('workflow.nextRefine', 'Step 4: Refine & Design')}
          canProceed={!!backgroundImageUrl}
          hint={t('workflow.hintSelectBackground', 'Choose a background to continue')}
          missingDetail={t('workflow.hintSelectBackgroundBody', 'Without a background, the label will print on a blank canvas. You can add one later.')}
          onOverride={() => setWorkflowGap('background', true)}
          onNext={() => goto('editor-v2')}
        />
      )}
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
    setAllAssets(all.filter((a) =>
      (a.kind === 'photo' || a.kind === 'logo' || a.kind === 'ai') && isLibraryDisplayAsset(a),
    ));
    setLoading(false);
  }, []);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    const api = (window as unknown as {
      electronAPI?: { onImageDownloaded?: (cb: () => void) => () => void };
    }).electronAPI;
    if (!api?.onImageDownloaded) return;
    return api.onImageDownloaded(() => { void reload(); });
  }, [reload]);

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
          <span className="text-xs text-slate-400">{t('assets.pasteFormats')}</span>
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
  const syncStore = useLibraryStore((s) => s.load);
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const all = await assetsRepo.all();
    setAssets(all.filter(isLibraryDisplayAsset));
    setLoading(false);
    void syncStore();
  }, [syncStore]);

  useEffect(() => { void reload(); }, [reload]);

  useEffect(() => {
    if (!menuId) return;
    const close = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('[data-asset-menu]')) return;
      setMenuId(null);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [menuId]);

  const doArchive = async (id: string) => {
    await assetsRepo.archive(id);
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, archived: true } : a));
    setMenuId(null);
    void syncStore();
  };

  const doUnarchive = async (id: string) => {
    await assetsRepo.unarchive(id);
    setAssets((prev) => prev.map((a) => a.id === id ? { ...a, archived: false } : a));
    setMenuId(null);
    void syncStore();
  };

  const doDelete = async (id: string) => {
    if (!window.confirm(t('assets.confirmDeleteOne'))) return;
    await assetsRepo.remove(id);
    setAssets((prev) => prev.filter((a) => a.id !== id));
    setMenuId(null);
    void syncStore();
  };

  const active = assets.filter((a) => !a.archived);
  const archived = assets.filter((a) => a.archived);

  return (
    <div className="h-full overflow-y-auto bg-gaia-50 p-5 space-y-5">
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-gaia-400" />
        </div>
      ) : active.length === 0 && archived.length === 0 ? (
        <EmptyState message={t('background.noAssets', 'Your library is empty. Upload photos or generate AI images.')} />
      ) : (
        <>
          {active.length === 0 ? (
            <EmptyState message={t('assets.noPhotos')} />
          ) : (
            <AssetGrid
              assets={active}
              onSelect={(a) => onSelect(a.dataUrl)}
              menuId={menuId}
              onToggleMenu={(id) => setMenuId((cur) => cur === id ? null : id)}
              onArchive={(id) => void doArchive(id)}
              onDelete={(id) => void doDelete(id)}
            />
          )}

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
                <div className="mt-3">
                  <AssetGrid
                    assets={archived}
                    archived
                    onSelect={(a) => onSelect(a.dataUrl)}
                    menuId={menuId}
                    onToggleMenu={(id) => setMenuId((cur) => cur === id ? null : id)}
                    onUnarchive={(id) => void doUnarchive(id)}
                    onDelete={(id) => void doDelete(id)}
                  />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Free Stock tab — Unsplash / Pixabay search
// ---------------------------------------------------------------------------

const STOCK_QUERY_KEY = 'gaia:last-stock-query';
const DEFAULT_STOCK_QUERY = 'linen texture';

function StockTab({
  onSelect,
  settings,
  selectedUrl,
}: {
  onSelect: (url: string) => void;
  settings: import('@/types').AppSettings;
  selectedUrl: string | null;
}) {
  const { t, i18n } = useTranslation();
  const hasKey = !!(settings.unsplashKey || settings.pixabayKey);
  const goto   = useAppStore((s) => s.goto);
  const activeRecipeId = useAppStore((s) => s.activeRecipeId);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);
  const autoStarted = useRef(false);
  const scrollBoxRef = useRef<HTMLDivElement>(null);
  const pendingScroll = useRef<'top' | 'bottom' | null>(null);

  const [query, setQuery]       = useState(() => {
    try { return sessionStorage.getItem(STOCK_QUERY_KEY) ?? DEFAULT_STOCK_QUERY; }
    catch { return DEFAULT_STOCK_QUERY; }
  });
  const [results, setResults]   = useState<StockPhoto[]>([]);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading]   = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [preview, setPreview]   = useState<StockPhoto | null>(null);
  const [favorites, setFavorites] = useState<StockPhoto[]>(() => loadStockFavorites());
  const [showFavorites, setShowFavorites] = useState(false);
  const [ingredientLooks, setIngredientLooks] = useState<Ingredient[]>([]);
  const [customLooks, setCustomLooks] = useState<CustomStockLook[]>(() => loadCustomStockLooks());
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [activeSuggest, setActiveSuggest] = useState(-1);
  const [webSuggests, setWebSuggests] = useState<string[]>([]);
  const [usedPhotoKey, setUsedPhotoKey] = useState<string | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  const applyStockPage = useCallback((q: string, found: StockSearchResult) => {
    setCachedStockPage(q, found);
    pruneStockPageCache(q, found.page);
    setResults(found.photos);
    setPage(found.page);
    setTotalPages(found.totalPages);
    setSearched(true);
    setError(found.warnings.length ? found.warnings.join(' — ') : null);
    rememberStockQuery(q);
    if (found.page < found.totalPages) {
      void prefetchStockPage(q, found.page + 1, settings);
    }
  }, [settings]);

  const runSearch = useCallback(async (term: string, nextPage = 1) => {
    const q = term.trim();
    if (!q || !hasKey) return;
    setShowFavorites(false);
    setQuery(q);
    try { sessionStorage.setItem(STOCK_QUERY_KEY, q); } catch { /* ignore */ }
    setSaveError(null);

    const cached = getCachedStockPage(q, nextPage);
    if (cached) {
      applyStockPage(q, cached);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const found = await searchStockDetailed(q, settings, { page: nextPage });
      applyStockPage(q, found);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setResults([]);
      setPage(1);
      setTotalPages(1);
      setSearched(true);
    } finally {
      setLoading(false);
    }
  }, [applyStockPage, hasKey, settings]);

  const doSearch = useCallback(() => {
    setShowFavorites(false);
    pendingScroll.current = 'top';
    void runSearch(query);
  }, [query, runSearch]);

  useEffect(() => {
    if (!hasKey || autoStarted.current) return;
    autoStarted.current = true;
    void runSearch(query || DEFAULT_STOCK_QUERY);
  }, [hasKey, query, runSearch]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      ingredientsRepo.all(),
      activeRecipeId ? recipesRepo.get(activeRecipeId) : Promise.resolve(null),
    ]).then(([all, recipe]) => {
      if (cancelled) return;
      const recipeIds = new Set(recipe?.ingredientIds ?? []);
      const visual = (ing: Ingredient) => !ing.isSoapBase;
      const fromRecipe = all.filter((ing) => recipeIds.has(ing.id) && visual(ing));
      const fromLibrary = all
        .filter((ing) => ing.active && visual(ing) && !recipeIds.has(ing.id))
        .sort((a, b) => a.name.localeCompare(b.name));
      setIngredientLooks([...fromRecipe, ...fromLibrary]);
    });
    return () => { cancelled = true; };
  }, [activeRecipeId]);

  const favoritePages = stockTotalPages(favorites.length, STOCK_PER_PAGE);
  const viewPages = showFavorites ? favoritePages : totalPages;
  const viewPage = Math.min(page, viewPages);
  const visiblePhotos = showFavorites
    ? favorites.slice((viewPage - 1) * STOCK_PER_PAGE, viewPage * STOCK_PER_PAGE)
    : results;

  useEffect(() => {
    if (loading || !pendingScroll.current) return;
    const box = scrollBoxRef.current;
    const dir = pendingScroll.current;
    pendingScroll.current = null;
    if (!box) return;
    requestAnimationFrame(() => {
      box.scrollTo({
        top: dir === 'top' ? 0 : box.scrollHeight,
        behavior: 'smooth',
      });
    });
  }, [loading, viewPage, visiblePhotos.length, showFavorites]);

  const changePage = (nextPage: number, dir: 'top' | 'bottom') => {
    pendingScroll.current = dir;
    if (showFavorites) {
      setPage(nextPage);
      return;
    }
    void runSearch(query, nextPage);
  };

  const handleToggleFavorite = (photo: StockPhoto) => {
    setFavorites(toggleStockFavorite(photo));
  };

  const openFavorites = () => {
    pendingScroll.current = 'top';
    setShowFavorites(true);
    setPage(1);
    setError(null);
    setSearched(true);
  };

  const suggestPool = useMemo<StockSuggestItem[]>(() => {
    const currentLang = (i18n.resolvedLanguage ?? i18n.language ?? 'en').startsWith('es') ? 'es' : 'en';
    const otherLang = currentLang === 'es' ? 'en' : 'es';
    const tCurrent = i18n.getFixedT(currentLang);
    const tOther = i18n.getFixedT(otherLang);
    const custom = customLooks.map((look) => ({
      query: look.query,
      label: look.label,
      kind: 'custom' as const,
    }));
    const ingredients = ingredientLooks.map((ing) => {
      const nameKey = `ingredientNames.${ingredientNameKey(ing.name)}`;
      return {
        query: stockQueryForIngredient(ing.name),
        label: tCurrent(nameKey, ing.name),
        altLabel: tOther(nameKey, ing.name),
        kind: 'ingredient' as const,
      };
    });
    const recent = loadRecentStockQueries().map((term) => ({
      query: term,
      label: term,
      kind: 'recent' as const,
    }));
    return [...custom, ...ingredients, ...recent];
  }, [customLooks, i18n, ingredientLooks]);

  const suggestions = useMemo(
    () => mergeStockSuggestions(query, suggestPool, webSuggests),
    [query, suggestPool, webSuggests],
  );

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (!searchBoxRef.current?.contains(event.target as Node)) setSuggestOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    const q = query.trim();
    const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'en').startsWith('es') ? 'es' : 'en';
    if (!suggestOpen || q.length < 2) {
      setWebSuggests([]);
      return;
    }
    const ac = new AbortController();
    const timer = window.setTimeout(() => {
      void fetchWebStockSuggestions(q, lang, ac.signal)
        .then((rows) => { if (!ac.signal.aborted) setWebSuggests(rows); })
        .catch(() => { if (!ac.signal.aborted) setWebSuggests([]); });
    }, 160);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [i18n.language, i18n.resolvedLanguage, query, suggestOpen]);

  const pickSuggestion = (item: StockSuggestItem) => {
    setQuery(item.query);
    setSuggestOpen(false);
    pendingScroll.current = 'top';
    void runSearch(item.query);
  };

  const addCurrentLook = () => {
    const term = query.trim();
    if (!term) return;
    setCustomLooks(addCustomStockLook(term));
    setSuggestOpen(false);
    pendingScroll.current = 'top';
    void runSearch(term);
  };

  const qNorm = query.trim().toLowerCase();
  const canAddLook = !!qNorm
    && !customLooks.some((look) => look.query.toLowerCase() === qNorm);

  const handleUse = useCallback(async (photo: StockPhoto) => {
    setSaveError(null);
    setSavingId(photo.id);
    try {
      triggerUnsplashDownload(photo, settings.unsplashKey);
      const url = await resolveStockUseUrl(photo);
      if (photo.source !== 'unsplash') {
        await addFromDataUrl(url, 'stock', photo.credit.slice(0, 80));
      }
      setUsedPhotoKey(`${photo.source}-${photo.id}`);
      onSelect(url);
      setPreview(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingId(null);
    }
  }, [addFromDataUrl, onSelect, settings.unsplashKey]);

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
    <div className="flex h-full min-h-0 flex-col">
      <div className="relative z-20 shrink-0 border-b border-slate-200 bg-white px-5 py-3">
        <div className="grid grid-cols-1 items-start gap-x-4 gap-y-3 md:grid-cols-2">
          <div ref={searchBoxRef} className="relative min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <input
                type="text"
                className="input min-w-0 flex-1"
                placeholder={t('background.stockSearchPlaceholder', 'Search free stock photos…')}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggestOpen(true);
                  setActiveSuggest(-1);
                }}
                onFocus={() => setSuggestOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown' && suggestions.length) {
                    e.preventDefault();
                    setActiveSuggest((i) => (i < 0 ? 0 : (i + 1) % suggestions.length));
                    return;
                  }
                  if (e.key === 'ArrowUp' && suggestions.length) {
                    e.preventDefault();
                    setActiveSuggest((i) => (i < 0 ? suggestions.length - 1 : (i - 1 + suggestions.length) % suggestions.length));
                    return;
                  }
                  if (e.key === 'Escape') {
                    setSuggestOpen(false);
                    setActiveSuggest(-1);
                    return;
                  }
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (suggestOpen && activeSuggest >= 0 && suggestions[activeSuggest]) {
                      pickSuggestion(suggestions[activeSuggest]);
                    } else {
                      void doSearch();
                    }
                    setSuggestOpen(false);
                  }
                }}
                autoComplete="off"
                role="combobox"
                aria-expanded={suggestOpen && suggestions.length > 0}
                aria-autocomplete="list"
              />
              <button className="btn-primary shrink-0 px-3" onClick={() => void doSearch()} disabled={loading || !query.trim()}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </button>
            </div>
            {suggestOpen && suggestions.length > 0 && (
              <ul
                role="listbox"
                className="absolute left-0 right-0 z-40 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              >
                {suggestions.map((item, idx) => {
                  const bits = splitSuggestHighlight(item.label, query);
                  return (
                  <li key={`${item.kind}-${item.query}`}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={idx === activeSuggest}
                      className={`flex w-full flex-col items-start px-3 py-1.5 text-left text-sm ${
                        idx === activeSuggest ? 'bg-gaia-50 text-gaia-900' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                      onMouseEnter={() => setActiveSuggest(idx)}
                      onClick={() => pickSuggestion(item)}
                    >
                      <span>
                        {bits.head && <span className="text-slate-500">{bits.head}</span>}
                        <span className="font-medium">{bits.tail || (!bits.head ? item.label : '')}</span>
                      </span>
                      {item.altLabel && item.altLabel !== item.label && (
                        <span className="text-[11px] text-slate-400">{item.altLabel}</span>
                      )}
                    </button>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {t('background.stockLooks', 'Looks')}
              </span>
              <button
                type="button"
                className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition ${
                  showFavorites
                    ? 'bg-rose-500 text-white'
                    : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100 hover:text-rose-800'
                }`}
                onClick={openFavorites}
              >
                <Heart className={`h-3 w-3 ${showFavorites ? 'fill-current text-white' : 'fill-rose-400 text-rose-500'}`} />
                {t('background.stockFavorites', 'Favorites')}
                {favorites.length > 0 && (
                  <span className={`ml-0.5 ${showFavorites ? 'text-white/80' : 'text-rose-400'}`}>
                    {favorites.length}
                  </span>
                )}
              </button>
              {customLooks.map((look) => {
                const active = !showFavorites && query.trim().toLowerCase() === look.query.toLowerCase();
                return (
                  <span
                    key={look.query}
                    className={`inline-flex shrink-0 items-center gap-0.5 rounded-full pl-2.5 text-xs font-medium transition ${
                      active ? 'bg-gaia-600 text-white' : 'bg-violet-50 text-violet-800 ring-1 ring-violet-200'
                    }`}
                  >
                    <button
                      type="button"
                      className="whitespace-nowrap py-1 hover:underline"
                      onClick={() => {
                        pendingScroll.current = 'top';
                        void runSearch(look.query);
                      }}
                    >
                      {look.label}
                    </button>
                    <button
                      type="button"
                      className={`rounded-full p-1 ${active ? 'text-white/80 hover:text-white' : 'text-violet-400 hover:text-violet-700'}`}
                      aria-label={t('background.stockRemoveLook', 'Remove Look')}
                      onClick={() => setCustomLooks(removeCustomStockLook(look.query))}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              <button
                type="button"
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gaia-700 ring-1 ring-gaia-200 hover:bg-gaia-50 disabled:cursor-not-allowed disabled:opacity-40"
                disabled={!canAddLook}
                onClick={addCurrentLook}
              >
                <Plus className="h-3 w-3" />
                {t('background.stockAddLook', 'Add Look')}
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-1.5 py-0.5">
              <span className="mr-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                {t('background.stockIngredients', 'Ingredients')}
              </span>
              {ingredientLooks.length === 0 ? (
                <span className="text-xs text-slate-400">
                  {t('background.stockIngredientsEmpty', 'Ingredients you add to your library will show up here.')}
                </span>
              ) : ingredientLooks.map((ing) => {
                const lookQuery = stockQueryForIngredient(ing.name);
                const active = !showFavorites && query.trim().toLowerCase() === lookQuery.toLowerCase();
                const theme = getIngredientLookTheme(ing.name, ing.category);
                const stroke = getIngredientPillStroke(theme);
                return (
                  <button
                    key={ing.id}
                    type="button"
                    className={`shrink-0 whitespace-nowrap rounded-full border-2 px-2.5 py-1 text-xs font-medium leading-tight transition ${stroke} ${
                      active ? `${theme.dot} text-white` : `${theme.bg} ${theme.text}`
                    }`}
                    onClick={() => {
                      pendingScroll.current = 'top';
                      void runSearch(lookQuery);
                    }}
                  >
                    {getIngredientDisplayName(ing.name, t)}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div ref={scrollBoxRef} className="min-h-0 flex-1 overflow-y-auto bg-gaia-50 p-5">
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
        {showFavorites && visiblePhotos.length > 0 && (
          <p className="mb-3 text-xs text-slate-500">
            {t('background.stockFavoriteHint', 'Saved as a link. Use it when you’re ready.')}
          </p>
        )}
        {loading && visiblePhotos.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-gaia-500" />
          </div>
        ) : visiblePhotos.length === 0 && showFavorites ? (
          <EmptyState message={t('background.stockFavoritesEmpty', 'No saved photos yet. Tap the heart to find a look later — nothing is imported until you use it.')} />
        ) : visiblePhotos.length === 0 && searched && !loading ? (
          !error && <EmptyState message={t('background.stockNoResults', 'No photos found. Try a different look above.')} />
        ) : visiblePhotos.length === 0 ? (
          <EmptyState message={t('background.stockHint', 'Pick a look or type a search.')} />
        ) : (
          <>
          <div className="flex flex-wrap gap-3">
            {visiblePhotos.map((photo) => {
              const isSaving = savingId === photo.id;
              const favorited = isStockFavorite(photo, favorites);
              const isSelected = usedPhotoKey === `${photo.source}-${photo.id}`
                || (!!selectedUrl && selectedUrl === photo.full);
              return (
                <div
                  key={`${photo.source}-${photo.id}`}
                  className={`group relative min-w-[9.5rem] flex-[1_1_calc(50%-0.375rem)] overflow-hidden rounded-xl transition sm:flex-[1_1_calc(33.333%-0.5rem)] lg:flex-[1_1_calc(25%-0.5625rem)] xl:flex-[1_1_calc(20%-0.6rem)] ${
                    isSelected
                      ? 'ring-2 ring-gaia-600'
                      : 'ring-1 ring-slate-200 hover:ring-2 hover:ring-gaia-400'
                  }`}
                >
                  <button
                    type="button"
                    className="block w-full"
                    onClick={() => void handleUse(photo)}
                    aria-label={t('background.stockUse', 'Use as background')}
                    aria-pressed={isSelected}
                    disabled={isSaving}
                  >
                    <img
                      src={photo.thumb}
                      alt={photo.credit}
                      className="aspect-square w-full object-cover"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </button>

                  <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] flex aspect-square flex-col items-center justify-center gap-1.5 bg-black/55 opacity-0 transition group-hover:opacity-100">
                    <button
                      type="button"
                      className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-white"
                      onClick={() => setPreview(photo)}
                    >
                      <Eye className="h-3.5 w-3.5" />
                      {t('background.stockPreview', 'Preview')}
                    </button>
                    <button
                      type="button"
                      className="pointer-events-auto flex items-center gap-1.5 rounded-lg bg-gaia-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gaia-600 disabled:opacity-60"
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

                  <button
                    type="button"
                    className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full shadow-sm backdrop-blur-sm ${
                      favorited
                        ? 'bg-rose-500 text-white'
                        : 'bg-white/90 text-rose-500 hover:bg-rose-50 hover:text-rose-600'
                    }`}
                    aria-label={favorited
                      ? t('background.stockUnfavorite', 'Remove From Saved')
                      : t('background.stockFavorite', 'Save For Later')}
                    aria-pressed={favorited}
                    onClick={() => handleToggleFavorite(photo)}
                  >
                    <Heart className={`h-4 w-4 ${favorited ? 'fill-current' : ''}`} />
                  </button>

                  {isSelected && (
                    <span className="absolute left-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-gaia-600 text-white shadow-sm">
                      <Check className="h-4 w-4" />
                    </span>
                  )}

                  <div className="border-t border-slate-100 bg-white">
                    <StockAttribution photo={photo} />
                  </div>
                </div>
              );
            })}
          </div>
          {viewPages > 1 && (
            <div className="mt-5 flex items-center justify-center gap-3">
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={loading || viewPage <= 1}
                onClick={() => changePage(viewPage - 1, 'bottom')}
              >
                <ChevronLeft className="h-4 w-4" />
                {t('background.stockPrev', 'Previous')}
              </button>
              <span className="text-sm font-medium text-slate-600">
                {t('background.stockPage', 'Page {{page}} of {{total}}', { page: viewPage, total: viewPages })}
              </span>
              <button
                type="button"
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40"
                disabled={loading || viewPage >= viewPages}
                onClick={() => changePage(viewPage + 1, 'top')}
              >
                {t('background.stockNext', 'Next')}
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
          </>
        )}
      </div>

      <Modal
        open={!!preview}
        onClose={() => setPreview(null)}
        title={t('background.stockPreviewTitle', 'Preview Photo')}
        width={720}
        footer={preview && (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium ${
                isStockFavorite(preview, favorites)
                  ? 'bg-rose-500 text-white hover:bg-rose-600'
                  : 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100'
              }`}
              onClick={() => handleToggleFavorite(preview)}
            >
              <Heart className={`h-4 w-4 ${isStockFavorite(preview, favorites) ? 'fill-current' : 'fill-rose-400 text-rose-500'}`} />
              {isStockFavorite(preview, favorites)
                ? t('background.stockUnfavorite', 'Remove From Saved')
                : t('background.stockFavorite', 'Save For Later')}
            </button>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setPreview(null)}>
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={savingId === preview.id}
                onClick={() => void handleUse(preview)}
              >
                {savingId === preview.id
                  ? t('background.stockUsing', 'Adding…')
                  : t('assets.use')}
              </button>
            </div>
          </div>
        )}
      >
        {preview && (
          <div className="space-y-3">
            <img
              src={preview.full}
              alt={preview.credit}
              className="max-h-[60vh] w-full rounded-lg object-contain bg-slate-100"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <StockAttribution photo={preview} />
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function AssetGrid({
  assets,
  onSelect,
  archived = false,
  menuId,
  onToggleMenu,
  onArchive,
  onUnarchive,
  onDelete,
}: {
  assets: AssetRecord[];
  onSelect: (asset: AssetRecord) => void;
  archived?: boolean;
  menuId: string | null;
  onToggleMenu: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${archived ? 'opacity-70' : ''}`}>
      {assets.map((asset) => {
        const open = menuId === asset.id;
        return (
          <div
            key={asset.id}
            className="group relative overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 transition hover:ring-2 hover:ring-gaia-400"
          >
            <button
              type="button"
              className="block w-full"
              onClick={() => onSelect(asset)}
              title={asset.name}
            >
              <img
                src={asset.dataUrl}
                alt={asset.name}
                className="aspect-square w-full object-cover"
                loading="lazy"
              />
            </button>

            <div className="absolute right-1.5 top-1.5 z-20" data-asset-menu>
              <button
                type="button"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/95 text-slate-600 shadow ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-900"
                aria-label={t('assets.photoMenu', 'Photo Actions')}
                aria-expanded={open}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMenu(asset.id);
                }}
              >
                <MoreVertical className="h-4 w-4" />
              </button>
              {open && (
                <div className="absolute right-0 top-9 z-30 w-44 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200">
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-gaia-50"
                    onClick={() => { onSelect(asset); onToggleMenu(asset.id); }}
                  >
                    <Check className="h-3.5 w-3.5 text-gaia-600" />
                    {t('assets.use')}
                  </button>
                  {archived ? (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-amber-50"
                      onClick={() => onUnarchive?.(asset.id)}
                    >
                      <ArchiveRestore className="h-3.5 w-3.5 text-amber-600" />
                      {t('assets.unarchive')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-amber-50"
                      onClick={() => onArchive?.(asset.id)}
                    >
                      <Archive className="h-3.5 w-3.5 text-amber-600" />
                      {t('assets.archive')}
                    </button>
                  )}
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-rose-700 hover:bg-rose-50"
                    onClick={() => onDelete(asset.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              )}
            </div>
          </div>
        );
      })}
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
