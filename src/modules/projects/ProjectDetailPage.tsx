import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Image,
  LayoutDashboard,
  ListChecks,
  MessageSquare,
  Search,
  Star,
  Upload,
  X
} from "lucide-react";
import { useEffect, useRef, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Drawer } from "@/shared/components/Drawer";
import { StatusBadge } from "@/shared/components/StatusBadge";
import type { Project, Task } from "@/shared/types/domain";
import { categories, clientName, employees, taskStatuses } from "@/infrastructure/offline/mockData";
import { hapticImpact, hapticSelection, ImpactStyle } from "@/infrastructure/capacitor/haptics";
import { ensureProjectPhotoPermissions } from "@/infrastructure/capacitor/cameraPermissions";
import { GalleryGrid } from "./ProjectGalleryPage";
import { ProjectPlanWorkspace } from "./ProjectPlanWorkspace";
import { TaskBoard } from "./TaskBoard";
import { useProjectBundle } from "./projectHelpers";
import { phaseStatuses, statusByCode } from "./statusModel";

type WorkspaceSection = "overview" | "plans" | "tasks" | "photos" | "files" | "checklists" | "activity";

const workspaceLabels: Record<WorkspaceSection, string> = {
  overview: "Overview",
  plans: "Plans",
  tasks: "Tasks",
  photos: "Photos",
  files: "Files",
  checklists: "Checklists",
  activity: "Activity"
};

const workspaceItems = [
  { label: "Overview", section: "overview", icon: LayoutDashboard },
  { label: "Plans", section: "plans", icon: Image },
  { label: "Tasks", section: "tasks", icon: ListChecks },
  { label: "Photos", section: "photos", icon: Image },
  { label: "Files", section: "files", icon: FileText },
  { label: "Checklists", section: "checklists", icon: ClipboardCheck },
  { label: "Activity", section: "activity", icon: Activity }
] satisfies { label: string; section: WorkspaceSection; icon: typeof Activity }[];

export function ProjectDetailPage({ initialSection = "overview" }: { initialSection?: WorkspaceSection }) {
  const { projectId, planId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [statusOpen, setStatusOpen] = useState(false);
  const [favorite, setFavorite] = useState(false);
  const [sectionDrawerOpen, setSectionDrawerOpen] = useState(false);
  const edgeGestureStartX = useRef<number | null>(null);
  const { project, projectTasks, projectPlans, projectPhotos, projectActivity, employeeName, addFloorPlan, updateFloorPlan, deleteFloorPlan, duplicateFloorPlan, repairFloorPlanPreview, addTask, updateTask, deleteTask, updateProject } = useProjectBundle(projectId);

  useEffect(() => {
    function handleOpenProjectSections() {
      hapticImpact(ImpactStyle.Light);
      setSectionDrawerOpen(true);
    }
    window.addEventListener("clearplan:open-project-sections", handleOpenProjectSections);
    return () => window.removeEventListener("clearplan:open-project-sections", handleOpenProjectSections);
  }, []);

  if (!project) {
    return (
      <div className="grid min-h-[calc(100vh-64px)] place-items-center bg-[#f5f7fb] p-6">
        <section className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Project not found</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-950">No project matches this route.</h1>
          <p className="mt-3 text-sm font-medium text-slate-500">The project ID may have been removed or the link may be stale.</p>
          <button onClick={() => navigate("/projects")} className="mt-6 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
            Back to projects
          </button>
        </section>
      </div>
    );
  }

  const currentProject = project;
  const requestedSection = searchParams.get("section") as WorkspaceSection | null;
  const activeSection = isWorkspaceSection(requestedSection) ? requestedSection : initialSection;
  const projectPhase = statusByCode(currentProject.phaseCode ?? "phase-3");
  const completeTasks = projectTasks.filter((task) => task.status === "Done").length;
  const openTasks = projectTasks.length - completeTasks;
  const sectionTitle = workspaceLabels[activeSection] ?? "Overview";

  function openSectionDrawer() {
    hapticImpact(ImpactStyle.Light);
    setSectionDrawerOpen(true);
  }

  function closeSectionDrawer() {
    hapticImpact(ImpactStyle.Light);
    setSectionDrawerOpen(false);
  }

  function navigateSection(section: WorkspaceSection) {
    hapticSelection();
    setSectionDrawerOpen(false);
    navigate(`/projects/${currentProject.id}/${section}`);
  }

  return (
    <div
      className={`bg-[#f5f7fb] ${activeSection === "plans" ? "h-full min-h-0 overflow-hidden" : "min-h-[calc(100vh-64px)]"}`}
      onPointerDown={(event) => {
        if (event.pointerType !== "touch" || event.clientX > 24) return;
        edgeGestureStartX.current = event.clientX;
      }}
      onPointerUp={(event) => {
        if (edgeGestureStartX.current === null) return;
        const delta = event.clientX - edgeGestureStartX.current;
        edgeGestureStartX.current = null;
        if (delta > 64) openSectionDrawer();
      }}
    >
        <ProjectSectionDrawer
          projectName={project.name}
          activeSection={activeSection}
          open={sectionDrawerOpen}
          onClose={closeSectionDrawer}
          onNavigate={navigateSection}
        />
        <div className={`min-w-0 ${activeSection === "plans" ? "h-full min-h-0 p-0" : ""}`}>
          {activeSection !== "plans" && <section className="mb-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="mb-4 flex items-center gap-2">
                  <button onClick={() => navigate("/projects")} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-950">
                    <ArrowLeft size={16} />
                    Projects
                  </button>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-500">{sectionTitle}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="truncate text-2xl font-bold text-slate-950 sm:text-3xl">{project.name}</h1>
                  <div className="relative">
                    <button onClick={() => setStatusOpen((open) => !open)} className={`rounded-lg border px-2 py-1 text-[11px] font-semibold ${projectPhase.classes}`}>
                      {project.phaseLabel ?? projectPhase.label}
                    </button>
                    {statusOpen && (
                      <div className="absolute left-0 top-10 z-30 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-[0_22px_44px_rgba(15,23,42,0.16)]">
                        {phaseStatuses.map((status) => (
                          <button
                            key={status.code}
                            onClick={() => {
                              updateProject(project.id, { status: status.projectStatus, phaseCode: status.code, phaseLabel: status.label });
                              setStatusOpen(false);
                            }}
                            className="block w-full px-3 py-2 text-left text-xs font-semibold transition hover:bg-slate-50"
                          >
                            <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10.5px] ${status.classes}`}>{status.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-slate-500 md:grid-cols-2 xl:grid-cols-4">
                  <Meta label="Client" value={clientName(project.clientId)} />
                  <Meta label="Address" value={project.address} />
                  <Meta label="Manager" value={employeeName(project.managerId)} />
                  <Meta label="Team" value={`${project.assignedUserIds.length} assigned`} />
                </div>
              </div>
              <button onClick={() => setFavorite((value) => !value)} aria-label={favorite ? "Remove favorite" : "Add favorite"} className="rounded-full border border-slate-200 p-2.5 text-slate-500 transition hover:bg-amber-50 hover:text-amber-500">
                <Star size={18} className={favorite ? "fill-amber-400 text-amber-400" : ""} />
              </button>
            </div>
          </section>}

          {activeSection === "overview" && (
            <OverviewSection
              project={project}
              projectPhase={project.phaseLabel ?? projectPhase.label}
              openTasks={openTasks}
              completeTasks={completeTasks}
              planCount={projectPlans.length}
              photoCount={projectPhotos.length}
              projectActivity={projectActivity}
              employeeName={employeeName}
              updateProject={updateProject}
            />
          )}
          {activeSection === "plans" && <ProjectPlanWorkspace project={project} projectPlans={projectPlans} projectTasks={projectTasks} initialPlanId={planId} onOpenSections={openSectionDrawer} addFloorPlan={addFloorPlan} updateFloorPlan={updateFloorPlan} deleteFloorPlan={deleteFloorPlan} duplicateFloorPlan={duplicateFloorPlan} repairFloorPlanPreview={repairFloorPlanPreview} addTask={addTask} updateTask={updateTask} deleteTask={deleteTask} />}
          {activeSection === "tasks" && <TasksSection tasks={projectTasks} onSelect={setSelectedTask} />}
          {activeSection === "photos" && <PhotosSection photos={projectPhotos} />}
          {activeSection === "files" && <FilesSection />}
          {activeSection === "checklists" && <ChecklistsSection />}
          {activeSection === "activity" && <ActivitySection activity={projectActivity} employeeName={employeeName} />}

          <Drawer title={selectedTask?.title ?? "Task detail"} open={Boolean(selectedTask)} onClose={() => setSelectedTask(null)}>
            {selectedTask && <TaskDetailContent task={selectedTask} onTaskChange={(patch) => updateTask(selectedTask.id, patch)} />}
          </Drawer>
        </div>
    </div>
  );
}

function ProjectSectionDrawer({
  projectName,
  activeSection,
  open,
  onClose,
  onNavigate
}: {
  projectName: string;
  activeSection: WorkspaceSection;
  open: boolean;
  onClose: () => void;
  onNavigate: (section: WorkspaceSection) => void;
}) {
  const dragStartX = useRef<number | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/45 backdrop-blur-[1px] lg:hidden" onClick={onClose}>
      <aside
        className="safe-top safe-bottom flex h-full w-[min(18rem,calc(100vw-3.5rem))] animate-[drawerIn_180ms_ease-out] flex-col border-r border-white/10 bg-slate-950 text-slate-200 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => {
          if (event.pointerType === "touch") dragStartX.current = event.clientX;
        }}
        onPointerUp={(event) => {
          if (dragStartX.current === null) return;
          const delta = event.clientX - dragStartX.current;
          dragStartX.current = null;
          if (delta < -56) onClose();
        }}
      >
        <div className="flex h-20 items-center justify-between gap-3 border-b border-white/10 px-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{projectName}</p>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Project workspace</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close project sections" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 text-slate-300 active:scale-95">
            <X size={17} />
          </button>
        </div>
        <nav className="app-scroll min-h-0 flex-1 space-y-1 overflow-y-auto p-3 scrollbar-soft" aria-label="Project sections">
          {workspaceItems.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.section;
            return (
              <button
                key={item.section}
                type="button"
                onClick={() => onNavigate(item.section)}
                className={`flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition active:scale-[0.99] ${active ? "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]" : "text-slate-300 hover:bg-white/10 hover:text-white"}`}
              >
                <Icon size={18} aria-hidden="true" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>
    </div>
  );
}

function isWorkspaceSection(value: string | null): value is WorkspaceSection {
  return value === "overview" || value === "plans" || value === "tasks" || value === "photos" || value === "files" || value === "checklists" || value === "activity";
}

export function TaskDetailContent({ task, onTaskChange }: { task: Task; onOpenPage?: () => void; onTaskChange?: (patch: Partial<Task>) => void }) {
  return (
    <div className="space-y-5">
      <StatusBadge>{task.status}</StatusBadge>
      <p className="text-slate-600">{task.description}</p>
      <div className="grid gap-3 text-sm">
        <Info label="Category" value={task.category} />
        <Info label="Priority" value={task.priority} />
        <Info label="Assignee" value={employees.find((employee) => employee.id === task.assigneeId)?.name ?? "Unassigned"} />
        <Info label="Due" value={task.dueDate} />
        {typeof task.x_percent === "number" && <Info label="Plan coordinates" value={`${task.x_percent}% x, ${task.y_percent}% y`} />}
      </div>
      <Select label="Status manager" value={task.status} onChange={(value) => onTaskChange?.({ status: value as Task["status"] })} options={taskStatuses} />
      <Select label="Category selector" value={task.category} onChange={(value) => onTaskChange?.({ category: value })} options={categories.map((category) => category.name)} />
      <Select label="Assignee" value={task.assigneeId} onChange={(value) => onTaskChange?.({ assigneeId: value })} options={employees.map((employee) => employee.id)} labels={Object.fromEntries(employees.map((employee) => [employee.id, employee.name]))} />
    </div>
  );
}

function OverviewSection({
  project,
  projectPhase,
  openTasks,
  completeTasks,
  planCount,
  photoCount,
  projectActivity,
  employeeName,
  updateProject
}: {
  project: Project;
  projectPhase: string;
  openTasks: number;
  completeTasks: number;
  planCount: number;
  photoCount: number;
  projectActivity: ReturnType<typeof useProjectBundle>["projectActivity"];
  employeeName: (id: string) => string;
  updateProject: (projectId: string, patch: Partial<Project>) => void;
}) {
  const stats = [
    ["Progress", `${project.progress}%`],
    ["Open tasks", String(openTasks)],
    ["Completed", String(completeTasks)],
    ["Plans", String(planCount)],
    ["Photos", String(photoCount)]
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold text-slate-950">Project summary</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Info label="Phase" value={projectPhase} />
          <Info label="Client" value={clientName(project.clientId)} />
          <Info label="Address" value={project.address} />
          <Info label="Manager" value={employeeName(project.managerId)} />
          <Info label="Team" value={`${project.assignedUserIds.length} members`} />
          <Info label="Status" value={project.status} />
        </div>
        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm font-semibold text-slate-600"><span>Progress</span><span>{project.progress}%</span></div>
          <input type="range" min={0} max={100} value={project.progress} onChange={(event) => updateProject(project.id, { progress: Number(event.target.value) })} className="w-full accent-blue-600" aria-label="Project progress" />
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-bold text-slate-950">Workspace health</h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {stats.map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-950">{value}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft xl:col-span-2">
        <h2 className="text-xl font-bold text-slate-950">Recent activity</h2>
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {projectActivity.slice(0, 3).map((item) => (
            <div key={item.id} className="rounded-2xl bg-slate-50 p-4">
              <Activity className="text-blue-600" size={18} />
              <p className="mt-3 font-semibold text-slate-800">{employeeName(item.actorId)} {item.action}</p>
              <p className="mt-1 text-sm text-slate-500">{item.timestamp}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TasksSection({ tasks, onSelect }: { tasks: Task[]; onSelect: (task: Task) => void }) {
  const [mode, setMode] = useState<"Board" | "List">("Board");
  const [status, setStatus] = useState("All");
  const [assignee, setAssignee] = useState("All");
  const [category, setCategory] = useState("All");
  const [priority, setPriority] = useState("All");
  const filtered = useMemo(() => tasks.filter((task) => {
    return (status === "All" || task.status === status) && (assignee === "All" || task.assigneeId === assignee) && (category === "All" || task.category === category) && (priority === "All" || task.priority === priority);
  }), [assignee, category, priority, status, tasks]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex rounded-2xl bg-slate-100 p-1">
            {(["Board", "List"] as const).map((item) => (
              <button key={item} onClick={() => setMode(item)} className={`rounded-xl px-4 py-2 text-sm font-semibold ${mode === item ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"}`}>{item}</button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <MiniSelect value={status} onChange={setStatus} options={["All", ...taskStatuses]} label="Status" />
            <MiniSelect value={assignee} onChange={setAssignee} options={["All", ...employees.map((employee) => employee.id)]} labels={Object.fromEntries(employees.map((employee) => [employee.id, employee.name]))} label="Assignee" />
            <MiniSelect value={category} onChange={setCategory} options={["All", ...categories.map((item) => item.name)]} label="Category" />
            <MiniSelect value={priority} onChange={setPriority} options={["All", "Low", "Medium", "High"]} label="Priority" />
          </div>
        </div>
      </section>
      {mode === "Board" && <TaskBoard tasks={filtered} onSelect={onSelect} />}
      {mode === "List" && (
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="space-y-2">
            {filtered.map((task) => (
              <button key={task.id} onClick={() => onSelect(task)} className="grid w-full gap-3 rounded-2xl bg-slate-50 p-4 text-left text-sm transition hover:bg-blue-50 md:grid-cols-[1fr_150px_150px_100px]">
                <span className="font-semibold text-slate-900">{task.title}</span>
                <span>{task.status}</span>
                <span>{task.category}</span>
                <span>{task.priority}</span>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PhotosSection({ photos }: { photos: ReturnType<typeof useProjectBundle>["projectPhotos"] }) {
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Photos</h2>
          <p className="mt-1 text-sm text-slate-500">Gallery-ready project media.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            hapticImpact(ImpactStyle.Light);
            void ensureProjectPhotoPermissions();
          }}
          className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"
        >
          <Upload size={17} />Upload
        </button>
      </section>
      {photos.length ? <GalleryGrid photos={photos} /> : <EmptyWorkspace icon={Image} title="No photos yet" detail="Upload jobsite photos when they are ready." />}
    </div>
  );
}

function FilesSection() {
  const files = ["Client packet.pdf", "Plans / IFC set", "Materials.csv", "Closeout / As-built notes.docx"];
  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
        <h2 className="text-xl font-bold text-slate-950">Files</h2>
        <button className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]"><Upload size={17} />Upload</button>
      </section>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {files.map((file) => (
          <section key={file} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <FileText className="text-blue-600" size={24} />
            <h3 className="mt-3 font-bold text-slate-900">{file}</h3>
            <p className="mt-2 text-sm text-slate-500">Folder-backed mock file record.</p>
          </section>
        ))}
      </div>
    </div>
  );
}

function ChecklistsSection() {
  const checklistGroups = [
    { title: "Project checklists", icon: ClipboardCheck, items: ["Site readiness", "Install QA", "Client walkthrough"], done: 2 },
    { title: "Task checklists", icon: CheckCircle2, items: ["Network closet turnover", "Security install QA", "Photo documentation"], done: 1 }
  ];

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {checklistGroups.map((group) => (
        <section key={group.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
          <group.icon className="text-blue-600" size={24} />
          <h2 className="mt-3 text-xl font-bold text-slate-950">{group.title}</h2>
          <div className="mt-5 space-y-3">
            {group.items.map((item, index) => (
              <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
                <span className="font-semibold text-slate-700">{item}</span>
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${index < group.done ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{index < group.done ? "Complete" : "Open"}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function ActivitySection({ activity, employeeName }: { activity: ReturnType<typeof useProjectBundle>["projectActivity"]; employeeName: (id: string) => string }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-slate-950">Activity</h2>
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2">
          <Search size={16} className="text-slate-400" />
          <input placeholder="Filter activity" className="w-44 border-none bg-transparent text-sm outline-none placeholder:text-slate-400" />
        </div>
      </div>
      <div className="mt-6 space-y-4">
        {activity.map((item) => (
          <div key={item.id} className="flex gap-3 rounded-2xl bg-slate-50 p-4">
            <MessageSquare className="mt-0.5 text-blue-600" size={20} />
            <div>
              <p className="font-semibold text-slate-900">{employeeName(item.actorId)} {item.action}</p>
              <p className="text-sm text-slate-500">{item.timestamp}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function EmptyWorkspace({ icon: Icon, title, detail }: { icon: typeof Image; title: string; detail: string }) {
  return (
    <section className="grid min-h-72 place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-soft">
      <div>
        <Icon className="mx-auto text-blue-600" size={30} />
        <h2 className="mt-3 text-xl font-bold text-slate-950">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{detail}</p>
      </div>
    </section>
  );
}

function MiniSelect({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="text-xs font-semibold uppercase text-slate-400">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm normal-case text-slate-700 outline-none focus:border-blue-600">
        {options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}
      </select>
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</span>
      <p className="mt-1 font-semibold text-slate-700">{value}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function Select({ label, value, onChange, options, labels = {} }: { label: string; value: string; onChange: (value: string) => void; options: string[]; labels?: Record<string, string> }) {
  return (
    <label className="text-sm font-semibold text-slate-500">
      {label}
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-slate-700 outline-none focus:border-blue-600">
        {options.map((option) => <option key={option} value={option}>{labels[option] ?? option}</option>)}
      </select>
    </label>
  );
}
