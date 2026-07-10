import { Avatar } from "@/shared/components/Avatar";
import { DataTable } from "@/shared/components/DataTable";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { employees, findProject } from "@/infrastructure/offline/mockData";

export function EmployeesPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-field">Employees</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Field team</h1>
        <p className="mt-2 text-slate-500">Employee profiles, assigned work, and time summary.</p>
      </div>
      <DataTable
        rows={employees}
        getKey={(employee) => employee.id}
        columns={[
          { header: "Employee", cell: (employee) => <div className="flex items-center gap-3"><Avatar name={employee.name} /><div><p className="font-semibold text-ink">{employee.name}</p><p className="text-xs text-slate-500">{employee.title}</p></div></div> },
          { header: "Role", cell: (employee) => employee.role },
          { header: "Status", cell: (employee) => <StatusBadge>{employee.status}</StatusBadge> },
          { header: "Assigned project", cell: (employee) => findProject(employee.assignedProjectId).name },
          { header: "Today", cell: (employee) => `${employee.todayHours}h` },
          { header: "Week", cell: (employee) => `${employee.weekHours}h` }
        ]}
      />
    </div>
  );
}
