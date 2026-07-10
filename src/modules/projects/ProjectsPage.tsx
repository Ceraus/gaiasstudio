import {
  Archive,
  ArrowDownAZ,
  ArrowUpAZ,
  CheckSquare,
  Crown,
  Filter,
  Pencil,
  MoreVertical,
  Plus,
  Search,
  Star,
  Trash2,
  Users
} from "lucide-react";
import { useEffect, useMemo, useState, type ComponentType, type MouseEvent as ReactMouseEvent } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Modal } from "@/shared/components/Modal";
import { clients, dashboardProjectId, employees } from "@/infrastructure/offline/mockData";
import { useDemoData } from "@/app/providers/DemoDataProvider";
import type { ProjectStatus } from "@/shared/types/domain";
import { hapticImpact, hapticSelection, hapticSuccess, ImpactStyle } from "@/infrastructure/capacitor/haptics";
import { phaseStatuses, statusByCode, statusByLegacy } from "./statusModel";

type DashboardPhase = string;

interface DashboardProject {
  id: string;
  name: string;
  address: string;
  phase: DashboardPhase;
  phaseDetail: string;
  statusCode: string;
  people: number;
  tasks: number;
  favorite: boolean;
  detailProjectId: string;
}

type DashboardOverlay =
  | { kind: "menu"; projectId: string; rect: DOMRect }
  | { kind: "status"; projectId: string; rect: DOMRect };

const phaseOptions = ["Phase 1", "Phase 2", "Phase 3", "Phase 4", "Phase 5", "Phase 6", "Phase 7"];

const seededDashboardProjects: DashboardProject[] = [
  ["dash-1", "HERE Arts Center", "145 6th Ave", "Phase 3", "Approved", 3, 8, false, "proj-1"],
  ["dash-2", "Adaptive Build", "200 Park Ave S, Suite 1702", "Phase 2", "Quote Sent", 5, 12, false, "proj-2"],
  ["dash-3", "AO Management", "287 Park Ave S", "Phase 1", "Site Visit", 3, 9, false, "proj-3"],
  ["dash-4", "Atlas Wellness Clinic", "505 8th Ave, 12th Floor", "Phase 2", "Quote Sent", 3, 11, false, "proj-1"],
  ["dash-5", "Bharati Center", "305 Schermerhorn St", "Phase 2", "Quote Sent", 3, 10, false, "proj-2"],
  ["dash-6", "Dailymotion", "150 W 22nd St 12 Floor", "Phase 7", "Job Completed Pending Payment", 5, 18, false, "proj-3"],
  ["dash-7", "Earned", "287 Park Ave S 7th Floor", "Phase 5", "Job Completed", 5, 16, false, "proj-1"],
  ["dash-8", "Fever Up", "483-485 Broadway", "Phase 4", "Installation in Progress", 5, 14, false, "proj-2"],
  ["dash-9", "Herald Center", "1239 Broadway", "Phase 3", "Approved", 3, 8, false, "proj-3"],
  ["dash-10", "Herald Towers Elevator project", "HT Elevators 2026", "Phase 3", "Approved", 3, 7, false, "proj-1"],
  ["dash-11", "Instant One", "53W 21th St", "Phase 2", "Quote Sent", 3, 9, false, "proj-2"],
  ["dash-12", "Irving Realty", "33W 17th St", "Phase 1", "Site Visit", 3, 6, false, "proj-3"],
  ["dash-13", "Jembrealty", "150 Broadway 4th Floor", "Phase 1", "Site Visit", 5, 13, false, "proj-1"],
  ["dash-14", "Khaite", "65 Bleeker Street 9th floor", "Phase 3", "Approved", 5, 19, false, "proj-2"],
  ["dash-15", "Le Parc", "287 Park Ave S", "Phase 4", "Installation in Progress", 4, 15, false, "proj-3"],
  ["dash-16", "Metaforms AI", "30 East 23rd Street", "Phase 7", "Job Completed Pending Payment", 5, 20, false, "proj-1"],
  ["dash-17", "Neighborhood Restore", "150 Broadway", "Phase 7", "Job Completed Pending Payment", 4, 17, false, "proj-2"],
  ["dash-18", "Park Pictures", "184 5th Ave", "Phase 1", "Site Visit", 6, 14, false, "proj-3"],
  ["dash-19", "Pharsalus", "200 Varick St, Floor 8", "Phase 2", "Quote Sent", 3, 8, false, "proj-1"],
  ["dash-20", "Phaze App", "330 7th Ave 21th Floor", "Phase 5", "Job Completed", 5, 16, false, "proj-2"],
  ["dash-21", "Probook AI", "130 Madison Avenue", "Phase 2", "Quote Sent", 3, 9, false, "proj-3"],
  ["dash-22", "Runway", "18 West 18th Street, Floor 8", "Phase 7", "Job Completed Pending Payment", 3, 11, false, "proj-1"],
  ["dash-23", "SFI Sunbeth", "375 9th Avenue", "Phase 1", "Site Visit", 3, 7, false, "proj-2"],
  ["dash-24", "Skillz", "150 Broadway 15th Floor", "Phase 4", "Installation in Progress", 5, 13, false, "proj-3"],
  ["dash-25", "Sola Salon", "50 W 17th Street", "Phase 4", "Installation in Progress", 5, 15, false, "proj-1"],
  ["dash-26", "Sola Salon", "666 Broadway", "Phase 4", "Installation in Progress", 5, 12, false, "proj-2"],
  ["dash-27", "Still Here", "905 Madison Ave", "Phase 2", "Quote Sent", 3, 10, false, "proj-3"],
  ["dash-28", "Sutton Smyth", "155 E 55th St #6C", "Phase 7", "Job Completed Pending Payment", 5, 17, false, "proj-1"],
  ["dash-29", "The Globe Show Room", "236W 38th St", "Phase 2", "Quote Sent", 3, 8, false, "proj-2"],
  ["dash-30", "Too Lost", "915 Broadway 801", "Phase 5", "Job Completed", 5, 15, false, "proj-3"]
].map(([id, name, address, phase, phaseDetail, people, tasks, favorite]) => ({
  id: String(id),
  name: String(name),
  address: String(address),
  phase: phase as DashboardPhase,
  phaseDetail: String(phaseDetail),
  statusCode: statusByLegacy(String(phase), String(phaseDetail)).code,
  people: Number(people),
  tasks: Number(tasks),
  favorite: Boolean(favorite),
  detailProjectId: dashboardProjectId(String(id))
}));

export function ProjectsPage() {
  const navigate = useNavigate();
  const { projects: cachedProjects, addProject, updateProject } = useDemoData();
  const [projects, setProjects] = useState<DashboardProject[]>(seededDashboardProjects);
  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [phaseFilter, setPhaseFilter] = useState<DashboardPhase | "All">("All");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [overlay, setOverlay] = useState<DashboardOverlay | null>(null);
  const [deleteProject, setDeleteProject] = useState<DashboardProject | null>(null);
  const [draft, setDraft] = useState({ name: "", address: "", phase: "Phase 2" as DashboardPhase });

  useEffect(() => {
    setProjects((current) => {
      const knownDetailIds = new Set(current.map((project) => project.detailProjectId));
      const additions = cachedProjects
        .filter((project) => !knownDetailIds.has(project.id))
        .map((project) => {
          const status = statusByCode(project.phaseCode ?? "phase-2");
          return {
            id: `dash-${project.id}`,
            name: project.name,
            address: project.address,
            phase: status.label.split(" - ")[0] as DashboardPhase,
            phaseDetail: status.label.split(" - ").slice(1).join(" - "),
            statusCode: status.code,
            people: project.assignedUserIds.length,
            tasks: 0,
            favorite: false,
            detailProjectId: project.id
          };
        });
      return additions.length ? [...additions, ...current] : current;
    });
  }, [cachedProjects]);

  const visibleProjects = useMemo(() => {
    return projects
      .filter((project) => {
        const matchesSearch = `${project.name} ${project.address}`.toLowerCase().includes(search.toLowerCase());
        const matchesPhase = phaseFilter === "All" || project.phase.startsWith(phaseFilter);
        return matchesSearch && matchesPhase;
      })
      .sort((a, b) => (sortDirection === "asc" ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)));
  }, [phaseFilter, projects, search, sortDirection]);

  function createProject() {
    if (!draft.name.trim() || !draft.address.trim()) return;
    const created = addProject({
      name: draft.name.trim(),
      address: draft.address.trim(),
      clientId: clients[0]?.id ?? "client-1",
      managerId: employees[0]?.id ?? "emp-1",
      status: phaseToProjectStatus(draft.phase)
    });
    const dashboardProject: DashboardProject = {
      id: `dash-${Date.now()}`,
      name: draft.name.trim(),
      address: draft.address.trim(),
      phase: draft.phase,
      phaseDetail: defaultPhaseDetail(draft.phase),
      statusCode: statusByLegacy(draft.phase, defaultPhaseDetail(draft.phase)).code,
      people: 3,
      tasks: 0,
      favorite: false,
      detailProjectId: created.id
    };
    setProjects((current) => [dashboardProject, ...current]);
    setDraft({ name: "", address: "", phase: "Phase 2" });
    setModalOpen(false);
    hapticSuccess();
  }

  function toggleFavorite(projectId: string) {
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, favorite: !project.favorite } : project)));
  }

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function updateDashboardStatus(projectId: string, statusCode: string) {
    const status = statusByCode(statusCode);
    const phase = status.label.split(" - ")[0] as DashboardPhase;
    const phaseDetail = status.label.split(" - ").slice(1).join(" - ");
    setProjects((current) => current.map((project) => (project.id === projectId ? { ...project, phase, phaseDetail, statusCode } : project)));
    const project = projects.find((item) => item.id === projectId);
    if (project) updateProject(project.detailProjectId, { status: status.projectStatus, phaseCode: status.code, phaseLabel: status.label });
    setOverlay(null);
    showToast(`Status updated to ${status.label}`);
    hapticSelection();
  }

  function duplicateDashboardProject(project: DashboardProject) {
    const created = addProject({
      name: `${project.name} Copy`,
      address: project.address,
      clientId: clients[0]?.id ?? "client-1",
      managerId: employees[0]?.id ?? "emp-1",
      status: statusByCode(project.statusCode).projectStatus
    });
    setProjects((current) => [{ ...project, id: `dash-${Date.now()}`, name: `${project.name} Copy`, detailProjectId: created.id, favorite: false }, ...current]);
    setOverlay(null);
    showToast("Project duplicated");
  }

  function removeDashboardProject(projectId: string) {
    setProjects((current) => current.filter((project) => project.id !== projectId));
    setDeleteProject(null);
    setOverlay(null);
    showToast("Project deleted");
  }

  function openMenu(projectId: string, rect: DOMRect) {
    setOverlay((current) => (current?.kind === "menu" && current.projectId === projectId ? null : { kind: "menu", projectId, rect }));
  }

  function openStatus(projectId: string, rect: DOMRect) {
    setOverlay((current) => (current?.kind === "status" && current.projectId === projectId ? null : { kind: "status", projectId, rect }));
  }

  useEffect(() => {
    if (!overlay) return;
    function closeOnDocumentClick() {
      setOverlay(null);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOverlay(null);
    }
    document.addEventListener("click", closeOnDocumentClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("click", closeOnDocumentClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [overlay]);

  const overlayProject = overlay ? projects.find((project) => project.id === overlay.projectId) : undefined;

  return (
    <div className="min-h-screen bg-[#f5f7fa] text-[#334155]">
      <main className="w-full px-3 pb-[calc(6.75rem+var(--safe-bottom))] pt-5 sm:px-4 md:px-6 lg:px-8 lg:pb-16 lg:pt-8">
        <div className="border-b border-slate-200">
          <h1 className="inline-block border-b-2 border-[#2563eb] px-1 pb-3 text-[15px] font-semibold text-slate-800">My projects (38)</h1>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 sm:mt-8">
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                hapticImpact(ImpactStyle.Light);
                setModalOpen(true);
              }}
              className="compact-control inline-flex h-9 items-center gap-2 rounded-lg bg-[#2563eb] px-3 text-sm font-semibold text-white shadow-[0_6px_14px_rgba(37,99,235,0.16)] transition hover:-translate-y-0.5 hover:bg-[#1d4ed8]"
            >
              <Plus size={15} />
              New project
            </button>
          </div>

          <div className="flex flex-1 flex-wrap items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setSortDirection((direction) => (direction === "asc" ? "desc" : "asc"))}
              className="compact-control inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
            >
              {sortDirection === "asc" ? <ArrowDownAZ size={15} /> : <ArrowUpAZ size={15} />}
              Sort
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setFilterOpen((open) => !open)}
                className="compact-control inline-flex h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-600 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900"
              >
                <Filter size={15} />
                Filter
              </button>
              {filterOpen && (
                <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1 shadow-[0_22px_44px_rgba(15,23,42,0.12)]">
                  {(["All", ...phaseOptions] as const).map((phase) => (
                    <button
                      key={phase}
                      type="button"
                      onClick={() => {
                        setPhaseFilter(phase);
                        setFilterOpen(false);
                      }}
                      className={`block w-full px-4 py-2.5 text-left text-sm transition hover:bg-slate-50 ${phaseFilter === phase ? "font-semibold text-[#2563eb]" : "text-slate-600"}`}
                    >
                      {phase === "All" ? "All phases" : phase}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="relative block min-w-[min(100%,18rem)] max-w-full flex-1 sm:flex-none">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa3af]" size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search projects"
                placeholder="Search projects"
                className="compact-control h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100 sm:w-72"
              />
            </label>
          </div>
        </div>

        <section className="mt-6 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3 min-[1800px]:grid-cols-4">
          {visibleProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onToggleFavorite={toggleFavorite}
              onOpen={() => {
                hapticImpact(ImpactStyle.Medium);
                navigate(`/projects/${project.detailProjectId}/plans`);
              }}
              onOpenMenu={(rect) => openMenu(project.id, rect)}
              onOpenStatus={(rect) => openStatus(project.id, rect)}
              onEdit={() => {
                setOverlay(null);
                navigate(`/projects/${project.detailProjectId}/plans`);
              }}
              onDuplicate={() => duplicateDashboardProject(project)}
              onArchive={() => {
                setProjects((current) => current.filter((item) => item.id !== project.id));
                setOverlay(null);
                showToast("Project archived");
              }}
              onDelete={() => setDeleteProject(project)}
            />
          ))}
        </section>
      </main>

      {overlay && overlayProject && (
        <DashboardCardOverlay
          overlay={overlay}
          project={overlayProject}
          onClose={() => setOverlay(null)}
          onOpenStatus={(rect) => openStatus(overlayProject.id, rect)}
          onStatusChange={(statusCode) => updateDashboardStatus(overlayProject.id, statusCode)}
          onEdit={() => {
            setOverlay(null);
            navigate(`/projects/${overlayProject.detailProjectId}/plans`);
          }}
          onDuplicate={() => duplicateDashboardProject(overlayProject)}
          onArchive={() => {
            setProjects((current) => current.filter((item) => item.id !== overlayProject.id));
            setOverlay(null);
            showToast("Project archived");
          }}
          onDelete={() => {
            setOverlay(null);
            setDeleteProject(overlayProject);
          }}
        />
      )}

      <Modal title="New project" open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="grid gap-4">
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            aria-label="Project name"
            placeholder="Project name"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
          />
          <input
            value={draft.address}
            onChange={(event) => setDraft({ ...draft, address: event.target.value })}
            aria-label="Project address"
            placeholder="Project address"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
          />
          <select
            value={draft.phase}
            onChange={(event) => setDraft({ ...draft, phase: event.target.value as DashboardPhase })}
            aria-label="Project phase"
            className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#2563eb] focus:ring-4 focus:ring-blue-100"
          >
            {phaseOptions.map((phase) => <option key={phase}>{phase}</option>)}
          </select>
          <button type="button" onClick={createProject} className="h-10 rounded-xl bg-[#2563eb] px-4 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)]">
            Create project
          </button>
        </div>
      </Modal>
      <Modal title="Delete project" open={Boolean(deleteProject)} onClose={() => setDeleteProject(null)}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">Delete {deleteProject?.name}? This removes it from the local demo dashboard.</p>
          <button type="button" onClick={() => deleteProject && removeDashboardProject(deleteProject.id)} className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white">
            <Trash2 size={17} />
            Delete project
          </button>
        </div>
      </Modal>
      {toast && <div className="fixed bottom-[calc(5.75rem+var(--safe-bottom))] left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-2xl lg:bottom-6">{toast}</div>}
    </div>
  );
}

function ProjectCard({
  project,
  onToggleFavorite,
  onOpen,
  onOpenMenu,
  onOpenStatus,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete
}: {
  project: DashboardProject;
  onToggleFavorite: (projectId: string) => void;
  onOpen: () => void;
  onOpenMenu: (rect: DOMRect) => void;
  onOpenStatus: (rect: DOMRect) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const status = statusByCode(project.statusCode);

  return (
    <article
      className="relative min-h-[116px] rounded-xl border border-slate-200/90 bg-white px-3.5 py-3 shadow-[0_3px_12px_rgba(15,23,42,0.04)] transition duration-200 active:scale-[0.985] hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] sm:min-h-[132px] sm:px-4 sm:py-3.5"
    >
      <button
        type="button"
        aria-label={`Open ${project.name}`}
        onClick={onOpen}
        className="absolute inset-0 z-0 cursor-pointer rounded-xl"
      />
      <div className="flex items-start justify-between gap-4">
        <div className="pointer-events-none relative z-10 min-w-0">
          <h2 className="truncate text-[15px] font-bold leading-5 text-slate-800 sm:text-base">{project.name}</h2>
          <p className="mt-1.5 truncate text-[13px] font-medium text-slate-500 sm:text-sm">{project.address}</p>
          {project.name === "Herald Towers Elevator project" && <p className="mt-1 truncate text-xs text-slate-400">HT Elevators 2026</p>}
        </div>
        <div className="relative z-10 flex shrink-0 items-center gap-2 text-slate-400">
          <button type="button" aria-label="Project owner" onClick={(event) => event.stopPropagation()} className="rounded-full p-1 text-amber-500 transition hover:bg-amber-50">
            <Crown size={15} className="fill-amber-100" />
          </button>
          <button
            type="button"
            aria-label={project.favorite ? "Remove favorite" : "Add favorite"}
            onClick={(event) => {
              event.stopPropagation();
              onToggleFavorite(project.id);
            }}
            className="rounded-full p-1 text-slate-400 transition hover:bg-amber-50 hover:text-amber-500"
          >
            <Star size={15} className={project.favorite ? "fill-[#f5b301] text-[#f5b301]" : ""} />
          </button>
          <button
            type="button"
            aria-label="Project menu"
            onClick={(event) => {
              event.stopPropagation();
              onOpenMenu(event.currentTarget.getBoundingClientRect());
            }}
            className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>
      <div className="pointer-events-none relative z-10 mt-4 flex items-end justify-between gap-4 sm:mt-5">
        <div className="pointer-events-auto relative">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenStatus(event.currentTarget.getBoundingClientRect());
            }}
            className={`inline-flex max-w-[220px] truncate rounded-lg border px-2 py-0.5 text-[10px] font-bold transition active:scale-95 hover:-translate-y-0.5 sm:max-w-[260px] sm:text-[10.5px] ${status.classes}`}
          >
            {status.label}
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-3 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            {project.people}
            <Users size={14} className="text-slate-400" />
          </span>
          <span className="inline-flex items-center gap-1">
            {project.tasks}
            <CheckSquare size={13} className="text-slate-400" />
          </span>
        </div>
      </div>
    </article>
  );
}

function DashboardCardOverlay({
  overlay,
  project,
  onClose,
  onOpenStatus,
  onStatusChange,
  onEdit,
  onDuplicate,
  onArchive,
  onDelete
}: {
  overlay: DashboardOverlay;
  project: DashboardProject;
  onClose: () => void;
  onOpenStatus: (rect: DOMRect) => void;
  onStatusChange: (statusCode: string) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const position = getDropdownPosition(overlay.rect, overlay.kind === "menu" ? 224 : 312, overlay.kind === "menu" ? 228 : 420);

  return createPortal(
    <div
      data-dashboard-overlay
      onClick={(event) => event.stopPropagation()}
      className="fixed z-[1000] origin-top-right rounded-2xl border border-slate-200 bg-white text-sm opacity-100 shadow-[0_22px_44px_rgba(15,23,42,0.18)] animate-[dropdownIn_120ms_ease-out]"
      style={{ left: position.left, top: position.top, width: position.width, transformOrigin: position.placement === "up" ? "bottom right" : "top right" }}
    >
      {overlay.kind === "menu" ? (
        <div className="py-2">
          <MenuButton icon={Filter} label="Change Status" onClick={(event) => onOpenStatus(event.currentTarget.getBoundingClientRect())} />
          <MenuButton icon={Pencil} label="Edit Project" onClick={onEdit} />
          <MenuButton icon={Plus} label="Duplicate Project" onClick={onDuplicate} />
          <MenuButton icon={Archive} label="Archive Project" onClick={onArchive} />
          <MenuButton icon={Trash2} label="Delete Project" danger onClick={onDelete} />
        </div>
      ) : (
        <div className="overflow-y-auto p-3 scrollbar-soft" style={{ maxHeight: position.maxHeight }}>
          {phaseStatuses.map((phaseStatus) => (
            <button
              key={phaseStatus.code}
              type="button"
              onClick={() => onStatusChange(phaseStatus.code)}
              className={`block w-full rounded-xl px-2 py-2 text-left text-xs font-semibold transition hover:bg-slate-50 ${project.statusCode === phaseStatus.code ? "bg-blue-50 ring-1 ring-blue-100" : ""}`}
            >
              <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[10.5px] ${phaseStatus.classes}`}>{phaseStatus.label}</span>
            </button>
          ))}
        </div>
      )}
      <button type="button" aria-label="Close overlay" onClick={onClose} className="sr-only">Close</button>
    </div>,
    document.body
  );
}

function getDropdownPosition(rect: DOMRect, preferredWidth: number, estimatedHeight: number) {
  const margin = 12;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(preferredWidth, viewportWidth - margin * 2);
  const spaceBelow = viewportHeight - rect.bottom - margin;
  const spaceAbove = rect.top - margin;
  const placement = spaceBelow >= Math.min(estimatedHeight, 260) || spaceBelow >= spaceAbove ? "down" : "up";
  const left = clampNumber(rect.right - width, margin, viewportWidth - width - margin);
  const top = placement === "down"
    ? Math.min(rect.bottom + 8, viewportHeight - margin)
    : Math.max(margin, rect.top - Math.min(estimatedHeight, spaceAbove) - 8);
  const maxHeight = placement === "down"
    ? Math.max(160, viewportHeight - top - margin)
    : Math.max(160, rect.top - margin - 8);
  return { left, top, width, placement, maxHeight };
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function MenuButton({ icon: Icon, label, onClick, danger = false }: { icon: ComponentType<{ size?: number }>; label: string; onClick: (event: ReactMouseEvent<HTMLButtonElement>) => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left font-semibold transition hover:bg-slate-50 ${danger ? "text-red-600" : "text-slate-700"}`}>
      <Icon size={15} />
      {label}
    </button>
  );
}

function phaseToProjectStatus(phase: DashboardPhase): ProjectStatus {
  if (phase === "Phase 5") return "Complete";
  if (phase === "Phase 3" || phase === "Phase 4") return "Active";
  if (phase === "Phase 7") return "Review";
  return "Planning";
}

function defaultPhaseDetail(phase: DashboardPhase) {
  const details: Record<DashboardPhase, string> = {
    "Phase 1": "Site Visit",
    "Phase 2": "Quote Sent",
    "Phase 3": "Approved",
    "Phase 4": "Installation in Progress",
    "Phase 5": "Job Completed",
    "Phase 7": "Job Completed Pending Payment"
  };
  return details[phase];
}
