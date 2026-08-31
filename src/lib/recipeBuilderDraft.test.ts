import { afterEach, describe, expect, it } from 'vitest';
import {
  clearRecipeBuilderDraft,
  draftHasContent,
  loadRecipeBuilderDraft,
  saveRecipeBuilderDraft,
} from '@/lib/recipeBuilderDraft';

const empty = {
  step: 0,
  name: '',
  netWeight: '100g',
  barsPerBatch: '1',
  selectedIds: ['base-1'],
  amounts: {},
  units: {},
  pasteText: '',
  unresolved: [],
};

afterEach(() => {
  clearRecipeBuilderDraft();
});

describe('recipe builder draft', () => {
  it('ignores an empty new-recipe form', () => {
    expect(draftHasContent(empty, 'base-1')).toBe(false);
    saveRecipeBuilderDraft(empty, 'base-1');
    expect(loadRecipeBuilderDraft()).toBeNull();
  });

  it('persists and restores a named draft', () => {
    saveRecipeBuilderDraft({ ...empty, name: 'Watermelon bar', selectedIds: ['base-1', 'ing-2'] }, 'base-1');
    const loaded = loadRecipeBuilderDraft();
    expect(loaded?.name).toBe('Watermelon bar');
    expect(loaded?.selectedIds).toEqual(['base-1', 'ing-2']);
    expect(loadRecipeBuilderDraft()).toBeTruthy();
  });

  it('persists chosen recipe-line units', () => {
    saveRecipeBuilderDraft({
      ...empty,
      name: 'Lavender bar',
      selectedIds: ['base-1', 'oil-1'],
      units: { 'oil-1': 'ml' },
    }, 'base-1');
    expect(loadRecipeBuilderDraft()?.units).toEqual({ 'oil-1': 'ml' });
  });

  it('persists benefit copy on a named draft', () => {
    saveRecipeBuilderDraft({
      ...empty,
      name: 'Shea bar',
      selectedIds: ['base-1', 'ing-2'],
      benefit: 'Leaves skin feeling creamy.',
      benefitEn: 'Leaves skin feeling creamy.',
      benefitEs: 'Deja la piel con un tacto cremoso.',
    }, 'base-1');
    const loaded = loadRecipeBuilderDraft();
    expect(loaded?.benefitEn).toBe('Leaves skin feeling creamy.');
    expect(loaded?.benefitEs).toBe('Deja la piel con un tacto cremoso.');
  });
});
