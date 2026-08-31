import { describe, expect, it } from 'vitest';
import { getWorkflowStepStatus } from './workflowStepStatus';

const pastEditor = { currentOrder: 4, hasRecipe: false, hasBackground: false };

describe('getWorkflowStepStatus', () => {
  it('marks recipe and background skipped on Refine when data is missing', () => {
    expect(getWorkflowStepStatus({ ...pastEditor, stepOrder: 1 })).toBe('complete');
    expect(getWorkflowStepStatus({ ...pastEditor, stepOrder: 2 })).toBe('skipped');
    expect(getWorkflowStepStatus({ ...pastEditor, stepOrder: 3 })).toBe('skipped');
    expect(getWorkflowStepStatus({ ...pastEditor, stepOrder: 4 })).toBe('current');
    expect(getWorkflowStepStatus({ ...pastEditor, stepOrder: 5 })).toBe('upcoming');
  });

  it('turns recipe green once a recipe is selected', () => {
    const input = { currentOrder: 4, hasRecipe: true, hasBackground: false };
    expect(getWorkflowStepStatus({ ...input, stepOrder: 2 })).toBe('complete');
    expect(getWorkflowStepStatus({ ...input, stepOrder: 3 })).toBe('skipped');
  });

  it('shows current-step chrome on a skipped recipe screen (remedying)', () => {
    expect(getWorkflowStepStatus({
      stepOrder: 2,
      currentOrder: 2,
      hasRecipe: false,
      hasBackground: false,
    })).toBe('current');
  });

  it('returns skipped after leaving a skipped step still incomplete', () => {
    expect(getWorkflowStepStatus({
      stepOrder: 2,
      currentOrder: 5,
      hasRecipe: false,
      hasBackground: true,
    })).toBe('skipped');
  });

  it('never marks shape as skipped even without a template', () => {
    expect(getWorkflowStepStatus({
      stepOrder: 1,
      currentOrder: 4,
      hasRecipe: false,
      hasBackground: false,
    })).toBe('complete');
  });

  it('keeps unreached steps as upcoming numbers', () => {
    expect(getWorkflowStepStatus({
      stepOrder: 3,
      currentOrder: 1,
      hasRecipe: false,
      hasBackground: false,
    })).toBe('upcoming');
  });
});
