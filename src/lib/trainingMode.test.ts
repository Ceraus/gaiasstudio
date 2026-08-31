import { describe, expect, it } from 'vitest';
import {
  TRAINING_ALLOWED_SCREENS,
  checkTrainingGate,
  isTrainingModeActive,
} from '@/lib/trainingMode';

const base = {
  template: null,
  activeRecipeId: null,
  backgroundImageUrl: null,
  currentOrder: 1,
};

describe('checkTrainingGate', () => {
  it('blocks Refine (editor-v2) without a template', () => {
    const gate = checkTrainingGate({ ...base, target: 'editor-v2' });
    expect(gate?.reason).toBe('needTemplate');
    expect(gate?.canOverride).toBe(false);
    expect(gate?.redirectTo).toBe('template');
  });

  it('blocks Refine without a recipe once a template is set', () => {
    const gate = checkTrainingGate({
      ...base,
      target: 'editor-v2',
      template: { id: '22562' },
    });
    expect(gate?.reason).toBe('needRecipe');
    expect(gate?.canOverride).toBe(true);
  });

  it('blocks Refine without a background once recipe is set', () => {
    const gate = checkTrainingGate({
      ...base,
      target: 'editor-v2',
      template: { id: '22562' },
      activeRecipeId: 'r1',
    });
    expect(gate?.reason).toBe('needBackground');
    expect(gate?.canOverride).toBe(true);
  });

  it('allows Refine when template, recipe, and background are present', () => {
    expect(
      checkTrainingGate({
        ...base,
        target: 'editor-v2',
        template: { id: '22562' },
        activeRecipeId: 'r1',
        backgroundImageUrl: 'data:image/png;base64,xx',
      }),
    ).toBeNull();
  });

  it('blocks Export before the editor step', () => {
    const gate = checkTrainingGate({
      ...base,
      target: 'export',
      template: { id: '22562' },
      activeRecipeId: 'r1',
      backgroundImageUrl: 'data:image/png;base64,xx',
      currentOrder: 3,
    });
    expect(gate?.reason).toBe('needEditor');
    expect(gate?.redirectTo).toBe('editor-v2');
  });
});

describe('TRAINING_ALLOWED_SCREENS', () => {
  it('lists editor-v2 once and does not keep V1 editor', () => {
    const editors = TRAINING_ALLOWED_SCREENS.filter((s) => s === 'editor' || s === 'editor-v2');
    expect(editors).toEqual(['editor-v2']);
  });
});

describe('isTrainingModeActive', () => {
  it('is on only when explicitly true', () => {
    expect(isTrainingModeActive({ isTrainingMode: true })).toBe(true);
    expect(isTrainingModeActive({ isTrainingMode: false })).toBe(false);
    expect(isTrainingModeActive({})).toBe(false);
  });
});
