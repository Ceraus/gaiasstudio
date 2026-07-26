import { db, DEFAULT_SETTINGS } from './db';
import type {
  AppSettings,
  AssetRecord,
  Client,
  DesignVersion,
  Draft,
  Ingredient,
  LabelSet,
  Recipe,
  SetPurchase,
  WorkOrder,
  WorkOrderItem,
} from '@/types';

const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;

// ---------------------------------------------------------------------------
// COGS utility
// ---------------------------------------------------------------------------

/**
 * Calculates the fractional cost of an ingredient per its base unit:
 *   - Weight mode (default): cost per gram
 *   - Volume mode: cost per drop (1 ml = 20 drops)
 *
 * Returns `undefined` when the required fields are missing or invalid.
 */
export function calculateFractionalCost(ing: Partial<Ingredient>): number | undefined {
  if (
    ing.manualFractionalCost !== undefined
    && Number.isFinite(ing.manualFractionalCost)
    && ing.manualFractionalCost > 0
  ) {
    return ing.manualFractionalCost;
  }
  const { measurementType, purchaseSize, purchaseUnit, purchasePrice } = ing;
  if (!purchaseSize || !purchasePrice || purchaseSize <= 0) return undefined;

  if (measurementType === 'volume') {
    // 1 ml = 20 drops (only ml is supported for volume)
    const drops = purchaseSize * 20;
    return purchasePrice / drops;
  } else {
    // Weight mode — convert to grams
    let grams = purchaseSize;
    if (purchaseUnit === 'oz') grams = purchaseSize * 28.3495;
    else if (purchaseUnit === 'lbs') grams = purchaseSize * 453.592;
    // 'g' or undefined → grams as-is
    return purchasePrice / grams;
  }
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
  async applyQuickPrice(ids: string[], fractionalCost: number) {
    if (!Number.isFinite(fractionalCost) || fractionalCost <= 0 || ids.length === 0) return;
    const now = Date.now();
    await db.ingredients.bulkUpdate(ids.map((key) => ({
      key,
      changes: {
        manualFractionalCost: fractionalCost,
        fractionalCost,
        pricingSource: 'quick-set' as const,
        updatedAt: now,
      },
    })));
  },
  async toggleActive(id: string) {
    const ing = await db.ingredients.get(id);
    if (!ing) return;
    await db.ingredients.update(id, { active: !ing.active, updatedAt: Date.now() });
  },
  remove: (id: string) => db.ingredients.delete(id),
};

// --- Recipes ---------------------------------------------------------------

export const recipesRepo = {
  all: () => db.recipes.orderBy('name').toArray(),
  get: (id: string) => db.recipes.get(id),
  async create(
    input: Omit<Recipe, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Recipe> {
    const now = Date.now();
    const rec: Recipe = { ...input, id: uid(), createdAt: now, updatedAt: now };
    await db.recipes.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Recipe>) {
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
        const updated: Draft = { ...existing, ...patch, updatedAt: now };
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
      createdAt: now,
      updatedAt: now,
    };
    await db.drafts.add(rec);
    return rec;
  },
  async rename(id: string, name: string) {
    await db.drafts.update(id, { name, updatedAt: Date.now() });
  },
  remove: (id: string) => db.drafts.delete(id),
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

// --- Clients and work orders -----------------------------------------------

export const clientsRepo = {
  all: () => db.clients.orderBy('name').toArray(),
  get: (id: string) => db.clients.get(id),
  async create(input: Pick<Client, 'name' | 'email' | 'phone' | 'address'>): Promise<Client> {
    const now = Date.now();
    const rec: Client = {
      ...input,
      name: input.name.trim(),
      id: uid(),
      createdAt: now,
      updatedAt: now,
    };
    await db.clients.add(rec);
    return rec;
  },
  async update(id: string, patch: Partial<Omit<Client, 'id' | 'createdAt'>>) {
    await db.clients.update(id, { ...patch, updatedAt: Date.now() });
  },
  remove: (id: string) => db.clients.delete(id),
};

export interface WorkOrderItemInput {
  recipeId: string;
  quantity: number;
  unitPrice: number;
}

export interface WorkOrderWithItems {
  order: WorkOrder;
  items: WorkOrderItem[];
}

export const workOrdersRepo = {
  async all(): Promise<WorkOrderWithItems[]> {
    const orders = await db.workOrders.orderBy('orderDate').reverse().toArray();
    return Promise.all(orders.map(async (order) => ({
      order,
      items: await db.workOrderItems.where('workOrderId').equals(order.id).toArray(),
    })));
  },
  async get(id: string): Promise<WorkOrderWithItems | undefined> {
    const order = await db.workOrders.get(id);
    if (!order) return undefined;
    return {
      order,
      items: await db.workOrderItems.where('workOrderId').equals(id).toArray(),
    };
  },
  async create(
    client: Client,
    inputItems: WorkOrderItemInput[],
    notes?: string,
  ): Promise<WorkOrderWithItems> {
    const recipeIds = [...new Set(inputItems.map((item) => item.recipeId))];
    const recipes = await db.recipes.bulkGet(recipeIds);
    const recipeMap = new Map(
      recipes.filter((recipe): recipe is Recipe => !!recipe).map((recipe) => [recipe.id, recipe]),
    );
    const cleanItems = inputItems.filter(
      (item) => recipeMap.has(item.recipeId)
        && Number.isFinite(item.quantity) && item.quantity > 0
        && Number.isFinite(item.unitPrice) && item.unitPrice >= 0,
    );
    if (cleanItems.length === 0) throw new Error('Add at least one valid recipe item.');

    const now = Date.now();
    const orderId = uid();
    const items: WorkOrderItem[] = cleanItems.map((item) => {
      const recipe = recipeMap.get(item.recipeId)!;
      return {
        id: uid(),
        workOrderId: orderId,
        recipeId: recipe.id,
        recipeName: recipe.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.quantity * item.unitPrice,
        createdAt: now,
      };
    });
    const order: WorkOrder = {
      id: orderId,
      clientId: client.id,
      clientName: client.name,
      status: 'draft',
      orderDate: now,
      notes: notes?.trim() || undefined,
      subtotal: items.reduce((sum, item) => sum + item.lineTotal, 0),
      createdAt: now,
      updatedAt: now,
    };
    await db.transaction('rw', db.workOrders, db.workOrderItems, async () => {
      await db.workOrders.add(order);
      await db.workOrderItems.bulkAdd(items);
    });
    return { order, items };
  },
  /**
   * Completes an order and deducts recipe usage in one transaction.
   * Repeated calls are safe: a previously-completed order is returned without
   * deducting inventory a second time.
   */
  async complete(id: string): Promise<WorkOrderWithItems> {
    return db.transaction(
      'rw',
      db.workOrders,
      db.workOrderItems,
      db.recipes,
      db.ingredients,
      async () => {
        const order = await db.workOrders.get(id);
        if (!order) throw new Error('Work order not found.');
        const items = await db.workOrderItems.where('workOrderId').equals(id).toArray();
        if (order.status === 'completed') return { order, items };
        if (order.status === 'cancelled') throw new Error('Cancelled orders cannot be completed.');

        const recipeIds = [...new Set(items.map((item) => item.recipeId))];
        const recipes = await db.recipes.bulkGet(recipeIds);
        const recipeMap = new Map(
          recipes.filter((recipe): recipe is Recipe => !!recipe).map((recipe) => [recipe.id, recipe]),
        );
        const deductions = new Map<string, number>();
        for (const item of items) {
          const recipe = recipeMap.get(item.recipeId);
          if (!recipe) throw new Error(`Recipe "${item.recipeName}" no longer exists.`);
          for (const [ingredientId, amount] of Object.entries(recipe.ingredientAmounts ?? {})) {
            if (!Number.isFinite(amount) || amount <= 0) continue;
            deductions.set(
              ingredientId,
              (deductions.get(ingredientId) ?? 0) + amount * item.quantity,
            );
          }
        }

        const now = Date.now();
        for (const [ingredientId, amount] of deductions) {
          const ingredient = await db.ingredients.get(ingredientId);
          if (!ingredient) throw new Error('An ingredient used by this order no longer exists.');
          await db.ingredients.update(ingredientId, {
            stockQuantity: (ingredient.stockQuantity ?? 0) - amount,
            updatedAt: now,
          });
        }
        const completed: WorkOrder = {
          ...order,
          status: 'completed',
          completedAt: now,
          updatedAt: now,
        };
        await db.workOrders.put(completed);
        return { order: completed, items };
      },
    );
  },
  async cancel(id: string) {
    const order = await db.workOrders.get(id);
    if (!order || order.status === 'completed') return;
    await db.workOrders.update(id, { status: 'cancelled', updatedAt: Date.now() });
  },
  async removeDraft(id: string) {
    const order = await db.workOrders.get(id);
    if (!order || order.status !== 'draft') return;
    await db.transaction('rw', db.workOrders, db.workOrderItems, async () => {
      await db.workOrderItems.where('workOrderId').equals(id).delete();
      await db.workOrders.delete(id);
    });
  },
};

// --- Settings --------------------------------------------------------------

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
