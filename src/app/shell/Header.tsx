import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthContext";
import { Avatar } from "@/shared/components/Avatar";
import { hapticImpact, ImpactStyle } from "@/infrastructure/capacitor/haptics";

export function Header({ onSidebarToggle, onMobileMenu, collapsed, title }: { onSidebarToggle: () => void; onMobileMenu: () => void; collapsed: boolean; title: string }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const showProjectMenu = /^\/projects\/[^/]+/.test(location.pathname);

  return (
    <header className="safe-top sticky top-0 z-30 min-h-12 border-b border-slate-200/70 bg-white/90 px-2.5 shadow-[0_1px_8px_rgba(15,23,42,0.035)] backdrop-blur-xl sm:px-4 md:px-6">
      <div className="flex min-h-12 items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              hapticImpact(ImpactStyle.Light);
              onMobileMenu();
            }}
            aria-label="Open navigation"
            className="compact-control grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm active:scale-95 lg:hidden"
          >
            <Menu size={19} />
          </button>
          <button
            type="button"
            onClick={() => {
              hapticImpact(ImpactStyle.Light);
              onSidebarToggle();
            }}
            aria-label="Toggle sidebar"
            className="compact-control hidden h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:grid"
          >
            {collapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
          </button>
          <p className="min-w-0 flex-1 truncate text-base font-bold text-ink lg:hidden">{title}</p>
          {showProjectMenu && (
            <button
              type="button"
              onClick={() => {
                hapticImpact(ImpactStyle.Light);
                window.dispatchEvent(new CustomEvent("clearplan:open-project-sections"));
              }}
              aria-label="Open project sections"
              className="compact-control grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-600 active:scale-95 lg:hidden"
            >
              <Menu size={18} />
            </button>
          )}
          <div className="hidden min-h-9 min-w-0 flex-1 items-center gap-2.5 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3 py-1 shadow-sm xs:flex sm:flex">
            <Search size={16} className="shrink-0 text-slate-400" aria-hidden="true" />
            <input aria-label="Search projects, people, tasks" placeholder="Search projects, people, tasks" className="w-full min-w-0 border-none bg-transparent text-sm outline-none placeholder:text-slate-400" />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <button type="button" aria-label="Notifications" className="compact-control grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
            <Bell size={16} aria-hidden="true" />
          </button>
          <Avatar name={user?.name ?? "User"} className="h-9 w-9 text-xs" />
          <button type="button" onClick={() => void logout()} aria-label="Log out" className="compact-control grid h-9 w-9 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 shadow-sm hover:bg-slate-50">
            <LogOut size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
