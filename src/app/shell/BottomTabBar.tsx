import { Clock3, FolderKanban, UserCircle } from "lucide-react";
import { NavLink, useLocation } from "react-router-dom";
import { hapticSelection } from "@/infrastructure/capacitor/haptics";

const bottomTabs = [
  { label: "Projects", path: "/projects", icon: FolderKanban },
  { label: "Time & Material", path: "/time-material", icon: Clock3 },
  { label: "Profile", path: "/profile", icon: UserCircle }
];

export function BottomTabBar() {
  const location = useLocation();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 h-[calc(3.55rem+var(--safe-bottom))] translate-y-0 border-t border-slate-200/75 bg-white/98 px-[max(0.75rem,var(--safe-left))] pb-[max(0.35rem,var(--safe-bottom))] pt-1 shadow-[0_-6px_18px_rgba(15,23,42,0.055)] backdrop-blur-xl [backface-visibility:hidden] [transform:translate3d(0,0,0)] dark:border-slate-700/80 dark:bg-slate-950/94 dark:shadow-[0_-14px_34px_rgba(0,0,0,0.42)] lg:hidden" aria-label="Primary">
      <div className="mx-auto grid h-10 max-w-md grid-cols-3 gap-1">
        {bottomTabs.map((item) => {
          const active = item.path === "/projects" ? location.pathname.startsWith("/projects") : location.pathname === item.path;
          const Icon = item.icon;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={hapticSelection}
              aria-current={active ? "page" : undefined}
              className={`compact-control relative flex h-10 min-h-10 flex-col items-center justify-center gap-0.5 rounded-lg px-2 text-[10px] font-bold leading-none transition duration-150 active:scale-[0.97] ${
                active
                  ? "text-blue-700 dark:text-blue-200"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              }`}
            >
              <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
              <span className="leading-tight">{item.label}</span>
              {active && <span className="absolute bottom-0.5 h-0.5 w-5 rounded-full bg-blue-600/75" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
