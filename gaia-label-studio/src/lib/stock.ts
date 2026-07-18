import type { AppSettings } from '@/types';

export interface StockPhoto {
  id: string;
  thumb: string;
  full: string;
  credit: string;
}

/** Searches Unsplash first (if a key is set), then Pixabay. Open-license images. */
export async function searchStock(query: string, settings: AppSettings): Promise<StockPhoto[]> {
  if (settings.unsplashKey) return searchUnsplash(query, settings.unsplashKey);
  if (settings.pixabayKey) return searchPixabay(query, settings.pixabayKey);
  return [];
}

async function searchUnsplash(query: string, key: string): Promise<StockPhoto[]> {
  const url = `https://api.unsplash.com/search/photos?per_page=24&query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Authorization: `Client-ID ${key}` } });
  if (!res.ok) throw new Error(`Unsplash ${res.status}`);
  const data = (await res.json()) as {
    results: { id: string; urls: { small: string; regular: string }; user: { name: string } }[];
  };
  return data.results.map((r) => ({
    id: r.id,
    thumb: r.urls.small,
    full: r.urls.regular,
    credit: `Photo by ${r.user.name} on Unsplash`,
  }));
}

async function searchPixabay(query: string, key: string): Promise<StockPhoto[]> {
  const url = `https://pixabay.com/api/?key=${key}&per_page=24&image_type=photo&q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay ${res.status}`);
  const data = (await res.json()) as {
    hits: { id: number; webformatURL: string; largeImageURL: string; user: string }[];
  };
  return data.hits.map((h) => ({
    id: String(h.id),
    thumb: h.webformatURL,
    full: h.largeImageURL,
    credit: `Image by ${h.user} on Pixabay`,
  }));
}
