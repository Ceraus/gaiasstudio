import { Coffee, LogIn, LogOut, MapPin, Pause, Play, TimerReset } from "lucide-react";
import { useState } from "react";
import { Avatar } from "@/shared/components/Avatar";
import { DataTable } from "@/shared/components/DataTable";
import { Modal } from "@/shared/components/Modal";
import { StatCard } from "@/shared/components/StatCard";
import { StatusBadge } from "@/shared/components/StatusBadge";
import { employees, findProject, projects } from "@/infrastructure/offline/mockData";

export function ClockPage() {
  const [state, setState] = useState<"Clocked in" | "On break" | "Off shift">("Clocked in");
  const [confirm, setConfirm] = useState<"clock" | "break" | null>(null);
  const currentEmployee = employees[0];
  const project = findProject(currentEmployee.assignedProjectId);
  const clockedIn = state !== "Off shift";

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase text-field">Democlock</p>
        <h1 className="mt-2 text-3xl font-semibold text-ink">Employee time tracking</h1>
        <p className="mt-2 text-slate-500">Clock in/out, breaks, assigned job, and GPS status are mocked locally for the demo.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Today" value={`${currentEmployee.todayHours}h`} detail="Includes lunch and break tracking" icon={TimerReset} />
        <StatCard label="This week" value={`${currentEmployee.weekHours}h`} detail="Admin-ready weekly summary" icon={Play} />
        <StatCard label="Current job" value={project.name.split(" ")[0]} detail={project.address} icon={MapPin} />
      </div>
      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="card rounded-[2rem] p-6">
          <div className="flex items-center gap-4">
            <Avatar name={currentEmployee.name} className="h-14 w-14" />
            <div>
              <h2 className="text-xl font-semibold text-ink">{currentEmployee.name}</h2>
              <p className="text-sm text-slate-500">{currentEmployee.title}</p>
            </div>
          </div>
          <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
            <p className="text-sm text-slate-300">Current shift</p>
            <p className={`mt-2 text-3xl font-semibold ${state === "On break" ? "text-orange-300" : state === "Off shift" ? "text-red-300" : "text-emerald-300"}`}>{state}</p>
            <p className="mt-2 text-sm text-slate-300">{project.name} · Inside geofence · Shift note: Level 4 closeout</p>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setConfirm("clock")} className={`col-span-2 flex items-center justify-center gap-2 rounded-full px-5 py-4 font-semibold text-white ${clockedIn ? "bg-red-500" : "bg-emerald-500"}`}>
              {clockedIn ? <LogOut size={20} /> : <LogIn size={20} />}
              {clockedIn ? "Clock out" : "Clock in"}
            </button>
            <button type="button" className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">
              <Coffee size={18} />
              Lunch
            </button>
            <button type="button" onClick={() => setConfirm("break")} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700">
              <Pause size={18} />
              {state === "On break" ? "End break" : "Break"}
            </button>
          </div>
        </div>
        <div className="space-y-5">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="text-lg font-semibold text-ink">Location map</h2>
            <div className="relative mt-4 h-64 overflow-hidden rounded-3xl bg-[linear-gradient(90deg,#e2e8f0_1px,transparent_1px),linear-gradient(#e2e8f0_1px,transparent_1px)] bg-[size:34px_34px]">
              {employees.map((employee, index) => (
                <div key={employee.id} className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white px-3 py-2 text-xs font-bold text-white shadow-lift" style={{ left: `${24 + index * 18}%`, top: `${35 + (index % 2) * 26}%`, background: employee.status === "Clocked in" ? "#16a34a" : employee.status === "On break" ? "#f97316" : "#64748b" }}>
                  {employee.name.split(" ")[0]}
                </div>
              ))}
            </div>
          </div>
          <DataTable
            rows={employees}
            getKey={(employee) => employee.id}
            columns={[
              { header: "Employee", cell: (employee) => <span className="font-semibold text-ink">{employee.name}</span> },
              { header: "Status", cell: (employee) => <StatusBadge>{employee.status}</StatusBadge> },
              { header: "Project", cell: (employee) => projects.find((item) => item.id === employee.assignedProjectId)?.name ?? "Unassigned" },
              { header: "Today", cell: (employee) => `${employee.todayHours}h` }
            ]}
          />
        </div>
      </section>
      <Modal title={confirm === "break" ? "Confirm break state" : "Confirm clock action"} open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <div className="space-y-4">
          <p className="text-slate-600">
            {confirm === "break" ? "Switch your current shift between active work and break time." : "Confirm the clock action for the current job site."}
          </p>
          <button
            onClick={() => {
              if (confirm === "break") setState((value) => (value === "On break" ? "Clocked in" : "On break"));
              if (confirm === "clock") setState((value) => (value === "Off shift" ? "Clocked in" : "Off shift"));
              setConfirm(null);
            }}
            className="w-full rounded-full bg-slate-950 px-5 py-3 font-semibold text-white"
          >
            Confirm
          </button>
        </div>
      </Modal>
    </div>
  );
}
