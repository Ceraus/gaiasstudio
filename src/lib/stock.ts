// ---------------------------------------------------------------------------
// Free stock photo search — Unsplash + Pixabay.
//
// Both APIs are queried in parallel when both keys are configured; results
// are merged so the user sees the widest possible selection. Attribution
// links follow the Unsplash API guidelines (photographer + Unsplash credit,
// both with UTM parameters, plus a download-tracking ping when a photo is
// actually used). Pixabay does not require attribution but we show it anyway
// as a courtesy.
// ---------------------------------------------------------------------------

import type { AppSettings } from '@/types';

const APP_NAME = 'gaia-label-studio';

export interface StockPhoto {
  id: string;
  thumb: string;
  full: string;
  source: 'unsplash' | 'pixabay';
  photographerName: string;
  /** Link to the photographer's profile (Unsplash) — already carries UTM params. */
  photographerUrl: string;
  /** Link to the photo's page on the source site — already carries UTM params where applicable. */
  sourceUrl: string;
  /** Plain-text attribution, e.g. "Photo by Jane Doe on Unsplash" — for titles/alt text/asset names. */
  credit: string;
  /**
   * Unsplash-only: the `download_location` endpoint that must be pinged
   * (per Unsplash API guidelines) whenever the photo is actually used, not
   * just displayed as a search result thumbnail.
   */
  downloadLocation?: string;
}

/** Searches every configured source (Unsplash and/or Pixabay) and merges the results. */
export async function searchStock(query: string, settings: AppSettings): Promise<StockPhoto[]> {
  const tasks: Promise<StockPhoto[]>[] = [];
  if (settings.unsplashKey) tasks.push(searchUnsplash(query, settings.unsplashKey));
  if (settings.pixabayKey) tasks.push(searchPixabay(query, settings.pixabayKey));
  if (!tasks.length) return [];

  const outcomes = await Promise.allSettled(tasks);
  const photos: StockPhoto[] = [];
  const errors: string[] = [];
  for (const outcome of outcomes) {
    if (outcome.status === 'fulfilled') photos.push(...outcome.value);
    else errors.push(outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason));
  }
  // Only surface an error if every source failed — a partial success is still useful.
  if (!photos.length && errors.length) throw new Error(errors.join(' — '));
  return photos;
}

async function searchUnsplash(query: string, key: string): Promise<StockPhoto[]> {
  const url = `https://api.unsplash.com/search/photos?per_page=24&query=${encodeURIComponent(query)}`;
  let res: Response;
  try {
    res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  } catch {
    throw new Error('Unsplash: network error');
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('Unsplash: invalid API key');
    if (res.status === 403) throw new Error('Unsplash: rate limit exceeded');
    throw new Error(`Unsplash: error ${res.status}`);
  }
  const data = (await res.json()) as {
    results: {
      id: string;
      urls: { small: string; regular: string };
      links: { html: string; download_location: string };
      user: { name: string; links: { html: string } };
    }[];
  };
  return data.results.map((r) => ({
    id: r.id,
    thumb: r.urls.small,
    full: r.urls.regular,
    source: 'unsplash' as const,
    photographerName: r.user.name,
    photographerUrl: withUtm(r.user.links.html),
    sourceUrl: withUtm('https://unsplash.com/'),
    credit: `Photo by ${r.user.name} on Unsplash`,
    downloadLocation: r.links.download_location,
  }));
}

async function searchPixabay(query: string, key: string): Promise<StockPhoto[]> {
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(key)}&per_page=24&image_type=photo&safesearch=true&q=${encodeURIComponent(query)}`;
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
    hits: { id: number; webformatURL: string; largeImageURL: string; pageURL: string; user: string }[];
  };
  return data.hits.map((h) => ({
    id: String(h.id),
    thumb: h.webformatURL,
    full: h.largeImageURL,
    source: 'pixabay' as const,
    photographerName: h.user,
    photographerUrl: h.pageURL,
    sourceUrl: 'https://pixabay.com/',
    credit: `Image by ${h.user} on Pixabay`,
    downloadLocation: undefined,
  }));
}

function withUtm(href: string): string {
  const separator = href.includes('?') ? '&' : '?';
  return `${href}${separator}utm_source=${APP_NAME}&utm_medium=referral`;
}

/**
 * Per Unsplash's API guidelines, this must be pinged whenever a photo is
 * actually used (not merely displayed as a thumbnail in search results).
 * Fire-and-forget — a failure here shouldn't block the user's workflow.
 */
export function triggerUnsplashDownload(photo: StockPhoto, unsplashKey: string | undefined): void {
  if (photo.source !== 'unsplash' || !photo.downloadLocation || !unsplashKey) return;
  void fetch(photo.downloadLocation, { headers: { Authorization: `Client-ID ${unsplashKey}` } }).catch(() => {
    // Non-critical — the image is already in use, we just couldn't record the download ping.
  });
}

/** Fetches a stock photo's full-size image and returns it as a data URL, ready for the asset library. */
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
