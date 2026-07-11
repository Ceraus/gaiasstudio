import {
  BarChart3,
  Bell,
  Bot,
  CalendarDays,
  CalendarCheck,
  CheckSquare,
  CircleUser,
  ContactRound,
  FileSignature,
  Files,
  FolderKanban,
  HardHat,
  Layers,
  Map,
  Network,
  Plug,
  Settings,
  Smartphone,
  Tags,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export interface NavGroup {
  id: string;
  label: string;
  items: NavItem[];
}

// ── Pinned top — always visible, no accordion ─────────────────────────────────
export const CORE_NAV: NavItem[] = [
  { label: "Dashboard",     path: "/dashboard",     icon: BarChart3 },
  { label: "Notifications", path: "/notifications", icon: Bell      },
  { label: "AI Hub",        path: "/ai-hub",        icon: Bot       },
];

// ── Accordion groups ──────────────────────────────────────────────────────────
export const NAV_GROUPS: NavGroup[] = [
  {
    id:    "field",
    label: "Field",
    items: [
      { label: "Projects",      path: "/projects",   icon: FolderKanban },
      { label: "Blueprint Hub", path: "/map",        icon: Map          },
      { label: "Checklists",    path: "/checklists", icon: CheckSquare  },
      { label: "Documents",     path: "/documents",  icon: Files        },
      { label: "Templates",     path: "/templates",  icon: Tags         },
      { label: "Categories",    path: "/categories", icon: Layers       },
    ],
  },
  {
    id:    "crm",
    label: "CRM & Financials",
    items: [
      { label: "Contracts", path: "/contracts",  icon: FileSignature },
      { label: "Customers", path: "/customers",  icon: ContactRound  },
      { label: "CRM",       path: "/crm",        icon: Network       },
    ],
  },
  {
    id:    "workforce",
    label: "Workforce",
    items: [
      { label: "Calendar",   path: "/calendar",         icon: CalendarDays  },
      { label: "Timesheets", path: "/clock/timesheets", icon: CalendarCheck },
      { label: "Employees",  path: "/employees",        icon: HardHat       },
      { label: "Users",      path: "/users",            icon: UserCheck     },
    ],
  },
];

// ── Bottom utility dock — pinned, no accordion ────────────────────────────────
export const DOCK_NAV: NavItem[] = [
  { label: "Integrations", path: "/integrations", icon: Plug       },
  { label: "Mobile",       path: "/mobile",       icon: Smartphone },
  { label: "Settings",     path: "/settings",     icon: Settings   },
  { label: "Account",      path: "/account",      icon: CircleUser },
];
