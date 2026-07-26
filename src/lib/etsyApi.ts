// ---------------------------------------------------------------------------
// Etsy Open API v3 client (OAuth2 PKCE).
// Add credentials in Settings → Etsy; sync works once OAuth is complete.
// Reference: https://developers.etsy.com/documentation/
// ---------------------------------------------------------------------------

import type { EtsyListing, EtsyShopConfig, EtsySyncLog, Recipe } from '@/types';
import { db } from '@/db/db';
import { recipesRepo, workOrdersRepo } from '@/db/repositories';
import { getOAuthRedirectUri } from '@/lib/pwa';
import { uid } from '@/lib/id';

const ETSY_API = 'https://openapi.etsy.com/v3/application';
const ETSY_TOKEN = 'https://api.etsy.com/v3/public/oauth/token';
/** Bar soap taxonomy — handmade cosmetics. */
const SOAP_TAXONOMY_ID = 499;

const PKCE_VERIFIER_KEY = 'gaia-etsy-pkce-verifier';
const PKCE_STATE_KEY = 'gaia-etsy-oauth-state';

export function storePkceVerifier(verifier: string, state: string): void {
  sessionStorage.setItem(PKCE_VERIFIER_KEY, verifier);
  sessionStorage.setItem(PKCE_STATE_KEY, state);
}

export function consumePkceVerifier(expectedState?: string): string | null {
  const verifier = sessionStorage.getItem(PKCE_VERIFIER_KEY);
  const state = sessionStorage.getItem(PKCE_STATE_KEY);
  sessionStorage.removeItem(PKCE_VERIFIER_KEY);
  sessionStorage.removeItem(PKCE_STATE_KEY);
  if (!verifier) return null;
  if (expectedState && state && state !== expectedState) return null;
  return verifier;
}

// ---------------------------------------------------------------------------
// Connection status helpers
// ---------------------------------------------------------------------------

export function isEtsyConnected(config?: EtsyShopConfig): boolean {
  return !!(config?.apiKey && config?.shopId && config?.accessToken);
}

export function isEtsyConfigured(config?: EtsyShopConfig): boolean {
  return !!(config?.apiKey);
}

export type EtsyConnectionStatus = 'disconnected' | 'configured' | 'connected' | 'expired';

export function getConnectionStatus(config?: EtsyShopConfig): EtsyConnectionStatus {
  if (!config?.apiKey) return 'disconnected';
  if (!config.accessToken) return 'configured';
  if (config.tokenExpiresAt && config.tokenExpiresAt < Date.now()) return 'expired';
  return 'connected';
}

// ---------------------------------------------------------------------------
// OAuth2 PKCE flow helpers (for when API key is provided)
// ---------------------------------------------------------------------------

/** Generate a PKCE code verifier (43-128 chars, RFC 7636). */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** SHA-256 hash a string and return Base64url. */
async function sha256(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Generate the PKCE code challenge from a verifier. */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  return sha256(verifier);
}

/**
 * Build the Etsy OAuth2 authorization URL.
 * The user navigates here to grant access; Etsy redirects back with a code.
 */
export function buildAuthUrl(config: EtsyShopConfig, redirectUri: string, codeChallenge: string, state: string): string | null {
  if (!config.apiKey) return null;
  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'listings_r listings_w transactions_r shops_r',
    client_id: config.apiKey,
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}

/** Begin OAuth — generates PKCE verifier and returns the Etsy authorize URL. */
export async function startEtsyConnect(config: EtsyShopConfig): Promise<string | null> {
  if (!config.apiKey) return null;
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  const state = uid();
  storePkceVerifier(verifier, state);
  const redirectUri = getOAuthRedirectUri();
  const params = new URLSearchParams({
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'listings_r listings_w transactions_r shops_r',
    client_id: config.apiKey,
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  return `https://www.etsy.com/oauth/connect?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
};

/** Exchange authorization code for access + refresh tokens. */
export async function exchangeAuthCode(
  config: EtsyShopConfig,
  code: string,
  codeVerifier: string,
  redirectUri = getOAuthRedirectUri(),
): Promise<EtsyShopConfig> {
  if (!config.apiKey) throw new Error('Etsy API key is missing.');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.apiKey,
    redirect_uri: redirectUri,
    code,
    code_verifier: codeVerifier,
  });
  const res = await fetch(ETSY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Etsy token exchange failed: ${err}`);
  }
  const data = (await res.json()) as TokenResponse;
  return {
    ...config,
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    tokenExpiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function refreshAccessToken(config: EtsyShopConfig): Promise<EtsyShopConfig> {
  if (!config.apiKey || !config.refreshToken) throw new Error('Cannot refresh — not connected.');
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: config.apiKey,
    refresh_token: config.refreshToken,
  });
  const res = await fetch(ETSY_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error('Etsy token refresh failed — reconnect in Settings.');
  const data = (await res.json()) as TokenResponse;
  return {
    ...config,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? config.refreshToken,
    tokenExpiresAt: Date.now() + data.expires_in * 1000,
  };
}

async function ensureFreshConfig(config: EtsyShopConfig): Promise<EtsyShopConfig> {
  if (!config.accessToken) return config;
  if (config.tokenExpiresAt && config.tokenExpiresAt > Date.now() + 60_000) return config;
  return refreshAccessToken(config);
}

async function etsyFetch<T>(
  config: EtsyShopConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const fresh = await ensureFreshConfig(config);
  if (!fresh.apiKey || !fresh.accessToken) {
    throw new Error('Etsy is not connected.');
  }
  const res = await fetch(`${ETSY_API}${path}`, {
    ...init,
    headers: {
      'x-api-key': fresh.apiKey,
      Authorization: `Bearer ${fresh.accessToken}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Etsy API error (${res.status}): ${err}`);
  }
  return res.json() as Promise<T>;
}

/** Match an Etsy listing title to a local soap recipe by name. */
export function matchRecipeByListingTitle(title: string, recipes: Recipe[]): Recipe | undefined {
  const normalized = title
    .replace(/\s*[—–-]\s*handcrafted artisan soap.*/i, '')
    .replace(/\s+by\s+.+$/i, '')
    .trim()
    .toLowerCase();
  return recipes.find((r) => r.name.trim().toLowerCase() === normalized)
    ?? recipes.find((r) => normalized.includes(r.name.trim().toLowerCase()));
}

// ---------------------------------------------------------------------------
// Listing helpers — build Etsy-ready data from local recipes
// ---------------------------------------------------------------------------

/**
 * Build an Etsy listing title + description from a Recipe.
 * Follows Etsy's best practices for handmade soap listings.
 */
export function buildListingFromRecipe(
  recipe: Recipe,
  ingredientNames: string[],
  businessName?: string,
): { title: string; description: string; tags: string[] } {
  const title = `${recipe.name} — Handcrafted Artisan Soap${businessName ? ` by ${businessName}` : ''}`;

  const descParts: string[] = [];
  descParts.push(`✨ ${recipe.name}`);
  if (recipe.benefit) descParts.push(`\n${recipe.benefit}`);
  descParts.push('\n🧼 Ingredients:');
  descParts.push(ingredientNames.join(', '));
  if (recipe.netWeight) descParts.push(`\n📦 Net Weight: ${recipe.netWeight}`);
  if (recipe.directions) descParts.push(`\n📝 Directions: ${recipe.directions}`);
  if (recipe.warnings) descParts.push(`\n⚠️ ${recipe.warnings}`);
  if (businessName) descParts.push(`\n\n🌿 Handcrafted with love by ${businessName}`);

  const tags: string[] = ['handmade soap', 'artisan soap', 'natural soap'];
  if (recipe.name.toLowerCase().includes('lavender')) tags.push('lavender soap');
  if (recipe.name.toLowerCase().includes('oat')) tags.push('oatmeal soap');
  if (recipe.benefit) {
    const benefit = recipe.benefit.toLowerCase();
    if (benefit.includes('moistur')) tags.push('moisturizing soap');
    if (benefit.includes('sensitive')) tags.push('sensitive skin');
    if (benefit.includes('exfoliat')) tags.push('exfoliating soap');
  }

  return { title, description: descParts.join('\n'), tags: tags.slice(0, 13) };
}

// ---------------------------------------------------------------------------
// Local CRUD — manage EtsyListing records in the local database
// ---------------------------------------------------------------------------

export const etsyListingsRepo = {
  all: () => db.etsyListings.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.etsyListings.get(id),
  byRecipe: (recipeId: string) =>
    db.etsyListings.where('recipeId').equals(recipeId).first(),

  async create(input: Omit<EtsyListing, 'id' | 'createdAt' | 'updatedAt'>): Promise<EtsyListing> {
    const now = Date.now();
    const rec: EtsyListing = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.etsyListings.add(rec);
    return rec;
  },

  async update(id: string, patch: Partial<EtsyListing>) {
    await db.etsyListings.update(id, { ...patch, updatedAt: Date.now() });
  },

  remove: (id: string) => db.etsyListings.delete(id),

  /** Count listings by state. */
  async stats() {
    const all = await db.etsyListings.toArray();
    return {
      total: all.length,
      active: all.filter((l) => l.state === 'active').length,
      draft: all.filter((l) => l.state === 'draft').length,
      inactive: all.filter((l) => l.state === 'inactive').length,
    };
  },
};

// ---------------------------------------------------------------------------
// Sync log — records push/pull history
// ---------------------------------------------------------------------------

export const etsySyncLogsRepo = {
  all: () => db.etsySyncLogs.orderBy('timestamp').reverse().toArray(),
  recent: (limit = 10) =>
    db.etsySyncLogs.orderBy('timestamp').reverse().limit(limit).toArray(),

  async log(entry: Omit<EtsySyncLog, 'id'>): Promise<EtsySyncLog> {
    const rec: EtsySyncLog = { ...entry, id: uid() };
    await db.etsySyncLogs.add(rec);
    return rec;
  },
};

// ---------------------------------------------------------------------------
// Push / Pull stubs — these become real when the API key is configured.
// Each method checks connection status and returns a typed result so the
// UI can handle both connected and disconnected states gracefully.
// ---------------------------------------------------------------------------

export type SyncResult = {
  success: boolean;
  message: string;
  listingsCreated?: number;
  listingsUpdated?: number;
  ordersImported?: number;
  errors?: string[];
};

/**
 * Push a local listing to Etsy. Creates or updates depending on etsyListingId.
 */
export async function pushListingToEtsy(
  listing: EtsyListing,
  config?: EtsyShopConfig,
): Promise<SyncResult> {
  const status = getConnectionStatus(config);
  if (status !== 'connected' || !config?.shopId) {
    return {
      success: false,
      message: status === 'disconnected'
        ? 'Etsy is not configured. Add your API key in Settings → Etsy.'
        : status === 'expired'
          ? 'Your Etsy session has expired. Please reconnect in Settings → Etsy.'
          : config?.shopId
            ? 'Etsy is configured but not connected. Complete the OAuth flow in Settings → Etsy.'
            : 'Add your Etsy Shop ID in Settings → Etsy.',
    };
  }

  try {
    const priceCents = Math.round(listing.price * 100);
    let etsyListingId = listing.etsyListingId;
    let created = 0;
    let updated = 0;

    if (etsyListingId) {
      await etsyFetch(config, `/shops/${config.shopId}/listings/${etsyListingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: listing.title,
          description: listing.description,
          price: priceCents / 100,
          quantity: listing.quantity,
          tags: listing.tags,
          state: listing.state === 'active' ? 'active' : 'draft',
        }),
      });
      updated = 1;
    } else {
      const result = await etsyFetch<{ listing_id: number; url?: string }>(
        config,
        `/shops/${config.shopId}/listings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quantity: listing.quantity,
            title: listing.title,
            description: listing.description,
            price: priceCents / 100,
            who_made: 'i_did',
            when_made: 'made_to_order',
            taxonomy_id: SOAP_TAXONOMY_ID,
            tags: listing.tags,
            type: 'physical',
            state: listing.state === 'active' ? 'active' : 'draft',
          }),
        },
      );
      etsyListingId = String(result.listing_id);
      created = 1;
      await etsyListingsRepo.update(listing.id, {
        etsyListingId,
        etsyUrl: result.url ?? `https://www.etsy.com/listing/${etsyListingId}`,
        state: listing.state === 'draft' ? 'draft' : 'active',
        lastSyncedAt: Date.now(),
      });
    }

    if (updated) {
      await etsyListingsRepo.update(listing.id, { lastSyncedAt: Date.now() });
    }

    await etsySyncLogsRepo.log({
      direction: 'push',
      entity: 'listings',
      listingsCreated: created,
      listingsUpdated: updated,
      ordersImported: 0,
      errors: [],
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: `"${listing.title}" ${created ? 'pushed' : 'updated'} on Etsy.`,
      listingsCreated: created,
      listingsUpdated: updated,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await etsySyncLogsRepo.log({
      direction: 'push',
      entity: 'listings',
      listingsCreated: 0,
      listingsUpdated: 0,
      ordersImported: 0,
      errors: [msg],
      timestamp: Date.now(),
    });
    return { success: false, message: msg, errors: [msg] };
  }
}

/**
 * Pull recent Etsy orders and create Work Orders (matched to soap recipes by title).
 */
export async function pullEtsyOrders(
  config?: EtsyShopConfig,
): Promise<SyncResult> {
  const status = getConnectionStatus(config);
  if (status !== 'connected' || !config?.shopId) {
    return {
      success: false,
      message: status === 'disconnected'
        ? 'Etsy is not configured. Add your API key in Settings → Etsy.'
        : 'Etsy is not connected. Complete setup in Settings → Etsy.',
    };
  }

  try {
    type EtsyReceipt = {
      receipt_id: number;
      name: string;
      buyer_email?: string;
      transactions?: Array<{
        title: string;
        quantity: number;
        price: { amount: number; divisor: number };
        listing_id: number;
      }>;
    };

    const data = await etsyFetch<{ results: EtsyReceipt[] }>(
      config,
      `/shops/${config.shopId}/receipts?was_paid=true&limit=25`,
    );

    const recipes = await recipesRepo.all();
    const existingOrders = await workOrdersRepo.all();
    const importedReceiptIds = new Set(
      existingOrders
        .map((o) => /Etsy receipt (\d+)/.exec(o.notes ?? '')?.[1])
        .filter(Boolean),
    );

    let imported = 0;
    const errors: string[] = [];

    for (const receipt of data.results ?? []) {
      const receiptKey = String(receipt.receipt_id);
      if (importedReceiptIds.has(receiptKey)) continue;

      const items = (receipt.transactions ?? [])
        .map((tx) => {
          const recipe = matchRecipeByListingTitle(tx.title, recipes);
          if (!recipe) {
            errors.push(`No matching soap recipe for "${tx.title}"`);
            return null;
          }
          const unitPrice = tx.price.amount / tx.price.divisor;
          return {
            recipeId: recipe.id,
            recipeName: recipe.name,
            quantity: tx.quantity,
            unitPrice,
          };
        })
        .filter((i): i is NonNullable<typeof i> => i !== null);

      if (items.length === 0) continue;

      await workOrdersRepo.create({
        clientName: receipt.name?.trim() || 'Etsy Customer',
        notes: `Etsy receipt ${receiptKey}${receipt.buyer_email ? ` · ${receipt.buyer_email}` : ''}`,
        items,
      });
      imported++;
    }

    await etsySyncLogsRepo.log({
      direction: 'pull',
      entity: 'orders',
      listingsCreated: 0,
      listingsUpdated: 0,
      ordersImported: imported,
      errors,
      timestamp: Date.now(),
    });

    return {
      success: true,
      message: imported
        ? `Imported ${imported} Etsy order${imported === 1 ? '' : 's'}.`
        : 'No new Etsy orders found.',
      ordersImported: imported,
      errors: errors.length ? errors : undefined,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg, errors: [msg] };
  }
}

/**
 * Full sync: push all active listings, then pull recent orders.
 */
export async function fullEtsySync(config?: EtsyShopConfig): Promise<SyncResult> {
  const status = getConnectionStatus(config);
  if (status !== 'connected') {
    return {
      success: false,
      message: 'Etsy is not connected. Complete setup in Settings → Etsy.',
    };
  }

  const listings = await db.etsyListings.where('state').equals('active').toArray();
  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const listing of listings) {
    const result = await pushListingToEtsy(listing, config);
    if (result.success) {
      created += result.listingsCreated ?? 0;
      updated += result.listingsUpdated ?? 0;
    } else {
      errors.push(result.message);
    }
  }

  const orderResult = await pullEtsyOrders(config);

  return {
    success: errors.length === 0,
    message: `Synced ${created + updated} listings, imported ${orderResult.ordersImported ?? 0} orders.`,
    listingsCreated: created,
    listingsUpdated: updated,
    ordersImported: orderResult.ordersImported,
    errors,
  };
}
