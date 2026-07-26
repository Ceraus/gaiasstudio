import { db, DEFAULT_SETTINGS } from './db';
import type {
  AppSettings,
  AssetRecord,
  Client,
  Collection,
  CustomMaterial,
  DesignVersion,
  Draft,
  ExpenseCategory,
  Ingredient,
  IngredientCategory,
  LabelSet,
  ProductListing,
  Receipt,
  ReceiptLineItem,
  Recipe,
  SetPurchase,
  WorkOrder,
  WorkOrderItem,
  WorkOrderUsageLine,
} from '@/types';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

import { calculateFractionalCost, calculateProfitMargin, calculateRecipeMaterialCogs } from '@/lib/inventoryMath';

function recipeFinancials(recipe: Recipe, ingredients: Ingredient[]) {
  const cogsTotal = calculateRecipeMaterialCogs(recipe, ingredients);
  const profitMargin =
    recipe.retailPrice !== undefined
      ? calculateProfitMargin(recipe.retailPrice, cogsTotal)
      : undefined;
  return { cogsTotal, profitMargin };
}

// ---------------------------------------------------------------------------
// Measurement helpers (shared by Inventory, Recipes, and Work Orders)
// ---------------------------------------------------------------------------

/** Categories measured in drops by default (everything else uses grams). */
export const VOLUME_CATEGORIES: ReadonlySet<IngredientCategory> = new Set([
  'essential-oil',
  'fragrance',
]);

/** True when the ingredient is measured in drops (volume) rather than grams. */
export function isVolumeIngredient(ing: Pick<Ingredient, 'measurementType' | 'category'>): boolean {
  if (ing.measurementType) return ing.measurementType === 'volume';
  return ing.category ? VOLUME_CATEGORIES.has(ing.category) : false;
}

/** Base unit label for an ingredient ('g' or 'drops'). */
export function baseUnitOf(ing: Pick<Ingredient, 'measurementType' | 'category'>): 'g' | 'drops' {
  return isVolumeIngredient(ing) ? 'drops' : 'g';
}

// --- Ingredients -----------------------------------------------------------

export const ingredientsRepo = {
  all: () => db.ingredients.orderBy('name').toArray(),
  active: () =>
    db.ingredients
      .filter((i) => i.active === true)
      .sortBy('name'),
  inactive: () =>
    db.ingredients
      .filter((i) => i.active !== true)
      .sortBy('name'),
  async create(
    input: Omit<Ingredient, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Ingredient> {
    const now = Date.now();
    const fractionalCost = calculateFractionalCost(input);
    const rec: Ingredient = {
      ...input,
      active: input.active ?? false,
      fractionalCost,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.ingredients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Ingredient>) {
    const existing = await db.ingredients.get(id);
    const merged = existing ? { ...existing, ...patch } : patch;
    const fractionalCost = calculateFractionalCost(merged);
    await db.ingredients.update(id, { ...patch, fractionalCost, updatedAt: Date.now() });
  },
  async toggleActive(id: string) {
    const ing = await db.ingredients.get(id);
    if (!ing) return;
    await db.ingredients.update(id, { active: !ing.active, updatedAt: Date.now() });
  },
  /** Deactivates every active ingredient whose id is not in `keepIds`. */
  async deactivateExcept(keepIds: Set<string>): Promise<number> {
    const active = await db.ingredients.filter((i) => i.active === true).toArray();
    const now = Date.now();
    let count = 0;
    for (const ing of active) {
      if (!keepIds.has(ing.id)) {
        await db.ingredients.update(ing.id, { active: false, updatedAt: now });
        count++;
      }
    }
    return count;
  },
  /** Deactivates every currently active ingredient. */
  async deactivateAll(): Promise<number> {
    return this.deactivateExcept(new Set());
  },
  remove: (id: string) => db.ingredients.delete(id),
};

// --- Custom Materials & Packaging --------------------------------------------

export const customMaterialsRepo = {
  all: () => db.customMaterials.orderBy('name').toArray(),
  active: () =>
    db.customMaterials
      .filter((m) => m.active === true)
      .sortBy('name'),
  inactive: () =>
    db.customMaterials
      .filter((m) => m.active !== true)
      .sortBy('name'),
  async create(
    input: Omit<CustomMaterial, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<CustomMaterial> {
    const now = Date.now();
    const rec: CustomMaterial = {
      ...input,
      active: input.active ?? true,
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.customMaterials.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<CustomMaterial>) {
    await db.customMaterials.update(id, { ...patch, updatedAt: Date.now() });
  },
  async toggleActive(id: string) {
    const material = await db.customMaterials.get(id);
    if (!material) return;
    await db.customMaterials.update(id, { active: !material.active, updatedAt: Date.now() });
  },
  remove: (id: string) => db.customMaterials.delete(id),
};

// --- Recipes ---------------------------------------------------------------

export const recipesRepo = {
  all: () => db.recipes.orderBy('name').toArray(),
  get: (id: string) => db.recipes.get(id),
  async create(
    input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Recipe> {
    const now = Date.now();
    const ingredients = await db.ingredients.toArray();
    const draft: Recipe = { ...input, id: uid(), createdAt: now, updatedAt: now };
    const { cogsTotal, profitMargin } = recipeFinancials(draft, ingredients);
    const rec: Recipe = { ...draft, cogsTotal, profitMargin };
    await db.recipes.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Recipe>) {
    const existing = await db.recipes.get(id);
    if (existing) {
      const merged = { ...existing, ...patch };
      const ingredients = await db.ingredients.toArray();
      const { cogsTotal, profitMargin } = recipeFinancials(merged, ingredients);
      await db.recipes.update(id, {
        ...patch,
        cogsTotal,
        profitMargin,
        updatedAt: Date.now(),
      });
      return;
    }
    await db.recipes.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.recipes.delete(id),
};

// --- Assets ----------------------------------------------------------------

export const assetsRepo = {
  all: () => db.assets.orderBy('createdAt').reverse().toArray(),
  active: () =>
    db.assets
      .filter((a) => !a.archived)
      .sortBy('createdAt')
      .then((arr) => arr.reverse()),
  archived: () =>
    db.assets
      .filter((a) => !!a.archived)
      .sortBy('createdAt')
      .then((arr) => arr.reverse()),
  byKind: (kind: AssetRecord['kind']) =>
    db.assets.where('kind').equals(kind).reverse().sortBy('createdAt'),
  async create(input: Omit<AssetRecord, 'id' | 'createdAt'>): Promise<AssetRecord> {
    const rec: AssetRecord = { ...input, archived: false, id: uid(), createdAt: Date.now() };
    await db.assets.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<AssetRecord>) {
    await db.assets.update(id, patch);
  },
  archive: (id: string) => db.assets.update(id, { archived: true }),
  unarchive: (id: string) => db.assets.update(id, { archived: false }),
  remove: (id: string) => db.assets.delete(id),
  bulkRemove: (ids: string[]) => db.assets.bulkDelete(ids),
};

// --- Versions (non-destructive history) ------------------------------------

export const versionsRepo = {
  /** Returns versions newest-first. (Dexie's .reverse() is ignored by .sortBy, so we reverse in JS.) */
  forDesign: async (designId: string) => {
    const asc = await db.versions.where('designId').equals(designId).sortBy('createdAt');
    return asc.reverse();
  },
  async create(input: Omit<DesignVersion, 'id' | 'createdAt'>): Promise<DesignVersion> {
    const rec: DesignVersion = { ...input, id: uid(), createdAt: Date.now() };
    await db.versions.add(rec);
    // Keep history bounded per design (latest 40 snapshots).
    // sortBy('createdAt') returns ASCENDING (oldest first), so we delete
    // the first (oldest) entries beyond the cap, not the newest.
    const all = await db.versions
      .where('designId')
      .equals(input.designId)
      .sortBy('createdAt');
    if (all.length > 40) {
      await db.versions.bulkDelete(all.slice(0, all.length - 40).map((v) => v.id));
    }
    return rec;
  },
  remove: (id: string) => db.versions.delete(id),
};

// --- Label Sets ------------------------------------------------------------

export const setsRepo = {
  all: () => db.labelSets.orderBy('name').toArray(),
  get: (id: string) => db.labelSets.get(id),
  async create(name: string, recipeId?: string): Promise<LabelSet> {
    const now = Date.now();
    const rec: LabelSet = { id: uid(), name, recipeId, createdAt: now, updatedAt: now };
    await db.labelSets.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<LabelSet>) {
    await db.labelSets.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.labelSets.delete(id),
};

// --- Drafts ----------------------------------------------------------------

export const draftsRepo = {
  all: () => db.drafts.orderBy('updatedAt').reverse().toArray(),
  get: (id: string) => db.drafts.get(id),
  async save(patch: Partial<Draft> & { id?: string }): Promise<Draft> {
    const now = Date.now();
    if (patch.id) {
      const existing = await db.drafts.get(patch.id);
      if (existing) {
        // Autosave sends optional fields as undefined when they aren't known
        // right now; those must not wipe values the user already set.
        const defined = Object.fromEntries(
          Object.entries(patch).filter(([, v]) => v !== undefined),
        ) as Partial<Draft>;
        const updated: Draft = { ...existing, ...defined, updatedAt: now };
        await db.drafts.put(updated);
        return updated;
      }
    }
    const rec: Draft = {
      id: uid(),
      name: patch.name ?? 'Untitled Draft',
      designJson: patch.designJson ?? '{}',
      templateId: patch.templateId ?? '',
      context: patch.context ?? 'front',
      thumb: patch.thumb,
      notes: patch.notes,
      collectionId: patch.collectionId,
      recipeId: patch.recipeId,
      createdAt: now,
      updatedAt: now,
    };
    await db.drafts.add(rec);
    return rec;
  },
  async rename(id: string, name: string) {
    await db.drafts.update(id, { name, updatedAt: Date.now() });
  },
  /** Moves a design into a collection, or out of every collection when null. */
  async setCollection(id: string, collectionId: string | null) {
    await db.drafts.update(id, { collectionId: collectionId ?? undefined, updatedAt: Date.now() });
  },
  /**
   * Copies a design, keeping the artwork, template and collection but giving it
   * a fresh identity. Used by "Duplicate" so a scent variant can start from a
   * finished label instead of a blank canvas.
   */
  async duplicate(id: string): Promise<Draft | undefined> {
    const source = await db.drafts.get(id);
    if (!source) return undefined;
    const now = Date.now();
    const copy: Draft = { ...source, id: uid(), name: copyName(source.name), createdAt: now, updatedAt: now };
    await db.drafts.add(copy);
    return copy;
  },
  remove: (id: string) => db.drafts.delete(id),
};

/** "Rose Bar" → "Rose Bar copy" → "Rose Bar copy 2" … */
function copyName(name: string): string {
  const match = /^(.*?) copy(?: (\d+))?$/.exec(name);
  if (!match) return `${name} copy`;
  return `${match[1]} copy ${Number(match[2] ?? 1) + 1}`;
}

// --- Collections -----------------------------------------------------------

export const collectionsRepo = {
  all: () => db.collections.orderBy('name').toArray(),
  get: (id: string) => db.collections.get(id),
  async create(name: string, color: string): Promise<Collection> {
    const now = Date.now();
    const rec: Collection = { id: uid(), name, color, createdAt: now, updatedAt: now };
    await db.collections.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Pick<Collection, 'name' | 'color'>>) {
    await db.collections.update(id, { ...patch, updatedAt: Date.now() });
  },
  /** Deleting a collection un-files its designs rather than deleting them. */
  async remove(id: string) {
    await db.transaction('rw', db.collections, db.drafts, async () => {
      await db.drafts.where('collectionId').equals(id).modify((d) => {
        d.collectionId = undefined;
      });
      await db.collections.delete(id);
    });
  },
};

// --- Set Purchases ---------------------------------------------------------

export const setPurchasesRepo = {
  all: () => db.setPurchases.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.setPurchases.get(id),
  async create(
    input: Omit<SetPurchase, 'id' | 'createdAt'>,
  ): Promise<SetPurchase> {
    const rec: SetPurchase = { ...input, id: uid(), createdAt: Date.now() };
    await db.setPurchases.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<SetPurchase, 'id' | 'createdAt'>>) {
    await db.setPurchases.update(id, patch);
  },
  remove: (id: string) => db.setPurchases.delete(id),
};

// --- Receipts ----------------------------------------------------------------

function computeReceiptTotals(lineItems: ReceiptLineItem[], tax?: number) {
  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const total = subtotal + (tax ?? 0);
  return { subtotal, total };
}

/**
 * Pushes each line item's unitCost back into the Ingredient or Custom
 * Material it's linked to, when the line item opts in via `syncPrice`.
 * Ingredients store the *total* paid for a purchase (purchasePrice) plus the
 * quantity (purchaseSize), so a receipt line syncs quantity → purchaseSize
 * and lineTotal → purchasePrice. Custom Materials store a flat per-unit
 * cost, so a receipt line syncs unitCost → cost directly.
 */
async function syncLineItemPrices(lineItems: ReceiptLineItem[]) {
  for (const item of lineItems) {
    if (!item.syncPrice) continue;
    if (item.ingredientId) {
      const ing = await db.ingredients.get(item.ingredientId);
      if (ing) {
        await ingredientsRepo.update(item.ingredientId, {
          purchaseSize: item.quantity,
          purchasePrice: item.lineTotal,
        });
      }
    } else if (item.materialId) {
      const material = await db.customMaterials.get(item.materialId);
      if (material) {
        await customMaterialsRepo.update(item.materialId, { cost: item.unitCost });
      }
    }
  }
}

export const receiptsRepo = {
  all: async () => {
    const asc = await db.receipts.orderBy('date').toArray();
    return asc.reverse();
  },
  get: (id: string) => db.receipts.get(id),
  async create(
    input: Omit<Receipt, 'id' | 'createdAt' | 'updatedAt' | 'subtotal' | 'total'>,
  ): Promise<Receipt> {
    const now = Date.now();
    const { subtotal, total } = computeReceiptTotals(input.lineItems, input.tax);
    const rec: Receipt = { ...input, subtotal, total, id: uid(), createdAt: now, updatedAt: now };
    await db.receipts.add(rec);
    await syncLineItemPrices(rec.lineItems);
    return rec;
  },
  async update(
    id: string,
    patch: Partial<Omit<Receipt, 'id' | 'createdAt' | 'subtotal' | 'total'>>,
  ) {
    const existing = await db.receipts.get(id);
    if (!existing) return;
    const merged = { ...existing, ...patch };
    const { subtotal, total } = computeReceiptTotals(merged.lineItems, merged.tax);
    await db.receipts.update(id, { ...patch, subtotal, total, updatedAt: Date.now() });
    if (patch.lineItems) await syncLineItemPrices(patch.lineItems);
  },
  remove: (id: string) => db.receipts.delete(id),
  /** Totals for this month / this year / all time, plus a spend-by-category breakdown. */
  summarize(receipts: Receipt[]) {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const year = now.getFullYear();

    let thisMonth = 0;
    let thisYear = 0;
    let allTime = 0;
    const byCategory = new Map<ExpenseCategory, number>();

    for (const r of receipts) {
      const d = new Date(r.date);
      allTime += r.total;
      if (d.getFullYear() === year) {
        thisYear += r.total;
        if (`${d.getFullYear()}-${d.getMonth()}` === monthKey) thisMonth += r.total;
      }
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + r.total);
    }

    return {
      thisMonth,
      thisYear,
      allTime,
      byCategory: Array.from(byCategory.entries()).sort((a, b) => b[1] - a[1]),
    };
  },
};

// --- Clients ----------------------------------------------------------------

export const clientsRepo = {
  all: () => db.clients.orderBy('name').toArray(),
  get: (id: string) => db.clients.get(id),
  async create(input: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const now = Date.now();
    const rec: Client = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.clients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Client>) {
    await db.clients.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.clients.delete(id),
  /**
   * Returns the existing client with this name (case-insensitive) or creates
   * one. Keeps the client list free of "Maria" / "maria" duplicates when the
   * user types a name into the New Order form.
   */
  async findOrCreateByName(name: string): Promise<Client> {
    const needle = name.trim().toLowerCase();
    const existing = (await db.clients.toArray()).find(
      (c) => c.name.trim().toLowerCase() === needle,
    );
    if (existing) return existing;
    return this.create({ name: name.trim() });
  },
};

// --- Work Orders -------------------------------------------------------------
//
// The pipeline: New Order (open) → Mark Completed → ingredient stock deducted
// + COGS snapshot stored → PDF receipt. "Reopen" restores exactly the stock
// that was deducted (from the usage snapshot), so mistakes are reversible.
// ---------------------------------------------------------------------------

export interface OrderUsageShortfall {
  ingredientId: string;
  name: string;
  needed: number;
  onHand: number;
  unit: 'g' | 'drops';
}

export interface OrderUsageComputation {
  lines: WorkOrderUsageLine[];
  /** Total raw-material cost of all priced lines (USD). */
  materialCost: number;
  /** Tracked ingredients whose stock would drop below zero. */
  shortfalls: OrderUsageShortfall[];
}

/**
 * Computes the exact fractional ingredient usage for a set of order items.
 *
 * Per-unit usage = recipe amount ÷ barsPerBatch (default 1), then × quantity.
 * Weight ingredients are in grams, volume ingredients in drops — the same
 * base units as `Ingredient.fractionalCost`, so cost is a simple multiply.
 */
export function computeOrderUsage(
  items: Array<Pick<WorkOrderItem, 'recipeId' | 'quantity'>>,
  recipes: Recipe[],
  ingredients: Ingredient[],
): OrderUsageComputation {
  const recipeById = new Map(recipes.map((r) => [r.id, r]));
  const ingredientById = new Map(ingredients.map((i) => [i.id, i]));
  const totals = new Map<string, number>(); // ingredientId → base-unit amount

  for (const item of items) {
    const recipe = recipeById.get(item.recipeId);
    if (!recipe || item.quantity <= 0) continue;
    const amounts = recipe.ingredientAmounts ?? {};
    const perBatch = recipe.barsPerBatch && recipe.barsPerBatch > 0 ? recipe.barsPerBatch : 1;
    for (const [ingredientId, batchAmount] of Object.entries(amounts)) {
      if (!batchAmount || batchAmount <= 0) continue;
      const used = (batchAmount / perBatch) * item.quantity;
      totals.set(ingredientId, (totals.get(ingredientId) ?? 0) + used);
    }
  }

  const lines: WorkOrderUsageLine[] = [];
  const shortfalls: OrderUsageShortfall[] = [];
  let materialCost = 0;

  for (const [ingredientId, rawAmount] of totals) {
    const ing = ingredientById.get(ingredientId);
    const amount = Math.round(rawAmount * 1000) / 1000; // avoid float dust
    const unit = ing ? baseUnitOf(ing) : 'g';
    const cost = ing?.fractionalCost !== undefined ? amount * ing.fractionalCost : undefined;
    if (cost !== undefined) materialCost += cost;
    const tracked = ing?.stockOnHand !== undefined;
    lines.push({
      ingredientId,
      ingredientName: ing?.name ?? 'Unknown ingredient',
      amount,
      unit,
      cost,
      deducted: tracked,
    });
    if (ing && tracked && (ing.stockOnHand ?? 0) < amount) {
      shortfalls.push({
        ingredientId,
        name: ing.name,
        needed: amount,
        onHand: ing.stockOnHand ?? 0,
        unit,
      });
    }
  }

  lines.sort((a, b) => a.ingredientName.localeCompare(b.ingredientName));
  return { lines, materialCost, shortfalls };
}

export interface NewWorkOrderItemInput {
  recipeId: string;
  recipeName: string;
  quantity: number;
  unitPrice: number;
}

export const workOrdersRepo = {
  /** All orders, newest first. */
  async all(): Promise<WorkOrder[]> {
    const asc = await db.workOrders.orderBy('createdAt').toArray();
    return asc.reverse();
  },
  get: (id: string) => db.workOrders.get(id),
  items: (workOrderId: string) =>
    db.workOrderItems.where('workOrderId').equals(workOrderId).sortBy('createdAt'),
  /** Every item row across all orders (one query for the dashboard). */
  allItems: () => db.workOrderItems.toArray(),

  /** Next sequential human-friendly number: ORD-001, ORD-002, … (delete-safe). */
  async nextOrderNumber(): Promise<string> {
    const all = await db.workOrders.toArray();
    const maxN = all.reduce((max, o) => {
      const m = /^ORD-(\d+)$/.exec(o.orderNumber ?? '');
      return m ? Math.max(max, parseInt(m[1], 10)) : max;
    }, 0);
    return `ORD-${String(maxN + 1).padStart(3, '0')}`;
  },

  /**
   * Creates an open order plus its item rows in one transaction.
   * The client is resolved (or created) from the typed name.
   */
  async create(input: {
    clientName: string;
    notes?: string;
    items: NewWorkOrderItemInput[];
  }): Promise<{ order: WorkOrder; items: WorkOrderItem[] }> {
    const client = await clientsRepo.findOrCreateByName(input.clientName);
    const orderNumber = await this.nextOrderNumber();
    const now = Date.now();
    const orderId = uid();

    const items: WorkOrderItem[] = input.items
      .filter((i) => i.quantity > 0)
      .map((i, idx) => ({
        id: uid(),
        workOrderId: orderId,
        recipeId: i.recipeId,
        recipeName: i.recipeName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        lineTotal: Math.round(i.quantity * i.unitPrice * 100) / 100,
        createdAt: now + idx, // preserves row order on sortBy('createdAt')
      }));

    const subtotal = Math.round(items.reduce((s, i) => s + i.lineTotal, 0) * 100) / 100;
    const order: WorkOrder = {
      id: orderId,
      orderNumber,
      clientId: client.id,
      clientName: client.name,
      status: 'open',
      notes: input.notes?.trim() || undefined,
      subtotal,
      total: subtotal,
      createdAt: now,
      updatedAt: now,
    };

    await db.transaction('rw', db.workOrders, db.workOrderItems, async () => {
      await db.workOrders.add(order);
      await db.workOrderItems.bulkAdd(items);
    });
    return { order, items };
  },

  async update(id: string, patch: Partial<WorkOrder>) {
    await db.workOrders.update(id, { ...patch, updatedAt: Date.now() });
  },

  /** Deletes the order and its item rows. */
  async remove(id: string) {
    await db.transaction('rw', db.workOrders, db.workOrderItems, async () => {
      const itemIds = (await db.workOrderItems.where('workOrderId').equals(id).toArray()).map(
        (i) => i.id,
      );
      await db.workOrderItems.bulkDelete(itemIds);
      await db.workOrders.delete(id);
    });
  },

  /**
   * Marks an order Completed: computes the exact fractional ingredient usage,
   * deducts every TRACKED ingredient's stockOnHand (clamped at 0), and stores
   * the usage snapshot + material-cost (COGS) on the order.
   */
  async complete(id: string): Promise<OrderUsageComputation | null> {
    const order = await db.workOrders.get(id);
    if (!order || order.status === 'completed') return null;

    const [items, recipes, ingredients] = await Promise.all([
      this.items(id),
      db.recipes.toArray(),
      db.ingredients.toArray(),
    ]);
    const usage = computeOrderUsage(items, recipes, ingredients);
    const now = Date.now();

    await db.transaction('rw', db.workOrders, db.ingredients, async () => {
      for (const line of usage.lines) {
        if (!line.deducted) continue;
        const ing = await db.ingredients.get(line.ingredientId);
        if (!ing || ing.stockOnHand === undefined) continue;
        const next = Math.max(0, Math.round((ing.stockOnHand - line.amount) * 1000) / 1000);
        await db.ingredients.update(line.ingredientId, { stockOnHand: next, updatedAt: now });
      }
      await db.workOrders.update(id, {
        status: 'completed',
        completedAt: now,
        updatedAt: now,
        materialCost: Math.round(usage.materialCost * 100) / 100,
        usageSnapshot: usage.lines,
      });
    });
    return usage;
  },

  /**
   * Reverts a completed order to open and restores exactly the stock that the
   * completion deducted (using the stored snapshot — recipe edits made in the
   * meantime cannot corrupt the restore).
   */
  async reopen(id: string) {
    const order = await db.workOrders.get(id);
    if (!order || order.status !== 'completed') return;
    const now = Date.now();

    await db.transaction('rw', db.workOrders, db.ingredients, async () => {
      for (const line of order.usageSnapshot ?? []) {
        if (!line.deducted) continue;
        const ing = await db.ingredients.get(line.ingredientId);
        if (!ing || ing.stockOnHand === undefined) continue;
        const next = Math.round((ing.stockOnHand + line.amount) * 1000) / 1000;
        await db.ingredients.update(line.ingredientId, { stockOnHand: next, updatedAt: now });
      }
      await db.workOrders.update(id, {
        status: 'open',
        completedAt: undefined,
        materialCost: undefined,
        usageSnapshot: undefined,
        updatedAt: now,
      });
    });
  },
};

// --- Settings --------------------------------------------------------------

export const productListingsRepo = {
  all: () => db.productListings.orderBy('createdAt').reverse().toArray(),
  get: (id: string) => db.productListings.get(id),
  byRecipe: (recipeId: string) =>
    db.productListings.where('recipeId').equals(recipeId).first(),

  async create(input: Omit<ProductListing, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProductListing> {
    const now = Date.now();
    const rec: ProductListing = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.productListings.add(rec);
    return rec;
  },

  async update(id: string, patch: Partial<ProductListing>) {
    await db.productListings.update(id, { ...patch, updatedAt: Date.now() });
  },

  remove: (id: string) => db.productListings.delete(id),
};

export const settingsRepo = {
  async get(): Promise<AppSettings> {
    const existing = await db.settings.get('app');
    if (existing) return { ...DEFAULT_SETTINGS, ...existing };
    await db.settings.put(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  },
  async update(patch: Partial<AppSettings>) {
    const current = await this.get();
    const next = { ...current, ...patch, id: 'app' as const };
    await db.settings.put(next);
    return next;
  },
};
