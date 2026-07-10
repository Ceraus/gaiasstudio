import { clearplanDb } from "@/core/storage/clearplanDb";
import { tenantFields } from "@/core/storage/cacheKeys";
import type { CachedSyncQueueItem, SyncOperation } from "@/core/storage/types";

export async function enqueueMutation(entity: string, operation: SyncOperation, payload: unknown) {
  const item: CachedSyncQueueItem = {
    id: `sync-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    entity,
    operation,
    payload,
    status: "pending",
    created_at: new Date().toISOString(),
    retry_count: 0,
    ...tenantFields()
  };
  await clearplanDb.syncQueue.put(item);
  return item;
}

// Future backend sync placeholders:
// GET /api/projects
// POST /api/projects
// GET /api/projects/:id/plans
// POST /api/projects/:id/plans
// GET /api/projects/:id/tasks
// POST /api/tasks
// PATCH /api/tasks/:id
// POST /api/sync
export async function listPendingMutations() {
  return clearplanDb.syncQueue.where("status").equals("pending").toArray();
}
