// ---------------------------------------------------------------------------
// Free stock photo search — Unsplash + Pixabay.
//
// Unsplash production guidelines:
//   1. Hotlink photo.urls.* — never re-host the source image.
//   2. Ping photo.links.download_location when the user uses a photo.
//   3. Attribute "Photo by {name} on Unsplash" with both names linked + UTM.
// Pixabay does not require hotlinking; those images may be stored locally.
// ---------------------------------------------------------------------------

import type { AppSettings } from '@/types';

/** Must match the Unsplash application name (underscored). */
export const UNSPLASH_UTM_SOURCE = 'gaia_studio';

export interface StockPhoto {
  id: string;
  /** Hotlinked thumbnail (Unsplash: photo.urls.small). */
  thumb: string;
  /** Hotlinked embed URL (Unsplash: photo.urls.regular). */
  full: string;
  source: 'unsplash' | 'pixabay';
  photographerName: string;
  /** Photographer profile — already carries UTM params. */
  photographerUrl: string;
  /** Source homepage or photo page — already carries UTM params. */
  sourceUrl: string;
  /** "Photo by Jane Doe on Unsplash" — alt text, layer names. */
  credit: string;
  /**
   * Unsplash-only: photo.links.download_location.
   * Must be requested (with Client-ID) when the user uses the photo.
   */
  downloadLocation?: string;
}

export interface StockSearchResult {
  photos: StockPhoto[];
  warnings: string[];
  page: number;
  totalPages: number;
}

/** Turns a library name into a photo search (“Lavender Essential Oil” → “Lavender”). */
export function stockQueryForIngredient(name: string): string {
  const noise =
    /\b(melt\s*&\s*pour base|glycerin base|soap base|m&p base|essential oils?|fragrance oils?|carrier oils?|absolutes?|hydrosols?)\b/gi;
  const withoutParens = name.replace(/\s*\([^)]*\)/g, ' ').replace(/\s+/g, ' ').trim();
  const cleaned = withoutParens.replace(noise, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || withoutParens || name.trim();
}

/** Photos per request — divisible by 2/4/5 so rows fill on typical grid widths. */
export const STOCK_PER_PAGE = 20;

export function stockTotalPages(totalItems: number, perPage: number): number {
  if (perPage <= 0 || totalItems <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / perPage));
}

/** Searches every configured source (Unsplash and/or Pixabay) and merges the results. */
export async function searchStock(query: string, settings: AppSettings): Promise<StockPhoto[]> {
  return (await searchStockDetailed(query, settings)).photos;
}

export async function searchStockDetailed(
  query: string,
  settings: AppSettings,
  opts?: { page?: number; perPage?: number },
): Promise<StockSearchResult> {
  const page = Math.max(1, opts?.page ?? 1);
  const perPage = opts?.perPage ?? STOCK_PER_PAGE;
  const tasks: Promise<{ photos: StockPhoto[]; totalPages: number }>[] = [];
  if (settings.unsplashKey) tasks.push(searchUnsplash(query, settings.unsplashKey, page, perPage));
  if (settings.pixabayKey) tasks.push(searchPixabay(query, settings.pixabayKey, page, perPage));
  if (!tasks.length) return { photos: [], warnings: [], page, totalPages: 1 };

  const outcomes = await Promise.allSettled(tasks);
  const buckets: StockPhoto[][] = [];
  const warnings: string[] = [];
  let totalPages = 1;
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') {
      buckets.push(outcome.value.photos);
      totalPages = Math.max(totalPages, outcome.value.totalPages);
    } else {
      warnings.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
    }
  }
  const photos = interleavePhotos(buckets);
  if (!photos.length && warnings.length) throw new Error(warnings.join(' — '));
  return { photos, warnings, page, totalPages };
}

function interleavePhotos(buckets: StockPhoto[][]): StockPhoto[] {
  const photos: StockPhoto[] = [];
  const max = Math.max(0, ...buckets.map((b) => b.length));
  for (let i = 0; i < max; i++) {
    for (const bucket of buckets) {
      if (bucket[i]) photos.push(bucket[i]);
    }
  }
  return photos;
}

async function searchUnsplash(
  query: string,
  key: string,
  page: number,
  perPage: number,
): Promise<{ photos: StockPhoto[]; totalPages: number }> {
  const url = `https://api.unsplash.com/search/photos?page=${page}&per_page=${perPage}&query=${encodeURIComponent(query)}&client_id=${encodeURIComponent(key)}`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Client-ID ${key}`,
        'Accept-Version': 'v1',
      },
    });
  } catch {
    throw new Error('Unsplash: network error');
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unsplash: invalid API key');
    if (res.status === 403) throw new Error('Unsplash: rate limit exceeded');
    throw new Error(`Unsplash: error ${res.status}`);
  }
  const data = (await res.json()) as {
    total: number;
    total_pages: number;
    results: {
      id: string;
      urls: { small: string; regular: string };
      links: { html: string; download_location: string };
      user: { name: string; links: { html: string } };
    }[];
  };
  const photos = data.results.map((r) => ({
    id: r.id,
    thumb: r.urls.small,
    full: r.urls.regular,
    source: 'unsplash' as const,
    photographerName: r.user.name,
    photographerUrl: withUnsplashUtm(r.user.links.html),
    sourceUrl: withUnsplashUtm('https://unsplash.com/'),
    credit: `Photo by ${r.user.name} on Unsplash`,
    downloadLocation: r.links.download_location,
  }));
  return { photos, totalPages: Math.max(1, data.total_pages || stockTotalPages(data.total ?? photos.length, perPage)) };
}

async function searchPixabay(
  query: string,
  key: string,
  page: number,
  perPage: number,
): Promise<{ photos: StockPhoto[]; totalPages: number }> {
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&page=${page}&per_page=${perPage}&image_type=photo&safesearch=true&q=${encodeURIComponent(query)}`;
  let res: Response;
  try {
    res = await fetch(url);
  } catch {
    throw new Error('Pixabay: network error');
  }
  if (!res.ok) {
    if (res.status === 400 || res.status === 403) throw new Error('Pixabay: invalid API key');
    if (res.status === 429) throw new Error('Pixabay: rate limit exceeded');
    throw new Error(`Pixabay: error ${res.status}`);
  }
  const data = (await res.json()) as {
    totalHits: number;
    hits: { id: number; webformatURL: string; largeImageURL: string; pageURL: string; user: string }[];
  };
  const photos = data.hits.map((h) => ({
    id: String(h.id),
    thumb: h.webformatURL,
    full: h.largeImageURL,
    source: 'pixabay' as const,
    photographerName: h.user,
    photographerUrl: h.pageURL,
    sourceUrl: 'https://pixabay.com/',
    credit: `Photo by ${h.user} on Pixabay`,
    downloadLocation: undefined,
  }));
  return { photos, totalPages: stockTotalPages(data.totalHits ?? photos.length, perPage) };
}

export function withUnsplashUtm(href: string): string {
  const url = new URL(href);
  url.searchParams.set('utm_source', UNSPLASH_UTM_SOURCE);
  url.searchParams.set('utm_medium', 'referral');
  return url.toString();
}

/**
 * Per Unsplash's API guidelines, this must be pinged whenever a photo is
 * actually used (not merely displayed as a thumbnail in search results).
 * Fire-and-forget — a failure here shouldn't block the user's workflow.
 */
export function triggerUnsplashDownload(photo: StockPhoto, unsplashKey: string | undefined): void {
  if (photo.source !== 'unsplash' || !photo.downloadLocation || !unsplashKey) return;
  const ping = new URL(photo.downloadLocation);
  if (!ping.searchParams.get('client_id')) ping.searchParams.set('client_id', unsplashKey);
  void fetch(ping.toString(), {
    headers: { Authorization: `Client-ID ${unsplashKey}`, 'Accept-Version': 'v1' },
  }).catch(() => {
    // Non-critical — the image is already in use, we just couldn't record the download ping.
  });
}

/**
 * URL to show / place when the user chooses a photo.
 * Unsplash stays on images.unsplash.com (hotlink). Pixabay may be copied locally.
 */
export async function resolveStockUseUrl(photo: StockPhoto): Promise<string> {
  if (photo.source === 'unsplash') return photo.full;
  return fetchStockPhotoAsDataUrl(photo);
}

/** Fetches a non-Unsplash stock photo as a data URL for the local library. */
export async function fetchStockPhotoAsDataUrl(photo: StockPhoto): Promise<string> {
  const res = await fetch(photo.full);
  if (!res.ok) throw new Error(`Failed to download image (${res.status})`);
  const blob = await res.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read downloaded image'));
    reader.readAsDataURL(blob);
  });
}
