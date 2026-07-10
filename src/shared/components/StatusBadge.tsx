import type { ReactNode } from "react";

const toneMap: Record<string, string> = {
  Active: "bg-emerald-100 text-emerald-700",
  Planning: "bg-blue-100 text-blue-700",
  Review: "bg-amber-100 text-amber-700",
  Complete: "bg-slate-100 text-slate-700",
  "Clocked in": "bg-emerald-100 text-emerald-700",
  "On break": "bg-amber-100 text-amber-700",
  "Off shift": "bg-slate-100 text-slate-700",
  Backlog: "bg-slate-100 text-slate-700",
  Scheduled: "bg-blue-100 text-blue-700",
  "In Progress": "bg-indigo-100 text-indigo-700",
  Blocked: "bg-red-100 text-red-700",
  Done: "bg-emerald-100 text-emerald-700"
};

export function StatusBadge({ children }: { children: ReactNode }) {
  const label = String(children);
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold leading-5 ${toneMap[label] ?? "bg-slate-100 text-slate-700"}`}>{children}</span>;
}
