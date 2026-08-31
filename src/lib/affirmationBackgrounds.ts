import type { AppSettings } from '@/types';
import type { AffirmationCategory } from '@/data/affirmations';

/** Serene CSS gradients — always available offline. */
export const AFFIRMATION_GRADIENTS: Record<AffirmationCategory, readonly string[]> = {
  focus: [
    'linear-gradient(165deg, #1e3a5f 0%, #2d5a4a 48%, #14241f 100%)',
    'linear-gradient(180deg, #243b55 0%, #141e30 100%)',
    'linear-gradient(145deg, #0f2a3a 0%, #1a4a5c 50%, #0a1820 100%)',
  ],
  esteem: [
    'linear-gradient(160deg, #4a3728 0%, #8b5e3c 45%, #2c1810 100%)',
    'linear-gradient(180deg, #5c3d2e 0%, #2a1a14 100%)',
    'linear-gradient(155deg, #3a2418 0%, #6e4a32 48%, #1c100c 100%)',
  ],
  forgive: [
    'linear-gradient(165deg, #3d2c4a 0%, #6b4c6e 50%, #1f1524 100%)',
    'linear-gradient(180deg, #4a3f55 0%, #221c28 100%)',
    'linear-gradient(150deg, #2e2438 0%, #5a4660 50%, #161018 100%)',
  ],
  hustle: [
    'linear-gradient(165deg, #3d2a18 0%, #8a5a2b 48%, #1f140c 100%)',
    'linear-gradient(180deg, #4a3218 0%, #1c120a 100%)',
    'linear-gradient(155deg, #2c1c10 0%, #6a4020 48%, #140e08 100%)',
  ],
  calm: [
    'linear-gradient(165deg, #1a3a3a 0%, #3d6b6b 50%, #0f2222 100%)',
    'linear-gradient(180deg, #2c4a4a 0%, #122020 100%)',
    'linear-gradient(160deg, #0e2a32 0%, #2a5a62 50%, #08181c 100%)',
  ],
  gratitude: [
    'linear-gradient(165deg, #2d4a28 0%, #6b8f4e 48%, #1a2614 100%)',
    'linear-gradient(180deg, #3a5528 0%, #161e10 100%)',
    'linear-gradient(150deg, #243818 0%, #5a7040 50%, #12180c 100%)',
  ],
  courage: [
    'linear-gradient(165deg, #1c2e4a 0%, #3d5a80 50%, #0e1724 100%)',
    'linear-gradient(180deg, #243656 0%, #101820 100%)',
    'linear-gradient(155deg, #142030 0%, #2e4a70 50%, #0a1018 100%)',
  ],
  rest: [
    'linear-gradient(165deg, #2a2438 0%, #4a3f5c 50%, #141018 100%)',
    'linear-gradient(180deg, #32283e 0%, #16121c 100%)',
    'linear-gradient(150deg, #1e1a28 0%, #3e3450 50%, #100c14 100%)',
  ],
  presence: [
    'linear-gradient(165deg, #163040 0%, #3a6870 50%, #0c1c22 100%)',
    'linear-gradient(180deg, #1c3844 0%, #101c24 100%)',
    'linear-gradient(155deg, #122830 0%, #2e5860 48%, #0a161a 100%)',
  ],
  boundaries: [
    'linear-gradient(165deg, #2a2030 0%, #4a3858 50%, #141018 100%)',
    'linear-gradient(180deg, #322438 0%, #18141e 100%)',
    'linear-gradient(150deg, #241c2c 0%, #463850 48%, #100c14 100%)',
  ],
};

/** Extra distinct moods for the welcome strip so each cycle looks different. */
export const DASHBOARD_GRADIENTS: readonly string[] = [
  'linear-gradient(165deg, #1a4a62 0%, #0e2a3c 42%, #08141c 100%)',
  'linear-gradient(160deg, #0f2a28 0%, #1e4a44 48%, #0a1816 100%)',
  'linear-gradient(170deg, #1c2e4a 0%, #243656 50%, #0e1724 100%)',
  'linear-gradient(155deg, #3d2a18 0%, #6a4020 48%, #1a1008 100%)',
  'linear-gradient(165deg, #2d4a28 0%, #4a6a38 50%, #141e10 100%)',
  'linear-gradient(180deg, #3d2c4a 0%, #2a1c32 100%)',
  'linear-gradient(145deg, #123848 0%, #2a6878 50%, #0c1c24 100%)',
  'linear-gradient(165deg, #4a3728 0%, #6e4a32 48%, #241810 100%)',
  'linear-gradient(160deg, #1a3a3a 0%, #2c5a5a 50%, #0f2222 100%)',
  'linear-gradient(170deg, #243040 0%, #3a5068 48%, #101820 100%)',
  'linear-gradient(155deg, #2a2438 0%, #4a3f5c 50%, #141018 100%)',
  'linear-gradient(165deg, #0c2438 0%, #1a4a5c 45%, #08141c 100%)',
  'linear-gradient(150deg, #2c1810 0%, #5c3d2e 50%, #1a100c 100%)',
  'linear-gradient(180deg, #163a52 0%, #0a1c28 100%)',
  'linear-gradient(160deg, #1e3a5f 0%, #2d5a4a 48%, #14241f 100%)',
  'linear-gradient(165deg, #32283e 0%, #1a1420 100%)',
  'linear-gradient(155deg, #0e2a32 0%, #245058 50%, #08181c 100%)',
  'linear-gradient(170deg, #3a2418 0%, #1c120c 100%)',
];

const FALLBACK_GRADIENT = DASHBOARD_GRADIENTS[0];

const NATURE_QUERIES: Record<AffirmationCategory, string> = {
  focus: 'misty pine forest calm',
  esteem: 'soft sunrise meadow',
  forgive: 'still lake reflection',
  hustle: 'warm morning workshop light',
  calm: 'foggy mountains serene',
  gratitude: 'wildflower field golden',
  courage: 'ocean horizon dawn',
  rest: 'soft clouds dusk',
  presence: 'calm water blue reflection',
  boundaries: 'quiet path forest dusk',
};

const photoCache = new Map<string, string>();

function hashSeed(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return Math.abs(hash);
}

export function gradientForAffirmation(
  category: AffirmationCategory | undefined,
  seed: string,
): string {
  const set = AFFIRMATION_GRADIENTS[category ?? 'calm'] ?? AFFIRMATION_GRADIENTS.calm;
  return set[hashSeed(seed) % set.length] ?? FALLBACK_GRADIENT;
}

export function dashboardGradient(seed: string): string {
  return DASHBOARD_GRADIENTS[hashSeed(seed) % DASHBOARD_GRADIENTS.length] ?? FALLBACK_GRADIENT;
}

function unsplashConfigured(settings: AppSettings): boolean {
  return Boolean(settings.unsplashKey?.trim());
}

/**
 * Optional calming Unsplash photo. Never required — returns null offline,
 * without a key, or on any network/API failure.
 * `seed` varies the page so each affirmation can get a different photo.
 */
export async function maybeFetchCalmPhoto(
  category: AffirmationCategory | undefined,
  settings: AppSettings,
  seed?: string,
): Promise<string | null> {
  const cacheKey = seed || category || 'calm';
  // Offline: never return a remote URL (even a cached one). The caller keeps the CSS gradient.
  if (typeof navigator !== 'undefined' && !navigator.onLine) return null;
  if (photoCache.has(cacheKey)) return photoCache.get(cacheKey) ?? null;
  if (!unsplashConfigured(settings)) return null;

  const accessKey = settings.unsplashKey!.trim();
  const query = NATURE_QUERIES[category ?? 'calm'] ?? NATURE_QUERIES.calm;
  const page = (hashSeed(cacheKey) % 8) + 1;
  const url =
    `https://api.unsplash.com/search/photos?page=${page}&per_page=1&orientation=landscape` +
    `&query=${encodeURIComponent(query)}&client_id=${encodeURIComponent(accessKey)}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Authorization: `Client-ID ${accessKey}`,
        'Accept-Version': 'v1',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: Array<{ urls?: { regular?: string } }> };
    const photo = data.results?.[0]?.urls?.regular ?? null;
    if (photo) photoCache.set(cacheKey, photo);
    return photo;
  } catch {
    return null;
  }
}
