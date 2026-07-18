import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ExternalLink,
  ImagePlus,
  Loader2,
  Search,
  Sparkles,
  Star,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import type { AssetRecord } from '@/types';
import { editor } from '@/lib/fabric/editorController';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useAppStore } from '@/store/useAppStore';
import { fileToDataUrl, isImageFile } from '@/lib/files';
import { searchStock, type StockPhoto } from '@/lib/stock';

type Tab = 'myPhotos' | 'library' | 'stock' | 'ai';

export default function AssetsDrawer() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('myPhotos');
  const load = useLibraryStore((s) => s.load);
  const loaded = useLibraryStore((s) => s.loaded);

  useEffect(() => {
    if (!loaded) void load();
  }, [loaded, load]);

  const tabs: { id: Tab; label: string }[] = [
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
            className={`rounded-lg px-1 py-1.5 text-[11px] font-semibold transition ${
              tab === tb.id ? 'bg-gaia-600 text-white' : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {tab === 'myPhotos' && <MyPhotosTab />}
        {tab === 'library' && <LibraryTab />}
        {tab === 'stock' && <StockTab />}
        {tab === 'ai' && <AiTab />}
      </div>
    </div>
  );
}

function AssetGrid({ assets }: { assets: AssetRecord[] }) {
  const { t } = useTranslation();
  const remove = useLibraryStore((s) => s.remove);
  if (assets.length === 0) {
    return <p className="px-2 py-6 text-center text-xs text-slate-400">{t('assets.emptyLibrary')}</p>;
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      {assets.map((a) => (
        <div
          key={a.id}
          className="group relative aspect-square overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/x-gaia-asset', a.dataUrl);
            e.dataTransfer.setData('application/x-gaia-kind', a.kind === 'logo' ? 'logo' : 'image');
          }}
        >
          <button
            className="h-full w-full"
            title={t('assets.add')}
            onClick={() => void editor.addImageFromUrl(a.dataUrl, a.kind === 'logo' ? 'logo' : 'image', a.name)}
          >
            <img src={a.dataUrl} alt={a.name} className="h-full w-full object-contain" />
          </button>
          <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-black/45 px-1 py-0.5 opacity-0 transition group-hover:opacity-100">
            <button
              className="text-[10px] text-white hover:text-amber-300"
              title={t('assets.markAsLogo')}
              onClick={() => void editor.addImageFromUrl(a.dataUrl, 'logo', a.name)}
            >
              <Star className="h-3.5 w-3.5" />
            </button>
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

function UploadZone({ kind }: { kind: AssetRecord['kind'] }) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);
  const [busy, setBusy] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files) return;
    setBusy(true);
    try {
      for (const file of Array.from(files).filter(isImageFile)) {
        const raw = await fileToDataUrl(file);
        await addFromDataUrl(raw, kind, file.name);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className="mb-3 flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500 transition hover:border-gaia-400 hover:bg-gaia-50"
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 className="h-6 w-6 animate-spin text-gaia-500" />
        ) : (
          <UploadCloud className="h-6 w-6 text-gaia-500" />
        )}
        <span className="font-medium text-slate-700">{t('assets.uploadPhotos')}</span>
        <span>{t('assets.uploadHint')}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
    </>
  );
}

function MyPhotosTab() {
  const assets = useLibraryStore((s) => s.assets.filter((a) => a.kind === 'photo' || a.kind === 'logo'));
  return (
    <div>
      <UploadZone kind="photo" />
      <AssetGrid assets={assets} />
    </div>
  );
}

function LibraryTab() {
  const assets = useLibraryStore((s) => s.assets);
  return <AssetGrid assets={assets} />;
}

function StockTab() {
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
    try {
      const res = await fetch(p.full);
      const blob = await res.blob();
      const dataUrl = await fileToDataUrl(new File([blob], `${p.id}.jpg`, { type: blob.type }));
      const rec = await addFromDataUrl(dataUrl, 'stock', p.credit || 'Stock photo');
      await editor.addImageFromUrl(rec.dataUrl, 'image', rec.name);
    } catch {
      await editor.addImageFromUrl(p.full, 'image', p.credit || 'Stock');
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
            title={p.credit}
          >
            <img src={p.thumb} alt={p.credit} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}

function AiTab() {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const addFromDataUrl = useLibraryStore((s) => s.addFromDataUrl);

  const importFiles = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files).filter(isImageFile)) {
      const raw = await fileToDataUrl(file);
      const rec = await addFromDataUrl(raw, 'ai', file.name);
      await editor.addImageFromUrl(rec.dataUrl, 'image', rec.name);
    }
  };

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-gaia-50 p-3 text-xs text-slate-600 ring-1 ring-gaia-100">
        <Sparkles className="mb-1 h-4 w-4 text-gaia-600" />
        {t('assets.aiHint')}
      </div>
      <a
        href="https://aistudio.google.com/"
        target="_blank"
        rel="noreferrer"
        className="btn-secondary w-full"
      >
        <ExternalLink className="h-4 w-4" /> {t('assets.aiOpen')}
      </a>
      <button className="btn-primary w-full" onClick={() => inputRef.current?.click()}>
        <ImagePlus className="h-4 w-4" /> {t('assets.aiImport')}
      </button>
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
