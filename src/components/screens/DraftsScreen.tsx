import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, Check, Copy, FileStack, FolderOpen, ImageOff, Layers, Loader2, Minus,
  Pencil, PencilLine, Plus, Printer, Search, Tag, Trash2, Vault, X,
} from 'lucide-react';
import type { AveryDataset, Draft } from '@/types';
import { draftsRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';
import averyData from '@/data/averyTemplates.json';
import { footprintHeightIn, footprintWidthIn, slotPositionIn } from '@/lib/units';
import Modal from '@/components/common/Modal';

interface PdfEntry {
  name: string;
  path: string;
  size: number;
  modified: string;
}

interface ElectronAPIWithVault {
  listPdfs(): Promise<PdfEntry[]>;
  openFile(filePath: string): Promise<void>;
  openFolder(filePath: string): Promise<void>;
  onPdfExported?(cb: (payload: { filename: string }) => void): () => void;
}

function getElectronVaultAPI(): ElectronAPIWithVault | null {
  if (typeof window === 'undefined') return null;
  const api = (window as unknown as { electronAPI?: Partial<ElectronAPIWithVault> }).electronAPI;
  if (api && typeof api.listPdfs === 'function') return api as ElectronAPIWithVault;
  return null;
}

const templates = (averyData as AveryDataset).templates;

/** Pastel accent palette for color-coding collections / product lines. */
const COLLECTION_COLORS = [
  '#a7d3a0', '#f6b8c8', '#a7c8ec', '#f6d69b',
  '#c8b6ec', '#8fded0', '#f2b199', '#94a3b8',
];

function relativeTime(ts: number): string {
  const diffMs = Date.now() - ts;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  return `${Math.floor(diffHr / 24)}d`;
}

function contextBadgeClass(ctx: string) {
  if (ctx === 'front') return 'bg-gaia-100 text-gaia-700';
  if (ctx === 'back') return 'bg-amber-100 text-amber-700';
  return 'bg-violet-100 text-violet-700';
}

type Tab = 'workspace' | 'pdfvault';

export default function DraftsScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const loadDraft = useAppStore((s) => s.loadDraft);
  const settings = useAppStore((s) => s.settings);
  const activeDraftId = useAppStore((s) => s.activeDraftId);

  const [tab, setTab] = useState<Tab>('workspace');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);

  const reload = () => {
    draftsRepo.all().then(setDrafts).catch(() => {});
  };

  useEffect(() => { reload(); }, []);

  const activeDraft = activeDraftId ? drafts.find((d) => d.id === activeDraftId) ?? null : null;

  // Distinct collections (with their accent color) for the filter chips.
  const collections = useMemo(() => {
    const map = new Map<string, string | undefined>();
    for (const d of drafts) {
      if (d.collection) map.set(d.collection, d.color ?? map.get(d.collection));
    }
    return Array.from(map.entries()).map(([name, color]) => ({ name, color }));
  }, [drafts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drafts.filter((d) => {
      if (collectionFilter !== null && (d.collection ?? '') !== collectionFilter) return false;
      if (!q) return true;
      const tpl = templates.find((tmpl) => tmpl.id === d.templateId);
      const hay = [d.name, d.notes, d.collection, tpl?.name, tpl?.averyCode, d.context]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(q);
    });
  }, [drafts, query, collectionFilter]);

  const openDraft = (draft: Draft) => {
    const tpl = templates.find((t) => t.id === draft.templateId);
    if (!tpl) {
      alert(`Template for this draft is no longer available (id: ${draft.templateId}). The draft cannot be opened.`);
      return;
    }
    loadDraft(draft, tpl);
  };

  const doRemove = async (id: string) => {
    setConfirmDeleteId(null);
    await draftsRepo.remove(id);
    reload();
  };

  const duplicate = async (id: string) => {
    await draftsRepo.duplicate(id);
    reload();
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-4xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-800">{t('drafts.title')}</h1>
              {activeDraft && tab === 'workspace' && (
                <PencilLine className="h-5 w-5 text-orange-500" aria-hidden="true" />
              )}
            </div>
            {activeDraft && tab === 'workspace' ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <span>{t('drafts.subtitle')}</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-600">
                  <PencilLine className="h-3 w-3" />
                  {activeDraft.name}
                </span>
              </p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">{t('drafts.subtitle')}</p>
            )}
          </div>
          {tab === 'workspace' && (
            <div className="flex shrink-0 items-center gap-2">
              <button
                className="btn-secondary"
                onClick={() => setBatchOpen(true)}
                disabled={drafts.length === 0}
                title={t('batch.title', 'Batch print (ink saver)')}
              >
                <Printer className="h-4 w-4" />
                <span className="hidden sm:inline">{t('batch.button', 'Batch Print')}</span>
              </button>
              <button className="btn-primary" onClick={() => goto('template')}>
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">{t('nav.newLabel')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl bg-slate-200 p-1">
          <button
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              tab === 'workspace'
                ? 'bg-white text-slate-800 shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setTab('workspace')}
          >
            <FileStack className="h-4 w-4" />
            {t('drafts.tabWorkspace', 'Workspace')}
          </button>
          <button
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-semibold transition ${
              tab === 'pdfvault'
                ? 'bg-white text-slate-800 shadow'
                : 'text-slate-500 hover:text-slate-700'
            }`}
            onClick={() => setTab('pdfvault')}
          >
            <Vault className="h-4 w-4" />
            {t('drafts.pdfVault', 'PDF Vault')}
          </button>
        </div>

        {/* Workspace tab */}
        {tab === 'workspace' && (
          <>
            {drafts.length > 0 && (
              <div className="mb-4 space-y-3">
                {/* Search bar */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="search"
                    className="input pl-9"
                    placeholder={t('drafts.searchPlaceholder', 'Search designs by name, collection, or size…')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>

                {/* Collection filter chips */}
                {collections.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="mr-0.5 text-xs font-medium text-slate-400">{t('drafts.collections', 'Collections')}:</span>
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                        collectionFilter === null
                          ? 'bg-slate-800 text-white'
                          : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'
                      }`}
                      onClick={() => setCollectionFilter(null)}
                    >
                      {t('drafts.allCollections', 'All')}
                    </button>
                    {collections.map((c) => {
                      const active = collectionFilter === c.name;
                      return (
                        <button
                          key={c.name}
                          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ring-1 ${
                            active ? 'text-slate-900 ring-2' : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-100'
                          }`}
                          style={active && c.color ? { backgroundColor: `${c.color}33`, borderColor: c.color } : undefined}
                          onClick={() => setCollectionFilter(active ? null : c.name)}
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color ?? '#94a3b8' }} />
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {drafts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
                <FileStack className="mb-4 h-12 w-12 text-slate-300" />
                <p className="font-semibold text-slate-600">{t('drafts.empty')}</p>
                <p className="mt-1 max-w-xs text-sm text-slate-400">{t('drafts.emptyHint')}</p>
                <button className="btn-primary mt-6" onClick={() => goto('template')}>
                  <Plus className="h-4 w-4" /> {t('nav.newLabel')}
                </button>
              </div>
            )}

            {drafts.length > 0 && filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
                <Search className="mb-3 h-9 w-9 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">{t('drafts.noResults', 'No designs match your search.')}</p>
              </div>
            )}

            {filtered.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    isActive={draft.id === activeDraftId}
                    onOpen={() => openDraft(draft)}
                    onDelete={() => setConfirmDeleteId(draft.id)}
                    onDuplicate={() => void duplicate(draft.id)}
                    onRename={(name) => {
                      draftsRepo.rename(draft.id, name).then(reload).catch(() => {});
                    }}
                    onSetCollection={(collection, color) => {
                      draftsRepo.setCollection(draft.id, collection, color).then(reload).catch(() => {});
                    }}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* PDF Vault tab */}
        {tab === 'pdfvault' && <PdfVaultPanel />}
      </div>

      <Modal
        open={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        width={360}
        title={
          <span className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            {t('common.confirmDeleteTitle')}
          </span>
        }
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-secondary" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel')}
            </button>
            <button
              className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              onClick={() => { if (confirmDeleteId) void doRemove(confirmDeleteId); }}
            >
              {t('common.delete')}
            </button>
          </div>
        }
      >
        <p className="text-sm text-slate-600">{t('common.confirmDeleteBody')}</p>
      </Modal>

      <BatchPrintModal
        open={batchOpen}
        onClose={() => setBatchOpen(false)}
        drafts={drafts}
        settings={settings}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// PDF Vault panel
// ---------------------------------------------------------------------------
function PdfVaultPanel() {
  const { t } = useTranslation();
  // Stabilize reference — the API object is always the same singleton or null.
  const apiRef = useRef(getElectronVaultAPI());
  const api = apiRef.current;

  const [pdfs, setPdfs] = useState<PdfEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPdfs = useCallback(() => {
    if (!api) return;
    setLoading(true);
    api
      .listPdfs()
      .then(setPdfs)
      .catch(() => setPdfs([]))
      .finally(() => setLoading(false));
  }, [api]);

  useEffect(() => {
    loadPdfs();
  }, [loadPdfs]);

  useEffect(() => {
    if (!api?.onPdfExported) return;
    const unsubscribe = api.onPdfExported(() => loadPdfs());
    return unsubscribe;
  }, [api, loadPdfs]);

  if (!api) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <Vault className="mb-4 h-12 w-12 text-slate-300" />
        <p className="font-semibold text-slate-600">
          {t('drafts.pdfVaultDesktopOnly', 'PDF Vault is only available in the desktop app.')}
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
      </div>
    );
  }

  if (pdfs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-20 text-center">
        <Vault className="mb-4 h-12 w-12 text-slate-300" />
        <p className="font-semibold text-slate-600">{t('drafts.noPdfs', 'No exported PDFs yet. Export a label to see it here.')}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {pdfs.map((pdf) => (
        <PdfCard key={pdf.path} pdf={pdf} api={api} />
      ))}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function PdfCard({ pdf, api }: { pdf: PdfEntry; api: ElectronAPIWithVault }) {
  const { t } = useTranslation();
  const date = new Date(pdf.modified);
  const dateStr = date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-md">
      {/* Icon area */}
      <div className="flex h-28 items-center justify-center bg-rose-50">
        <Vault className="h-12 w-12 text-rose-300" />
      </div>
      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="truncate text-sm font-semibold text-slate-800" title={pdf.name}>
          {pdf.name}
        </p>
        <p className="text-xs text-slate-500">{dateStr}</p>
        <p className="text-xs text-slate-400">{formatBytes(pdf.size)}</p>
        {/* Actions */}
        <div className="mt-2 flex gap-2">
          <button
            className="btn-primary flex-1 text-xs"
            onClick={() => void api.openFile(pdf.path)}
          >
            {t('drafts.openFile', 'Open')}
          </button>
          <button
            className="btn-secondary flex items-center gap-1 text-xs"
            onClick={() => void api.openFolder(pdf.path)}
            title={t('drafts.openFolder', 'Show in Folder')}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('drafts.openFolder', 'Show in Folder')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draft card
// ---------------------------------------------------------------------------
function DraftCard({
  draft,
  isActive,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
  onSetCollection,
}: {
  draft: Draft;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onSetCollection: (collection: string | undefined, color: string | undefined) => void;
}) {
  const { t } = useTranslation();
  const tpl = templates.find((tmpl) => tmpl.id === draft.templateId);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(draft.name);
  const [collOpen, setCollOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const accent = draft.color;

  const commitRename = () => {
    setEditing(false);
    const trimmed = nameVal.trim();
    if (trimmed && trimmed !== draft.name) {
      onRename(trimmed);
    } else {
      setNameVal(draft.name);
    }
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        isActive ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200'
      }`}
      style={accent && !isActive ? { borderColor: accent, borderTopWidth: 4 } : undefined}
    >
      {/* Active WIP badge */}
      {isActive && (
        <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">
          <PencilLine className="h-3 w-3" />
          <span>Currently editing</span>
        </div>
      )}
      {/* Collection header pill */}
      {draft.collection && (
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-left text-xs font-semibold"
          style={{ backgroundColor: `${accent ?? '#94a3b8'}22`, color: '#334155' }}
          onClick={() => setCollOpen((o) => !o)}
          title={t('drafts.editCollection', 'Edit collection')}
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: accent ?? '#94a3b8' }} />
          <span className="truncate">{draft.collection}</span>
        </button>
      )}

      {/* Thumbnail */}
      <div
        className="relative flex h-36 cursor-pointer items-center justify-center overflow-hidden bg-slate-100"
        onClick={onOpen}
      >
        {draft.thumb ? (
          <img
            src={draft.thumb}
            alt={draft.name}
            className="h-full w-full object-contain"
          />
        ) : (
          <ImageOff className="h-10 w-10 text-slate-300" />
        )}
        {/* Open overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
          <span className="scale-90 rounded-xl bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 opacity-0 shadow transition group-hover:scale-100 group-hover:opacity-100">
            {t('drafts.open', 'Open')}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col gap-1 p-3">
        {/* Editable name */}
        {editing ? (
          <input
            ref={inputRef}
            className="input text-sm font-semibold"
            value={nameVal}
            onChange={(e) => setNameVal(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setNameVal(draft.name); setEditing(false); }
            }}
          />
        ) : (
          <button
            className="flex items-center gap-1 truncate text-left text-sm font-semibold text-slate-800 hover:text-gaia-700"
            onClick={() => setEditing(true)}
            title="Click to rename"
          >
            <span className="truncate">{draft.name}</span>
            <Pencil className="h-3 w-3 shrink-0 text-slate-400 opacity-0 transition group-hover:opacity-100" />
          </button>
        )}

        {/* Template + context */}
        <div className="flex flex-wrap items-center gap-1.5">
          {tpl && (
            <span className="truncate text-xs text-slate-500">{tpl.name}</span>
          )}
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${contextBadgeClass(draft.context)}`}>
            {t(`template.${draft.context}`, draft.context)}
          </span>
        </div>

        {/* Notes */}
        {draft.notes && (
          <p className="line-clamp-2 text-xs text-slate-400">{draft.notes}</p>
        )}

        {/* Timestamp */}
        <p className="mt-auto pt-1 text-[11px] text-slate-400">
          {t('drafts.savedAgo', 'Updated {{time}} ago', { time: relativeTime(draft.updatedAt) })}
        </p>

        {/* Actions */}
        <div className="mt-2 flex items-center gap-1.5">
          <button className="btn-primary flex-1" onClick={onOpen}>
            {t('drafts.open', 'Open')}
          </button>
          <button
            className="icon-btn"
            title={t('drafts.setCollection', 'Collection')}
            onClick={() => setCollOpen((o) => !o)}
          >
            <Tag className="h-4 w-4" />
          </button>
          <button
            className="icon-btn"
            title={t('drafts.duplicate', 'Duplicate')}
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            className="icon-btn text-rose-500 hover:bg-rose-50"
            title={t('common.delete')}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Collection editor popover */}
      {collOpen && (
        <CollectionEditor
          initialName={draft.collection ?? ''}
          initialColor={draft.color ?? COLLECTION_COLORS[0]}
          onClose={() => setCollOpen(false)}
          onSave={(name, color) => {
            onSetCollection(name || undefined, name ? color : undefined);
            setCollOpen(false);
          }}
          onClear={() => {
            onSetCollection(undefined, undefined);
            setCollOpen(false);
          }}
        />
      )}
    </div>
  );
}

function CollectionEditor({
  initialName,
  initialColor,
  onClose,
  onSave,
  onClear,
}: {
  initialName: string;
  initialColor: string;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
  onClear: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  return (
    <div className="absolute inset-x-2 bottom-2 z-20 rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-600">{t('drafts.collection', 'Collection')}</span>
        <button className="rounded p-0.5 text-slate-400 hover:bg-slate-100" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <input
        autoFocus
        className="input mb-2 text-sm"
        placeholder={t('drafts.collectionPlaceholder', 'e.g. Oily Skin, Holiday…')}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') onSave(name.trim(), color); }}
      />
      <div className="mb-2 flex flex-wrap gap-1.5">
        {COLLECTION_COLORS.map((c) => (
          <button
            key={c}
            className="flex h-6 w-6 items-center justify-center rounded-full ring-1 ring-slate-200 transition hover:scale-110"
            style={{ backgroundColor: c }}
            onClick={() => setColor(c)}
            aria-label={c}
          >
            {color === c && <Check className="h-3.5 w-3.5 text-white drop-shadow" />}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          className="btn-primary flex-1 py-1.5 text-xs"
          onClick={() => onSave(name.trim(), color)}
        >
          {t('common.save')}
        </button>
        {initialName && (
          <button className="btn-secondary py-1.5 text-xs" onClick={onClear}>
            {t('drafts.clearCollection', 'Clear')}
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mixed Batch Printing ("Ink Saver") — several designs on one Avery sheet.
// ---------------------------------------------------------------------------
function BatchPrintModal({
  open,
  onClose,
  drafts,
  settings,
}: {
  open: boolean;
  onClose: () => void;
  drafts: Draft[];
  settings: ReturnType<typeof useAppStore.getState>['settings'];
}) {
  const { t } = useTranslation();

  // Group drafts by their template (batching requires one shared geometry).
  const groups = useMemo(() => {
    const map = new Map<string, Draft[]>();
    for (const d of drafts) {
      if (!templates.find((tmpl) => tmpl.id === d.templateId)) continue;
      const arr = map.get(d.templateId) ?? [];
      arr.push(d);
      map.set(d.templateId, arr);
    }
    return map;
  }, [drafts]);

  const groupIds = useMemo(() => Array.from(groups.keys()), [groups]);
  const [templateId, setTemplateId] = useState('');
  const [copies, setCopies] = useState<Record<string, number>>({});
  const [fill, setFill] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState('');
  const [err, setErr] = useState('');

  // Pick the first available group when the modal opens / groups change.
  useEffect(() => {
    if (!open) return;
    setDone('');
    setErr('');
    if (!groups.has(templateId)) setTemplateId(groupIds[0] ?? '');
  }, [open, groupIds, groups, templateId]);

  const template = templates.find((tmpl) => tmpl.id === templateId) ?? null;
  const groupDrafts = groups.get(templateId) ?? [];

  const setCopy = (id: string, n: number) =>
    setCopies((prev) => ({ ...prev, [id]: Math.max(0, Math.min(999, n)) }));

  const selected = groupDrafts.filter((d) => (copies[d.id] ?? 0) > 0);
  const totalLabels = selected.reduce((sum, d) => sum + (copies[d.id] ?? 0), 0);
  const perSheet = template?.perSheet ?? 1;
  const sheets = totalLabels > 0 ? Math.ceil(totalLabels / perSheet) : 0;

  // Round-robin sequence of thumbs to fill the first-sheet preview.
  const previewSeq: Draft[] = [];
  for (const d of selected) for (let i = 0; i < (copies[d.id] ?? 0); i++) previewSeq.push(d);
  const previewFilled = fill && previewSeq.length > 0 && previewSeq.length % perSheet !== 0;

  const exportBatch = async () => {
    if (!template || selected.length === 0) return;
    setBusy(true);
    setDone('');
    setErr('');
    try {
      const [{ editor }, pdf] = await Promise.all([
        import('@/lib/fabric/editorController'),
        import('@/lib/pdfExport'),
      ]);
      const items = await Promise.all(
        selected.map(async (d) => ({
          pngDataUrl: await editor.renderDesignJsonToPng(d.designJson, template, settings),
          copies: copies[d.id] ?? 0,
        })),
      );
      const bytes = await pdf.buildMixedBatchPdf({ template, items, fillSheet: fill });
      const name = pdf.peekExportName(`${settings.filenamePrefix}-BATCH`);
      pdf.downloadBytes(bytes, name);
      pdf.bumpExportSeq(`${settings.filenamePrefix}-BATCH`);
      setDone(name);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Batch export failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={720}
      title={
        <span className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-gaia-600" />
          {t('batch.title', 'Batch print (ink saver)')}
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            {totalLabels > 0
              ? t('batch.summary', '{{labels}} labels · {{sheets}} sheet(s)', { labels: totalLabels, sheets })
              : t('batch.pickSome', 'Add copies of your designs to build a sheet.')}
          </p>
          <button
            className="btn-primary"
            disabled={busy || totalLabels === 0}
            onClick={() => void exportBatch()}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4" />}
            {busy ? t('export.exporting') : t('batch.export', 'Export Ink-Saver PDF')}
          </button>
        </div>
      }
    >
      {groupIds.length === 0 ? (
        <p className="rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
          {t('batch.empty', 'Save a few designs first, then combine them here onto one sheet.')}
        </p>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">
            {t('batch.intro', 'Combine several saved designs onto a single Avery sheet so no sticker paper is wasted. Designs must share the same template.')}
          </p>

          {/* Template group selector */}
          {groupIds.length > 1 && (
            <div>
              <label className="label">{t('batch.template', 'Template')}</label>
              <select
                className="input"
                value={templateId}
                onChange={(e) => { setTemplateId(e.target.value); setCopies({}); }}
              >
                {groupIds.map((id) => {
                  const tpl = templates.find((tmpl) => tmpl.id === id);
                  const count = groups.get(id)?.length ?? 0;
                  return (
                    <option key={id} value={id}>
                      {tpl?.name ?? id} · {t('batch.designsCount', '{{count}} designs', { count })}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_260px]">
            {/* Design list with copy steppers */}
            <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {groupDrafts.map((d) => {
                const n = copies[d.id] ?? 0;
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-3 rounded-xl border p-2 transition ${
                      n > 0 ? 'border-gaia-300 bg-gaia-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {d.thumb ? (
                        <img src={d.thumb} alt={d.name} className="h-full w-full object-contain" />
                      ) : (
                        <ImageOff className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-700">{d.name}</p>
                      {d.collection && <p className="truncate text-xs text-slate-400">{d.collection}</p>}
                    </div>
                    <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white">
                      <button className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-100 disabled:opacity-30"
                        disabled={n === 0} onClick={() => setCopy(d.id, n - 1)}>
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <input
                        type="number"
                        min={0}
                        className="w-10 border-0 bg-transparent py-0 text-center text-xs text-slate-700 outline-none"
                        value={n}
                        onChange={(e) => setCopy(d.id, Number(e.target.value) || 0)}
                      />
                      <button className="flex h-7 w-7 items-center justify-center text-slate-500 hover:bg-slate-100"
                        onClick={() => setCopy(d.id, n + 1)}>
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sheet preview */}
            <div className="space-y-3">
              {template && (
                <BatchSheetPreview template={template} sequence={previewSeq} fill={previewFilled} />
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gaia-600"
                  checked={fill}
                  onChange={(e) => setFill(e.target.checked)}
                />
                {t('batch.fill', 'Fill the last sheet (repeat designs)')}
              </label>
            </div>
          </div>

          {done && (
            <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              <Check className="h-4 w-4" /> {t('export.done', { name: done })}
            </p>
          )}
          {err && (
            <p className="flex items-center gap-2 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              <X className="h-4 w-4 shrink-0" /> {err}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}

function BatchSheetPreview({
  template,
  sequence,
  fill,
}: {
  template: import('@/types').AveryTemplate;
  sequence: Draft[];
  fill: boolean;
}) {
  const height = 220;
  const width = height * (template.pageWidthIn / template.pageHeightIn);
  const fw = footprintWidthIn(template);
  const fh = footprintHeightIn(template);
  const perSheet = template.perSheet;

  // First sheet only: round-robin fill when requested.
  const filled: Draft[] = sequence.slice(0, perSheet);
  if (fill && filled.length > 0 && filled.length < perSheet) {
    let i = 0;
    while (filled.length < perSheet) { filled.push(sequence[i % sequence.length]); i++; }
  }

  const radius =
    template.shape === 'circle' || template.shape === 'oval'
      ? '50%'
      : template.shape === 'rounded-rectangle'
        ? '18%'
        : '2px';

  const slots: { idx: number; left: number; top: number; w: number; h: number }[] = [];
  let idx = 0;
  for (let r = 0; r < template.rows; r++) {
    for (let c = 0; c < template.columns; c++) {
      const { xIn, yIn } = slotPositionIn(template, c, r);
      slots.push({
        idx,
        left: (xIn / template.pageWidthIn) * 100,
        top: (yIn / template.pageHeightIn) * 100,
        w: (fw / template.pageWidthIn) * 100,
        h: (fh / template.pageHeightIn) * 100,
      });
      idx++;
    }
  }

  return (
    <div className="relative mx-auto rounded-md bg-white shadow-inner ring-1 ring-slate-200" style={{ width, height }}>
      {slots.map((s) => {
        const d = filled[s.idx];
        return (
          <div
            key={s.idx}
            className={`absolute overflow-hidden ${d ? '' : 'border border-dashed border-slate-200 bg-slate-50'}`}
            style={{ left: `${s.left}%`, top: `${s.top}%`, width: `${s.w}%`, height: `${s.h}%`, borderRadius: radius }}
          >
            {d?.thumb && (
              <img
                src={d.thumb}
                alt=""
                className="h-full w-full object-contain"
                style={{ transform: template.rotateForPrint ? 'rotate(90deg)' : undefined }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
