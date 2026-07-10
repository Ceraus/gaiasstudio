import type { Task } from "@/shared/types/domain";
import { employeeName } from "@/infrastructure/offline/mockData";

interface TaskPinProps {
  task: Task;
  onSelect: (task: Task) => void;
  onMove?: (taskId: string, xPercent: number, yPercent: number) => void;
}

export function TaskPin({ task, onSelect, onMove }: TaskPinProps) {
  if (typeof task.x_percent !== "number" || typeof task.y_percent !== "number") return null;

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (!onMove) return;
    const movePin = onMove;
    event.preventDefault();
    event.stopPropagation();
    const canvas = event.currentTarget.closest("[data-plan-canvas]");
    if (!(canvas instanceof HTMLElement)) return;
    const planCanvas = canvas;
    event.currentTarget.setPointerCapture(event.pointerId);

    function move(clientX: number, clientY: number) {
      const rect = planCanvas.getBoundingClientRect();
      const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
      const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
      movePin(task.id, Number(x.toFixed(2)), Number(y.toFixed(2)));
    }

    function onPointerMove(moveEvent: PointerEvent) {
      move(moveEvent.clientX, moveEvent.clientY);
    }

    function onPointerUp() {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    }

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp, { once: true });
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
      onClick={() => onSelect(task)}
      aria-label={`Open task ${task.title}`}
      className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none"
      style={{ left: `${task.x_percent}%`, top: `${task.y_percent}%` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full border-4 border-white bg-field text-xs font-bold text-white shadow-lift">{task.title.slice(0, 1)}</span>
      <span className="pointer-events-none absolute left-1/2 top-10 hidden w-52 -translate-x-1/2 rounded-2xl bg-slate-950 px-3 py-2 text-left text-xs text-white shadow-xl group-hover:block">
        <strong className="block text-sm">{task.title}</strong>
        {task.category} · {task.status}
        <span className="mt-1 block text-slate-300">{employeeName(task.assigneeId)}</span>
      </span>
    </button>
  );
}
