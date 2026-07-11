import { useState } from "react";
import {
  Activity, ChevronDown, ChevronRight, ClipboardCheck, FileText,
  FlaskConical, FolderKanban, Image, LayoutDashboard, ListChecks, X,
} from "lucide-react";
import { NavLink, useLocation, useMatch, useNavigate } from "react-router-dom";
import { useDemoData } from "@/app/providers/DemoDataProvider";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { toggleUseExampleData } from "@/store/accountSlice";
import { brokerM365SsoStatus } from "@/store/m365Slice";
import { AnimatedCommandLogo } from "@/shared/components/branding/AnimatedCommandLogo";
import { PlexusOverlay } from "@/shared/components/effects/PlexusOverlay";
import { CORE_NAV, DOCK_NAV, NAV_GROUPS } from "./nav";

// ── Project sub-nav ────────────────────────────────────────────────────────────
const projectItems = [
  { label: "Overview",   section: "overview",   icon: LayoutDashboard },
  { label: "Plans",      section: "plans",      icon: FolderKanban    },
  { label: "Tasks",      section: "tasks",      icon: ListChecks      },
  { label: "Photos",     section: "photos",     icon: Image           },
  { label: "Files",      section: "files",      icon: FileText        },
  { label: "Checklists", section: "checklists", icon: ClipboardCheck  },
  { label: "Activity",   section: "activity",   icon: Activity        },
];

// ── Shared nav-link class builder ─────────────────────────────────────────────
function linkClass(active: boolean, collapsed: boolean) {
  return [
    "sidebar-link flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition",
    active
      ? "bg-blue-600 text-white shadow-[0_12px_24px_rgba(37,99,235,0.24)]"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
    collapsed ? "justify-center" : "",
  ].join(" ");
}

// ── Public component ──────────────────────────────────────────────────────────
export function Sidebar({
  collapsed,
  onCollapse,
  mode = "desktop",
  onNavigate,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  mode?: "desktop" | "drawer";
  onNavigate?: () => void;
}) {
  if (mode === "drawer") {
    return (
      <aside className="flex w-full flex-col overflow-y-auto bg-slate-950 text-slate-200 scrollbar-soft">
        {/* onNavigate doubles as onCollapse in drawer mode — closes the sheet */}
        <SidebarContent collapsed={false} onCollapse={onNavigate} onNavigate={onNavigate} />
      </aside>
    );
  }

  return (
    <aside
      className={[
        collapsed ? "w-[86px]" : "w-72",
        "hidden shrink-0 flex-col rounded-r-3xl border-r border-white/10",
        "bg-slate-950 text-slate-200 shadow-2xl transition-[width] duration-200 ease-out",
        "lg:sticky lg:top-0 lg:flex lg:max-h-screen lg:overflow-y-auto",
      ].join(" ")}
    >
      <SidebarContent collapsed={collapsed} onCollapse={onCollapse} onNavigate={onNavigate} />
    </aside>
  );
}

// ── Inner content ─────────────────────────────────────────────────────────────
function SidebarContent({
  collapsed,
  onCollapse,
  onNavigate,
}: {
  collapsed: boolean;
  onCollapse?: () => void;
  onNavigate?: () => void;
}) {
  const location = useLocation();
  const dispatch  = useAppDispatch();
  const useExampleData = useAppSelector((s) => s.account.useExampleData);
  const nestedProjectMatch = useMatch("/projects/:projectId/*");
  const rootProjectMatch   = useMatch("/projects/:projectId");
  const projectMatch = nestedProjectMatch ?? rootProjectMatch;
  const { projects } = useDemoData();
  const projectId = projectMatch?.params.projectId;
  const project   = projects.find((p) => p.id === projectId);
  const activeSection = getActiveSection(location.pathname, location.search);

  // Default all groups open; persist per key in sessionStorage
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    try {
      const stored = sessionStorage.getItem("cvg-sidebar-groups");
      return stored ? JSON.parse(stored) : { field: true, crm: true, workforce: true };
    } catch {
      return { field: true, crm: true, workforce: true };
    }
  });

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { sessionStorage.setItem("cvg-sidebar-groups", JSON.stringify(next)); } catch {}
      return next;
    });
  }

  function isPathActive(path: string) {
    if (path === "/projects") return location.pathname.startsWith("/projects");
    return location.pathname === path || location.pathname.startsWith(path + "/");
  }

  return (
    <>
      {/* ── Logo row ── */}
      <div
        className={[
          "relative flex shrink-0 items-center justify-center border-b border-white/10",
          collapsed ? "h-14 py-2" : "py-3",
        ].join(" ")}
      >
        <AnimatedCommandLogo size={collapsed ? 40 : 45} className="command-symbol-glow" />
        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="absolute right-2 flex h-7 w-7 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white/10 hover:text-white"
          >
            {collapsed ? <ChevronRight size={15} aria-hidden /> : <X size={15} aria-hidden />}
          </button>
        )}
      </div>

      {/* ── Nav body — grows to fit all items; outer aside handles scroll ── */}
      <div className="relative flex flex-1 flex-col">
        <PlexusOverlay
          opacity={0.65}
          nodeCount={collapsed ? 28 : 52}
          linkDist={collapsed ? 72 : 100}
          scale={collapsed ? 1 : 1.25}
        />

        <nav className="relative z-[1] space-y-0.5 p-3">

          {/* ── Core pinned items ── */}
          {CORE_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => linkClass(isActive, collapsed)}
            >
              <item.icon size={19} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span className="sidebar-label">{item.label}</span>}
            </NavLink>
          ))}

          {/* ── Microsoft 365 — positioned directly beneath Notifications ── */}
          <M365NavItem collapsed={collapsed} onNavigate={onNavigate} />

          {/* ── Accordion groups ── */}
          {!collapsed && (
            <div className="mt-1 space-y-0.5">
              {NAV_GROUPS.map((group) => (
                <div key={group.id}>
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleGroup(group.id)}
                    className="flex w-full items-center justify-between rounded-xl px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 transition hover:text-slate-400"
                  >
                    <span>{group.label}</span>
                    <ChevronDown
                      size={13}
                      aria-hidden
                      className={[
                        "shrink-0 transition-transform duration-200",
                        openGroups[group.id] ? "" : "-rotate-90",
                      ].join(" ")}
                    />
                  </button>

                  {/* Group items */}
                  {openGroups[group.id] && (
                    <div className="space-y-0.5">
                      {group.items.map((item) => (
                        <NavLink
                          key={item.path}
                          to={item.path}
                          onClick={onNavigate}
                          className={linkClass(isPathActive(item.path), false)}
                        >
                          <item.icon size={19} className="shrink-0" aria-hidden="true" />
                          <span className="sidebar-label">{item.label}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Collapsed state: show all group items flat (icon-only) */}
          {collapsed && (
            <div className="mt-1 space-y-0.5">
              {NAV_GROUPS.flatMap((g) => g.items).map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={item.label}
                  onClick={onNavigate}
                  className={linkClass(isPathActive(item.path), true)}
                >
                  <item.icon size={19} className="shrink-0" aria-hidden="true" />
                </NavLink>
              ))}
            </div>
          )}

          {/* ── Project sub-nav (shown when inside a project) ── */}
          {projectId && (
            <div className="mt-4 border-t border-white/10 pt-4">
              {!collapsed && (
                <div className="sidebar-label mb-2 px-3">
                  <p className="truncate text-sm font-bold text-white">
                    {project?.name ?? "Project workspace"}
                  </p>
                  <p className="text-[10px] font-semibold text-slate-500">Project workspace</p>
                </div>
              )}
              <div className="space-y-0.5">
                {projectItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.section}
                      to={`/projects/${projectId}/${item.section}`}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={linkClass(activeSection === item.section, collapsed)}
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

        {/* ── Bottom utility dock ── */}
        <div className="relative z-[1] shrink-0 border-t border-white/10 p-3 space-y-0.5">
          {DOCK_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={({ isActive }) => linkClass(isActive, collapsed)}
            >
              <item.icon size={19} className="shrink-0" aria-hidden="true" />
              {!collapsed && <span className="sidebar-label text-xs">{item.label}</span>}
            </NavLink>
          ))}

          {/* ── Example Data toggle ── */}
          <div className="mt-1 border-t border-white/[0.07] pt-1.5">
            {collapsed ? (
              <button
                type="button"
                title={useExampleData ? "Example Data ON — click to disable" : "Example Data OFF — click to enable"}
                onClick={() => dispatch(toggleUseExampleData())}
                className={[
                  "mx-auto flex h-8 w-8 items-center justify-center rounded-xl transition",
                  useExampleData
                    ? "bg-amber-400/20 text-amber-400"
                    : "text-slate-600 hover:bg-white/10 hover:text-slate-400",
                ].join(" ")}
              >
                <FlaskConical size={14} aria-hidden />
              </button>
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={useExampleData}
                onClick={() => dispatch(toggleUseExampleData())}
                className={[
                  "flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 transition",
                  useExampleData ? "bg-amber-400/15 ring-1 ring-amber-400/30" : "bg-white/5 hover:bg-white/10",
                ].join(" ")}
              >
                <div className="flex items-center gap-1.5">
                  <FlaskConical size={11} className={useExampleData ? "text-amber-400" : "text-slate-500"} aria-hidden />
                  <span className={[
                    "text-[9px] font-bold uppercase tracking-wider",
                    useExampleData ? "text-amber-400" : "text-slate-500",
                  ].join(" ")}>
                    Example Data
                  </span>
                </div>
                <span
                  className={[
                    "relative inline-flex h-[14px] w-6 shrink-0 items-center rounded-full border-2 border-transparent transition-colors duration-200",
                    useExampleData ? "bg-amber-400" : "bg-slate-700",
                  ].join(" ")}
                >
                  <span className={[
                    "inline-block h-2 w-2 transform rounded-full bg-white shadow transition-transform duration-200",
                    useExampleData ? "translate-x-2.5" : "translate-x-0.5",
                  ].join(" ")} />
                </span>
              </button>
            )}
          </div>

          {/* Version badge */}
          {!collapsed && (
            <div className="rounded-2xl border border-white/10 bg-white/5 py-2 text-center mt-2">
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-500">
                Clearplan Command
              </p>
              <p className="mt-0.5 font-mono text-[9px] text-slate-600">
                v{__APP_VERSION__}
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ── Microsoft 365 — 4-square grid icon (ported from Pre-Redux AppSidebar) ─────
function IconM365({ size = 19, className }: { size?: number; className?: string }) {
  const s = Math.round(size * 0.38);   // square size — ~38 % of overall icon
  const g = Math.round(size * 0.08);   // gap between squares
  const o = Math.round((size - 2 * s - g) / 2); // offset to center the 2×2 grid
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <rect x={o}         y={o}         width={s} height={s} rx="1.5" />
      <rect x={o + s + g} y={o}         width={s} height={s} rx="1.5" />
      <rect x={o}         y={o + s + g} width={s} height={s} rx="1.5" />
      <rect x={o + s + g} y={o + s + g} width={s} height={s} rx="1.5" />
    </svg>
  );
}

// ── Microsoft 365 nav item — auth-gated, placed beneath Notifications ─────────
function M365NavItem({
  collapsed,
  onNavigate,
}: {
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const dispatch  = useAppDispatch();
  const navigate  = useNavigate();
  const location  = useLocation();
  const isActive  = location.pathname.startsWith("/m365");

  const accessToken = useAppSelector((s) => s.m365.accessToken);
  const tokenExpiry = useAppSelector((s) => s.m365.tokenExpiry);
  const ssoLoading  = useAppSelector((s) => s.m365.status === "loading");
  const userEmail   = useAppSelector((s) => s.m365.userEmail);
  const isConnected = !!accessToken && !!tokenExpiry && Date.now() < tokenExpiry;

  async function handleClick() {
    if (isConnected) {
      navigate("/m365");
      onNavigate?.();
      return;
    }
    // Token absent or expired — broker SSO status from the API gateway.
    const result = await dispatch(brokerM365SsoStatus());
    if (brokerM365SsoStatus.fulfilled.match(result)) {
      const { enabled, redirect_url } = result.payload;
      if (enabled && redirect_url) {
        window.location.href = redirect_url;
        return;
      }
    }
    // SSO not configured on the backend — open the hub anyway (shows connect UI).
    navigate("/m365");
    onNavigate?.();
  }

  return (
    <button
      type="button"
      title={collapsed ? "Microsoft 365" : undefined}
      onClick={handleClick}
      disabled={ssoLoading}
      className={linkClass(isActive, collapsed)}
    >
      <IconM365 size={19} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="sidebar-label flex-1">Microsoft 365</span>
          {isConnected && (
            <span
              title={userEmail ?? "Connected"}
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400"
              aria-label="Connected"
            />
          )}
        </>
      )}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function getActiveSection(pathname: string, search: string) {
  if (pathname.includes("/plans/") || pathname.endsWith("/plans") || pathname.endsWith("/plan"))
    return "plans";
  const section = pathname.split("/").filter(Boolean)[2];
  if (["overview", "tasks", "photos", "files", "checklists", "activity"].includes(section ?? ""))
    return section;
  return new URLSearchParams(search).get("section") ?? "overview";
}
