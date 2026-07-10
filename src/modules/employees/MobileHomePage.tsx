import { BriefcaseBusiness, Clock3, Coffee, LogOut } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { Modal } from "@/shared/components/Modal";
import { employees, findProject, tasks } from "@/infrastructure/offline/mockData";

export function MobileHomePage() {
  const employee = employees[0];
  const project = findProject(employee.assignedProjectId);
  const myTasks = tasks.filter((task) => task.assigneeId === employee.id || task.projectId === project.id).slice(0, 3);
  const [state, setState] = useState<"Clocked in" | "On break" | "Off shift">("Clocked in");
  const [confirm, setConfirm] = useState<"clock" | "break" | null>(null);

  return (
    <main className="rounded-3xl bg-slate-950 p-4 text-white shadow-soft">
      <section className="mx-auto max-w-md space-y-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-300">Mobile</p>
          <h1 className="mt-2 text-2xl font-bold">{employee.name}</h1>
          <p className="text-sm text-slate-400">{employee.title}</p>
        </div>
        <section className="dark-card rounded-[2rem] p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400">Today shift</p>
              <h1 className="mt-2 text-3xl font-semibold">6h 24m</h1>
              <p className={`mt-1 text-sm font-semibold ${state === "On break" ? "text-orange-300" : state === "Off shift" ? "text-red-300" : "text-emerald-300"}`}>{state} · {project.name}</p>
            </div>
            <Clock3 className="text-blue-300" size={28} />
          </div>
          <button onClick={() => setConfirm("clock")} className={`mt-6 flex h-32 w-full items-center justify-center rounded-[2rem] text-xl font-semibold shadow-[0_20px_60px_rgba(59,130,246,0.35)] ${state === "Off shift" ? "bg-emerald-500" : "bg-blue-500"}`}>
            <LogOut className="mr-3" size={26} />
            {state === "Off shift" ? "Clock in" : "Clock out"}
          </button>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button onClick={() => setConfirm("break")} className="rounded-3xl bg-white/10 px-4 py-4 font-semibold text-slate-100"><Coffee className="mx-auto mb-2" size={20} />{state === "On break" ? "End break" : "Break"}</button>
            <button className="rounded-3xl bg-white/10 px-4 py-4 font-semibold text-slate-100"><Clock3 className="mx-auto mb-2" size={20} />My time</button>
          </div>
        </section>
        <section className="dark-card rounded-[2rem] p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Assigned project</h2>
            <BriefcaseBusiness className="text-emerald-300" size={22} />
          </div>
          <p className="font-semibold">{project.name}</p>
          <p className="mt-1 text-sm text-slate-400">{project.address}</p>
          <div className="mt-4 h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${project.progress}%` }} /></div>
        </section>
        <section className="dark-card rounded-[2rem] p-5">
          <h2 className="text-lg font-semibold">Quick tasks</h2>
          <div className="mt-4 space-y-3">
            {myTasks.map((task) => (
              <Link key={task.id} to={`/projects/${task.projectId}/tasks/${task.id}`} className="block rounded-3xl bg-white/10 p-4">
                <p className="font-semibold">{task.title}</p>
                <p className="mt-1 text-sm text-slate-400">{task.category} · {task.status}</p>
              </Link>
            ))}
          </div>
        </section>
      </section>
      <Modal title="Confirm shift update" open={Boolean(confirm)} onClose={() => setConfirm(null)}>
        <div className="space-y-4">
          <p className="text-slate-600">{confirm === "break" ? "Update break state for the current shift." : "Update clock state for the current job."}</p>
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
    </main>
  );
}
