export const DEFAULT_ORG_ID = "demo-org";
export const DEFAULT_TENANT_ID = "demo-tenant";

export const cacheKeys = {
  projects: "projects",
  projectStatuses: "projectStatuses",
  plans: "plans",
  planAssets: "planAssets",
  tasks: "tasks",
  comments: "comments",
  attachments: "attachments",
  photos: "photos",
  files: "files",
  checklists: "checklists",
  checklistItems: "checklistItems",
  users: "users",
  timeEntries: "timeEntries",
  activityEvents: "activityEvents",
  syncQueue: "syncQueue"
} as const;

export function tenantFields() {
  return { org_id: DEFAULT_ORG_ID, tenant_id: DEFAULT_TENANT_ID };
}
