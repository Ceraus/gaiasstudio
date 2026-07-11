import { Activity, BriefcaseBusiness, CheckCircle2, Clock3, FolderKanban, ListChecks, Plus, Settings, ShieldCheck, Users } from "lucide-react";
import { Avatar } from "@/shared/components/Avatar";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { categories, employeeName, taskStatuses } from "@/infrastructure/offline/mockData";
import { useDemoData } from "@/app/providers/DemoDataProvider";
import { useAppSelector } from "@/store/hooks";
import {
  EXAMPLE_CHECKLISTS,
  EXAMPLE_EMPLOYEES,
  EXAMPLE_TEMPLATES,
} from "@/core/example/exampleDataPayloads";

type AdminPageName = "dashboard" | "templates" | "checklists" | "categories" | "users" | "account";

export default function AdminPages({ page }: { page: AdminPageName }) {
  switch (page) {
    case "dashboard":
      return <DashboardPage />;
    case "templates":
      return <TemplatesPage />;
    case "checklists":
      return <ChecklistsPage />;
    case "categories":
      return <CategoriesPage />;
    case "users":
      return <UsersPage />;
    case "account":
      return <AccountPage />;
  }
}

export function DashboardPage() {
  const { projects: demoProjects, tasks: demoTasks } = useDemoData();
  const useExampleData = useAppSelector((s) => s.account.useExampleData);

  // All domain data is strictly gated — blank slate when useExampleData is OFF.
  const projects     = useExampleData ? demoProjects : [];
  const tasks        = useExampleData ? demoTasks    : [];
  const fieldEmployees = useExampleData ? EXAMPLE_EMPLOYEES : [];

  // Metrics — all zero when toggle is OFF.
  const activeProjects = projects.filter((p) => p.status === "Active").length;
  const clockedIn      = fieldEmployees.filter((e) => e.status !== "Off shift").length;
  const openTasks      = tasks.filter((t) => t.status !== "Done").length;
  const weekHours      = useExampleData
    ? fieldEmployees.reduce((s, e) => s + e.weekHours, 0)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-field">Admin dashboard</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink md:text-4xl">Field work, time, and project signal in one place.</h1>
        </div>
        <button className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lift">
          <Plus size={18} aria-hidden="true" />
          New project
        </button>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active projects" value={activeProjects > 0 ? String(activeProjects) : "0"} detail={activeProjects > 0 ? `${activeProjects} active` : "No active projects"} icon={FolderKanban} />
        <StatCard label="On shift"        value={clockedIn > 0      ? String(clockedIn)      : "0"} detail={clockedIn > 0      ? `${clockedIn} personnel on duty`   : "No personnel on shift"}   icon={Clock3} />
        <StatCard label="Open tasks"      value={openTasks > 0      ? String(openTasks)      : "0"} detail={openTasks > 0      ? `${openTasks} tasks in progress`   : "No open tasks"}           icon={CheckCircle2} />
        <StatCard label="Week hours"      value={weekHours > 0      ? weekHours.toFixed(1)   : "0"} detail={weekHours > 0      ? "Logged across active personnel"   : "No logged hours"}         icon={Activity} />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <DataTable
          rows={projects}
          getKey={(project) => project.id}
          columns={[
            { header: "Project",  cell: (project) => <span className="font-semibold text-ink">{project.name}</span> },
            { header: "Status",   cell: (project) => <StatusBadge>{project.status}</StatusBadge> },
            { header: "Progress", cell: (project) => <div className="h-2 min-w-28 rounded-full bg-slate-100"><div className="h-2 rounded-full bg-field" style={{ width: `${project.progress}%` }} /></div> },
            { header: "Manager",  cell: (project) => employeeName(project.managerId) },
          ]}
        />
        <section className="card rounded-3xl p-5">
          <h2 className="text-lg font-semibold text-ink">Live field status</h2>
          {fieldEmployees.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">No personnel on shift.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {fieldEmployees.map((employee) => (
                <div key={employee.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={employee.name} />
                    <div>
                      <p className="font-semibold text-ink">{employee.name}</p>
                      <p className="text-sm text-slate-500">{employee.location}</p>
                    </div>
                  </div>
                  <StatusBadge>{employee.status}</StatusBadge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export function TemplatesPage() {
  const useExampleData = useAppSelector((s) => s.account.useExampleData);
  const templates = useExampleData ? EXAMPLE_TEMPLATES : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Templates" subtitle="Reusable project, task, and checklist structures." />
      {templates.length === 0 ? (
        <EmptyState icon={BriefcaseBusiness} title="No templates" body="Connect to the backend or enable Example Data to view templates." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <SimpleList icon={BriefcaseBusiness} items={templates.map((t) => `${t.name} · ${t.type}`)} />
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
            <h2 className="text-xl font-semibold text-ink">Template edit</h2>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <input defaultValue={templates[0].name} className="rounded-2xl border border-slate-200 px-4 py-3 font-semibold outline-none focus:border-field" />
              <select defaultValue={templates[0].type} className="rounded-2xl border border-slate-200 px-4 py-3 outline-none focus:border-field"><option>Project</option><option>Task</option><option>Checklist</option></select>
            </div>
            <div className="mt-5 space-y-3">
              {templates[0].sections.map((section) => <div key={section} className="rounded-2xl bg-slate-50 p-4 font-semibold text-slate-700">{section}</div>)}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export function ChecklistsPage() {
  const useExampleData = useAppSelector((s) => s.account.useExampleData);
  const checklists = useExampleData ? EXAMPLE_CHECKLISTS : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Checklists" subtitle="Account, project, and task checklist library." />
      {checklists.length === 0 ? (
        <EmptyState icon={ListChecks} title="No checklists" body="Connect to the backend or enable Example Data to view checklists." />
      ) : (
        <DataTable
          rows={checklists}
          getKey={(checklist) => checklist.id}
          columns={[
            { header: "Checklist", cell: (checklist) => <span className="font-semibold text-ink">{checklist.title}</span> },
            { header: "Scope",    cell: (checklist) => checklist.scope },
            { header: "Items",    cell: (checklist) => checklist.items.length },
            { header: "Detail",   cell: (checklist) => checklist.items.slice(0, 2).join(", ") }
          ]}
        />
      )}
    </div>
  );
}

export function CategoriesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Categories" subtitle="Task categories used by floor plan pins, boards, and details." />
      <DataTable
        rows={categories}
        getKey={(category) => category.id}
        columns={[
          { header: "Category", cell: (category) => <span className={`rounded-full px-3 py-1 text-sm font-semibold ${category.color}`}>{category.name}</span> },
          { header: "Used in", cell: () => "Plan pins, task detail, status board" },
          { header: "Modal behavior", cell: () => "Selectable during create/edit task" }
        ]}
      />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">Customize statuses</h2>
        <DataTable
          rows={taskStatuses.map((status, index) => ({ id: status, name: status, color: ["Slate", "Blue", "Indigo", "Red", "Emerald"][index], type: index === 4 ? "Terminal" : "Workflow", permission: index === 3 ? "Manager override" : "All roles" }))}
          getKey={(row) => row.id}
          columns={[
            { header: "Name", cell: (row) => <span className="font-semibold text-ink">{row.name}</span> },
            { header: "Color", cell: (row) => row.color },
            { header: "Type", cell: (row) => row.type },
            { header: "Permissions", cell: (row) => row.permission }
          ]}
        />
      </section>
    </div>
  );
}

export function UsersPage() {
  const useExampleData = useAppSelector((s) => s.account.useExampleData);
  const employees = useExampleData ? EXAMPLE_EMPLOYEES : [];

  return (
    <div className="space-y-6">
      <PageHeader title="Users" subtitle="Personnel roster and role assignments." />
      {employees.length === 0 ? (
        <EmptyState icon={Users} title="No users" body="Connect to the backend or enable Example Data to view personnel." />
      ) : (
        <DataTable
          rows={employees}
          getKey={(employee) => employee.id}
          columns={[
            { header: "User",   cell: (employee) => <div className="flex items-center gap-3"><Avatar name={employee.name} /><div><p className="font-semibold text-ink">{employee.name}</p><p className="text-xs text-slate-500">{employee.title}</p></div></div> },
            { header: "Role",   cell: (employee) => employee.role },
            { header: "Phone",  cell: (employee) => employee.phone },
            { header: "Status", cell: (employee) => <StatusBadge>{employee.status}</StatusBadge> }
          ]}
        />
      )}
    </div>
  );
}

export function AccountPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Account" subtitle="Company profile, policies, and admin settings." />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold text-ink">Company profile</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {["Company name", "Primary contact", "Billing email", "Default time zone", "Office address", "Storage policy"].map((item, index) => (
            <label key={item} className="text-sm font-semibold text-slate-500">
              {item}
              <input defaultValue={["Clearplan Command", "", "", "America/New_York", "", ""][index]} placeholder="Not configured" className="mt-2 w-full rounded-2xl border border-slate-200 px-4 py-3 text-ink outline-none focus:border-field" />
            </label>
          ))}
        </div>
      </section>
    </div>
  );
}

function SimpleList({ icon: Icon, items }: { icon: typeof ShieldCheck; items: string[] }) {
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <section key={item} className="card rounded-3xl p-5">
          <Icon size={22} className="text-field" aria-hidden="true" />
          <h3 className="mt-3 font-semibold text-ink">{item}</h3>
        </section>
      ))}
    </div>
  );
}

function SimpleManager({ title, subtitle, icon: Icon, items }: { title: string; subtitle: string; icon: typeof ShieldCheck; items: string[] }) {
  return (
    <div className="space-y-6">
      <PageHeader title={title} subtitle={subtitle} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <section key={item} className="card rounded-3xl p-5">
            <Icon size={22} className="text-field" aria-hidden="true" />
            <h3 className="mt-3 font-semibold text-ink">{item}</h3>
            <p className="mt-2 text-sm text-slate-500">Editable demo record with local mock data only.</p>
          </section>
        ))}
      </div>
      {!items.length && <EmptyState icon={Icon} title={`No ${title.toLowerCase()}`} body="Create the first reusable record when backend storage is connected." />}
    </div>
  );
}

function PageHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold uppercase text-field">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{title}</h1>
        <p className="mt-2 text-slate-500">{subtitle}</p>
      </div>
      <button className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
        <Plus size={18} aria-hidden="true" />
        Add
      </button>
    </div>
  );
}
