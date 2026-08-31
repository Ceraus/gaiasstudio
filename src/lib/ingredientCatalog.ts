import type { IngredientCategory, IngredientSourceRef } from '@/types';
import { canonicalizeIngredientName } from '@/lib/ingredientResolution';
import { getIngredientBilingualNames } from '@/lib/ingredientI18n';
import offlineCatalogJson from '@/data/offlineIngredientCatalog.json';
import bundledPngSlugs from '@/data/bundledIngredientIconSlugs.json';
import { ingredientBlendComplexity, rankByQuery } from '@/lib/catalogSearchRank';

export { ingredientBlendComplexity, rankByQuery };

export type IngredientCatalogProvider = 'cosing' | 'openfoodfacts' | 'seed' | 'offline';

export interface OfflineIngredientCatalogEntry {
  name: string;
  /** Real Spanish common name from i18n / seed — never a machine dump of CosIng. */
  nameEs?: string;
  inci?: string;
  aliases?: string[];
  category?: IngredientCategory;
  iconKey?: string;
  /** `cosing` / `offline` are autocomplete+icon backlog only — never Dexie ingredients. */
  source: 'seed' | 'offline' | 'cosing';
}

export interface IngredientCatalogSuggestion {
  provider: IngredientCatalogProvider;
  sourceId: string;
  name: string;
  nameEs?: string;
  inci?: string;
  description?: string;
  category: IngredientCategory;
  aliases: string[];
  iconKey?: string;
  sourceRef: IngredientSourceRef;
}

export interface IngredientCatalogSearchResult {
  cosmetic: IngredientCatalogSuggestion[];
  food: IngredientCatalogSuggestion[];
  bundled: IngredientCatalogSuggestion[];
  errors: string[];
}

export const OFFLINE_INGREDIENT_CATALOG = offlineCatalogJson as OfflineIngredientCatalogEntry[];
const PNG_SLUGS = new Set(bundledPngSlugs as string[]);

const MAX_ICON_SLUG_LEN = 240;

function shortIconSlugHash(str: string): string {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function slugifyIngredientIconKey(value: string): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= MAX_ICON_SLUG_LEN) return slug;
  return `${slug.slice(0, MAX_ICON_SLUG_LEN - 9)}-${shortIconSlugHash(slug)}`;
}

export function catalogEntryKey(entry: Pick<OfflineIngredientCatalogEntry, 'name' | 'inci'>): string {
  return canonicalizeIngredientName(entry.inci?.trim() || entry.name);
}

/**
 * Filename slug for `/assets/icons/ingredients/{slug}.png`.
 * Same helper as `scripts/generateComfyIcons.mjs` (`slugify(iconKey || name)`).
 * Regenerated Comfy assets use `asset_*` keys and skip this path.
 */
export function ingredientIconFileSlug(name?: string, iconKey?: string): string | undefined {
  if (iconKey?.startsWith('asset_')) return undefined;
  const candidates = [
    iconKey ? slugifyIngredientIconKey(iconKey) : '',
    name ? slugifyIngredientIconKey(name) : '',
  ].filter(Boolean);
  return candidates[0] || undefined;
}

/** PNG filename slug if a bundled Comfy icon exists for this name or iconKey. */
export function resolveBundledIngredientPngSlug(name?: string, iconKey?: string): string | undefined {
  const candidates = [
    iconKey && !iconKey.startsWith('asset_') ? slugifyIngredientIconKey(iconKey) : '',
    name ? slugifyIngredientIconKey(name) : '',
  ].filter(Boolean);
  return candidates.find((key) => PNG_SLUGS.has(key));
}

export function findOfflineIngredientCatalogEntry(name: string): OfflineIngredientCatalogEntry | undefined {
  const key = canonicalizeIngredientName(name);
  if (!key) return undefined;
  return OFFLINE_INGREDIENT_CATALOG.find((entry) =>
    canonicalizeIngredientName(entry.name) === key
    || suggestionIdentityKeys(entry).includes(key),
  );
}

/** How many backlog rows have a real Spanish common name (not INCI repeated). */
export function countDistinctSpanishCatalogNames(
  catalog: OfflineIngredientCatalogEntry[] = OFFLINE_INGREDIENT_CATALOG,
): number {
  return catalog.filter((entry) => {
    if (!entry.nameEs) return false;
    return canonicalizeIngredientName(entry.nameEs) !== canonicalizeIngredientName(entry.name);
  }).length;
}

/** Bundled names vs how many of those names have a generated PNG on disk. */
export function getOfflineIngredientIconStats(): {
  names: number;
  icons: number;
  stored: boolean;
  included: boolean;
  available: boolean;
} {
  const names = OFFLINE_INGREDIENT_CATALOG.length;
  const icons = OFFLINE_INGREDIENT_CATALOG.filter((entry) =>
    !!resolveBundledIngredientPngSlug(entry.name, entry.iconKey),
  ).length;
  return {
    names,
    icons,
    stored: names > 0,
    included: names > 0,
    available: names > 0,
  };
}

const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; value: IngredientCatalogSearchResult }>();

interface ElectronFetchApi {
  fetchUrl?: (url: string) => Promise<{ ok: boolean; status: number; text: string }>;
}

function electronFetchApi(): ElectronFetchApi | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronAPI?: ElectronFetchApi }).electronAPI ?? null;
}

async function fetchCosingJson(url: URL, signal?: AbortSignal): Promise<unknown> {
  const bridge = electronFetchApi();
  if (bridge?.fetchUrl) {
    if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
    const response = await bridge.fetchUrl(url.toString());
    if (!response.ok) throw new Error(`CosIng search returned ${response.status}`);
    return JSON.parse(response.text) as unknown;
  }
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`CosIng search returned ${response.status}`);
  return response.json();
}

function titleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b[a-z]/g, (char) => char.toUpperCase())
    .replace(/\bCi (\d+)/g, 'CI $1');
}

export function inferCategory(value: string, functions = ''): IngredientCategory {
  const text = `${value} ${functions}`.toLowerCase();
  if (/essential oil|volatile oil/.test(text)) return 'essential-oil';
  if (/\boil\b|emollient/.test(text)) return 'oil';
  if (/\bbutter\b/.test(text)) return 'butter';
  if (/\bwax\b/.test(text)) return 'wax';
  if (/clay|kaolin|bentonite/.test(text)) return 'clay';
  if (/fragrance|perfuming/.test(text)) return 'fragrance';
  if (/color|colour|mica|pigment|ci \d/.test(text)) return 'colorant';
  if (/flower|floral/.test(text)) return 'floral';
  if (/citrus|lemon|orange|lime|grapefruit/.test(text)) return 'citrus';
  if (/milk|lactis|lac\b/.test(text)) return 'milk';
  if (/seed/.test(text)) return 'seed';
  if (/powder|scrub|exfoli/.test(text)) return 'exfoliant';
  if (/extract|leaf|root|herb|botanical|fruit/.test(text)) return 'botanical';
  if (/soap base|sodium cocoate|surfactant|cleansing/.test(text)) return 'base';
  return 'additive';
}

function entrySearchFields(entry: OfflineIngredientCatalogEntry): string[] {
  const bilingual = getIngredientBilingualNames(entry);
  return [
    entry.name,
    bilingual.en,
    bilingual.es,
    entry.nameEs ?? '',
    entry.inci ?? '',
    ...(entry.aliases ?? []),
  ].filter(Boolean);
}

function entrySearchBlob(entry: OfflineIngredientCatalogEntry): string {
  return entrySearchFields(entry).join(' ').toLowerCase();
}

function catalogMatchesQuery(entry: OfflineIngredientCatalogEntry, query: string): boolean {
  const raw = query.trim().toLowerCase();
  if (!raw) return false;
  const key = canonicalizeIngredientName(query);
  if (entrySearchBlob(entry).includes(raw)) return true;
  if (!key) return false;
  return entrySearchFields(entry).some((field) => {
    const canonical = canonicalizeIngredientName(field);
    return canonical === key || canonical.startsWith(key) || canonical.includes(key);
  });
}

/**
 * CosIng composite ferment/blend INCIs — nested slashes like
 * `Saccharomyces/((Clove/Lavender) Flower/... Ferment Extract`.
 * Hide these from catalog search; they are not a single recipe ingredient.
 */
export function isCompositeCatalogIngredient(name: string, inci?: string): boolean {
  const text = [name, inci].filter(Boolean).join(' ');
  if (!text.trim()) return false;
  if (/\(\(/.test(text)) return true;
  const slashes = (text.match(/\//g) ?? []).length;
  if (slashes >= 3) return true;
  if (/ferment extract/i.test(text) && slashes >= 1) return true;
  return text.length >= 80 && slashes >= 2;
}

export function suggestionIdentityKeys(suggestion: Pick<IngredientCatalogSuggestion, 'name' | 'inci'> & { aliases?: string[] }): string[] {
  return [
    canonicalizeIngredientName(suggestion.inci?.trim() || suggestion.name),
    canonicalizeIngredientName(suggestion.name),
    ...(suggestion.aliases ?? []).map((alias) => canonicalizeIngredientName(alias)),
  ].filter(Boolean);
}

function toOfflineSuggestion(entry: OfflineIngredientCatalogEntry): IngredientCatalogSuggestion {
  const id = catalogEntryKey(entry) || slugifyIngredientIconKey(entry.name);
  const bilingual = getIngredientBilingualNames(entry);
  return {
    provider: entry.source,
    sourceId: id,
    name: entry.name,
    nameEs: bilingual.es,
    inci: entry.inci,
    category: entry.category ?? 'additive',
    aliases: entry.aliases ?? [],
    iconKey: ingredientIconFileSlug(entry.name, entry.iconKey) ?? entry.iconKey,
    sourceRef: {
      provider: entry.source,
      id,
    },
  };
}

export function searchOfflineIngredientCatalog(
  rawQuery: string,
  options: { excludeKeys?: Iterable<string>; limit?: number } = {},
): IngredientCatalogSuggestion[] {
  const query = rawQuery.trim();
  if (!query) return [];
  const exclude = new Set(
    [...(options.excludeKeys ?? [])].map((key) => canonicalizeIngredientName(key)).filter(Boolean),
  );
  const matches = OFFLINE_INGREDIENT_CATALOG.filter((entry) => {
    if (isCompositeCatalogIngredient(entry.name, entry.inci)) return false;
    if (!catalogMatchesQuery(entry, query)) return false;
    if (!exclude.size) return true;
    return !suggestionIdentityKeys(entry).some((key) => exclude.has(key));
  });
  return rankByQuery(matches, query).slice(0, options.limit ?? 24).map(toOfflineSuggestion);
}

async function searchCosing(query: string, signal?: AbortSignal): Promise<IngredientCatalogSuggestion[]> {
  const url = new URL('https://cosingchecker.com/api/v1/ingredients/');
  url.searchParams.set('q', query);
  url.searchParams.set('per_page', '24');
  const data = await fetchCosingJson(url, signal) as {
    results?: Array<{
      ref_number?: string;
      slug?: string;
      inci_name?: string;
      description?: string;
      function?: string;
    }>;
  };
  return rankByQuery(
    (data.results ?? []).filter((row) => {
      const inci = String(row.inci_name ?? '').trim();
      return !!inci && !isCompositeCatalogIngredient(inci, inci);
    }).map((row) => {
      const inci = String(row.inci_name).trim();
      const id = String(row.ref_number || row.slug || canonicalizeIngredientName(inci));
      const name = titleCase(inci);
      const bilingual = getIngredientBilingualNames({ name, inci });
      return {
        provider: 'cosing' as const,
        sourceId: id,
        name,
        nameEs: bilingual.es,
        inci,
        description: row.function || row.description,
        category: inferCategory(inci, row.function),
        aliases: [],
        iconKey: ingredientIconFileSlug(name) ?? ingredientIconFileSlug(inci),
        sourceRef: {
          provider: 'cosing' as const,
          id,
          url: row.slug ? `https://cosingchecker.com/ingredients/${row.slug}/` : undefined,
        },
      };
    }),
    query,
  ).slice(0, 8);
}

async function searchOpenFoodFacts(query: string, signal?: AbortSignal): Promise<IngredientCatalogSuggestion[]> {
  const url = new URL('https://world.openfoodfacts.org/api/v3/taxonomy_suggestions');
  url.searchParams.set('tagtype', 'ingredients');
  url.searchParams.set('lc', 'en');
  url.searchParams.set('string', query);
  url.searchParams.set('limit', '8');
  url.searchParams.set('get_synonyms', '1');
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Food ingredient search returned ${response.status}`);
  const data = await response.json() as {
    suggestions?: string[];
    matched_synonyms?: Record<string, string>;
  };
  const synonyms = data.matched_synonyms ?? {};
  return rankByQuery(
    (data.suggestions ?? [])
      .filter((raw) => !isCompositeCatalogIngredient(raw))
      .map((raw) => {
        const id = canonicalizeIngredientName(raw);
        const alias = synonyms[raw];
        const name = titleCase(raw);
        const bilingual = getIngredientBilingualNames({
          name,
          aliases: alias ? [alias] : [],
        });
        return {
          provider: 'openfoodfacts' as const,
          sourceId: id,
          name,
          nameEs: bilingual.es,
          category: inferCategory(raw),
          aliases: alias && canonicalizeIngredientName(alias) !== id ? [alias] : [],
          iconKey: ingredientIconFileSlug(name),
          sourceRef: {
            provider: 'openfoodfacts' as const,
            id,
            url: `https://world.openfoodfacts.org/ingredient/${encodeURIComponent(raw)}`,
          },
        };
      }),
    query,
  ).slice(0, 8);
}

export async function searchOnlineIngredientCatalogs(
  rawQuery: string,
  signal?: AbortSignal,
): Promise<IngredientCatalogSearchResult> {
  const query = rawQuery.trim();
  if (query.length < 2) return { cosmetic: [], food: [], bundled: [], errors: [] };
  const key = canonicalizeIngredientName(query);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const [cosmetic, food] = await Promise.allSettled([
    searchCosing(query, signal),
    searchOpenFoodFacts(query, signal),
  ]);
  if (signal?.aborted) throw new DOMException('Search cancelled', 'AbortError');
  const value: IngredientCatalogSearchResult = {
    cosmetic: cosmetic.status === 'fulfilled' ? cosmetic.value : [],
    food: food.status === 'fulfilled' ? food.value : [],
    bundled: [],
    errors: [
      ...(cosmetic.status === 'rejected' ? [String(cosmetic.reason)] : []),
      ...(food.status === 'rejected' ? [String(food.reason)] : []),
    ],
  };
  cache.set(key, { at: Date.now(), value });
  return value;
}
