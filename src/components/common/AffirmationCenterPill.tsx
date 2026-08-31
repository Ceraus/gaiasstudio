import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BookHeart, Heart, RefreshCw } from 'lucide-react';
import AffirmationLibraryModal from '@/components/common/AffirmationLibraryModal';
import {
  BUILTIN_AFFIRMATIONS,
  affirmationRefKey,
  affirmationText,
  buildAffirmationCyclePool,
  customToAffirmation,
  type Affirmation,
} from '@/data/affirmations';
import { getAffirmationImageUrl } from '@/data/affirmationImages';
import { customAffirmationsRepo, favoriteAffirmationsRepo } from '@/db/repositories';
import { dashboardGradient } from '@/lib/affirmationBackgrounds';
import { useAppStore } from '@/store/useAppStore';
import type { FavoriteAffirmation } from '@/types';

const LAST_INDEX_KEY = 'gaia:affirmation-center-pill-index';

function pickIndex(count: number): number {
  if (count <= 0) return 0;
  let last = Number.NaN;
  try {
    last = Number(sessionStorage.getItem(LAST_INDEX_KEY));
  } catch {
    /* ignore */
  }
  let next = Math.floor(Math.random() * count);
  if (count > 1 && next === last) next = (next + 1) % count;
  try {
    sessionStorage.setItem(LAST_INDEX_KEY, String(next));
  } catch {
    /* ignore */
  }
  return next;
}

function rememberIndex(next: number): void {
  try {
    sessionStorage.setItem(LAST_INDEX_KEY, String(next));
  } catch {
    /* ignore */
  }
}

function nextIndex(current: number, count: number): number {
  if (count <= 1) return 0;
  const safe = ((current % count) + count) % count;
  const next = (safe + 1) % count;
  rememberIndex(next);
  return next;
}

/** Welcome dashboard quote — centered serif on a rotating dark panel. No overlay. */
export default function AffirmationCenterPill() {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage ?? i18n.language;
  const libraryRev = useAppStore((s) => s.affirmationLibraryRev);
  const bumpAffirmationLibrary = useAppStore((s) => s.bumpAffirmationLibrary);
  const [customs, setCustoms] = useState<Affirmation[]>([]);
  const [favoriteRefs, setFavoriteRefs] = useState<FavoriteAffirmation[]>([]);
  const [index, setIndex] = useState(0);
  const [photo, setPhoto] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const pinnedKeyRef = useRef<string | null>(null);

  useEffect(() => {
    void Promise.all([customAffirmationsRepo.all(), favoriteAffirmationsRepo.all()]).then(
      ([customRows, favRows]) => {
        setCustoms(customRows.map(customToAffirmation));
        setFavoriteRefs(favRows);
      },
    );
  }, [libraryRev]);

  const pool = useMemo(
    () => buildAffirmationCyclePool(customs, favoriteRefs),
    [customs, favoriteRefs],
  );

  useEffect(() => {
    if (pool.length === 0) return;
    if (!pinnedKeyRef.current) {
      const next = pickIndex(pool.length);
      setIndex(next);
      pinnedKeyRef.current = affirmationRefKey(pool[next].source, pool[next].id);
      return;
    }
    const next = pool.findIndex(
      (row) => affirmationRefKey(row.source, row.id) === pinnedKeyRef.current,
    );
    if (next >= 0) {
      setIndex(next);
      rememberIndex(next);
    }
  }, [pool]);

  const applySelection = (row: Affirmation) => {
    pinnedKeyRef.current = affirmationRefKey(row.source, row.id);
    const next = pool.findIndex((item) => item.source === row.source && item.id === row.id);
    if (next >= 0) {
      setIndex(next);
      rememberIndex(next);
    }
    setLibraryOpen(false);
  };

  const card = pool[index] ?? BUILTIN_AFFIRMATIONS[0];
  const line = affirmationText(card, lang);
  const gradient = dashboardGradient(card.id);
  const seed = card.id;

  useEffect(() => {
    setPhoto(null);
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    let cancelled = false;
    const url = getAffirmationImageUrl(card.id, card.category);
    const img = new Image();
    img.onload = () => {
      if (!cancelled) setPhoto(url);
    };
    img.onerror = () => {
      /* keep the CSS gradient */
    };
    img.src = url;
    const nextRow = pool[(index + 1) % Math.max(pool.length, 1)];
    if (nextRow && nextRow.id !== card.id) {
      const preload = new Image();
      preload.src = getAffirmationImageUrl(nextRow.id, nextRow.category);
    }
    return () => {
      cancelled = true;
      img.onload = null;
      img.onerror = null;
    };
  }, [card.category, card.id, index, pool, seed]);

  useEffect(() => {
    let cancelled = false;
    void favoriteAffirmationsRepo.isFavorite(card.source, card.id).then((yes) => {
      if (!cancelled) setFavorited(yes);
    });
    return () => {
      cancelled = true;
    };
  }, [card.source, card.id, libraryRev]);

  const iconBtn =
    'relative z-[1] flex shrink-0 items-center justify-center self-center rounded-full p-1.5 text-white outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/50';

  return (
    <>
      <div
        data-affirmation-center-pill=""
        data-affirmation-bg={seed}
        data-affirmation-photo={photo ? 'ready' : 'fallback'}
        className="welcome-affirmation-panel relative flex w-full min-w-0 shrink-0 items-center overflow-hidden rounded-2xl px-3 py-[calc(0.625rem*1.597)] min-h-[calc(84.375px*1.597)] shadow-panel"
        style={{
          backgroundImage: photo
            ? `linear-gradient(180deg, rgba(8,12,18,0.38), rgba(8,12,18,0.58)), url(${photo})`
            : gradient,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <button
          type="button"
          className="absolute inset-0 z-0"
          aria-label={t('affirmationCenter.openCatalog', 'Browse affirmations')}
          data-affirmation-open-library=""
          onClick={() => setLibraryOpen(true)}
        />
        <div className="relative z-[1] flex shrink-0 flex-col items-center justify-center gap-1 self-center">
          <button
            type="button"
            className={iconBtn}
            aria-label={
              favorited
                ? t('affirmationCenter.unheart', 'Remove favorite')
                : t('affirmationCenter.heart', 'Favorite')
            }
            aria-pressed={favorited}
            data-affirmation-favorite=""
            data-favorited={favorited ? 'true' : 'false'}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              void favoriteAffirmationsRepo.toggle(card.source, card.id).then((yes) => {
                setFavorited(yes);
                bumpAffirmationLibrary();
              });
            }}
          >
            <Heart
              className={`h-[1.48rem] w-[1.48rem] drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] ${
                favorited
                  ? 'fill-rose-500 text-rose-500'
                  : 'fill-transparent stroke-white text-white'
              }`}
              strokeWidth={2.5}
            />
          </button>
          <button
            type="button"
            className={iconBtn}
            aria-label={t('affirmationCenter.openCatalog', 'Browse affirmations')}
            data-affirmation-catalog-icon=""
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              setLibraryOpen(true);
            }}
          >
            <BookHeart
              className="h-[1.48rem] w-[1.48rem] fill-white/40 stroke-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)] [&_path:last-child]:fill-none"
              stroke="currentColor"
              strokeWidth={2.25}
            />
          </button>
        </div>
        <div className="relative z-[1] flex min-w-0 flex-1 items-center justify-center pointer-events-none">
          <p
            className="pointer-events-auto cursor-default text-center font-display text-[calc(1.5rem*0.90)] font-normal leading-snug text-white/95 sm:text-[calc(1.85rem*0.90)]"
            onClick={(event) => event.stopPropagation()}
          >
            {line}
          </p>
        </div>
        <button
          type="button"
          className={iconBtn}
          aria-label={t('welcome.nextAffirmation', 'Next Affirmation')}
          data-affirmation-refresh=""
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIndex((current) => {
              const next = nextIndex(current, pool.length);
              const row = pool[next];
              if (row) pinnedKeyRef.current = affirmationRefKey(row.source, row.id);
              return next;
            });
          }}
        >
          <RefreshCw
            className="h-[1.48rem] w-[1.48rem] stroke-white text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]"
            strokeWidth={2.25}
          />
        </button>
      </div>
      <AffirmationLibraryModal
        open={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        current={card}
        onSelect={applySelection}
      />
    </>
  );
}
