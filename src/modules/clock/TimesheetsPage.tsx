import { Clock } from "lucide-react";
import { DataTable } from "@/shared/components/DataTable";
import { EmptyState } from "@/shared/components/EmptyState";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { employeeName, findProject } from "@/infrastructure/offline/mockData";
import { useAppSelector } from "@/store/hooks";
import { EXAMPLE_TIME_ENTRIES } from "@/core/example/exampleDataPayloads";

export function TimesheetsPage() {
  const useExampleData = useAppSelector((s) => s.account.useExampleData);
  const timeEntries = useExampleData ? EXAMPLE_TIME_ENTRIES : [];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-field">Field clock admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Timesheets</h1>
        <p className="mt-2 text-slate-500">Review clock entries, breaks, hours, and GPS review status.</p>
      </div>
      {timeEntries.length === 0 ? (
        <EmptyState icon={Clock} title="No timesheet entries" body="Connect to the backend or enable Example Data to review clock entries." />
      ) : (
        <DataTable
          rows={timeEntries}
          getKey={(entry) => entry.id}
          columns={[
            { header: "Employee", cell: (entry) => <span className="font-semibold text-ink">{employeeName(entry.employeeId)}</span> },
            { header: "Project",  cell: (entry) => findProject(entry.projectId).name },
            { header: "Date",     cell: (entry) => entry.date },
            { header: "Clock",    cell: (entry) => `${entry.clockIn} - ${entry.clockOut ?? "Active"}` },
            { header: "Break",    cell: (entry) => `${entry.breakMinutes} min` },
            { header: "Hours",    cell: (entry) => `${entry.hours}h` },
            { header: "Location", cell: (entry) => (
              <StatusBadge>
                {entry.locationStatus === "Inside geofence" ? "Active"
                  : entry.locationStatus === "Manual review" ? "Review"
                  : "Complete"}
              </StatusBadge>
            )},
          ]}
        />
      )}
    </div>
  );
}
