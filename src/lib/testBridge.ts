// ---------------------------------------------------------------------------
// Test bridge (window.gaiaTest)
//
// A tiny, side-effect-only helper surface used by the headless-Chrome smoke test
// (scripts/smoke.mjs) to drive the real app deterministically. It complements the
// existing window.gaiaEditor hook. Heavy libraries (Fabric via layoutEngine,
// pdf-lib via pdfExport) are loaded with dynamic import() so this file never
// bloats the initial bundle or defeats code-splitting.
// ---------------------------------------------------------------------------

import type { AveryDataset, Ingredient, LabelContext, Recipe } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import dataset from '@/data/averyTemplates.json';

interface GaiaEditorLike {
  exportLabelPng: (ppi?: number) => string;
}

export interface GaiaTestApi {
  templates: () => Array<{
    id: string;
    shape: string;
    perSheet: number;
    widthIn: number;
    heightIn: number;
    contexts: LabelContext[];
  }>;
  startDesign: (templateId: string, context: LabelContext) => void;
  autoLayout: (context: LabelContext, ingredientCount: number) => Promise<void>;
  buildPdf: (
    quantity: number,
    fillSheet: boolean,
  ) => Promise<{ pages: number; width: number; height: number }>;
}

const data = dataset as unknown as AveryDataset;

const api: GaiaTestApi = {
  templates: () =>
    data.templates.map((t) => ({
      id: t.id,
      shape: t.shape,
      perSheet: t.perSheet,
      widthIn: t.labelWidthIn,
      heightIn: t.labelHeightIn,
      contexts: t.contexts,
    })),

  startDesign: (templateId, context) => {
    const tpl = data.templates.find((t) => t.id === templateId);
    if (!tpl) throw new Error(`template not found: ${templateId}`);
    useAppStore.getState().startNewDesign(tpl, context);
  },

  autoLayout: async (context, ingredientCount) => {
    const { applyAutoLayout } = await import('@/lib/layoutEngine');
    const ingredients: Ingredient[] = Array.from({ length: ingredientCount }, (_, i) => ({
      id: `ing-${i}`,
      name: `Ingredient ${i + 1}`,
      benefit: `Nourishing benefit number ${i + 1}`,
      inci: `Botanical Inci ${i + 1}`,
      isSoapBase: i === 0,
      active: true,
      createdAt: 0,
      updatedAt: 0,
    }));
    const recipe: Recipe = {
      id: 'test-recipe',
      name: 'Lavender Dream Soap',
      ingredientIds: ingredients.map((i) => i.id),
      benefit: 'Soothes and gently softens skin',
      netWeight: '4.5 oz (128 g)',
      directions: 'Lather, rinse, and enjoy daily.',
      warnings: 'For external use only. Discontinue if irritation occurs.',
      footer: 'Handmade by Gaia · gaiasoaps.com',
      createdAt: 0,
      updatedAt: 0,
    };
    await applyAutoLayout(recipe, ingredients, context);
  },

  buildPdf: async (quantity, fillSheet) => {
    const template = useAppStore.getState().template;
    if (!template) throw new Error('no active template');
    const editor = (window as unknown as { gaiaEditor: GaiaEditorLike }).gaiaEditor;
    const png = editor.exportLabelPng();
    const { buildLabelSheetPdf } = await import('@/lib/pdfExport');
    const bytes = await buildLabelSheetPdf({ template, pngDataUrl: png, quantity, fillSheet });
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes);
    const first = doc.getPage(0);
    const { width, height } = first.getSize();
    return { pages: doc.getPageCount(), width, height };
  },
};

if (typeof window !== 'undefined') {
  (window as unknown as { gaiaTest: GaiaTestApi }).gaiaTest = api;
}
