import { create } from "zustand";
import type { LabelContext } from "../../shared/contract";

export type WizardStep = "template" | "assets" | "editor" | "print";

interface AppState {
  step: WizardStep;
  projectId: number | null;
  projectName: string;
  templateSku: string | null;
  context: LabelContext;
  recipeId: number | null;
  canvasJson: string | null;
  setStep: (step: WizardStep) => void;
  setProject: (p: { id: number; name: string }) => void;
  setTemplateSku: (sku: string) => void;
  setContext: (c: LabelContext) => void;
  setRecipeId: (id: number | null) => void;
  setCanvasJson: (json: string | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: "template",
  projectId: null,
  projectName: "Untitled label",
  templateSku: null,
  context: "front",
  recipeId: null,
  canvasJson: null,
  setStep: (step) => set({ step }),
  setProject: (p) => set({ projectId: p.id, projectName: p.name }),
  setTemplateSku: (sku) => set({ templateSku: sku }),
  setContext: (context) => set({ context }),
  setRecipeId: (recipeId) => set({ recipeId }),
  setCanvasJson: (canvasJson) => set({ canvasJson }),
  reset: () =>
    set({
      step: "template",
      projectId: null,
      projectName: "Untitled label",
      templateSku: null,
      context: "front",
      recipeId: null,
      canvasJson: null,
    }),
}));
