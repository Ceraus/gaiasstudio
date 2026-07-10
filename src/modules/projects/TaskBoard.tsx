import type { Task } from "@/shared/types/domain";
import { employeeName, taskStatuses } from "@/infrastructure/offline/mockData";
import { StatusBadge } from "@/shared/components/StatusBadge";

export function TaskBoard({ tasks, onSelect }: { tasks: Task[]; onSelect: (task: Task) => void }) {
  return (
    <div className="grid gap-4 overflow-x-auto pb-2 scrollbar-soft xl:grid-cols-5">
      {taskStatuses.map((status) => (
        <section key={status} className="min-w-64 rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-ink">{status}</h2>
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-500">{tasks.filter((task) => task.status === status).length}</span>
          </div>
          <div className="space-y-3">
            {tasks.filter((task) => task.status === status).map((task) => (
              <button key={task.id} onClick={() => onSelect(task)} className="w-full rounded-2xl border border-slate-100 bg-slate-50 p-4 text-left transition hover:border-field hover:bg-blue-50">
                <StatusBadge>{task.status}</StatusBadge>
                <p className="mt-3 font-semibold text-ink">{task.title}</p>
                <p className="mt-1 text-sm text-slate-500">{task.category} · {employeeName(task.assigneeId)}</p>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
