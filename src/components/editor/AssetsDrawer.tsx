import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  ArchiveRestore,
  Check,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  Download,
  ExternalLink,
  FolderOpen,
  ImagePlus,
  Loader2,
  Search,
  Sparkles,
  Square,
  SquareCheck,
  Star,
  Trash2,
  UploadCloud,
  Wand2,
} from 'lucide-react';
import type { AssetRecord } from '@/types';
import { editor } from '@/lib/fabric/editorController';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppStore } from '@/store/useAppStore';
import { fileToDataUrl, isImageFile } from '@/lib/files';
import { searchStock, type StockPhoto } from '@/lib/stock';
import { isElectronWithBridge } from '@/lib/autoImport';

export type AssetTab = 'myPhotos' | 'library' | 'stock' | 'ai';

interface Props {
  activeTab?: AssetTab;
  onTabChange?: (tab: AssetTab) => void;
  /**
   * When true, clicking any image sets it as the background layer (fills the
   * canvas and sends to back) rather than placing it as a foreground element.
   */
  asBackground?: boolean;
}

export default function AssetsDrawer({ activeTab, onTabChange, asBackground = false }: Props) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<AssetTab>('myPhotos');
  const load = useLibraryStore((s) => s.load);
  const loaded = useLibraryStore((s) => s.loaded);

  const tab = activeTab ?? internalTab;
  const setTab = (next: AssetTab) => {
    setInternalTab(next);
    onTabChange?.(next);
  };

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const tabs: { id: AssetTab; label: string }[] = [
    { id: 'myPhotos', label: t('assets.myPhotos') },
    { id: 'library', label: t('assets.library') },
    { id: 'stock', label: t('assets.stock') },
    { id: 'ai', label: t('assets.ai') },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-4 gap-1 p-2">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            aria-label={tb.label}
            aria-pressed={tab === tb.id}
            className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold transition ${
              tab === tb.id ? 'bg-gaia-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {tab === 'myPhotos' && <MyPhotosTab asBackground={asBackground} />}
        {tab === 'library' && <LibraryTab asBackground={asBackground} />}
        {tab === 'stock' && <StockTab asBackground={asBackground} />}
        {tab === 'ai' && <AiTab asBackground={asBackground} />}
      </div>
    </div>
  );
}

function AssetGrid({ assets, asBackground }: { assets: AssetRecord[]; asBackground: boolean }) {
  const { t } = useTranslation();
  const remove = useLibraryStore((s) => s.remove);
  if (assets.length === 0) {
    return <p className="px-2 py-6 text-center text-xs text-slate-400">{t('assets.emptyLibrary')}</p>;
  }
  const addLabel = asBackground ? t('assets.setAsBackground') : t('assets.add');
  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((a) => (
        <div
          key={a.id}
          className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
          draggable={!asBackground}
          onDragStart={asBackground ? undefined : (e) => {
            e.dataTransfer.setData('application/x-gaia-asset', a.dataUrl);
            e.dataTransfer.setData('application/x-gaia-kind', a.kind === 'logo' ? 'logo' : 'image');
          }}
        >
          <button
            className="h-full w-full"
            title={addLabel}
            onClick={() =>
              void editor.addImageFromUrl(
                a.dataUrl,
                asBackground ? 'background' : (a.kind === 'logo' ? 'logo' : 'image'),
                a.name,
              )
            }
          >
            <img src={a.dataUrl} alt={a.name} className="h-full w-full object-contain" />
          </button>
          {/* Hover overlay */}
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/45 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
            {!asBackground && (
              <button
                className="text-[10px] text-white hover:text-amber-300"
                title={t('assets.markAsLogo')}
                onClick={() => void editor.addImageFromUrl(a.dataUrl, 'logo', a.name)}
              >
                <Star className="h-3.5 w-3.5" />
              </button>
            )}
            {asBackground && (
              <span className="flex-1 text-center text-[9px] font-semibold uppercase tracking-wide text-white/80">
                {t('assets.setAsBackground')}
              </span>
            )}
            <button
              className="text-[10px] text-white hover:text-rose-300"
              title={t('common.delete')}
              onClick={() => void remove(a.id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

type SortOption = 'newest' | 'oldest' | 'nameAZ' | 'largest';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function MyPhotosTab({ asBackground }: { asBackground: boolean }) {
  const { t } = useTranslation();
  const all = useLibraryStore((s) => s.assets);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);
  const remove = useLibraryStore((s) => s.remove);
  const bulkRemove = useLibraryStore((s) => s.bulkRemove);
  const archiveAsset = useLibraryStore((s) => s.archive);
  const unarchiveAsset = useLibraryStore((s) => s.unarchive);

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortOption>('newest');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showArchived, setShowArchived] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);
  const isElectron = isElectronWithBridge();

  const photos = all.filter((a) => (a.kind === 'photo' || a.kind === 'logo') && !a.archived);
  const archivedPhotos = all.filter((a) => (a.kind === 'photo' || a.kind === 'logo') && a.archived);

  const filtered = photos
    .filter((a) => !query || a.name.toLowerCase().includes(query.toLowerCase()))
    .sort((x, y) => {
      if (sort === 'oldest') return x.createdAt - y.createdAt;
      if (sort === 'nameAZ') return x.name.localeCompare(y.name);
      if (sort === 'largest') return (y.fileSize ?? 0) - (x.fileSize ?? 0);
      return y.createdAt - x.createdAt; // newest
    });

  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter(isImageFile);
    if (!imageFiles.length) return;
    setUploading(true);
    try {
      for (const file of imageFiles) {
        const raw = await fileToDataUrl(file);
        await addFromDataUrl(raw, 'photo', file.name, file.size);
      }
    } finally {
      setUploading(false);
    }
  }, [addFromDataUrl]);

  // Clipboard paste support
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItems = items.filter((i) => i.type.startsWith('image/'));
      if (!imageItems.length) return;
      e.preventDefault();
      const files = imageItems.map((i) => i.getAsFile()).filter(Boolean) as File[];
      await handleFiles(files);
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, [handleFiles]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const handleDragLeave = () => setDragging(false);
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files);
    await handleFiles(files);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(filtered.map((a) => a.id)));
  const clearSelection = () => setSelected(new Set());

  const bulkArchive = async () => {
    for (const id of selected) await archiveAsset(id);
    clearSelection();
  };

  const bulkDelete = async () => {
    if (!window.confirm(t('assets.confirmDeleteSelected', { count: selected.size }))) return;
    await bulkRemove(Array.from(selected));
    clearSelection();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('assets.confirmDeleteOne'))) return;
    await remove(id);
    setSelected((prev) => { const next = new Set(prev); next.delete(id); return next; });
  };

  const handleImportFolder = async () => {
    if (!isElectron) return;
    const api = (window as unknown as { electronAPI?: { pickFiles?: () => Promise<{ dataUrl: string; name: string; size: number }[]> } }).electronAPI;
    const files = await api?.pickFiles?.();
    if (!files) return;
    setUploading(true);
    try {
      for (const f of files) {
        await addFromDataUrl(f.dataUrl, 'photo', f.name, f.size);
      }
    } finally {
      setUploading(false);
    }
  };

  const anySelected = selected.size > 0;

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={(e) => void handleDrop(e)}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-3 py-5 text-center text-xs transition
          ${dragging
            ? 'border-gaia-500 bg-gaia-100 text-gaia-700'
            : 'border-slate-300 bg-slate-50 text-slate-500 hover:border-gaia-400 hover:bg-gaia-50'
          }`}
      >
        {uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-gaia-500" />
        ) : (
          <UploadCloud className="h-5 w-5 text-gaia-500" />
        )}
        <span className="font-medium text-slate-700">
          {uploading ? t('common.loading') : t('assets.dropZone')}
        </span>
        <span className="text-[10px] text-slate-400">JPG · PNG · WEBP · GIF · paste from clipboard</span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(Array.from(e.target.files ?? []))}
      />

      {/* Header row: search + sort + import */}
      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
          <input
            className="input w-full pl-7 text-xs"
            placeholder={t('common.search')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          className="input shrink-0 text-[11px]"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortOption)}
        >
          <option value="newest">{t('assets.sortNewest')}</option>
          <option value="oldest">{t('assets.sortOldest')}</option>
          <option value="nameAZ">{t('assets.sortNameAZ')}</option>
          <option value="largest">{t('assets.sortLargest')}</option>
        </select>
        {isElectron && (
          <button
            title={t('assets.importFolder')}
            className="shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100"
            onClick={() => void handleImportFolder()}
          >
            <FolderOpen className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Bulk action bar */}
      {anySelected ? (
        <div className="flex items-center gap-2 rounded-lg bg-gaia-50 px-2 py-1.5 ring-1 ring-gaia-200">
          <span className="flex-1 text-[11px] font-medium text-gaia-700">
            {t('assets.selectedCount', { count: selected.size })}
          </span>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-slate-600 hover:bg-white"
            onClick={clearSelection}
          >
            {t('common.cancel')}
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-amber-700 hover:bg-amber-50"
            onClick={() => void bulkArchive()}
          >
            <Archive className="h-3 w-3" />
            {t('assets.archiveSelected')}
          </button>
          <button
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-rose-700 hover:bg-rose-50"
            onClick={() => void bulkDelete()}
          >
            <Trash2 className="h-3 w-3" />
            {t('assets.deleteSelected')}
          </button>
        </div>
      ) : (
        filtered.length > 0 && (
          <div className="flex items-center">
            <button
              className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600"
              onClick={selectAll}
            >
              <Square className="h-3 w-3" />
              {t('assets.selectAll')}
            </button>
          </div>
        )
      )}

      {/* Photo grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border-2 border-dashed border-slate-200 py-10 text-center">
          <UploadCloud className="h-8 w-8 text-slate-300" />
          <p className="text-xs text-slate-400">{t('assets.noPhotos')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1.5">
          {filtered.map((a) => {
            const isSelected = selected.has(a.id);
            return (
              <div
                key={a.id}
                className={`group relative overflow-hidden rounded-lg bg-slate-100 ring-1 transition
                  ${isSelected ? 'ring-2 ring-gaia-500' : 'ring-slate-200'}`}
              >
                {/* Thumbnail */}
                <div className="aspect-square">
                  <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
                </div>

                {/* Checkbox (visible on hover or when any selected) */}
                <button
                  className={`absolute left-1 top-1 rounded p-0.5 transition
                    ${anySelected || isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                  onClick={(e) => { e.stopPropagation(); toggleSelect(a.id); }}
                >
                  {isSelected
                    ? <SquareCheck className="h-4 w-4 text-gaia-500 drop-shadow" />
                    : <Square className="h-4 w-4 text-white drop-shadow" />
                  }
                </button>

                {/* Meta strip */}
                <div className="border-t border-slate-100 bg-white px-1 py-0.5">
                  <p className="truncate text-[9px] font-medium leading-tight text-slate-700" title={a.name}>{a.name}</p>
                  <p className="text-[8px] text-slate-400">
                    {a.fileSize ? formatFileSize(a.fileSize) : ''}{a.fileSize ? ' · ' : ''}{formatDate(a.createdAt)}
                  </p>
                </div>

                {/* Hover overlay with action buttons */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 transition group-hover:opacity-100">
                  <button
                    className="flex items-center gap-1 rounded-md bg-gaia-500 px-2 py-1 text-[10px] font-semibold text-white hover:bg-gaia-600"
                    onClick={() => void editor.addImageFromUrl(
                      a.dataUrl,
                      asBackground ? 'background' : (a.kind === 'logo' ? 'logo' : 'image'),
                      a.name,
                    )}
                  >
                    <Check className="h-3 w-3" />
                    {t('assets.use')}
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-[10px] text-white hover:bg-amber-500"
                    onClick={() => void archiveAsset(a.id)}
                  >
                    <Archive className="h-3 w-3" />
                    {t('assets.archive')}
                  </button>
                  <button
                    className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-[10px] text-white hover:bg-rose-500"
                    onClick={() => void handleDelete(a.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Archived section */}
      {archivedPhotos.length > 0 && (
        <div className="mt-2">
          <button
            className="flex w-full items-center gap-1.5 text-[11px] text-slate-400 hover:text-slate-600"
            onClick={() => setShowArchived((v) => !v)}
          >
            {showArchived ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            {t('assets.archived')} ({archivedPhotos.length})
          </button>
          {showArchived && (
            <div className="mt-1.5 grid grid-cols-3 gap-1.5">
              {archivedPhotos.map((a) => (
                <div
                  key={a.id}
                  className="group relative overflow-hidden rounded-lg bg-slate-100 opacity-60 ring-1 ring-slate-200 transition hover:opacity-100"
                >
                  <div className="aspect-square">
                    <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
                  </div>
                  <div className="border-t border-slate-100 bg-white px-1 py-0.5">
                    <p className="truncate text-[9px] font-medium text-slate-700">{a.name}</p>
                  </div>
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/60 opacity-0 transition group-hover:opacity-100">
                    <button
                      className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-[10px] text-white hover:bg-gaia-500"
                      onClick={() => void unarchiveAsset(a.id)}
                    >
                      <ArchiveRestore className="h-3 w-3" />
                      {t('assets.unarchive')}
                    </button>
                    <button
                      className="flex items-center gap-1 rounded-md bg-white/20 px-2 py-1 text-[10px] text-white hover:bg-rose-500"
                      onClick={() => void handleDelete(a.id)}
                    >
                      <Trash2 className="h-3 w-3" />
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
  );
}

function LibraryTab({ asBackground }: { asBackground: boolean }) {
  const assets = useLibraryStore((s) => s.assets);
  return <AssetGrid assets={assets} asBackground={asBackground} />;
}

function StockTab({ asBackground }: { asBackground: boolean }) {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<StockPhoto[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const hasKey = !!(settings.unsplashKey || settings.pixabayKey);

  const run = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setError('');
    try {
      setResults(await searchStock(query.trim(), settings));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setBusy(false);
    }
  };

  const usePhoto = async (p: StockPhoto) => {
    const kind = asBackground ? 'background' : 'image';
    try {
      const res = await fetch(p.full);
      const blob = await res.blob();
      const dataUrl = await fileToDataUrl(new File([blob], `${p.id}.jpg`, { type: blob.type }));
      const rec = await addFromDataUrl(dataUrl, 'stock', p.credit || 'Stock photo');
      await editor.addImageFromUrl(rec.dataUrl, kind, rec.name);
    } catch {
      await editor.addImageFromUrl(p.full, kind, p.credit || 'Stock');
    }
  };

  if (!hasKey) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-center text-xs text-slate-500 ring-1 ring-slate-100">
        {t('assets.stockNeedsKey')}
      </p>
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-8"
          placeholder={t('assets.stockSearch')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void run()}
        />
      </div>
      {busy && <Loader2 className="mx-auto my-4 h-5 w-5 animate-spin text-gaia-500" />}
      {error && <p className="mb-2 text-center text-xs text-rose-500">{error}</p>}
      <div className="grid grid-cols-3 gap-2">
        {results.map((p) => (
          <button
            key={p.id}
            className="aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200 transition hover:ring-gaia-400"
            onClick={() => void usePhoto(p)}
            title={asBackground ? `${t('assets.setAsBackground')}: ${p.credit}` : p.credit}
          >
            <img src={p.thumb} alt={p.credit} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function AiTab({ asBackground }: { asBackground: boolean }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);
  const goto = useAppStore((s) => s.goto);
  const promptBuilderOutput = useAppStore((s) => s.promptBuilderOutput);
  const [copied, setCopied] = useState(false);

  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    const kind = asBackground ? 'background' : 'image';
    for (const file of Array.from(files).filter(isImageFile)) {
      const raw = await fileToDataUrl(file);
      const rec = await addFromDataUrl(raw, 'ai', file.name);
      await editor.addImageFromUrl(rec.dataUrl, kind, rec.name);
    }
  };

  const copyPrompt = async () => {
    if (!promptBuilderOutput) return;
    await navigator.clipboard.writeText(promptBuilderOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const isElectron = isElectronWithBridge();

  return (
    <div className="space-y-3">

      {/* ── Prompt preview ──────────────────────────────────────────────── */}
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t('assets.aiPromptSection')}
          </p>
          {isElectron && (
            <span
              title={t('assets.aiAutoImportHint')}
              className="flex shrink-0 items-center gap-1 rounded-full bg-gaia-100 px-2 py-0.5 text-[10px] font-semibold text-gaia-700"
            >
              <Download className="h-3 w-3" />
              {t('assets.aiAutoImport')}
            </span>
          )}
        </div>

        {promptBuilderOutput ? (
          <>
            <textarea
              readOnly
              rows={4}
              className="input resize-none font-mono text-[11px] leading-relaxed text-slate-600"
              value={promptBuilderOutput}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
            <button
              onClick={() => void copyPrompt()}
              className={`flex w-full items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                copied
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {copied ? (
                <><Check className="h-3.5 w-3.5" /> {t('assets.aiCopied')}</>
              ) : (
                <><ClipboardCopy className="h-3.5 w-3.5" /> {t('promptBuilder.copy')}</>
              )}
            </button>
          </>
        ) : (
          <p className="rounded-lg bg-gaia-50 px-3 py-3 text-[11px] text-gaia-700 ring-1 ring-gaia-100">
            {t('assets.aiNoPrompt')}
          </p>
        )}

        <button
          onClick={() => goto('promptBuilder')}
          className="btn-primary w-full"
        >
          <Wand2 className="h-4 w-4" />
          {t('assets.aiOpenBuilder')}
        </button>
      </div>

      <div className="rounded-xl bg-gaia-50 p-3 text-xs text-slate-600 ring-1 ring-gaia-100">
        <Sparkles className="mb-1 h-4 w-4 text-gaia-600" />
        {t('assets.aiHint')}
      </div>

      {/* AI Studio link */}
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {t('assets.aiStudioLabel')}
        </p>
        <a
          href="https://aistudio.google.com/"
          target="_blank"
          rel="noreferrer"
          className="btn-primary w-full"
        >
          <ExternalLink className="h-4 w-4" /> {t('assets.aiOpenStudio')}
        </a>
        <p className="text-[10px] text-slate-400">{t('assets.aiStudioHint')}</p>
      </div>

      {/* Gemini link */}
      <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200 space-y-1.5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {t('assets.geminiLabel')}
        </p>
        <a
          href="https://gemini.google.com/"
          target="_blank"
          rel="noreferrer"
          className="btn-secondary w-full"
        >
          <ExternalLink className="h-4 w-4" /> {t('assets.openGemini')}
        </a>
        <p className="text-[10px] text-slate-400">{t('assets.geminiHint')}</p>
      </div>

      {/* Import generated image */}
      <button className="btn-primary w-full" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" />
        {asBackground ? t('assets.aiImportAsBackground') : t('assets.aiImport')}
      </button>
      <p className="text-center text-[10px] text-slate-400">{t('assets.aiImportHint')}</p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void importFiles(e.target.files)}
      />
    </div>
  );
}
