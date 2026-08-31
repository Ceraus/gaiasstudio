import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookHeart, ChevronLeft, ChevronRight, Heart, PenLine, Plus } from 'lucide-react';
import Modal from '@/components/common/Modal';
import {
  BUILTIN_AFFIRMATIONS,
  affirmationRefKey,
  affirmationText,
  customToAffirmation,
  resolveAffirmationRef,
  type Affirmation,
} from '@/data/affirmations';
import { customAffirmationsRepo, favoriteAffirmationsRepo } from '@/db/repositories';
import { useAppStore } from '@/store/useAppStore';

const CATALOG_PAGE_SIZE = 15;

interface Props {
  open: boolean;
  onClose: () => void;
  current: Affirmation;
  onSelect: (row: Affirmation) => void;
}

function SourceIcon({ source }: { source: Affirmation['source'] }) {
  const Icon = source === 'custom' ? PenLine : BookHeart;
  return (
    <Icon
      aria-hidden
      data-affirmation-icon={source}
      className="mt-0.5 h-4 w-4 shrink-0 text-slate-400"
    />
  );
}

function Row({
  row,
  lang,
  current,
  favorited,
  onSelect,
  onToggleFavorite,
}: {
  row: Affirmation;
  lang: string;
  current: Affirmation;
  favorited: boolean;
  onSelect: (row: Affirmation) => void;
  onToggleFavorite: (row: Affirmation) => void;
}) {
  const { t } = useTranslation();
  const active = row.source === current.source && row.id === current.id;
  return (
    <div
      data-affirmation-row={row.id}
      data-affirmation-source={row.source}
      data-affirmation-current={active ? 'true' : 'false'}
      className={`flex w-full items-start gap-2 rounded-xl px-3 py-2.5 transition ${
        active ? 'bg-gaia-100 ring-1 ring-gaia-200' : 'hover:bg-slate-50'
      }`}
    >
      <SourceIcon source={row.source} />
      <button
        type="button"
        className={`min-w-0 flex-1 text-left text-sm leading-snug ${
          active ? 'font-medium text-gaia-900' : 'text-slate-700'
        }`}
        onClick={() => onSelect(row)}
      >
        {affirmationText(row, lang)}
      </button>
      <button
        type="button"
        className="flex shrink-0 items-center justify-center rounded-full p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-400"
        aria-label={
          favorited
            ? t('affirmationCenter.unheart', 'Remove favorite')
            : t('affirmationCenter.heart', 'Favorite')
        }
        aria-pressed={favorited}
        data-affirmation-row-heart=""
        data-favorited={favorited ? 'true' : 'false'}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onToggleFavorite(row);
        }}
      >
        <Heart className={`h-4 w-4 ${favorited ? 'fill-rose-300 text-rose-400' : ''}`} />
      </button>
    </div>
  );
}

export default function AffirmationLibraryModal({ open, onClose, current, onSelect }: Props) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const libraryRev = useAppStore((s) => s.affirmationLibraryRev);
  const bumpAffirmationLibrary = useAppStore((s) => s.bumpAffirmationLibrary);
  const [customs, setCustoms] = useState<Affirmation[]>([]);
  const [favorites, setFavorites] = useState<Affirmation[]>([]);
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState('');
  const [page, setPage] = useState(0);

  const pageCount = Math.max(1, Math.ceil(BUILTIN_AFFIRMATIONS.length / CATALOG_PAGE_SIZE));
  const catalogPage = useMemo(() => {
    const start = page * CATALOG_PAGE_SIZE;
    return BUILTIN_AFFIRMATIONS.slice(start, start + CATALOG_PAGE_SIZE);
  }, [page]);

  useEffect(() => {
    if (!open) {
      setDraft('');
      return;
    }
    if (current.source === 'builtin') {
      const idx = BUILTIN_AFFIRMATIONS.findIndex((row) => row.id === current.id);
      setPage(idx >= 0 ? Math.floor(idx / CATALOG_PAGE_SIZE) : 0);
    } else {
      setPage(0);
    }
    // Only snap to the current quote when the modal opens — not on later parent renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void Promise.all([customAffirmationsRepo.all(), favoriteAffirmationsRepo.all()]).then(
      ([customRows, favRows]) => {
        if (cancelled) return;
        const nextCustoms = customRows.map(customToAffirmation);
        setCustoms(nextCustoms);
        setFavoriteKeys(new Set(favRows.map((fav) => affirmationRefKey(fav.source, fav.refId))));
        setFavorites(
          favRows
            .map((fav) => resolveAffirmationRef(fav.source, fav.refId, nextCustoms))
            .filter((row): row is Affirmation => row != null),
        );
      },
    );
    return () => {
      cancelled = true;
    };
  }, [open, libraryRev]);

  const addCustom = async () => {
    const text = draft.trim();
    if (!text) return;
    const rec = await customAffirmationsRepo.create(text, text);
    bumpAffirmationLibrary();
    setDraft('');
    const next = customToAffirmation(rec);
    setCustoms((prev) => [next, ...prev]);
  };

  const toggleFavorite = (row: Affirmation) => {
    void favoriteAffirmationsRepo.toggle(row.source, row.id).then((yes) => {
      const key = affirmationRefKey(row.source, row.id);
      setFavoriteKeys((prev) => {
        const next = new Set(prev);
        if (yes) next.add(key);
        else next.delete(key);
        return next;
      });
      bumpAffirmationLibrary();
    });
  };

  const placeholder = lang.startsWith('es')
    ? t('affirmationCenter.createPlaceholderEs', 'Puedo empezar de nuevo.')
    : t('affirmationCenter.createPlaceholderEn', 'I am allowed to begin again.');

  const renderRows = (rows: readonly Affirmation[], keyPrefix: string) => (
    <ul className="space-y-1">
      {rows.map((row) => (
        <li key={`${keyPrefix}-${row.source}-${row.id}`}>
          <Row
            row={row}
            lang={lang}
            current={current}
            favorited={favoriteKeys.has(affirmationRefKey(row.source, row.id))}
            onSelect={onSelect}
            onToggleFavorite={toggleFavorite}
          />
        </li>
      ))}
    </ul>
  );

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t('affirmationCenter.title', 'Affirmation Center')}
      centerTitle
      width={560}
      minHeight="min(70vh, 36rem)"
    >
      <div data-affirmation-library="" className="space-y-6 text-center">
        <section data-affirmation-section="favorites">
          <h4 className="mb-2 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-widest text-slate-500">
            <Heart className="h-3.5 w-3.5 fill-rose-300 text-rose-400" />
            {t('affirmationCenter.favorites', 'Favorites')}
          </h4>
          {favorites.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-400">
              {t('affirmationCenter.emptyFavorites', 'Heart a line on the welcome bar to keep it here.')}
            </p>
          ) : (
            renderRows(favorites, 'fav')
          )}
        </section>

        <section data-affirmation-section="custom">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t('affirmationCenter.myAffirmations', 'My Affirmations')}
          </h4>
          <div className="mb-3 flex w-full gap-2">
            <input
              className="input min-w-0 flex-1 text-center"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void addCustom();
              }}
              placeholder={placeholder}
              aria-label={t('affirmationCenter.create', 'Create affirmation')}
              data-affirmation-custom-input=""
            />
            <button
              type="button"
              className="btn-primary shrink-0"
              disabled={!draft.trim()}
              onClick={() => void addCustom()}
              data-affirmation-custom-add=""
            >
              <Plus className="h-4 w-4" />
              {t('common.add', 'Add')}
            </button>
          </div>
          {customs.length === 0 ? (
            <p className="rounded-xl bg-slate-50 px-3 py-4 text-sm text-slate-400">
              {t('affirmationCenter.emptyMine', 'Write your own — it will also appear on the welcome pill.')}
            </p>
          ) : (
            renderRows(customs, 'custom')
          )}
        </section>

        <section data-affirmation-section="catalog">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">
            {t('affirmationCenter.catalog', 'All affirmations')}
          </h4>
          <ul className="space-y-1" data-affirmation-catalog-page={page + 1}>
            {catalogPage.map((row) => (
              <li key={`builtin-${row.id}`}>
                <Row
                  row={row}
                  lang={lang}
                  current={current}
                  favorited={favoriteKeys.has(affirmationRefKey(row.source, row.id))}
                  onSelect={onSelect}
                  onToggleFavorite={toggleFavorite}
                />
              </li>
            ))}
          </ul>
          <div className="mt-3 flex items-center justify-center gap-3">
            <button
              type="button"
              className="btn-ghost"
              disabled={page <= 0}
              aria-label={t('affirmationCenter.previous', 'Previous')}
              data-affirmation-page-prev=""
              onClick={() => setPage((currentPage) => Math.max(0, currentPage - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              {t('affirmationCenter.previous', 'Previous')}
            </button>
            <p className="min-w-[4.5rem] text-xs font-medium tabular-nums text-slate-500" data-affirmation-page="">
              {t('affirmationCenter.pageOf', {
                current: page + 1,
                total: pageCount,
                defaultValue: '{{current}} of {{total}}',
              })}
            </p>
            <button
              type="button"
              className="btn-ghost"
              disabled={page >= pageCount - 1}
              aria-label={t('affirmationCenter.next', 'Next')}
              data-affirmation-page-next=""
              onClick={() => setPage((currentPage) => Math.min(pageCount - 1, currentPage + 1))}
            >
              {t('affirmationCenter.next', 'Next')}
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </section>
      </div>
    </Modal>
  );
}
