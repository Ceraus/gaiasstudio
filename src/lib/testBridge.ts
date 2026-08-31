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
import { useEditorStore } from '@/store/useEditorStore';
import { useTourStore } from '@/store/useTourStore';
import dataset from '@/data/averyTemplates.json';

interface GaiaEditorLike {
  exportLabelPng: (ppi?: number) => string;
}

interface GaiaTestApi {
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
  /** Mixed batch sheet built from the live canvas, repeated with the given counts. */
  buildBatchPdf: (
    quantities: number[],
  ) => Promise<{ pages: number; width: number; height: number; slots: number }>;
  /** Writes a deterministic set of collections + drafts for Workspace UI tests. */
  seedWorkspace: () => Promise<{ collections: number; drafts: number }>;
  clearWorkspace: () => Promise<void>;
  /** Empties Saved Designs (`drafts`) only — not recipes, ingredients, or collections. */
  clearDrafts: () => Promise<{ drafts: number }>;
  tableCounts: () => Promise<{
    drafts: number;
    recipes: number;
    ingredients: number;
    collections: number;
    settings: number;
  }>;
  ingredientDedupRoundTrip: () => Promise<{ sameId: boolean; sourceCount: number }>;
  /** Full backup → restore → re-export round trip over the live database. */
  backupRoundTrip: () => Promise<{
    tables: number;
    rowsBefore: number;
    restored: number;
    rowsAfter: number;
  }>;
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

  buildBatchPdf: async (quantities) => {
    const template = useAppStore.getState().template;
    if (!template) throw new Error('no active template');
    const editor = (window as unknown as { gaiaEditor: GaiaEditorLike }).gaiaEditor;
    const png = editor.exportLabelPng();
    const { buildMixedSheetPdf, planBatchSlots } = await import('@/lib/pdfExport');
    const items = quantities.map((quantity) => ({ pngDataUrl: png, quantity }));
    const bytes = await buildMixedSheetPdf({ template, items });
    const { PDFDocument } = await import('pdf-lib');
    const doc = await PDFDocument.load(bytes);
    const { width, height } = doc.getPage(0).getSize();
    return { pages: doc.getPageCount(), width, height, slots: planBatchSlots(items).length };
  },

  seedWorkspace: async () => {
    const { collectionsRepo, draftsRepo, recipesRepo, ingredientsRepo } = await import('@/db/repositories');
    const oily = await collectionsRepo.create('Oily Skin', '#a7d7c5');
    const gifts = await collectionsRepo.create('Holiday Gifts', '#f6c6c0');

    const lavender = await ingredientsRepo.create({
      name: 'Lavender Essential Oil',
      benefit: 'Calming',
      isSoapBase: false,
      active: true,
    });
    const recipe = await recipesRepo.create({
      name: 'Charcoal Detox',
      ingredientIds: [lavender.id],
      benefit: 'Deep cleansing',
    });

    const tpl = data.templates[0];
    await draftsRepo.save({
      name: 'Mint Bar Front',
      designJson: '{"objects":[]}',
      templateId: tpl.id,
      context: 'front',
      collectionId: oily.id,
      recipeId: recipe.id,
    });
    await draftsRepo.save({
      name: 'Cocoa Bar Front',
      designJson: '{"objects":[]}',
      templateId: tpl.id,
      context: 'front',
      collectionId: gifts.id,
    });
    await draftsRepo.save({
      name: 'Unsorted Sample',
      designJson: '{"objects":[]}',
      templateId: tpl.id,
      context: 'front',
    });

    return { collections: 2, drafts: 3 };
  },

  clearWorkspace: async () => {
    const { db } = await import('@/db/db');
    await Promise.all([db.drafts.clear(), db.collections.clear()]);
  },

  clearDrafts: async () => {
    const { draftsRepo } = await import('@/db/repositories');
    const drafts = await draftsRepo.clear();
    return { drafts };
  },

  tableCounts: async () => {
    const { db } = await import('@/db/db');
    const [drafts, recipes, ingredients, collections, settings] = await Promise.all([
      db.drafts.count(),
      db.recipes.count(),
      db.ingredients.count(),
      db.collections.count(),
      db.settings.count(),
    ]);
    return { drafts, recipes, ingredients, collections, settings };
  },

  ingredientDedupRoundTrip: async () => {
    const { ingredientsRepo } = await import('@/db/repositories');
    const first = await ingredientsRepo.create({
      name: 'Smoke Test Shea EO',
      benefit: '',
      isSoapBase: false,
      active: true,
      sourceRefs: [{ provider: 'manual', id: 'smoke-eo' }],
    });
    const second = await ingredientsRepo.create({
      name: 'Smoke Test Shea Essential Oil',
      benefit: '',
      isSoapBase: false,
      active: true,
      sourceRefs: [{ provider: 'openfoodfacts', id: 'smoke-shea' }],
    });
    const sameId = first.id === second.id;
    const resolved = await ingredientsRepo.all();
    const sourceCount = resolved.find((ingredient) => ingredient.id === first.id)?.sourceRefs?.length ?? 0;
    await ingredientsRepo.remove(first.id);
    return { sameId, sourceCount };
  },

  backupRoundTrip: async () => {
    const { buildBackup, restoreBackup } = await import('@/lib/backup');
    const countRows = (tables: Record<string, unknown[]>) =>
      Object.values(tables).reduce((sum, rows) => sum + rows.length, 0);

    const before = await buildBackup();
    const rowsBefore = countRows(before.tables);
    const summary = await restoreBackup(JSON.stringify(before));
    const after = await buildBackup();
    return {
      tables: summary.tables,
      rowsBefore,
      restored: summary.rows,
      rowsAfter: countRows(after.tables),
    };
  },
};

export interface GaiaMaintenanceApi {
  resetInitialSetup: () => Promise<import('@/lib/maintenance').InitialSetupResetResult>;
  deactivateAllIngredients: () => Promise<number>;
  clearDrafts: () => Promise<{ drafts: number }>;
}

const maintenanceApi: GaiaMaintenanceApi = {
  resetInitialSetup: async () => {
    const { resetInitialSetup } = await import('@/lib/maintenance');
    return resetInitialSetup();
  },
  deactivateAllIngredients: async () => {
    const { ingredientsRepo } = await import('@/db/repositories');
    return ingredientsRepo.deactivateAll();
  },
  clearDrafts: async () => {
    const { draftsRepo } = await import('@/db/repositories');
    const drafts = await draftsRepo.clear();
    return { drafts };
  },
};

if (typeof window !== 'undefined' && (import.meta.env.DEV || import.meta.env.VITE_E2E === 'true')) {
  (window as unknown as { gaiaTest: GaiaTestApi }).gaiaTest = api;
  (window as unknown as { gaiaMaintenance: GaiaMaintenanceApi }).gaiaMaintenance = maintenanceApi;
  // The smoke test drives screen navigation and editor view toggles through the
  // same stores the UI uses, rather than reaching into React internals.
  (window as unknown as { gaiaTestStores: unknown }).gaiaTestStores = {
    useAppStore,
    useEditorStore,
    useTourStore,
  };
}
