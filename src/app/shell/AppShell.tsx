import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { navItems } from "./nav";

const sidebarStorageKey = "clearplan-app-sidebar-collapsed";

export function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(() => window.localStorage.getItem(sidebarStorageKey) === "true");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const params = new URLSearchParams(location.search);
  const isProjectDetail = /^\/projects\/[^/]+/.test(location.pathname);
  const isPlansWorkspace = isProjectDetail && (params.get("section") === "plans" || location.pathname.includes("/plans/") || location.pathname.endsWith("/plans") || location.pathname.endsWith("/plan"));
  const currentTitle = pageTitle(location.pathname);

  useEffect(() => {
    window.localStorage.setItem(sidebarStorageKey, String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileNavOpen]);

  return (
    <div className="h-screen h-svh overflow-hidden bg-[#f5f7fb]">
      <div className="flex h-full min-h-0">
        <Sidebar collapsed={collapsed} />
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {!isPlansWorkspace && <Header onMobileMenu={() => setMobileNavOpen(true)} onSidebarToggle={() => setCollapsed((value) => !value)} collapsed={collapsed} title={currentTitle} />}
          <main className={`app-scroll w-full min-w-0 flex-1 overflow-x-hidden overflow-y-auto ${isPlansWorkspace ? "h-full min-h-0 overflow-hidden" : "px-3 py-4 pb-[max(2rem,var(--safe-bottom))] sm:px-5 md:px-6 lg:px-8 lg:py-8"}`}>{children}</main>
        </div>
      </div>
      <div className={`fixed inset-0 z-50 lg:hidden ${mobileNavOpen ? "pointer-events-auto" : "pointer-events-none"}`} aria-hidden={!mobileNavOpen}>
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setMobileNavOpen(false)}
          className={`absolute inset-0 bg-slate-950/55 transition-opacity duration-200 ${mobileNavOpen ? "opacity-100" : "opacity-0"}`}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
          className={`absolute inset-y-0 left-0 flex w-[86vw] max-w-sm transform flex-col overflow-hidden rounded-r-[1.75rem] shadow-2xl transition-transform duration-200 ease-out ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"}`}
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation"
            className="compact-control absolute right-3 top-[max(0.75rem,var(--safe-top))] z-10 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/10 text-white backdrop-blur active:scale-95"
          >
            <X size={18} aria-hidden="true" />
          </button>
          <div className="h-full min-h-0 pt-[var(--safe-top)] pb-[var(--safe-bottom)]">
            <Sidebar collapsed={false} mode="drawer" onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function pageTitle(pathname: string) {
  if (pathname.startsWith("/projects")) return "Projects";
  if (pathname.startsWith("/customers")) return "Customers";
  const match = navItems
    .filter((item) => item.path !== "/")
    .sort((a, b) => b.path.length - a.path.length)
    .find((item) => pathname === item.path || pathname.startsWith(`${item.path}/`));
  return match?.label ?? "Command";
}
