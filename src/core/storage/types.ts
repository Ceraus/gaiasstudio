import type { ActivityItem, Checklist, FloorPlan, GalleryPhoto, Project, Task, TimeEntry } from "@/shared/types/domain";

export type SyncOperation = "create" | "update" | "delete";
export type SyncStatus = "pending" | "synced" | "failed";

export interface TenantScoped {
  org_id: string;
  tenant_id: string;
}

export type CachedProject = Project & TenantScoped;
export type CachedPlan = FloorPlan & TenantScoped;
export type CachedTask = Task & TenantScoped;
export type CachedPhoto = GalleryPhoto & TenantScoped;
export type CachedChecklist = Checklist & TenantScoped;
export type CachedTimeEntry = TimeEntry & TenantScoped;
export type CachedActivityEvent = ActivityItem & TenantScoped;

export interface CachedProjectStatus extends TenantScoped {
  id: string;
  code: string;
  label: string;
  projectStatus: Project["status"];
  classes: string;
  created_at: string;
  updated_at: string;
}

export interface CachedPlanAsset extends TenantScoped {
  id: string;
  project_id: string;
  plan_id: string;
  name: string;
  mime_type: string;
  size: number;
  original_blob: Blob;
  preview_blob?: Blob;
  preview_url_runtime?: string;
  created_at: string;
  updated_at: string;
}

export interface CachedComment extends TenantScoped {
  id: string;
  task_id: string;
  author: string;
  message: string;
  image_asset_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CachedAttachment extends TenantScoped {
  id: string;
  task_id?: string;
  comment_id?: string;
  name: string;
  mime_type: string;
  size: number;
  blob: Blob;
  created_at: string;
  updated_at: string;
}

export interface CachedFile extends TenantScoped {
  id: string;
  project_id: string;
  name: string;
  mime_type: string;
  size: number;
  blob?: Blob;
  created_at: string;
  updated_at: string;
}

export interface CachedChecklistItem extends TenantScoped {
  id: string;
  checklist_id: string;
  task_id?: string;
  label: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface CachedUser extends TenantScoped {
  id: string;
  name: string;
  role: string;
  title: string;
  email?: string;
  created_at: string;
  updated_at: string;
}

export interface CachedSyncQueueItem extends TenantScoped {
  id: string;
  entity: string;
  operation: SyncOperation;
  payload: unknown;
  status: SyncStatus;
  created_at: string;
  retry_count: number;
}
