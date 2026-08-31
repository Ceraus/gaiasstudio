/**
 * Derived workflow-step chrome: complete vs skipped vs current vs not reached.
 *
 * Skip is not “the user clicked Continue anyway”. A step is skipped when a later
 * step is active and that step’s required data is still missing. Shape (step 1)
 * is never skipped — Refine is blocked without a template.
 */

export type WorkflowStepStatus = 'current' | 'complete' | 'skipped' | 'upcoming';

export interface WorkflowStepStatusInput {
  stepOrder: number;
  /** 0 when the screen is not one of the five workflow steps. */
  currentOrder: number;
  hasRecipe: boolean;
  hasBackground: boolean;
}

export function getWorkflowStepStatus(input: WorkflowStepStatusInput): WorkflowStepStatus {
  const { stepOrder, currentOrder, hasRecipe, hasBackground } = input;

  if (currentOrder > 0 && stepOrder === currentOrder) return 'current';
  if (stepOrder > currentOrder) return 'upcoming';

  // Past: later step reached. Only recipe (2) and background (3) can be skipped.
  if (stepOrder === 2) return hasRecipe ? 'complete' : 'skipped';
  if (stepOrder === 3) return hasBackground ? 'complete' : 'skipped';
  return 'complete';
}
