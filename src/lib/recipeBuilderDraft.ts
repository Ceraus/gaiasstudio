import type { ParsedRecipeIngredient } from '@/lib/localAi';
import type { RecipeAmountUnit } from '@/types';
import { isRecipeAmountUnit } from '@/lib/inventoryMath';

export const RECIPE_BUILDER_DRAFT_KEY = 'gaia.recipeBuilder.draft';

const memoryStore = new Map<string, string>();

function readStore(key: string): string | null {
  try {
    const value = localStorage.getItem(key);
    if (value != null) return value;
  } catch {
    /* private mode / node */
  }
  return memoryStore.get(key) ?? null;
}

function writeStore(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    memoryStore.set(key, value);
  }
}

function removeStore(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    memoryStore.delete(key);
  }
}

export interface RecipeBuilderDraft {
  step: number;
  name: string;
  netWeight: string;
  barsPerBatch: string;
  selectedIds: string[];
  amounts: Record<string, string>;
  units: Record<string, RecipeAmountUnit>;
  pasteText: string;
  unresolved: ParsedRecipeIngredient[];
  benefit?: string;
  benefitEn?: string;
  benefitEs?: string;
  savedAt: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function sanitizeDraft(raw: unknown): RecipeBuilderDraft | null {
  if (!isRecord(raw)) return null;
  const selectedIds = Array.isArray(raw.selectedIds)
    ? raw.selectedIds.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];
  const amounts: Record<string, string> = {};
  if (isRecord(raw.amounts)) {
    for (const [id, value] of Object.entries(raw.amounts)) {
      if (typeof value === 'string') amounts[id] = value;
    }
  }
  const units: Record<string, RecipeAmountUnit> = {};
  if (isRecord(raw.units)) {
    for (const [id, value] of Object.entries(raw.units)) {
      if (isRecipeAmountUnit(value)) units[id] = value;
    }
  }
  const unresolved: ParsedRecipeIngredient[] = [];
  if (Array.isArray(raw.unresolved)) {
    for (const item of raw.unresolved) {
      if (!isRecord(item) || typeof item.name !== 'string' || !item.name.trim()) continue;
      const next: ParsedRecipeIngredient = { name: item.name };
      if (typeof item.amount === 'number' && Number.isFinite(item.amount)) next.amount = item.amount;
      if (item.unit === 'g' || item.unit === 'drops') next.unit = item.unit;
      unresolved.push(next);
    }
  }
  const step = typeof raw.step === 'number' && raw.step >= 0 && raw.step <= 2 ? Math.round(raw.step) : 0;
  return {
    step,
    name: typeof raw.name === 'string' ? raw.name : '',
    netWeight: typeof raw.netWeight === 'string' && raw.netWeight.trim() ? raw.netWeight : '100g',
    barsPerBatch: typeof raw.barsPerBatch === 'string' && raw.barsPerBatch.trim() ? raw.barsPerBatch : '1',
    selectedIds,
    amounts,
    units,
    pasteText: typeof raw.pasteText === 'string' ? raw.pasteText : '',
    unresolved,
    benefit: typeof raw.benefit === 'string' ? raw.benefit : '',
    benefitEn: typeof raw.benefitEn === 'string' ? raw.benefitEn : '',
    benefitEs: typeof raw.benefitEs === 'string' ? raw.benefitEs : '',
    savedAt: typeof raw.savedAt === 'number' ? raw.savedAt : Date.now(),
  };
}

export function draftHasContent(
  draft: Pick<RecipeBuilderDraft, 'name' | 'netWeight' | 'barsPerBatch' | 'selectedIds' | 'amounts' | 'pasteText' | 'unresolved' | 'step'>,
  lockedId?: string,
): boolean {
  if (draft.name.trim()) return true;
  if (draft.step > 0) return true;
  if (draft.pasteText.trim()) return true;
  if (draft.unresolved.length > 0) return true;
  if (draft.netWeight.trim() && draft.netWeight.trim() !== '100g') return true;
  if (draft.barsPerBatch.trim() && draft.barsPerBatch.trim() !== '1') return true;
  if (draft.selectedIds.some((id) => id !== lockedId)) return true;
  return Object.values(draft.amounts).some((value) => value.trim().length > 0);
}

export function loadRecipeBuilderDraft(): RecipeBuilderDraft | null {
  try {
    const raw = readStore(RECIPE_BUILDER_DRAFT_KEY);
    if (!raw) return null;
    return sanitizeDraft(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveRecipeBuilderDraft(
  draft: Omit<RecipeBuilderDraft, 'savedAt'>,
  lockedId?: string,
): void {
  if (!draftHasContent(draft, lockedId)) {
    removeStore(RECIPE_BUILDER_DRAFT_KEY);
    return;
  }
  const payload: RecipeBuilderDraft = { ...draft, savedAt: Date.now() };
  writeStore(RECIPE_BUILDER_DRAFT_KEY, JSON.stringify(payload));
}

export function clearRecipeBuilderDraft(): void {
  removeStore(RECIPE_BUILDER_DRAFT_KEY);
}
