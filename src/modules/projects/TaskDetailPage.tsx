import { Link, useParams } from "react-router-dom";
import { FloorPlanViewer } from "@/shared/components/FloorPlanViewer";
import { TaskDetailContent } from "./ProjectDetailPage";
import { useProjectBundle } from "./projectHelpers";

export function TaskDetailPage() {
  const { projectId, taskId } = useParams();
  const { project, projectTasks, projectPlans, projectPhotos, checklists, updateTask } = useProjectBundle(projectId);
  const task = projectTasks.find((item) => item.id === taskId) ?? projectTasks[0];
  const activePlan = task ? projectPlans.find((plan) => plan.id === task.floorPlanId) ?? projectPlans[0] : undefined;

  if (!project || !task) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-soft">
        <h1 className="text-2xl font-bold text-slate-950">{project ? "Task not found" : "Project not found"}</h1>
        <Link to={project ? `/projects/${project.id}` : "/projects"} className="mt-4 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white">
          {project ? "Back to project" : "Back to projects"}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to={`/projects/${project.id}`} className="text-sm font-semibold text-field">Back to project</Link>
        <h1 className="mt-2 text-3xl font-semibold text-ink">{task.title}</h1>
        <p className="mt-2 text-slate-500">{project.name}</p>
      </div>
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="card rounded-3xl p-6">
          <TaskDetailContent task={task} onTaskChange={(patch) => updateTask(task.id, patch)} />
        </section>
        <div className="space-y-5">
          {activePlan && <FloorPlanViewer floorPlan={activePlan} tasks={projectTasks.filter((item) => item.floorPlanId === activePlan.id)} onTaskSelect={() => undefined} onPinMove={(id, x_percent, y_percent) => updateTask(id, { x_percent, y_percent })} />}
          <section className="grid gap-4 md:grid-cols-3">
            <Panel title="Checklist" items={checklists[0]?.items ?? []} />
            <Panel title="Activity" items={["Status changed", "Pin moved on plan", "Assignee reviewed"]} />
            <Panel title="Comments" items={["Need final client approval.", "Photos attached for closeout."]} />
          </section>
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
            <h2 className="font-semibold text-ink">Task media</h2>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {projectPhotos.map((photo) => (
                <img key={photo.id} src={photo.url} alt={photo.title} className="h-28 w-40 shrink-0 rounded-2xl object-cover" />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-soft">
      <h2 className="font-semibold text-ink">{title}</h2>
      <div className="mt-4 space-y-2">
        {items.map((item) => <p key={item} className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-600">{item}</p>)}
      </div>
    </section>
  );
}
