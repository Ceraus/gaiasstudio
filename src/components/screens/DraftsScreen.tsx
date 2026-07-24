import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, FileStack, FolderOpen, ImageOff, Loader2, Pencil, PencilLine, Plus, Trash2, Vault } from 'lucide-react';
import type { AveryDataset, Draft } from '@/types';
import { draftsRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';
import averyData from '@/data/averyTemplates.json';
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
  const activeDraftId = useAppStore((s) => s.activeDraftId);

  const [tab, setTab] = useState<Tab>('workspace');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const reload = () => {
    draftsRepo.all().then(setDrafts).catch(() => {});
  };

  useEffect(() => { reload(); }, []);

  const activeDraft = activeDraftId ? drafts.find((d) => d.id === activeDraftId) ?? null : null;

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
            <button
              className="btn-primary shrink-0"
              onClick={() => goto('template')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t('nav.newLabel')}</span>
            </button>
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

            {drafts.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {drafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    isActive={draft.id === activeDraftId}
                    onOpen={() => openDraft(draft)}
                    onDelete={() => setConfirmDeleteId(draft.id)}
                    onRename={(name) => {
                      draftsRepo.rename(draft.id, name).then(reload).catch(() => {});
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
  onRename,
}: {
  draft: Draft;
  isActive: boolean;
  onOpen: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
}) {
  const { t } = useTranslation();
  const tpl = templates.find((tmpl) => tmpl.id === draft.templateId);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(draft.name);
  const inputRef = useRef<HTMLInputElement>(null);

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
    <div className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
      isActive ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200'
    }`}>
      {/* Active WIP badge */}
      {isActive && (
        <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">
          <PencilLine className="h-3 w-3" />
          <span>Currently editing</span>
        </div>
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
        <div className="mt-2 flex gap-2">
          <button
            className="btn-primary flex-1"
            onClick={onOpen}
          >
            {t('drafts.open', 'Open')}
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
    </div>
  );
}
