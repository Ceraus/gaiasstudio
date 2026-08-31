import { buildBackup, restoreBackup, type BackupFile } from '@/lib/backup';
import { db } from '@/db/db';
import type { AppSettings } from '@/types';

/**
 * Hostinger / website cloud sync is gated off until it can be re-implemented.
 * Keep the functions below; flip this to true to restore Settings + boot sync.
 */
export const CLOUD_SYNC_AVAILABLE = false;

function cloudSyncUnavailable(): CloudSyncResult {
  return {
    status: 'disabled',
    message: 'Cloud sync is turned off until it can be re-implemented.',
  };
}

export interface CloudSyncMeta {
  exportedAt: string | null;
  size: number;
}

export type CloudSyncStatus =
  | 'disabled'
  | 'in_sync'
  | 'pushed'
  | 'pulled'
  | 'remote_newer'
  | 'sync_conflict'
  | 'error';

export interface CloudSyncResult {
  status: CloudSyncStatus;
  message?: string;
  remoteExportedAt?: string | null;
}

function normalizeSyncUrl(raw: string): string {
  const trimmed = raw.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (!/^https:\/\//i.test(trimmed)) return '';
  try {
    const u = new URL(trimmed);
    if (u.protocol !== 'https:') return '';
    return u.toString().replace(/\/+$/, '');
  } catch {
    return '';
  }
}

function syncHeaders(token: string): HeadersInit {
  return {
    'X-Gaia-Sync-Token': token,
    'Content-Type': 'application/json',
  };
}

/** Latest change time across recipes, drafts, and versions. */
export async function getLocalDataTimestamp(): Promise<number> {
  const [recipe, draft, version] = await Promise.all([
    db.recipes.orderBy('updatedAt').reverse().first(),
    db.drafts.orderBy('updatedAt').reverse().first(),
    db.versions.orderBy('createdAt').reverse().first(),
  ]);
  return Math.max(recipe?.updatedAt ?? 0, draft?.updatedAt ?? 0, version?.createdAt ?? 0);
}

export async function fetchCloudSyncMeta(settings: AppSettings): Promise<CloudSyncMeta | null> {
  if (!CLOUD_SYNC_AVAILABLE) return null;
  const url = normalizeSyncUrl(settings.cloudSyncUrl ?? '');
  const token = settings.cloudSyncToken?.trim() ?? '';
  if (!settings.cloudSyncEnabled || !url || !token) return null;

  const res = await fetch(`${url}?meta=1`, {
    method: 'GET',
    headers: syncHeaders(token),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as CloudSyncMeta & { lastModified?: string };
  const exportedAt = data.exportedAt ?? data.lastModified ?? null;
  return {
    exportedAt,
    size: Number(data.size ?? 0),
  };
}

/**
 * Returns a conflict result when the cloud has data newer than this device's
 * last successful pull — pushing would overwrite changes Rosa never received.
 */
export async function detectSyncConflict(settings: AppSettings): Promise<CloudSyncResult | null> {
  if (!CLOUD_SYNC_AVAILABLE) return null;
  const meta = await fetchCloudSyncMeta(settings);
  if (!meta?.exportedAt) return null;

  const remoteTs = Date.parse(meta.exportedAt);
  if (!Number.isFinite(remoteTs)) return null;

  const lastPulled = settings.cloudSyncLastPulledAt
    ? Date.parse(settings.cloudSyncLastPulledAt)
    : 0;

  if (remoteTs > lastPulled + 2000) {
    return {
      status: 'sync_conflict',
      remoteExportedAt: meta.exportedAt,
      message:
        'Sync Conflict: The cloud has newer data. Pushing now will overwrite it. Please resolve manually.',
    };
  }
  return null;
}

export async function pushCloudBackup(settings: AppSettings): Promise<CloudSyncResult> {
  if (!CLOUD_SYNC_AVAILABLE) return cloudSyncUnavailable();
  const url = normalizeSyncUrl(settings.cloudSyncUrl ?? '');
  const token = settings.cloudSyncToken?.trim() ?? '';
  if (!settings.cloudSyncEnabled || !url || !token) {
    return { status: 'disabled', message: 'Cloud sync is not configured.' };
  }

  const conflict = await detectSyncConflict(settings);
  if (conflict) return conflict;

  try {
    const backup = await buildBackup();
    const res = await fetch(url, {
      method: 'POST',
      headers: syncHeaders(token),
      body: JSON.stringify(backup),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { status: 'error', message: text || `Upload failed (${res.status})` };
    }
    const meta = (await res.json()) as CloudSyncMeta;
    return { status: 'pushed', remoteExportedAt: meta.exportedAt ?? backup.exportedAt };
  } catch (err) {
    return { status: 'error', message: String(err instanceof Error ? err.message : err) };
  }
}

export async function pullCloudBackup(settings: AppSettings): Promise<CloudSyncResult> {
  if (!CLOUD_SYNC_AVAILABLE) return cloudSyncUnavailable();
  const url = normalizeSyncUrl(settings.cloudSyncUrl ?? '');
  const token = settings.cloudSyncToken?.trim() ?? '';
  if (!settings.cloudSyncEnabled || !url || !token) {
    return { status: 'disabled', message: 'Cloud sync is not configured.' };
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: syncHeaders(token),
    });
    if (res.status === 404) {
      return { status: 'error', message: 'No cloud backup found yet.' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { status: 'error', message: text || `Download failed (${res.status})` };
    }
    const json = await res.text();
    const parsed = JSON.parse(json) as BackupFile;
    await restoreBackup(json);
    return { status: 'pulled', remoteExportedAt: parsed.exportedAt ?? null };
  } catch (err) {
    return { status: 'error', message: String(err instanceof Error ? err.message : err) };
  }
}

/**
 * Compare local vs cloud and push/pull (last-write-wins).
 * When remote is newer and `autoPull` is false, returns remote_newer for UI confirm.
 */
export async function runCloudSync(
  settings: AppSettings,
  options: { autoPull?: boolean; autoPush?: boolean } = {},
): Promise<CloudSyncResult> {
  if (!CLOUD_SYNC_AVAILABLE) return cloudSyncUnavailable();
  const { autoPull = false, autoPush = true } = options;
  const url = normalizeSyncUrl(settings.cloudSyncUrl ?? '');
  const token = settings.cloudSyncToken?.trim() ?? '';
  if (!settings.cloudSyncEnabled || !url || !token) {
    return { status: 'disabled' };
  }

  try {
    const [meta, localTs] = await Promise.all([fetchCloudSyncMeta(settings), getLocalDataTimestamp()]);
    const remoteTs = meta?.exportedAt ? Date.parse(meta.exportedAt) : 0;
    const lastPushed = settings.cloudSyncLastPushedAt
      ? Date.parse(settings.cloudSyncLastPushedAt)
      : 0;

    if (!meta?.exportedAt) {
      if (autoPush && localTs > 0) return pushCloudBackup(settings);
      return { status: 'in_sync', message: 'Nothing on cloud yet.' };
    }

    if (remoteTs > localTs + 30_000 && remoteTs > lastPushed + 30_000) {
      if (autoPull) return pullCloudBackup(settings);
      return { status: 'remote_newer', remoteExportedAt: meta.exportedAt };
    }

    if (localTs > remoteTs + 30_000 && autoPush) {
      const conflict = await detectSyncConflict(settings);
      if (conflict) return conflict;
      return pushCloudBackup(settings);
    }

    return { status: 'in_sync', remoteExportedAt: meta.exportedAt };
  } catch (err) {
    return { status: 'error', message: String(err instanceof Error ? err.message : err) };
  }
}
