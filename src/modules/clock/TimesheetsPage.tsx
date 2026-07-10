import { DataTable } from "@/shared/components/DataTable";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { employeeName, findProject, timeEntries } from "@/infrastructure/offline/mockData";

export function TimesheetsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-field">Democlock admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-2 text-slate-500">Review clock entries, breaks, hours, and mocked GPS review status.</p>
      </div>
      <DataTable
        rows={timeEntries}
        getKey={(entry) => entry.id}
        columns={[
          { header: "Employee", cell: (entry) => <span className="font-semibold text-ink">{employeeName(entry.employeeId)}</span> },
          { header: "Project", cell: (entry) => findProject(entry.projectId).name },
          { header: "Date", cell: (entry) => entry.date },
          { header: "Clock", cell: (entry) => `${entry.clockIn} - ${entry.clockOut ?? "Active"}` },
          { header: "Break", cell: (entry) => `${entry.breakMinutes} min` },
          { header: "Hours", cell: (entry) => `${entry.hours}h` },
          { header: "Location", cell: (entry) => <StatusBadge>{entry.locationStatus === "Inside geofence" ? "Active" : entry.locationStatus === "Manual review" ? "Review" : "Complete"}</StatusBadge> }
        ]}
      />
    </div>
  );
}
