import Dexie, { type Table } from "dexie";
import type {
  CachedActivityEvent,
  CachedAttachment,
  CachedChecklist,
  CachedChecklistItem,
  CachedComment,
  CachedFile,
  CachedPhoto,
  CachedPlan,
  CachedPlanAsset,
  CachedProject,
  CachedProjectStatus,
  CachedSyncQueueItem,
  CachedTask,
  CachedTimeEntry,
  CachedUser
} from "./types";

export class ClearPlanDb extends Dexie {
  projects!: Table<CachedProject, string>;
  projectStatuses!: Table<CachedProjectStatus, string>;
  plans!: Table<CachedPlan, string>;
  planAssets!: Table<CachedPlanAsset, string>;
  tasks!: Table<CachedTask, string>;
  comments!: Table<CachedComment, string>;
  attachments!: Table<CachedAttachment, string>;
  photos!: Table<CachedPhoto, string>;
  files!: Table<CachedFile, string>;
  checklists!: Table<CachedChecklist, string>;
  checklistItems!: Table<CachedChecklistItem, string>;
  users!: Table<CachedUser, string>;
  timeEntries!: Table<CachedTimeEntry, string>;
  activityEvents!: Table<CachedActivityEvent, string>;
  syncQueue!: Table<CachedSyncQueueItem, string>;

  constructor() {
    super("clearplan-offline-cache");
    this.version(1).stores({
      projects: "id, org_id, tenant_id, status, clientId, managerId",
      projectStatuses: "id, org_id, tenant_id, code, projectStatus",
      plans: "id, org_id, tenant_id, projectId, assetId, type",
      planAssets: "id, org_id, tenant_id, project_id, plan_id, mime_type, created_at",
      tasks: "id, org_id, tenant_id, projectId, floorPlanId, status, assigneeId",
      comments: "id, org_id, tenant_id, task_id, created_at",
      attachments: "id, org_id, tenant_id, task_id, comment_id, created_at",
      photos: "id, org_id, tenant_id, projectId, uploadedAt",
      files: "id, org_id, tenant_id, project_id, created_at",
      checklists: "id, org_id, tenant_id, scope",
      checklistItems: "id, org_id, tenant_id, checklist_id, task_id",
      users: "id, org_id, tenant_id, role",
      timeEntries: "id, org_id, tenant_id, employeeId, projectId, date",
      activityEvents: "id, org_id, tenant_id, projectId, timestamp",
      syncQueue: "id, org_id, tenant_id, entity, operation, status, created_at"
    });
  }
}

export const clearplanDb = new ClearPlanDb();
