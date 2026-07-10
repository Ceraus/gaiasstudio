import { Activity, ClipboardCheck, FileText, FolderKanban, Image, LayoutDashboard, ListChecks } from "lucide-react";
import { NavLink, useLocation, useMatch } from "react-router-dom";
import { useDemoData } from "@/app/providers/DemoDataProvider";
import { navItems } from "./nav";

const projectItems = [
  { label: "Overview", section: "overview", icon: LayoutDashboard },
  { label: "Plans", section: "plans", icon: FolderKanban },
  { label: "Tasks", section: "tasks", icon: ListChecks },
  { label: "Photos", section: "photos", icon: Image },
  { label: "Files", section: "files", icon: FileText },
  { label: "Checklists", section: "checklists", icon: ClipboardCheck },
  { label: "Activity", section: "activity", icon: Activity }
];

export function Sidebar({ collapsed, mode = "desktop", onNavigate }: { collapsed: boolean; mode?: "desktop" | "drawer"; onNavigate?: () => void }) {
  if (mode === "drawer") {
    return (
      <aside className="flex h-full min-h-0 w-full flex-col bg-slate-950 text-slate-200">
        <SidebarContent collapsed={false} onNavigate={onNavigate} />
      </aside>
    );
  }

  return (
    <aside className={`${collapsed ? "w-[86px]" : "w-72"} hidden h-screen h-svh shrink-0 flex-col border-r border-white/10 bg-slate-950 text-slate-200 transition-[width] duration-200 ease-out lg:sticky lg:top-0 lg:flex`}>
      <SidebarContent collapsed={collapsed} />
    </aside>
  );
}

function SidebarContent({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const location = useLocation();
  const nestedProjectMatch = useMatch("/projects/:projectId/*");
  const rootProjectMatch = useMatch("/projects/:projectId");
  const projectMatch = nestedProjectMatch ?? rootProjectMatch;
  const { projects } = useDemoData();
  const projectId = projectMatch?.params.projectId;
  const project = projects.find((item) => item.id === projectId);
  const activeSection = getActiveSection(location.pathname, location.search);

  return (
    <>
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-4">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white text-sm font-black text-slate-950">CP</div>
        {!collapsed && (
          <div className="sidebar-label min-w-0">
            <p className="truncate text-lg font-bold text-white">ClearPlan</p>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Field operations demo</p>
          </div>
        )}
      </div>

      <nav className="app-scroll min-h-0 flex-1 space-y-1 overflow-y-auto p-3 scrollbar-soft">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            title={collapsed ? item.label : undefined}
            className={({ isActive }) =>
              `sidebar-link flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${
                isActive || (item.path === "/projects" && location.pathname.startsWith("/projects")) ? "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]" : "text-slate-300 hover:bg-white/10 hover:text-white"
              } ${collapsed ? "justify-center" : ""}`
            }
          >
            <item.icon size={19} className="shrink-0" aria-hidden="true" />
            {!collapsed && <span className="sidebar-label">{item.label}</span>}
          </NavLink>
        ))}

        {projectId && (
          <div className="mt-5 border-t border-white/10 pt-5">
            {!collapsed && (
              <div className="sidebar-label mb-3 px-3">
                <p className="truncate text-sm font-bold text-white">{project?.name ?? "Project workspace"}</p>
                <p className="text-xs font-semibold text-slate-500">Project workspace</p>
              </div>
            )}
            <div className="space-y-1">
              {projectItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.section}
                    to={`/projects/${projectId}/${item.section}`}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    className={`sidebar-link flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-bold transition ${activeSection === item.section ? "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]" : "text-slate-300 hover:bg-white/10 hover:text-white"} ${collapsed ? "justify-center" : ""}`}
                  >
                    <Icon size={19} className="shrink-0" aria-hidden="true" />
                    {!collapsed && <span className="sidebar-label">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}

function getActiveSection(pathname: string, search: string) {
  if (pathname.includes("/plans/") || pathname.endsWith("/plans") || pathname.endsWith("/plan")) return "plans";
  const section = pathname.split("/").filter(Boolean)[2];
  if (section === "overview" || section === "tasks" || section === "photos" || section === "files" || section === "checklists" || section === "activity") return section;
  return new URLSearchParams(search).get("section") ?? "overview";
}
