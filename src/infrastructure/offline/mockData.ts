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

export const clients: Client[] = [
  { id: "client-1", name: "Northstar Medical", contact: "Amelia Ross", email: "amelia@northstar.example" },
  { id: "client-2", name: "Civicline Offices", contact: "Mateo Kim", email: "mateo@civicline.example" },
  { id: "client-3", name: "Ridgeview Schools", contact: "Dana Patel", email: "dana@ridgeview.example" }
];

export const locations: Location[] = [
  { id: "loc-1", label: "Northstar Level 4", address: "418 Market St, Boston, MA", gpsStatus: "Verified" },
  { id: "loc-2", label: "Civicline Tower", address: "22 River Ave, Providence, RI", gpsStatus: "Approximate" },
  { id: "loc-3", label: "Ridgeview Campus", address: "9 Oak Lane, Hartford, CT", gpsStatus: "Verified" }
];

export const employees: Employee[] = [
  { id: "emp-1", name: "Jordan Lee", role: "Admin", title: "Operations Director", status: "Clocked in", phone: "(617) 555-0120", location: "Northstar Level 4", todayHours: 6.4, weekHours: 31.2, assignedProjectId: "proj-1" },
  { id: "emp-2", name: "Maya Chen", role: "Manager", title: "Field Lead", status: "On break", phone: "(617) 555-0144", location: "Civicline Tower", todayHours: 4.1, weekHours: 28.8, assignedProjectId: "proj-2" },
  { id: "emp-3", name: "Sam Rivera", role: "Employee", title: "Technician", status: "Clocked in", phone: "(617) 555-0188", location: "Ridgeview Campus", todayHours: 5.7, weekHours: 24.3, assignedProjectId: "proj-3" },
  { id: "emp-4", name: "Priya Nair", role: "Employee", title: "Installer", status: "Off shift", phone: "(617) 555-0199", location: "Northstar Level 4", todayHours: 0, weekHours: 22.5, assignedProjectId: "proj-1" }
];

export const dashboardProjectSeeds = [
  ["dash-1", "HERE Arts Center", "145 6th Ave", "Phase 3", "Approved", 3, 8, false],
  ["dash-2", "Adaptive Build", "200 Park Ave S, Suite 1702", "Phase 2", "Quote Sent", 5, 12, false],
  ["dash-3", "AO Management", "287 Park Ave S", "Phase 1", "Site Visit", 3, 9, false],
  ["dash-4", "Atlas Wellness Clinic", "505 8th Ave, 12th Floor", "Phase 2", "Quote Sent", 3, 11, false],
  ["dash-5", "Bharati Center", "305 Schermerhorn St", "Phase 2", "Quote Sent", 3, 10, false],
  ["dash-6", "Dailymotion", "150 W 22nd St 12 Floor", "Phase 7", "Job Completed Pending Payment", 5, 18, false],
  ["dash-7", "Earned", "287 Park Ave S 7th Floor", "Phase 5", "Job Completed", 5, 16, false],
  ["dash-8", "Fever Up", "483-485 Broadway", "Phase 4", "Installation in Progress", 5, 14, false],
  ["dash-9", "Herald Center", "1239 Broadway", "Phase 3", "Approved", 3, 8, false],
  ["dash-10", "Herald Towers Elevator project", "HT Elevators 2026", "Phase 3", "Approved", 3, 7, false],
  ["dash-11", "Instant One", "53W 21th St", "Phase 2", "Quote Sent", 3, 9, false],
  ["dash-12", "Irving Realty", "33W 17th St", "Phase 1", "Site Visit", 3, 6, false],
  ["dash-13", "Jembrealty", "150 Broadway 4th Floor", "Phase 1", "Site Visit", 5, 13, false],
  ["dash-14", "Khaite", "65 Bleeker Street 9th floor", "Phase 3", "Approved", 5, 19, false],
  ["dash-15", "Le Parc", "287 Park Ave S", "Phase 4", "Installation in Progress", 4, 15, false],
  ["dash-16", "Metaforms AI", "30 East 23rd Street", "Phase 7", "Job Completed Pending Payment", 5, 20, false],
  ["dash-17", "Neighborhood Restore", "150 Broadway", "Phase 7", "Job Completed Pending Payment", 4, 17, false],
  ["dash-18", "Park Pictures", "184 5th Ave", "Phase 1", "Site Visit", 6, 14, false],
  ["dash-19", "Pharsalus", "200 Varick St, Floor 8", "Phase 2", "Quote Sent", 3, 8, false],
  ["dash-20", "Phaze App", "330 7th Ave 21th Floor", "Phase 5", "Job Completed", 5, 16, false],
  ["dash-21", "Probook AI", "130 Madison Avenue", "Phase 2", "Quote Sent", 3, 9, false],
  ["dash-22", "Runway", "18 West 18th Street, Floor 8", "Phase 7", "Job Completed Pending Payment", 3, 11, false],
  ["dash-23", "SFI Sunbeth", "375 9th Avenue", "Phase 1", "Site Visit", 3, 7, false],
  ["dash-24", "Skillz", "150 Broadway 15th Floor", "Phase 4", "Installation in Progress", 5, 13, false],
  ["dash-25", "Sola Salon", "50 W 17th Street", "Phase 4", "Installation in Progress", 5, 15, false],
  ["dash-26", "Sola Salon", "666 Broadway", "Phase 4", "Installation in Progress", 5, 12, false],
  ["dash-27", "Still Here", "905 Madison Ave", "Phase 2", "Quote Sent", 3, 10, false],
  ["dash-28", "Sutton Smyth", "155 E 55th St #6C", "Phase 7", "Job Completed Pending Payment", 5, 17, false],
  ["dash-29", "The Globe Show Room", "236W 38th St", "Phase 2", "Quote Sent", 3, 8, false],
  ["dash-30", "Too Lost", "915 Broadway 801", "Phase 5", "Job Completed", 5, 15, false]
] as const;

export function dashboardProjectId(dashboardId: string) {
  return `project-${dashboardId}`;
}

function projectStatusFromDashboardPhase(phase: string): Project["status"] {
  if (phase === "Phase 1" || phase === "Phase 2") return "Planning";
  if (phase === "Phase 5" || phase === "Phase 7") return "Complete";
  if (phase === "Phase 3") return "Review";
  return "Active";
}

function phaseCodeFromDashboardPhase(phase: string) {
  if (phase === "Phase 1") return "phase-1";
  if (phase === "Phase 2") return "phase-2";
  if (phase === "Phase 3") return "phase-3";
  if (phase === "Phase 4") return "phase-4";
  if (phase === "Phase 5") return "phase-5";
  if (phase === "Phase 7") return "phase-7";
  return "phase-2";
}

export const projects: Project[] = [
  { id: "proj-1", name: "Northstar Clinic Expansion", clientId: "client-1", address: "418 Market St, Boston, MA", status: "Active", progress: 68, budget: "$184k", startDate: "2026-05-04", managerId: "emp-1", assignedUserIds: ["emp-1", "emp-4"], floorPlanIds: ["plan-1"] },
  { id: "proj-2", name: "Civicline HQ Refresh", clientId: "client-2", address: "22 River Ave, Providence, RI", status: "Planning", progress: 24, budget: "$92k", startDate: "2026-06-03", managerId: "emp-2", assignedUserIds: ["emp-2"], floorPlanIds: ["plan-2"] },
  { id: "proj-3", name: "Ridgeview Access Upgrade", clientId: "client-3", address: "9 Oak Lane, Hartford, CT", status: "Review", progress: 87, budget: "$126k", startDate: "2026-04-21", managerId: "emp-3", assignedUserIds: ["emp-3"], floorPlanIds: ["plan-3"] }
  ,
  ...dashboardProjectSeeds.map(([id, name, address, phase, phaseDetail], index) => ({
    id: dashboardProjectId(String(id)),
    name: String(name),
    clientId: clients[index % clients.length]?.id ?? "client-1",
    address: String(address),
    status: projectStatusFromDashboardPhase(String(phase)),
    phaseCode: phaseCodeFromDashboardPhase(String(phase)),
    phaseLabel: `${phase} - ${phaseDetail}`,
    progress: phase === "Phase 5" || phase === "Phase 7" ? 100 : phase === "Phase 1" ? 14 : phase === "Phase 2" ? 28 : phase === "Phase 3" ? 46 : 72,
    budget: "$0",
    startDate: "2026-06-18",
    managerId: employees[index % employees.length]?.id ?? "emp-1",
    assignedUserIds: employees.slice(0, Math.max(1, Math.min(4, Number(dashboardProjectSeeds[index][5])))).map((employee) => employee.id),
    floorPlanIds: []
  }))
];

export const floorPlans: FloorPlan[] = [
  { id: "plan-1", projectId: "proj-1", name: "Level 4 clinical wing", type: "image", uploadedAt: "2026-06-08", previewUrl: "" },
  { id: "plan-2", projectId: "proj-2", name: "Headquarters floor plate", type: "pdf", uploadedAt: "2026-06-12" },
  { id: "plan-3", projectId: "proj-3", name: "Campus access zones", type: "image", uploadedAt: "2026-05-19", previewUrl: "" }
];

export const checklists: Checklist[] = [
  { id: "check-1", title: "Network closet turnover", scope: "Task", items: ["Label patch panels", "Photograph rack", "Confirm uplink", "Attach as-built notes"] },
  { id: "check-2", title: "Account closeout", scope: "Account", items: ["Collect approvals", "Export photos", "Send client packet"] },
  { id: "check-3", title: "Security install QA", scope: "Project", items: ["Validate camera angles", "Run access test", "Confirm retention policy"] }
];

export const tasks: Task[] = [
  { id: "task-1", projectId: "proj-1", floorPlanId: "plan-1", title: "IT room router cutover", category: "Network", status: "In Progress", assigneeId: "emp-4", priority: "High", dueDate: "2026-06-19", checklistIds: ["check-1"], x_percent: 28, y_percent: 34, description: "Replace temporary router, verify VLAN routing, and capture rack photo." },
  { id: "task-2", projectId: "proj-1", floorPlanId: "plan-1", title: "Firewall handoff label", category: "Security", status: "Scheduled", assigneeId: "emp-1", priority: "Medium", dueDate: "2026-06-20", checklistIds: ["check-3"], x_percent: 63, y_percent: 42, description: "Apply final labels and update the client handoff sheet." },
  { id: "task-3", projectId: "proj-1", floorPlanId: "plan-1", title: "Nurse station access reader", category: "Access Control", status: "Backlog", assigneeId: "emp-4", priority: "Medium", dueDate: "2026-06-24", checklistIds: [], x_percent: 46, y_percent: 72, description: "Install badge reader and confirm door schedule." },
  { id: "task-4", projectId: "proj-2", floorPlanId: "plan-2", title: "Conference room A/V rough-in", category: "A/V", status: "Blocked", assigneeId: "emp-2", priority: "High", dueDate: "2026-06-26", checklistIds: [], x_percent: 52, y_percent: 51, description: "Waiting on ceiling grid access before cable pull." },
  { id: "task-5", projectId: "proj-3", floorPlanId: "plan-3", title: "Final access report", category: "Closeout", status: "Done", assigneeId: "emp-3", priority: "Low", dueDate: "2026-06-14", checklistIds: ["check-2"], description: "Package final notes and client signoff." }
];

export const templates: Template[] = [
  { id: "tmpl-1", name: "Low-voltage project", type: "Project", updatedAt: "2026-06-11", sections: ["Discovery", "Plan", "Install", "QA", "Closeout"] },
  { id: "tmpl-2", name: "Floor plan task", type: "Task", updatedAt: "2026-06-10", sections: ["Location", "Materials", "Checklist", "Photos"] },
  { id: "tmpl-3", name: "Client closeout", type: "Checklist", updatedAt: "2026-05-31", sections: ["Approvals", "Assets", "Archive"] }
];

export const timeEntries: TimeEntry[] = [
  { id: "time-1", employeeId: "emp-1", projectId: "proj-1", date: "2026-06-17", clockIn: "07:58", breakMinutes: 30, hours: 6.4, locationStatus: "Inside geofence" },
  { id: "time-2", employeeId: "emp-2", projectId: "proj-2", date: "2026-06-17", clockIn: "08:24", breakMinutes: 20, hours: 4.1, locationStatus: "Manual review" },
  { id: "time-3", employeeId: "emp-3", projectId: "proj-3", date: "2026-06-17", clockIn: "07:41", breakMinutes: 15, hours: 5.7, locationStatus: "Inside geofence" },
  { id: "time-4", employeeId: "emp-4", projectId: "proj-1", date: "2026-06-16", clockIn: "08:10", clockOut: "16:36", breakMinutes: 45, hours: 7.7, locationStatus: "Remote" }
];

export const galleryPhotos: GalleryPhoto[] = [
  { id: "photo-1", projectId: "proj-1", title: "Rack before turnover", category: "Network", url: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=900&q=80", uploadedBy: "emp-4", uploadedAt: "2026-06-16" },
  { id: "photo-2", projectId: "proj-1", title: "Clinical corridor device", category: "Access Control", url: "https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?auto=format&fit=crop&w=900&q=80", uploadedBy: "emp-1", uploadedAt: "2026-06-15" },
  { id: "photo-3", projectId: "proj-2", title: "Conference room ceiling", category: "A/V", url: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", uploadedBy: "emp-2", uploadedAt: "2026-06-14" }
];

export const activityLog: ActivityItem[] = [
  { id: "act-1", projectId: "proj-1", actorId: "emp-1", action: "moved Firewall handoff label to Scheduled", timestamp: "2026-06-17 10:22" },
  { id: "act-2", projectId: "proj-1", actorId: "emp-4", action: "uploaded Rack before turnover", timestamp: "2026-06-16 16:08" },
  { id: "act-3", projectId: "proj-2", actorId: "emp-2", action: "created A/V rough-in blocker", timestamp: "2026-06-17 09:47" }
];

export function findProject(id?: string) {
  return projects.find((project) => project.id === id) ?? projects[0];
}

export function employeeName(id: string) {
  return employees.find((employee) => employee.id === id)?.name ?? "Unassigned";
}

export function clientName(id: string) {
  return clients.find((client) => client.id === id)?.name ?? "Unknown client";
}
