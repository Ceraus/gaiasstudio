import { Clock3, DollarSign, MapPin, PackageCheck } from "lucide-react";
import { DataTable } from "@/shared/components/DataTable";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { employeeName, findProject } from "@/infrastructure/offline/mockData";
import { useDemoData } from "@/app/providers/DemoDataProvider";

export function TimeMaterialPage() {
  const { timeEntries } = useDemoData();
  const totalHours = timeEntries.reduce((sum, entry) => sum + entry.hours, 0);
  const materialEstimate = timeEntries.length * 240;
  const reviewEntries = timeEntries.filter((entry) => entry.locationStatus === "Manual review").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-field">Field cost tracking</p>
          <h1 className="mt-2 text-3xl font-semibold text-ink">Time & Material</h1>
          <p className="mt-2 max-w-2xl text-slate-500">Mock labor entries and material allowances for project review.</p>
        </div>
        <button type="button" className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lift">
          <PackageCheck size={18} aria-hidden="true" />
          Add entry
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Logged hours" value={totalHours.toFixed(1)} detail="Local demo entries" icon={Clock3} />
        <StatCard label="Material allowance" value={`$${materialEstimate.toLocaleString()}`} detail="Frontend estimate only" icon={DollarSign} />
        <StatCard label="Location reviews" value={String(reviewEntries)} detail="No backend approval flow yet" icon={MapPin} />
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
          { header: "Status", cell: (entry) => <StatusBadge>{entry.locationStatus === "Inside geofence" ? "Active" : entry.locationStatus === "Manual review" ? "Review" : "Remote"}</StatusBadge> }
        ]}
      />
    </div>
  );
}
