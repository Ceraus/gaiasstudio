// ---------------------------------------------------------------------------
// Full-database backup & restore.
//
// Everything Rosa owns lives in IndexedDB (Dexie) — one power surge or a
// "cleaned up" browser profile away from gone. This module makes that a
// non-event:
//
//   • buildBackup()        — serializes EVERY Dexie table generically (via
//     db.tables), so tables added in future schema versions are included in
//     backups automatically, with zero code changes here.
//   • exportBackup()       — desktop app: silently writes the .json into
//     "Gaia's Save System/backups/" (main process prunes to the newest 14);
//     browser build: downloads the file.
//   • restoreBackup(json)  — validates the file, then clears + reimports every
//     recognized table inside ONE read-write transaction: all-or-nothing, a
//     half-restored database is impossible.
//   • maybeRunAutoBackup() — daily safety net on boot (Electron silent save to
//     disk). Browser/PWA does not auto-download — use Settings → Export backup.
// ---------------------------------------------------------------------------

import { db } from '@/db/db';

export interface BackupFile {
  /** Marker so a random .json can't be restored by accident. */
  app: 'gaia-label-studio';
  format: 1;
  exportedAt: string;
  /** Dexie schema version the backup was taken from (informational). */
  dexieVersion: number;
  tables: Record<string, unknown[]>;
}

/** Preload-bridge surface used by this module (present only inside Electron). */
interface ElectronBackupApi {
  saveBackup?: (json: string, filename: string) => Promise<{ path: string }>;
}

function electronApi(): ElectronBackupApi | null {
  if (typeof window === 'undefined') return null;
  return (window as unknown as { electronAPI?: ElectronBackupApi }).electronAPI ?? null;
}

/** Reads every table into one portable JSON structure. */
export async function buildBackup(): Promise<BackupFile> {
  const tables: Record<string, unknown[]> = {};
  for (const table of db.tables) {
    tables[table.name] = await table.toArray();
  }
  return {
    app: 'gaia-label-studio',
    format: 1,
    exportedAt: new Date().toISOString(),
    dexieVersion: db.verno,
    tables,
  };
}

export function backupFilename(prefix = 'Gaia_Backup', now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${prefix}_${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
    `_${pad(now.getHours())}${pad(now.getMinutes())}.json`
  );
}

/** @deprecated Browser builds no longer auto-download; kept for manual export naming if needed. */
export function pwaAutoBackupFilename(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `gaias-studio-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

/**
 * Builds and saves a full backup.
 * Returns the absolute path when saved silently inside the desktop app, or
 * null when the browser download fallback was used.
 */
export async function exportBackup(): Promise<{ savedPath: string | null; filename: string }> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup);
  const filename = backupFilename();

  const api = electronApi();
  if (api?.saveBackup) {
    const { path } = await api.saveBackup(json, filename);
    return { savedPath: path, filename };
  }

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { savedPath: null, filename };
}

export interface RestoreSummary {
  tables: number;
  rows: number;
  /** Tables present in the file but unknown to this app version (skipped). */
  skipped: string[];
}

/**
 * Restores a backup file. Clears and reimports every table the file contains
 * (and this app version knows about) inside a single transaction — if
 * anything fails, the database is left exactly as it was.
 *
 * Throws with a user-readable message for invalid files.
 */
export async function restoreBackup(json: string): Promise<RestoreSummary> {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(json) as BackupFile;
  } catch {
    throw new Error('That file is not readable as JSON.');
  }
  if (parsed?.app !== 'gaia-label-studio' || typeof parsed.tables !== 'object' || !parsed.tables) {
    throw new Error("That file doesn't look like a Gaia's Essences backup.");
  }

  const known = new Map(db.tables.map((t) => [t.name, t]));
  const names = Object.keys(parsed.tables).filter((n) => known.has(n));
  const skipped = Object.keys(parsed.tables).filter((n) => !known.has(n));
  if (names.length === 0) {
    throw new Error('The backup contains no recognizable data tables.');
  }

  let rows = 0;
  await db.transaction('rw', db.tables, async () => {
    for (const name of names) {
      const table = known.get(name)!;
      const records = parsed.tables[name];
      if (!Array.isArray(records)) continue;
      await table.clear();
      // bulkPut (not bulkAdd) so a duplicate id inside the file can't abort.
      await table.bulkPut(records);
      rows += records.length;
    }
  });

  return { tables: names.length, rows, skipped };
}

// ---------------------------------------------------------------------------
// Automatic daily backup (Electron + PWA)
// ---------------------------------------------------------------------------

const LAST_BACKUP_DATE_KEY = 'lastBackupDate';
const AUTO_BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000;

/**
 * Writes an automatic backup at most once per 24 hours. Electron saves
 * silently to disk. Browser/PWA only stamps the date — no surprise download
 * on login (Settings → Export backup covers the hosted app).
 * Never throws — a failed auto-backup must not break app startup.
 *
 * First app session (e.g. right after PIN setup) is deferred: we stamp
 * lastBackupDate without downloading so Rosa isn't greeted with a backup file.
 */
export async function maybeRunAutoBackup(): Promise<void> {
  try {
    const now = Date.now();
    const lastRaw = localStorage.getItem(LAST_BACKUP_DATE_KEY);

    if (!lastRaw) {
      localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date(now).toISOString());
      return;
    }

    const last = Date.parse(lastRaw);
    if (Number.isFinite(last) && now - last < AUTO_BACKUP_INTERVAL_MS) return;

    const api = electronApi();

    if (api?.saveBackup) {
      const backup = await buildBackup();
      const json = JSON.stringify(backup);
      const { path } = await api.saveBackup(json, backupFilename('Gaia_AutoBackup'));
      localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date(now).toISOString());
      console.info(`[Gaia] Automatic backup saved: ${path}`);
      return;
    }

    // Hosted PWA: no auto-download. Manual export lives in Settings.
    localStorage.setItem(LAST_BACKUP_DATE_KEY, new Date(now).toISOString());
    console.info('[Gaia] Automatic browser backup skipped (use Settings → Export backup)');
  } catch (err) {
    console.warn('[Gaia] Automatic backup failed:', err);
  }
}
