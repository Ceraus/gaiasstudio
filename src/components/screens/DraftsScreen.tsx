import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CheckSquare,
  Copy,
  FileStack,
  FolderOpen,
  FolderTree,
  ImageOff,
  Loader2,
  Pencil,
  PencilLine,
  Plus,
  Printer,
  Search,
  Square,
  Trash2,
  Vault,
  X,
} from 'lucide-react';
import type { AveryDataset, Collection, Draft, Ingredient, Recipe } from '@/types';
import { collectionsRepo, draftsRepo, ingredientsRepo, recipesRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';
import averyData from '@/data/averyTemplates.json';
import Modal from '@/components/common/Modal';
import CollectionsModal from './CollectionsModal';
import { readableTextOn, tint } from '@/data/collectionPalette';

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

/** Sentinel filter value for designs that aren't in any collection. */
const UNFILED = '__unfiled__';

export default function DraftsScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const loadDraft = useAppStore((s) => s.loadDraft);
  const activeDraftId = useAppStore((s) => s.activeDraftId);
  const setBatchDraftIds = useAppStore((s) => s.setBatchDraftIds);

  const [tab, setTab] = useState<Tab>('workspace');
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const [managingCollections, setManagingCollections] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const reload = useCallback(() => {
    draftsRepo.all().then(setDrafts).catch(() => {});
    collectionsRepo.all().then(setCollections).catch(() => {});
  }, []);

  useEffect(() => {
    reload();
    // Recipes and ingredients only feed the search index, so failures here
    // must not stop the design list from rendering.
    recipesRepo.all().then(setRecipes).catch(() => {});
    ingredientsRepo.all().then(setIngredients).catch(() => {});
  }, [reload]);

  const collectionById = useMemo(
    () => new Map(collections.map((c) => [c.id, c])),
    [collections],
  );

  const counts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const d of drafts) if (d.collectionId) out[d.collectionId] = (out[d.collectionId] ?? 0) + 1;
    return out;
  }, [drafts]);

  /**
   * One lower-cased haystack per design: its own name and notes plus the names
   * of the things it is filed under — template, collection, recipe and every
   * ingredient in that recipe. Searching "lavender" finds a label whose recipe
   * simply contains lavender oil.
   */
  const searchIndex = useMemo(() => {
    const ingredientById = new Map(ingredients.map((i) => [i.id, i.name]));
    const recipeById = new Map(recipes.map((r) => [r.id, r]));
    const index = new Map<string, string>();
    for (const d of drafts) {
      const recipe = d.recipeId ? recipeById.get(d.recipeId) : undefined;
      const parts = [
        d.name,
        d.notes ?? '',
        d.context,
        templates.find((tpl) => tpl.id === d.templateId)?.name ?? '',
        d.collectionId ? collectionById.get(d.collectionId)?.name ?? '' : '',
        recipe?.name ?? '',
        recipe?.benefit ?? '',
        ...(recipe?.ingredientIds ?? []).map((id) => ingredientById.get(id) ?? ''),
      ];
      index.set(d.id, parts.join(' ').toLowerCase());
    }
    return index;
  }, [drafts, collectionById, recipes, ingredients]);

  const visibleDrafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return drafts.filter((d) => {
      if (collectionFilter === UNFILED && d.collectionId) return false;
      if (collectionFilter && collectionFilter !== UNFILED && d.collectionId !== collectionFilter) return false;
      if (!q) return true;
      return (searchIndex.get(d.id) ?? '').includes(q);
    });
  }, [drafts, query, collectionFilter, searchIndex]);

  const activeDraft = activeDraftId ? drafts.find((d) => d.id === activeDraftId) ?? null : null;

  const openDraft = (draft: Draft) => {
    const tpl = templates.find((tmpl) => tmpl.id === draft.templateId);
    if (!tpl) {
      alert(`Template for this draft is no longer available (id: ${draft.templateId}). The draft cannot be opened.`);
      return;
    }
    loadDraft(draft, tpl);
  };

  const doRemove = async (id: string) => {
    setConfirmDeleteId(null);
    await draftsRepo.remove(id);
    setSelectedIds((ids) => ids.filter((x) => x !== id));
    reload();
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  };

  const startBatchPrint = () => {
    setBatchDraftIds(selectedIds);
    goto('batch');
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-slate-50 p-6">
      <div className="mx-auto w-full max-w-5xl">
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
            {drafts.length > 0 && (
              <div className="mb-4 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    className="input pl-9 pr-9"
                    type="search"
                    placeholder={t('drafts.searchPlaceholder', 'Search by design, recipe, ingredient or collection…')}
                    aria-label={t('drafts.searchLabel', 'Search designs')}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100"
                      title={t('common.clear', 'Clear')}
                      aria-label={t('common.clear', 'Clear')}
                      onClick={() => setQuery('')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {/* Collection filter chips */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <FilterChip
                    label={t('collections.all', 'All designs')}
                    count={drafts.length}
                    active={collectionFilter === null}
                    onClick={() => setCollectionFilter(null)}
                  />
                  {collections.map((c) => (
                    <FilterChip
                      key={c.id}
                      label={c.name}
                      count={counts[c.id] ?? 0}
                      color={c.color}
                      active={collectionFilter === c.id}
                      onClick={() => setCollectionFilter(collectionFilter === c.id ? null : c.id)}
                    />
                  ))}
                  <FilterChip
                    label={t('collections.unfiled', 'Unfiled')}
                    count={drafts.filter((d) => !d.collectionId).length}
                    active={collectionFilter === UNFILED}
                    onClick={() => setCollectionFilter(collectionFilter === UNFILED ? null : UNFILED)}
                  />
                  <button
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-slate-500 ring-1 ring-slate-200 transition hover:bg-white hover:text-slate-700"
                    onClick={() => setManagingCollections(true)}
                  >
                    <FolderTree className="h-3.5 w-3.5" />
                    {t('collections.manage', 'Manage collections')}
                  </button>
                </div>
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

            {drafts.length > 0 && visibleDrafts.length === 0 && (
              <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-white py-16 text-center">
                <Search className="mb-3 h-10 w-10 text-slate-300" />
                <p className="font-semibold text-slate-600">{t('drafts.noMatches', 'No designs match that search.')}</p>
                <button
                  className="btn-secondary mt-4"
                  onClick={() => { setQuery(''); setCollectionFilter(null); }}
                >
                  {t('drafts.clearFilters', 'Clear search & filters')}
                </button>
              </div>
            )}

            {visibleDrafts.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleDrafts.map((draft) => (
                  <DraftCard
                    key={draft.id}
                    draft={draft}
                    collection={draft.collectionId ? collectionById.get(draft.collectionId) : undefined}
                    collections={collections}
                    isActive={draft.id === activeDraftId}
                    selected={selectedIds.includes(draft.id)}
                    onToggleSelected={() => toggleSelected(draft.id)}
                    onOpen={() => openDraft(draft)}
                    onDelete={() => setConfirmDeleteId(draft.id)}
                    onDuplicate={() => { void draftsRepo.duplicate(draft.id).then(reload); }}
                    onRename={(name) => {
                      draftsRepo.rename(draft.id, name).then(reload).catch(() => {});
                    }}
                    onSetCollection={(id) => {
                      draftsRepo.setCollection(draft.id, id).then(reload).catch(() => {});
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

      {/* Batch-print action bar — appears once designs are ticked */}
      {tab === 'workspace' && selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-20 mx-auto mt-6 flex w-full max-w-md items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-panel">
          <CheckSquare className="h-4 w-4 shrink-0 text-gaia-300" />
          <span className="flex-1 text-sm">
            {t('batch.selectedCount', '{{count}} design(s) selected', { count: selectedIds.length })}
          </span>
          <button
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10"
            onClick={() => setSelectedIds([])}
          >
            {t('common.clear', 'Clear')}
          </button>
          <button
            className="flex items-center gap-1.5 rounded-lg bg-gaia-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gaia-400"
            onClick={startBatchPrint}
          >
            <Printer className="h-3.5 w-3.5" />
            {t('batch.printTogether', 'Print together')}
          </button>
        </div>
      )}

      <CollectionsModal
        open={managingCollections}
        collections={collections}
        counts={counts}
        onClose={() => setManagingCollections(false)}
        onChanged={reload}
      />

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

function FilterChip({
  label,
  count,
  color,
  active,
  onClick,
}: {
  label: string;
  count: number;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
        active ? 'text-slate-900 ring-2' : 'text-slate-600 ring-1 ring-slate-200 hover:ring-slate-400'
      }`}
      style={
        color
          ? { background: tint(color, active ? 0.55 : 0.22), ...(active ? { boxShadow: `0 0 0 2px ${color}` } : {}) }
          : active
            ? { background: '#fff', boxShadow: '0 0 0 2px #334155' }
            : { background: '#fff' }
      }
    >
      {color && (
        <span className="h-2.5 w-2.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      )}
      <span className="max-w-[10rem] truncate">{label}</span>
      <span className="tabular-nums opacity-60">{count}</span>
    </button>
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
  collection,
  collections,
  isActive,
  selected,
  onToggleSelected,
  onOpen,
  onDelete,
  onDuplicate,
  onRename,
  onSetCollection,
}: {
  draft: Draft;
  collection?: Collection;
  collections: Collection[];
  isActive: boolean;
  selected: boolean;
  onToggleSelected: () => void;
  onOpen: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onRename: (name: string) => void;
  onSetCollection: (collectionId: string | null) => void;
}) {
  const { t } = useTranslation();
  const tpl = templates.find((tmpl) => tmpl.id === draft.templateId);
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(draft.name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setNameVal(draft.name), [draft.name]);

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

  const accent = collection?.color;

  return (
    <div
      data-testid="draft-card"
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:shadow-md ${
        isActive ? 'border-orange-400 ring-2 ring-orange-200' : 'border-slate-200'
      }`}
      style={accent && !isActive ? { borderColor: accent, boxShadow: `inset 0 0 0 1px ${accent}` } : undefined}
    >
      {/* Collection header — the instant visual identifier for a product line */}
      {collection && (
        <div
          data-testid="draft-collection-header"
          className="truncate px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide"
          style={{ background: collection.color, color: readableTextOn(collection.color) }}
        >
          {collection.name}
        </div>
      )}

      {/* Active WIP badge */}
      {isActive && (
        <div className="flex items-center gap-1.5 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-600">
          <PencilLine className="h-3 w-3" />
          <span>{t('drafts.currentlyEditing', 'Currently editing')}</span>
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

        {/* Batch-print selection tick */}
        <button
          className={`absolute left-2 top-2 rounded-lg bg-white/90 p-1 text-slate-500 shadow-sm transition hover:text-gaia-700 ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
          title={t('batch.selectForPrinting', 'Select for a mixed print sheet')}
          aria-label={t('batch.selectForPrinting', 'Select for a mixed print sheet')}
          aria-pressed={selected}
          onClick={(e) => { e.stopPropagation(); onToggleSelected(); }}
        >
          {selected
            ? <CheckSquare className="h-4 w-4 text-gaia-600" />
            : <Square className="h-4 w-4" />}
        </button>

        {/* Open overlay on hover */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/10">
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
            title={t('drafts.clickToRename', 'Click to rename')}
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

        {/* Collection picker */}
        <label className="mt-1 block">
          <span className="sr-only">{t('collections.assign', 'Collection')}</span>
          <select
            className="w-full rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 outline-none focus:border-gaia-400"
            value={draft.collectionId ?? ''}
            onChange={(e) => onSetCollection(e.target.value || null)}
          >
            <option value="">{t('collections.unfiled', 'Unfiled')}</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </label>

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
            className="icon-btn"
            title={t('drafts.duplicate', 'Duplicate')}
            aria-label={t('drafts.duplicate', 'Duplicate')}
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            className="icon-btn text-rose-500 hover:bg-rose-50"
            title={t('common.delete')}
            aria-label={t('common.delete')}
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
