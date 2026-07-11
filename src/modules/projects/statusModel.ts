import type { ProjectStatus } from "@/shared/types/domain";

export interface PhaseStatus {
  code: string;
  label: string;
  projectStatus: ProjectStatus;
  classes: string;
}

export const phaseStatuses: PhaseStatus[] = [
  { code: "phase-1", label: "Phase 1 - Site Visit", projectStatus: "Planning", classes: "border-blue-200/70 bg-blue-50/70 text-blue-700" },
  { code: "phase-2", label: "Phase 2 - Proposal Sent", projectStatus: "Planning", classes: "border-orange-200/70 bg-orange-50/70 text-orange-700" },
  { code: "phase-2-1", label: "Phase 2.1 - Pending", projectStatus: "Planning", classes: "border-orange-200/70 bg-orange-50/70 text-orange-700" },
  { code: "phase-2-2", label: "Phase 2.2 - Cancelled", projectStatus: "Review", classes: "border-red-200/70 bg-red-50/70 text-red-700" },
  { code: "phase-3", label: "Phase 3 - Approved", projectStatus: "Active", classes: "border-fuchsia-200/70 bg-fuchsia-50/70 text-fuchsia-700" },
  { code: "phase-3-1", label: "Phase 3.1 - Deposit Paid", projectStatus: "Active", classes: "border-fuchsia-200/70 bg-fuchsia-50/70 text-fuchsia-700" },
  { code: "phase-3-2", label: "Phase 3.2 - Equipment Ordered", projectStatus: "Active", classes: "border-fuchsia-200/70 bg-fuchsia-50/70 text-fuchsia-700" },
  { code: "phase-3-3", label: "Phase 3.3 - Scheduled", projectStatus: "Active", classes: "border-fuchsia-200/70 bg-fuchsia-50/70 text-fuchsia-700" },
  { code: "phase-4", label: "Phase 4 - Installation In Progress", projectStatus: "Active", classes: "border-sky-200/70 bg-sky-50/70 text-sky-700" },
  { code: "phase-4-1", label: "Phase 4.1 - Installation Completed", projectStatus: "Active", classes: "border-sky-200/70 bg-sky-50/70 text-sky-700" },
  { code: "phase-4-2", label: "Phase 4.2 - Configuration In Progress", projectStatus: "Active", classes: "border-sky-200/70 bg-sky-50/70 text-sky-700" },
  { code: "phase-4-3", label: "Phase 4.3 - Configuration Completed", projectStatus: "Active", classes: "border-sky-200/70 bg-sky-50/70 text-sky-700" },
  { code: "phase-5", label: "Phase 5 - Job Completed", projectStatus: "Complete", classes: "border-green-200/70 bg-green-50/70 text-green-700" },
  { code: "phase-6", label: "Phase 6 - Final Payment Paid", projectStatus: "Complete", classes: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700" },
  { code: "phase-7", label: "Phase 7 - Closed", projectStatus: "Review", classes: "border-red-200/70 bg-red-50/70 text-red-700" }
];

export function statusByCode(code: string) {
  return phaseStatuses.find((status) => status.code === code) ?? phaseStatuses[0];
}

export function statusByLegacy(phase: string, detail: string) {
  const label = `${phase} - ${detail}`;
  return phaseStatuses.find((status) => status.label.toLowerCase() === label.toLowerCase()) ?? phaseStatuses.find((status) => status.label.startsWith(phase)) ?? phaseStatuses[0];
}
