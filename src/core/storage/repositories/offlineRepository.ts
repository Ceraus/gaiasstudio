import { activityLog, checklists, employees, floorPlans, galleryPhotos, projects, tasks, timeEntries } from "@/infrastructure/offline/mockData";
import type { FloorPlan, GalleryPhoto, Project, Task, TaskComment } from "@/shared/types/domain";
import { phaseStatuses } from "@/modules/projects/statusModel";
import { clearplanDb } from "@/core/storage/clearplanDb";
import { tenantFields } from "@/core/storage/cacheKeys";
import { enqueueMutation } from "@/core/sync/syncQueue";
import type { CachedComment, CachedPlanAsset } from "@/core/storage/types";

export async function seedOfflineCacheIfNeeded() {
  const count = await clearplanDb.projects.count();
  if (count > 0) {
    await ensureMissingSeedProjects();
    return;
  }
  const tenant = tenantFields();
  const now = new Date().toISOString();
  await clearplanDb.projects.bulkPut(projects.map((project) => ({ ...project, ...tenant })));
  await clearplanDb.projectStatuses.bulkPut(phaseStatuses.map((status) => ({ ...status, id: status.code, ...tenant, created_at: now, updated_at: now })));
  await clearplanDb.plans.bulkPut(floorPlans.map((plan) => ({ ...plan, renderStatus: "ready" as const, ...tenant })));
  await clearplanDb.tasks.bulkPut(tasks.map((task) => ({ ...task, ...tenant })));
  await clearplanDb.photos.bulkPut(galleryPhotos.map((photo) => ({ ...photo, ...tenant })));
  await clearplanDb.checklists.bulkPut(checklists.map((checklist) => ({ ...checklist, ...tenant })));
  await clearplanDb.users.bulkPut(employees.map((employee) => ({ id: employee.id, name: employee.name, role: employee.role, title: employee.title, ...tenant, created_at: now, updated_at: now })));
  await clearplanDb.timeEntries.bulkPut(timeEntries.map((entry) => ({ ...entry, ...tenant })));
  await clearplanDb.activityEvents.bulkPut(activityLog.map((event) => ({ ...event, ...tenant })));
}

async function ensureMissingSeedProjects() {
  const cachedProjects = await clearplanDb.projects.toArray();
  const existingIds = new Set(cachedProjects.map((project) => project.id));
  const missingProjects = projects.filter((project) => !existingIds.has(project.id));
  if (!missingProjects.length) return;
  await clearplanDb.projects.bulkPut(missingProjects.map((project) => ({ ...project, ...tenantFields() })));
}

export async function loadOfflineState() {
  await seedOfflineCacheIfNeeded();
  const [cachedProjects, cachedPlans, cachedTasks, cachedPhotos, cachedTimeEntries] = await Promise.all([
    clearplanDb.projects.toArray(),
    clearplanDb.plans.toArray(),
    clearplanDb.tasks.toArray(),
    clearplanDb.photos.toArray(),
    clearplanDb.timeEntries.toArray()
  ]);
  const assets = await clearplanDb.planAssets.toArray();
  const assetByPlan = new Map(assets.map((asset) => [asset.plan_id, asset]));
  const hydratedPlans: FloorPlan[] = cachedPlans.map((plan) => {
    const asset = assetByPlan.get(plan.id);
    return {
      ...plan,
      previewUrl: asset?.preview_blob ? URL.createObjectURL(asset.preview_blob) : plan.previewUrl,
      sourceUrl: asset?.original_blob ? URL.createObjectURL(asset.original_blob) : plan.sourceUrl
    };
  });
  return {
    projects: cachedProjects as Project[],
    floorPlans: hydratedPlans,
    tasks: cachedTasks as Task[],
    galleryPhotos: cachedPhotos as GalleryPhoto[],
    timeEntries: cachedTimeEntries
  };
}

export async function getProjectById(projectId: string) {
  return clearplanDb.projects.get(projectId);
}

export async function getPlansByProjectId(projectId: string) {
  return clearplanDb.plans.where("projectId").equals(projectId).toArray();
}

export async function getTasksByProjectId(projectId: string) {
  return clearplanDb.tasks.where("projectId").equals(projectId).toArray();
}

export async function persistProject(project: Project) {
  await clearplanDb.projects.put({ ...project, ...tenantFields() });
  await enqueueMutation("projects", "create", project);
}

export async function persistProjectPatch(project: Project) {
  await clearplanDb.projects.put({ ...project, ...tenantFields() });
  await enqueueMutation("projects", "update", project);
}

export async function persistTask(task: Task, operation: "create" | "update" | "delete" = "update") {
  if (operation === "delete") await clearplanDb.tasks.delete(task.id);
  else await clearplanDb.tasks.put({ ...task, ...tenantFields() });
  await enqueueMutation("tasks", operation, task);
}

export async function persistPhoto(photo: GalleryPhoto) {
  await clearplanDb.photos.put({ ...photo, ...tenantFields() });
  await enqueueMutation("photos", "create", photo);
}

export async function persistPlan(plan: FloorPlan, file: File, previewBlob?: Blob) {
  const now = new Date().toISOString();
  const asset: CachedPlanAsset = {
    id: plan.assetId ?? `asset-${plan.id}`,
    project_id: plan.projectId,
    plan_id: plan.id,
    name: file.name,
    mime_type: file.type || (plan.type === "pdf" ? "application/pdf" : "image/*"),
    size: file.size,
    original_blob: file,
    preview_blob: previewBlob,
    created_at: now,
    updated_at: now,
    ...tenantFields()
  };
  await clearplanDb.transaction("rw", clearplanDb.plans, clearplanDb.planAssets, async () => {
    await clearplanDb.plans.put({ ...plan, assetId: asset.id, ...tenantFields() });
    await clearplanDb.planAssets.put(asset);
  });
  await enqueueMutation("plans", "create", { plan, asset: { ...asset, original_blob: undefined, preview_blob: undefined } });
}

export async function updatePlanPreview(plan: FloorPlan, previewBlob: Blob) {
  await clearplanDb.transaction("rw", clearplanDb.plans, clearplanDb.planAssets, async () => {
    await clearplanDb.plans.put({ ...plan, ...tenantFields() });
    const asset = plan.assetId ? await clearplanDb.planAssets.get(plan.assetId) : undefined;
    if (asset) await clearplanDb.planAssets.put({ ...asset, preview_blob: previewBlob, updated_at: new Date().toISOString() });
  });
  await enqueueMutation("plans", "update", plan);
}

export async function persistPlanPatch(plan: FloorPlan) {
  await clearplanDb.plans.put({ ...plan, ...tenantFields() });
  await enqueueMutation("plans", "update", plan);
}

export async function getPlanAsset(planId: string) {
  return clearplanDb.planAssets.where("plan_id").equals(planId).first();
}

export async function deletePersistedPlan(plan: FloorPlan) {
  await clearplanDb.transaction("rw", clearplanDb.plans, clearplanDb.planAssets, async () => {
    await clearplanDb.plans.delete(plan.id);
    const assets = await clearplanDb.planAssets.where("plan_id").equals(plan.id).toArray();
    await Promise.all(assets.map((asset) => clearplanDb.planAssets.delete(asset.id)));
  });
  await enqueueMutation("plans", "delete", plan);
}

export async function duplicatePersistedPlan(sourcePlan: FloorPlan, duplicatePlan: FloorPlan) {
  const sourceAsset = await getPlanAsset(sourcePlan.id);
  await clearplanDb.transaction("rw", clearplanDb.plans, clearplanDb.planAssets, async () => {
    await clearplanDb.plans.put({ ...duplicatePlan, ...tenantFields() });
    if (!sourceAsset) return;
    const now = new Date().toISOString();
    await clearplanDb.planAssets.put({
      ...sourceAsset,
      id: duplicatePlan.assetId ?? `asset-${duplicatePlan.id}`,
      plan_id: duplicatePlan.id,
      project_id: duplicatePlan.projectId,
      name: duplicatePlan.name,
      created_at: now,
      updated_at: now
    });
  });
  await enqueueMutation("plans", "create", duplicatePlan);
}

export async function loadTaskComments(taskId: string): Promise<TaskComment[]> {
  const comments = await clearplanDb.comments.where("task_id").equals(taskId).sortBy("created_at");
  const attachments = await clearplanDb.attachments.toArray();
  const attachmentByComment = new Map(attachments.filter((asset) => asset.comment_id).map((asset) => [asset.comment_id, asset]));
  return comments.map((comment) => {
    const attachment = attachmentByComment.get(comment.id);
    return {
      id: comment.id,
      taskId: comment.task_id,
      author: comment.author,
      message: comment.message,
      imageUrl: attachment?.blob ? URL.createObjectURL(attachment.blob) : undefined,
      createdAt: comment.created_at
    };
  });
}

export async function persistTaskComment(comment: TaskComment, imageFile?: File | Blob) {
  const cached: CachedComment = {
    id: comment.id,
    task_id: comment.taskId,
    author: comment.author,
    message: comment.message,
    created_at: comment.createdAt,
    updated_at: new Date().toISOString(),
    ...tenantFields()
  };
  await clearplanDb.comments.put(cached);
  if (imageFile) {
    await clearplanDb.attachments.put({
      id: `attachment-${comment.id}`,
      task_id: comment.taskId,
      comment_id: comment.id,
      name: `comment-${comment.id}`,
      mime_type: imageFile.type || "image/*",
      size: imageFile.size,
      blob: imageFile,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...tenantFields()
    });
  }
  await enqueueMutation("comments", "create", comment);
}
