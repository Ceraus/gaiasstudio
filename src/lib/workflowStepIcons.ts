import { BookOpen, Image as ImageIcon, Layers, Pencil, Printer, type LucideIcon } from 'lucide-react';

export type WorkflowStepOrder = 1 | 2 | 3 | 4 | 5;

export interface WorkflowStepIcon {
  icon: LucideIcon;
  /** Tinted chip classes — same tokens as WelcomeScreen workflow cards. */
  chip: string;
}

/** Shared step icons + colors for WelcomeScreen cards and the header WorkflowStepper. */
export const WORKFLOW_STEP_ICONS: Record<WorkflowStepOrder, WorkflowStepIcon> = {
  1: { icon: Layers, chip: 'bg-sky-100 text-sky-700' },
  2: { icon: BookOpen, chip: 'bg-gaia-100 text-gaia-700' },
  3: { icon: ImageIcon, chip: 'bg-violet-100 text-violet-700' },
  4: { icon: Pencil, chip: 'bg-amber-100 text-amber-700' },
  5: { icon: Printer, chip: 'bg-emerald-100 text-emerald-700' },
};

const SCREEN_STEP_ORDER: Record<string, WorkflowStepOrder> = {
  template: 1,
  sets: 1,
  recipes: 2,
  background: 3,
  'editor-v2': 4,
  editor: 4,
  export: 5,
};

/** Map a workflow screen to its step order (1–5). */
export function workflowOrderForScreen(screen: string): WorkflowStepOrder | undefined {
  return SCREEN_STEP_ORDER[screen];
}
