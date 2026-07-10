export type Role = "Admin" | "Manager" | "Employee";
export type EmployeeStatus = "Clocked in" | "On break" | "Off shift";
export type ProjectStatus = "Planning" | "Active" | "Review" | "Complete";
export type TaskStatus = "Backlog" | "Scheduled" | "In Progress" | "Blocked" | "Done";

export interface Employee {
  id: string;
  name: string;
  role: Role;
  title: string;
  status: EmployeeStatus;
  avatarUrl?: string;
  phone: string;
  location: string;
  todayHours: number;
  weekHours: number;
  assignedProjectId: string;
}

export interface Client {
  id: string;
  name: string;
  contact: string;
  email: string;
}

export interface Location {
  id: string;
  label: string;
  address: string;
  gpsStatus: "Verified" | "Approximate" | "Missing";
}

export interface FloorPlan {
  id: string;
  projectId: string;
  name: string;
  type: "image" | "pdf";
  previewUrl?: string;
  sourceUrl?: string;
  assetId?: string;
  renderStatus?: "ready" | "rendering" | "error";
  previewVersion?: number;
  renderError?: string;
  uploadedAt: string;
}

export interface Task {
  id: string;
  projectId: string;
  floorPlanId?: string;
  title: string;
  category: string;
  status: TaskStatus;
  assigneeId: string;
  priority: "Low" | "Medium" | "High";
  dueDate: string;
  checklistIds: string[];
  x_percent?: number;
  y_percent?: number;
  description: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  manpower?: string;
  cost?: string;
  tags?: string[];
  watchers?: string[];
}

export interface TaskChecklistItem {
  id: string;
  taskId: string;
  label: string;
  completed: boolean;
}

export interface TaskComment {
  id: string;
  taskId: string;
  author: string;
  message: string;
  imageUrl?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  clientId: string;
  address: string;
  status: ProjectStatus;
  phaseCode?: string;
  phaseLabel?: string;
  progress: number;
  budget: string;
  startDate: string;
  managerId: string;
  assignedUserIds: string[];
  floorPlanIds: string[];
}

export interface Checklist {
  id: string;
  title: string;
  items: string[];
  scope: "Account" | "Project" | "Task";
}

export interface Template {
  id: string;
  name: string;
  type: "Project" | "Task" | "Checklist";
  updatedAt: string;
  sections: string[];
}

export interface TimeEntry {
  id: string;
  employeeId: string;
  projectId: string;
  date: string;
  clockIn: string;
  clockOut?: string;
  breakMinutes: number;
  hours: number;
  locationStatus: "Inside geofence" | "Manual review" | "Remote";
}

export interface GalleryPhoto {
  id: string;
  projectId: string;
  title: string;
  category: string;
  url: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface ActivityItem {
  id: string;
  projectId: string;
  actorId: string;
  action: string;
  timestamp: string;
}
