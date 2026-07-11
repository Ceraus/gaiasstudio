import type {
  ActivityItem,
  Checklist,
  Client,
  Employee,
  FloorPlan,
  GalleryPhoto,
  Location,
  Project,
  Task,
  TaskStatus,
  Template,
  TimeEntry
} from "@/shared/types/domain";

export const taskStatuses: TaskStatus[] = ["Backlog", "Scheduled", "In Progress", "Blocked", "Done"];

export const categories = [
  { id: "cat-network", name: "Network", color: "bg-blue-100 text-blue-700" },
  { id: "cat-security", name: "Security", color: "bg-red-100 text-red-700" },
  { id: "cat-access", name: "Access Control", color: "bg-emerald-100 text-emerald-700" },
  { id: "cat-av", name: "A/V", color: "bg-violet-100 text-violet-700" },
  { id: "cat-closeout", name: "Closeout", color: "bg-slate-100 text-slate-700" }
];

/** Blank slate — clients are provided by the backend or the Example Data gateway. */
export const clients: Client[] = [];

/** Blank slate — locations are provided by the backend or the Example Data gateway. */
export const locations: Location[] = [];

/** Blank slate — employees are provided by the backend or the Example Data gateway. */
export const employees: Employee[] = [];

export function dashboardProjectId(dashboardId: string) {
  return `project-${dashboardId}`;
}

/** Default project list is empty — projects are added by the backend or via the "New project" form. */
export const projects: Project[] = [];

/** Blank slate — floor plans are provided by the backend or the Example Data gateway. */
export const floorPlans: FloorPlan[] = [];

/** Blank slate — checklists are provided by the backend or the Example Data gateway. */
export const checklists: Checklist[] = [];

/** Blank slate — tasks are provided by the backend or the Example Data gateway. */
export const tasks: Task[] = [];

/** Blank slate — templates are provided by the backend or the Example Data gateway. */
export const templates: Template[] = [];

/** Blank slate — time entries are provided by the backend or the Example Data gateway. */
export const timeEntries: TimeEntry[] = [];

/** Blank slate — gallery photos are provided by the backend or the Example Data gateway. */
export const galleryPhotos: GalleryPhoto[] = [];

/** Blank slate — activity log is provided by the backend or the Example Data gateway. */
export const activityLog: ActivityItem[] = [];

export function findProject(id?: string) {
  return projects.find((project) => project.id === id) ?? projects[0];
}

export function employeeName(id: string) {
  return employees.find((employee) => employee.id === id)?.name ?? "Unassigned";
}

export function clientName(id: string) {
  return clients.find((client) => client.id === id)?.name ?? "Unknown client";
}
