import { Focus, Plus, ZoomIn, ZoomOut } from "lucide-react";
import { useState } from "react";
import type { FloorPlan, Task } from "@/shared/types/domain";
import { TaskPin } from "./TaskPin";

interface FloorPlanViewerProps {
  floorPlan: FloorPlan;
  tasks: Task[];
  onTaskSelect: (task: Task) => void;
  addTaskMode?: boolean;
  onCreatePin?: (xPercent: number, yPercent: number) => void;
  onPinMove?: (taskId: string, xPercent: number, yPercent: number) => void;
}

export function FloorPlanViewer({ floorPlan, tasks, onTaskSelect, addTaskMode = false, onCreatePin, onPinMove }: FloorPlanViewerProps) {
  const [zoom, setZoom] = useState(1);

  function handleCreate(event: React.MouseEvent<HTMLDivElement>) {
    if (!addTaskMode || !onCreatePin || !(event.target instanceof Element)) return;
    if (event.target.closest("button")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const xPercent = Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2));
    const yPercent = Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2));
    onCreatePin(xPercent, yPercent);
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-soft">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-ink">{floorPlan.name}</h3>
          <p className="text-sm text-slate-500">Pins use relative x/y percentages so they stay locked across resize, zoom, and mobile layout.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" aria-label="Fit to screen" onClick={() => setZoom(1)} className="rounded-full border border-slate-200 p-2 hover:bg-slate-50">
            <Focus size={18} />
          </button>
          <button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.6, value - 0.1))} className="rounded-full border border-slate-200 p-2 hover:bg-slate-50">
            <ZoomOut size={18} />
          </button>
          <span className="min-w-14 text-center text-sm font-semibold text-slate-600">{Math.round(zoom * 100)}%</span>
          <button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.8, value + 0.1))} className="rounded-full border border-slate-200 p-2 hover:bg-slate-50">
            <ZoomIn size={18} />
          </button>
        </div>
      </div>
      <div className="overflow-auto rounded-2xl bg-slate-100 p-3 scrollbar-soft">
        <div className="mx-auto min-w-[620px] max-w-5xl origin-top transition-transform" style={{ transform: `scale(${zoom})`, marginBottom: `${(zoom - 1) * 110}px` }}>
          <div
            data-plan-canvas
            onClick={handleCreate}
            className={`relative aspect-[16/10] overflow-hidden rounded-2xl border border-slate-300 bg-white ${addTaskMode ? "cursor-crosshair ring-2 ring-field" : "cursor-default"}`}
          >
            {floorPlan.type === "pdf" ? (
              <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(90deg,#eef2f7_1px,transparent_1px),linear-gradient(#eef2f7_1px,transparent_1px)] bg-[size:42px_42px] p-8">
                <div className="w-full max-w-lg rounded-3xl bg-white/92 px-6 py-5 text-center shadow-soft">
                  <p className="text-sm font-semibold uppercase text-slate-400">PDF preview placeholder</p>
                  <p className="mt-1 text-xl font-semibold text-ink">{floorPlan.name}</p>
                  <p className="mt-2 text-sm text-slate-500">Application/PDF · uploaded {floorPlan.uploadedAt}</p>
                  <div className="mt-5 aspect-[4/3] rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="h-full rounded-xl border-2 border-dashed border-slate-300 bg-white" />
                  </div>
                </div>
              </div>
            ) : floorPlan.previewUrl ? (
              <img src={floorPlan.previewUrl} alt={floorPlan.name} className="absolute inset-0 h-full w-full object-contain" />
            ) : (
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1600 1000" role="img" aria-label="Floor plan mock">
                <rect width="1600" height="1000" fill="#f8fafc" />
                <path d="M120 120H1480V880H120Z" fill="#fff" stroke="#334155" strokeWidth="10" />
                <path d="M120 300H1480M120 560H1480M430 120V880M760 120V560M1080 300V880" stroke="#64748b" strokeWidth="8" />
                <path d="M455 145H730V280H455ZM785 145H1050V280H785ZM1110 330H1450V540H1110ZM455 590H1045V850H455Z" fill="#eff6ff" stroke="#94a3b8" strokeWidth="5" />
                <text x="220" y="215" fill="#475569" fontSize="48" fontFamily="Inter">Lobby</text>
                <text x="510" y="225" fill="#475569" fontSize="38" fontFamily="Inter">IT Room</text>
                <text x="815" y="225" fill="#475569" fontSize="38" fontFamily="Inter">Firewall</text>
                <text x="1150" y="430" fill="#475569" fontSize="38" fontFamily="Inter">Nurse Station</text>
                <text x="530" y="735" fill="#475569" fontSize="44" fontFamily="Inter">Clinical Wing</text>
              </svg>
            )}
            {tasks.map((task) => (
              <TaskPin key={task.id} task={task} onSelect={onTaskSelect} onMove={onPinMove} />
            ))}
            {addTaskMode && (
              <div className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600 shadow">
                <Plus size={14} aria-hidden="true" />
                Click the plan to place a task pin
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
