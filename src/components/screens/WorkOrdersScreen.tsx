// ---------------------------------------------------------------------------
// WorkOrdersScreen — Client Work Orders & Automated Receipts (Phase 2).
//
// Turns the label studio into a business tracker:
//   • DASHBOARD — every order at a glance: client, items, totals, status,
//     revenue / COGS summary chips.
//   • NEW ORDER — type the client's name (existing clients auto-suggest),
//     pick the recipes (soaps) sold + quantity; unit prices pre-fill from
//     each recipe's retail price and stay editable per order.
//   • MARK COMPLETED — previews the exact fractional ingredient usage
//     (grams of base/oils, drops of EO), warns about stock shortfalls, then
//     deducts every tracked ingredient's stock-on-hand and freezes a COGS
//     snapshot. Fully reversible via "Reopen".
//   • RECEIPT PDF — a professional 8.5"×11" receipt (pdf-lib) saved silently
//     to /work_orders/[Client_Name]_[ORD-xxx].pdf inside the desktop app
//     (browser build downloads it instead).
// ---------------------------------------------------------------------------
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ClipboardList,
  Copy, DollarSign, FileDown, Loader2, Package, Plus, Printer, ReceiptText,
  RotateCcw, Trash2, UserRound, X,
} from 'lucide-react';
import type { Client, Ingredient, Recipe, WorkOrder, WorkOrderItem } from '@/types';
import {
  clientsRepo,
  computeOrderUsage,
  draftsRepo,
  ingredientsRepo,
  recipesRepo,
  workOrdersRepo,
  type NewWorkOrderItemInput,
  type OrderUsageComputation,
} from '@/db/repositories';
import { buildReceiptPdf, receiptFileName, saveReceiptPdf } from '@/lib/orderReceiptPdf';
import Modal from '@/components/common/Modal';
import TipBanner from '@/components/tour/TipBanner';
import { useAppStore } from '@/store/useAppStore';

const fmtMoney = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (ts: number) => new Date(ts).toLocaleDateString();

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------
/** Seed used by "Repeat order" to pre-fill the New Order modal. */
export interface RepeatSeed {
  clientName: string;
  notes?: string;
  items: Array<{ recipeId: string; quantity: number; unitPrice: number }>;
}

export default function WorkOrdersScreen() {
  const { t } = useTranslation();
  const goto = useAppStore((s) => s.goto);
  const settings = useAppStore((s) => s.settings);
  const setBatchDraftIds = useAppStore((s) => s.setBatchDraftIds);

  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Map<string, WorkOrderItem[]>>(new Map());
  const [clients, setClients] = useState<Client[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  const [showNewOrder, setShowNewOrder] = useState(false);
  const [repeatSeed, setRepeatSeed] = useState<RepeatSeed | null>(null);
  const [clientFilter, setClientFilter] = useState<string>(''); // '' = all clients
  const [completeTarget, setCompleteTarget] = useState<WorkOrder | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (msg: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(msg);
    toastTimer.current = setTimeout(() => setToast(null), 4500);
  };

  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  const reload = async () => {
    const [ords, allItems, cls, recs, ings] = await Promise.all([
      workOrdersRepo.all(),
      workOrdersRepo.allItems(),
      clientsRepo.all(),
      recipesRepo.all(),
      ingredientsRepo.all(),
    ]);
    const map = new Map<string, WorkOrderItem[]>();
    for (const item of allItems) {
      const list = map.get(item.workOrderId) ?? [];
      list.push(item);
      map.set(item.workOrderId, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.createdAt - b.createdAt);
    setOrders(ords);
    setItemsByOrder(map);
    setClients(cls);
    setRecipes(recs);
    setIngredients(ings);
  };

  useEffect(() => { void reload(); }, []);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const open = orders.filter((o) => o.status === 'open');
    const completed = orders.filter((o) => o.status === 'completed');
    const revenue = completed.reduce((s, o) => s + o.total, 0);
    const cogs = completed.reduce((s, o) => s + (o.materialCost ?? 0), 0);
    return { openCount: open.length, completedCount: completed.length, revenue, cogs };
  }, [orders]);

  // ── Per-client history filter ──────────────────────────────────────────────
  const visibleOrders = useMemo(
    () => (clientFilter ? orders.filter((o) => o.clientId === clientFilter) : orders),
    [orders, clientFilter],
  );

  /** Only clients that actually have orders show up in the filter. */
  const clientsWithOrders = useMemo(() => {
    const counts = new Map<string, number>();
    for (const o of orders) counts.set(o.clientId, (counts.get(o.clientId) ?? 0) + 1);
    return clients
      .filter((c) => counts.has(c.id))
      .map((c) => ({ ...c, orderCount: counts.get(c.id) ?? 0 }));
  }, [clients, orders]);

  const clientHistory = useMemo(() => {
    if (!clientFilter) return null;
    const completed = visibleOrders.filter((o) => o.status === 'completed');
    return {
      name: clients.find((c) => c.id === clientFilter)?.name ?? '',
      orders: visibleOrders.length,
      spent: completed.reduce((s, o) => s + o.total, 0),
    };
  }, [clientFilter, visibleOrders, clients]);

  // ── Actions ───────────────────────────────────────────────────────────────

  /** Builds + saves the receipt PDF for an order (silent in Electron). */
  const generateReceipt = async (order: WorkOrder) => {
    setBusyOrderId(order.id);
    try {
      const items = itemsByOrder.get(order.id) ?? (await workOrdersRepo.items(order.id));
      const bytes = await buildReceiptPdf({ order, items, settings });
      const savedPath = await saveReceiptPdf(bytes, receiptFileName(order));
      showToast(
        savedPath
          ? t('orders.receiptSavedTo', 'Receipt saved: {{path}}', { path: savedPath })
          : t('orders.receiptDownloaded', 'Receipt "{{name}}" downloaded.', { name: receiptFileName(order) }),
      );
    } catch (err) {
      console.error('[Orders] Receipt generation failed:', err);
      showToast(t('orders.receiptFailed', 'Could not create the receipt PDF.'));
    } finally {
      setBusyOrderId(null);
    }
  };

  /** Completes the order (deducts stock), then auto-generates the receipt. */
  const completeOrder = async (order: WorkOrder) => {
    setBusyOrderId(order.id);
    try {
      await workOrdersRepo.complete(order.id);
      setCompleteTarget(null);
      await reload();
      const fresh = await workOrdersRepo.get(order.id);
      if (fresh) await generateReceipt(fresh);
    } catch (err) {
      console.error('[Orders] Completion failed:', err);
      showToast(t('orders.completeFailed', 'Could not complete the order.'));
    } finally {
      setBusyOrderId(null);
    }
  };

  const reopenOrder = async (order: WorkOrder) => {
    setBusyOrderId(order.id);
    try {
      await workOrdersRepo.reopen(order.id);
      await reload();
      showToast(t('orders.reopened', '{{n}} reopened — deducted stock was restored.', { n: order.orderNumber }));
    } finally {
      setBusyOrderId(null);
    }
  };

  const deleteOrder = async (id: string) => {
    setConfirmDeleteId(null);
    await workOrdersRepo.remove(id);
    await reload();
  };

  /** Pre-fills the New Order modal with an existing order's client + items. */
  const repeatOrder = (order: WorkOrder) => {
    const items = (itemsByOrder.get(order.id) ?? [])
      .filter((i) => recipes.some((r) => r.id === i.recipeId)) // deleted recipes can't be reordered
      .map((i) => ({ recipeId: i.recipeId, quantity: i.quantity, unitPrice: i.unitPrice }));
    setRepeatSeed({ clientName: order.clientName, notes: order.notes, items });
    setShowNewOrder(true);
  };

  /**
   * Order → Batch Print bridge: finds the newest saved design linked to each
   * ordered recipe and opens the ink-saving batch sheet pre-filled with the
   * ordered quantities.
   */
  const printLabels = async (order: WorkOrder) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const drafts = await draftsRepo.all(); // newest first
    const ids: string[] = [];
    const quantities: Record<string, number> = {};
    const missing: string[] = [];
    for (const item of items) {
      const draft = drafts.find((d) => d.recipeId === item.recipeId);
      if (draft) {
        if (!ids.includes(draft.id)) ids.push(draft.id);
        quantities[draft.id] = (quantities[draft.id] ?? 0) + item.quantity;
      } else {
        missing.push(item.recipeName);
      }
    }
    if (ids.length === 0) {
      showToast(t('orders.noLinkedDesigns', 'No saved label designs are linked to these recipes yet. Design a label while the recipe is active — it links automatically.'));
      return;
    }
    if (missing.length > 0) {
      showToast(t('orders.someLinkedDesigns', 'Queued {{n}} design(s) — no design found for: {{missing}}', {
        n: ids.length,
        missing: missing.join(', '),
      }));
    }
    setBatchDraftIds(ids, quantities);
    goto('batch');
  };

  const deletable = orders.find((o) => o.id === confirmDeleteId) ?? null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-3xl px-4 py-6">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gaia-900">
                <ClipboardList className="h-6 w-6 text-gaia-600" />
                {t('orders.title', 'Client Work Orders')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {t('orders.subtitle', 'Track what each client ordered. Completing an order deducts your ingredient stock and creates a PDF receipt automatically.')}
              </p>
            </div>
            <button className="btn-primary" onClick={() => setShowNewOrder(true)} data-tour="new-order">
              <Plus className="h-4 w-4" />
              {t('orders.newOrder', 'New Order')}
            </button>
          </div>

          <TipBanner
            id="orders-complete-deducts"
            textDefault="Marking an order Completed deducts the exact ingredients from stock and saves the client's PDF receipt automatically — and Reopen undoes it."
          />

          {/* Stats */}
          {orders.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
                <span className="font-semibold">{stats.openCount}</span>
                <span className="opacity-80">{t('orders.open', 'open')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span className="font-semibold">{stats.completedCount}</span>
                <span className="text-slate-400">{t('orders.completed', 'completed')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-gaia-600 px-4 py-2 text-sm text-white">
                <DollarSign className="h-4 w-4 opacity-80" />
                <span className="font-semibold">{fmtMoney(stats.revenue)}</span>
                <span className="opacity-80">{t('orders.revenue', 'revenue')}</span>
              </div>
              {stats.cogs > 0 && (
                <div className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200">
                  <Package className="h-4 w-4 text-slate-400" />
                  <span className="font-semibold">{fmtMoney(stats.cogs)}</span>
                  <span className="text-slate-400">{t('orders.materials', 'materials')}</span>
                </div>
              )}
            </div>
          )}

          {/* Orders list / empty state */}
          {orders.length === 0 ? (
            <div className="mt-8 rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-12 text-center">
              <ClipboardList className="mx-auto mb-3 h-10 w-10 text-gaia-300" />
              <p className="font-medium text-slate-600">
                {t('orders.empty', 'No work orders yet.')}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-slate-400">
                {recipes.length === 0
                  ? t('orders.emptyNoRecipes', 'Create a recipe first — orders are built from your saved recipes.')
                  : t('orders.emptyHint', 'Click "New Order" when a client buys your soaps.')}
              </p>
              {recipes.length === 0 ? (
                <button className="btn-secondary mx-auto mt-4" onClick={() => goto('recipes')}>
                  {t('orders.gotoRecipes', 'Go to Recipes')}
                </button>
              ) : (
                <button className="btn-primary mx-auto mt-4" onClick={() => setShowNewOrder(true)}>
                  <Plus className="h-4 w-4" />
                  {t('orders.newOrder', 'New Order')}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* ── Per-client history filter ─────────────────────────────── */}
              {clientsWithOrders.length > 0 && (
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <select
                    className="input w-auto min-w-[180px] text-sm"
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    aria-label={t('orders.filterByClient', 'Filter by client')}
                  >
                    <option value="">{t('orders.allClients', 'All clients')}</option>
                    {clientsWithOrders.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.orderCount})
                      </option>
                    ))}
                  </select>
                  {clientHistory && (
                    <span className="flex items-center gap-2 rounded-xl bg-gaia-50 px-3 py-1.5 text-xs font-medium text-gaia-700 ring-1 ring-gaia-200">
                      <UserRound className="h-3.5 w-3.5" />
                      {t('orders.clientHistory', '{{name}}: {{orders}} order(s) · {{spent}} lifetime', {
                        name: clientHistory.name,
                        orders: clientHistory.orders,
                        spent: fmtMoney(clientHistory.spent),
                      })}
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 space-y-3">
                {visibleOrders.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    items={itemsByOrder.get(order.id) ?? []}
                    busy={busyOrderId === order.id}
                    onComplete={() => setCompleteTarget(order)}
                    onReceipt={() => void generateReceipt(order)}
                    onReopen={() => void reopenOrder(order)}
                    onDelete={() => setConfirmDeleteId(order.id)}
                    onRepeat={() => repeatOrder(order)}
                    onPrintLabels={() => void printLabels(order)}
                  />
                ))}
              </div>
            </>
          )}

        </div>
      </div>

      {/* ── New Order modal ─────────────────────────────────────────────────── */}
      <NewOrderModal
        open={showNewOrder}
        onClose={() => { setShowNewOrder(false); setRepeatSeed(null); }}
        clients={clients}
        recipes={recipes}
        seed={repeatSeed}
        onCreated={async (orderNumber) => {
          setShowNewOrder(false);
          setRepeatSeed(null);
          await reload();
          showToast(t('orders.created', '{{n}} saved. Mark it Completed when the soaps are handed over.', { n: orderNumber }));
        }}
      />

      {/* ── Complete confirmation modal ─────────────────────────────────────── */}
      {completeTarget && (
        <CompleteOrderModal
          order={completeTarget}
          items={itemsByOrder.get(completeTarget.id) ?? []}
          recipes={recipes}
          ingredients={ingredients}
          busy={busyOrderId === completeTarget.id}
          onCancel={() => setCompleteTarget(null)}
          onConfirm={() => void completeOrder(completeTarget)}
        />
      )}

      {/* ── Delete confirmation ─────────────────────────────────────────────── */}
      <Modal
        open={!!deletable}
        onClose={() => setConfirmDeleteId(null)}
        title={t('orders.deleteTitle', 'Delete this order?')}
        footer={
          <div className="flex justify-end gap-2">
            <button className="btn-ghost" onClick={() => setConfirmDeleteId(null)}>
              {t('common.cancel', 'Cancel')}
            </button>
            <button className="btn-danger" onClick={() => deletable && void deleteOrder(deletable.id)}>
              <Trash2 className="h-4 w-4" />
              {t('common.delete', 'Delete')}
            </button>
          </div>
        }
      >
        {deletable && (
          <p className="text-sm text-slate-600">
            {deletable.status === 'completed'
              ? t('orders.deleteCompletedWarning', '{{n}} for {{client}} is completed — deleting it does NOT restore deducted stock (use Reopen first if you need that).', { n: deletable.orderNumber, client: deletable.clientName })
              : t('orders.deleteOpenWarning', '{{n}} for {{client}} will be removed. This cannot be undone.', { n: deletable.orderNumber, client: deletable.clientName })}
          </p>
        )}
      </Modal>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="pointer-events-none fixed bottom-6 left-1/2 z-50 max-w-[90vw] -translate-x-1/2 truncate rounded-full bg-gaia-700 px-5 py-2.5 text-sm font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Order card
// ---------------------------------------------------------------------------
interface OrderCardProps {
  order: WorkOrder;
  items: WorkOrderItem[];
  busy: boolean;
  onComplete: () => void;
  onReceipt: () => void;
  onReopen: () => void;
  onDelete: () => void;
  onRepeat: () => void;
  onPrintLabels: () => void;
}

function OrderCard({
  order, items, busy, onComplete, onReceipt, onReopen, onDelete, onRepeat, onPrintLabels,
}: OrderCardProps) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const isCompleted = order.status === 'completed';

  const itemsSummary = items.map((i) => `${i.recipeName} ×${i.quantity}`).join(' · ');

  return (
    <div className={`rounded-2xl bg-white px-5 py-4 ring-1 transition ${isCompleted ? 'ring-emerald-200' : 'ring-amber-200'} ${busy ? 'opacity-60' : ''}`}>
      {/* Top row */}
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${isCompleted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
          <UserRound className="h-[18px] w-[18px]" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 font-semibold text-slate-800">
            <span className="truncate">{order.clientName}</span>
            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {order.orderNumber}
            </span>
          </p>
          <p className="truncate text-xs text-slate-400">
            {fmtDate(order.createdAt)}{itemsSummary ? ` · ${itemsSummary}` : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-base font-bold text-slate-800">{fmtMoney(order.total)}</p>
          {isCompleted ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-200">
              <CheckCircle2 className="h-3 w-3" />
              {t('orders.completedOn', 'Completed {{date}}', { date: order.completedAt ? fmtDate(order.completedAt) : '' })}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
              {t('orders.statusOpen', 'Open')}
            </span>
          )}
        </div>
      </div>

      {/* Expanded detail: line items + usage snapshot */}
      {expanded && (
        <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5 text-xs">
              <span className="max-w-[50%] truncate font-medium text-slate-600">{item.recipeName}</span>
              <span className="shrink-0 text-[11px] text-slate-400">
                {item.quantity} × {fmtMoney(item.unitPrice)}
              </span>
              <span className="shrink-0 font-semibold text-slate-700">{fmtMoney(item.lineTotal)}</span>
            </div>
          ))}
          {order.notes && (
            <p className="px-1 pt-1 text-xs text-slate-400">{order.notes}</p>
          )}
          {isCompleted && order.usageSnapshot && order.usageSnapshot.length > 0 && (
            <div className="pt-1.5">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {t('orders.materialsUsed', 'Materials deducted')}
                {order.materialCost !== undefined && (
                  <span className="ml-1.5 normal-case text-emerald-700">({fmtMoney(order.materialCost)})</span>
                )}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {order.usageSnapshot.map((u) => (
                  <span
                    key={u.ingredientId}
                    className={`rounded-full px-2 py-0.5 text-[11px] ${u.deducted ? 'bg-gaia-50 text-gaia-700 ring-1 ring-gaia-200' : 'bg-slate-50 text-slate-400 ring-1 ring-slate-200'}`}
                    title={u.deducted
                      ? t('orders.deductedTitle', 'Deducted from stock')
                      : t('orders.notTrackedTitle', 'Not deducted — stock tracking is off for this ingredient')}
                  >
                    {u.ingredientName} −{u.amount} {u.unit}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action row */}
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        {!isCompleted && (
          <button className="btn-primary px-3 py-1.5 text-xs" disabled={busy} onClick={onComplete}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            {t('orders.markCompleted', 'Mark Completed')}
          </button>
        )}
        <button className="btn-secondary px-3 py-1.5 text-xs" disabled={busy} onClick={onReceipt}>
          <ReceiptText className="h-3.5 w-3.5" />
          {t('orders.receiptPdf', 'Receipt PDF')}
        </button>
        <button
          className="btn-secondary px-3 py-1.5 text-xs"
          disabled={busy}
          onClick={onPrintLabels}
          title={t('orders.printLabelsTitle', 'Queue the label designs for these soaps onto a batch print sheet')}
        >
          <Printer className="h-3.5 w-3.5" />
          {t('orders.printLabels', 'Print labels')}
        </button>
        <button
          className="btn-ghost px-3 py-1.5 text-xs"
          disabled={busy}
          onClick={onRepeat}
          title={t('orders.repeatTitle', 'Start a new order with the same client and soaps')}
        >
          <Copy className="h-3.5 w-3.5" />
          {t('orders.repeat', 'Repeat')}
        </button>
        {isCompleted && (
          <button className="btn-ghost px-3 py-1.5 text-xs" disabled={busy} onClick={onReopen}>
            <RotateCcw className="h-3.5 w-3.5" />
            {t('orders.reopen', 'Reopen')}
          </button>
        )}
        <button
          className="btn-ghost ml-auto px-2 py-1.5 text-xs text-slate-400 hover:text-rose-600"
          disabled={busy}
          onClick={onDelete}
          aria-label={t('common.delete', 'Delete')}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
        <button
          className="btn-ghost px-2 py-1.5 text-xs"
          onClick={() => setExpanded((e) => !e)}
          aria-expanded={expanded}
          aria-label={expanded ? t('common.collapse', 'Collapse') : t('common.expand', 'Expand')}
        >
          {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Order modal
// ---------------------------------------------------------------------------
interface ItemDraft {
  key: string;
  recipeId: string;
  quantity: string;
  unitPrice: string;
}

const newItemKey = () => `item-${Date.now()}-${Math.random().toString(36).slice(2)}`;

interface NewOrderModalProps {
  open: boolean;
  onClose: () => void;
  clients: Client[];
  recipes: Recipe[];
  /** Pre-fill from "Repeat order" (client + items at their original prices). */
  seed?: RepeatSeed | null;
  onCreated: (orderNumber: string) => void | Promise<void>;
}

function NewOrderModal({ open, onClose, clients, recipes, seed, onCreated }: NewOrderModalProps) {
  const { t } = useTranslation();
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<ItemDraft[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset the form each time the modal opens (seeded by "Repeat order" when set).
  useEffect(() => {
    if (open) {
      if (seed && seed.items.length > 0) {
        setClientName(seed.clientName);
        setNotes(seed.notes ?? '');
        setItems(seed.items.map((i) => ({
          key: newItemKey(),
          recipeId: i.recipeId,
          quantity: String(i.quantity),
          unitPrice: String(i.unitPrice),
        })));
      } else {
        setClientName(seed?.clientName ?? '');
        setNotes('');
        setItems([{ key: newItemKey(), recipeId: recipes[0]?.id ?? '', quantity: '1', unitPrice: priceOf(recipes[0]) }]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function priceOf(recipe: Recipe | undefined): string {
    return recipe?.retailPrice !== undefined ? String(recipe.retailPrice) : '';
  }

  const setItem = (key: string, patch: Partial<ItemDraft>) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)));

  const addItem = () =>
    setItems((list) => [
      ...list,
      { key: newItemKey(), recipeId: recipes[0]?.id ?? '', quantity: '1', unitPrice: priceOf(recipes[0]) },
    ]);

  const removeItem = (key: string) => setItems((list) => list.filter((i) => i.key !== key));

  const parsedItems: NewWorkOrderItemInput[] = useMemo(() => {
    const out: NewWorkOrderItemInput[] = [];
    for (const draft of items) {
      const recipe = recipes.find((r) => r.id === draft.recipeId);
      const qty = parseFloat(draft.quantity);
      const price = parseFloat(draft.unitPrice);
      if (!recipe || isNaN(qty) || qty <= 0) continue;
      out.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        quantity: qty,
        unitPrice: !isNaN(price) && price >= 0 ? price : 0,
      });
    }
    return out;
  }, [items, recipes]);

  const subtotal = parsedItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const canSave = clientName.trim().length > 0 && parsedItems.length > 0 && !saving;

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const { order } = await workOrdersRepo.create({
        clientName: clientName.trim(),
        notes,
        items: parsedItems,
      });
      await onCreated(order.orderNumber);
    } catch (err) {
      console.error('[Orders] Failed to create order:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      width={620}
      title={
        <span className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-gaia-600" />
          {t('orders.newOrderTitle', 'New Work Order')}
        </span>
      }
      footer={
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm text-slate-500">
            {t('orders.orderTotal', 'Total')}{' '}
            <span className="text-lg font-bold text-slate-800">{fmtMoney(subtotal)}</span>
          </p>
          <div className="flex gap-2">
            <button className="btn-ghost" onClick={onClose}>{t('common.cancel', 'Cancel')}</button>
            <button className="btn-primary" disabled={!canSave} onClick={() => void save()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {t('orders.saveOrder', 'Save Order')}
            </button>
          </div>
        </div>
      }
    >
      {recipes.length === 0 ? (
        <p className="text-sm text-slate-500">
          {t('orders.needRecipes', 'You need at least one saved recipe before creating an order.')}
        </p>
      ) : (
        <div className="space-y-4">
          {/* Client */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {t('orders.clientName', "Client's name")}
            </label>
            <input
              autoFocus
              className="input text-sm"
              list="gaia-clients-list"
              placeholder={t('orders.clientPlaceholder', 'e.g. Maria Lopez')}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <datalist id="gaia-clients-list">
              {clients.map((c) => <option key={c.id} value={c.name} />)}
            </datalist>
            {clients.length > 0 && (
              <p className="mt-1 text-[11px] text-slate-400">
                {t('orders.clientHint', 'Existing clients auto-suggest as you type — no duplicates are created.')}
              </p>
            )}
          </div>

          {/* Items */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-slate-500">
              {t('orders.soapsSold', 'Soaps sold')}
            </label>
            <div className="space-y-2">
              {items.map((draft) => {
                const qty = parseFloat(draft.quantity);
                const price = parseFloat(draft.unitPrice);
                const line = !isNaN(qty) && !isNaN(price) ? qty * price : null;
                return (
                  <div key={draft.key} className="grid grid-cols-[1fr_64px_88px_72px_28px] items-center gap-1.5">
                    <select
                      className="input min-w-0 text-sm"
                      value={draft.recipeId}
                      onChange={(e) => {
                        const recipe = recipes.find((r) => r.id === e.target.value);
                        setItem(draft.key, {
                          recipeId: e.target.value,
                          // Re-prefill the price when switching recipes.
                          unitPrice: priceOf(recipe),
                        });
                      }}
                    >
                      {recipes.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="input text-sm"
                      placeholder={t('orders.qty', 'Qty')}
                      value={draft.quantity}
                      onChange={(e) => setItem(draft.key, { quantity: e.target.value })}
                    />
                    <div className="relative">
                      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">$</span>
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        className="input pl-6 text-sm"
                        placeholder={t('orders.price', 'Price')}
                        value={draft.unitPrice}
                        onChange={(e) => setItem(draft.key, { unitPrice: e.target.value })}
                      />
                    </div>
                    <span className="truncate text-right text-xs font-semibold text-slate-600">
                      {line !== null ? fmtMoney(line) : '—'}
                    </span>
                    <button
                      className="text-slate-300 transition hover:text-rose-500"
                      onClick={() => removeItem(draft.key)}
                      disabled={items.length === 1}
                      aria-label={t('common.delete', 'Delete')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
            <button
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gaia-200 py-2 text-xs font-medium text-gaia-600 transition hover:border-gaia-400 hover:bg-gaia-50"
              onClick={addItem}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('orders.addItem', 'Add another soap')}
            </button>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">
              {t('orders.notes', 'Notes (optional — printed on the receipt)')}
            </label>
            <textarea
              className="input min-h-[56px] text-sm"
              placeholder={t('orders.notesPlaceholder', 'e.g. Birthday gift set, lavender ribbon requested')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Complete-order confirmation — previews exact usage + stock shortfalls
// ---------------------------------------------------------------------------
interface CompleteOrderModalProps {
  order: WorkOrder;
  items: WorkOrderItem[];
  recipes: Recipe[];
  ingredients: Ingredient[];
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

function CompleteOrderModal({
  order, items, recipes, ingredients, busy, onCancel, onConfirm,
}: CompleteOrderModalProps) {
  const { t } = useTranslation();

  const usage: OrderUsageComputation = useMemo(
    () => computeOrderUsage(items, recipes, ingredients),
    [items, recipes, ingredients],
  );

  return (
    <Modal
      open
      onClose={onCancel}
      width={560}
      title={
        <span className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          {t('orders.completeTitle', 'Complete {{n}} for {{client}}?', { n: order.orderNumber, client: order.clientName })}
        </span>
      }
      footer={
        <div className="flex justify-end gap-2">
          <button className="btn-ghost" onClick={onCancel}>{t('common.cancel', 'Cancel')}</button>
          <button className="btn-primary" disabled={busy} onClick={onConfirm}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
            {t('orders.completeConfirm', 'Complete & Save Receipt')}
          </button>
        </div>
      }
    >
      <p className="text-sm text-slate-600">
        {t('orders.completeExplain', 'This deducts the exact material amounts below from your tracked stock and saves the PDF receipt. You can Reopen the order later to undo the deduction.')}
      </p>

      {/* Usage preview */}
      {usage.lines.length > 0 ? (
        <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-slate-200">
          {usage.lines.map((line) => (
            <div key={line.ingredientId} className="flex items-center justify-between gap-2 border-b border-slate-50 px-3 py-1.5 text-xs last:border-0">
              <span className="min-w-0 flex-1 truncate font-medium text-slate-600">{line.ingredientName}</span>
              <span className="shrink-0 text-slate-500">−{line.amount} {line.unit}</span>
              <span className="w-16 shrink-0 text-right font-semibold text-slate-700">
                {line.cost !== undefined ? fmtMoney(line.cost) : '—'}
              </span>
              {!line.deducted && (
                <span
                  className="shrink-0 rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-400"
                  title={t('orders.notTrackedTitle', 'Not deducted — stock tracking is off for this ingredient')}
                >
                  {t('orders.notTracked', 'untracked')}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-400">
          {t('orders.noUsage', 'No ingredient amounts are set on these recipes yet, so nothing will be deducted. (Set amounts in the Recipe builder to track usage.)')}
        </p>
      )}

      {/* Material cost */}
      {usage.materialCost > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-2.5 ring-1 ring-emerald-100">
          <span className="text-xs font-semibold text-emerald-800">
            {t('orders.totalMaterialCost', 'Material cost of this order')}
          </span>
          <span className="text-lg font-bold text-emerald-700">{fmtMoney(usage.materialCost)}</span>
        </div>
      )}

      {/* Shortfall warnings */}
      {usage.shortfalls.length > 0 && (
        <div className="mt-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('orders.shortfallTitle', 'Not enough stock for:')}
          </p>
          <ul className="mt-1.5 space-y-0.5 text-xs text-amber-700">
            {usage.shortfalls.map((s) => (
              <li key={s.ingredientId}>
                {s.name}: {t('orders.shortfallLine', 'needs {{needed}} {{unit}}, only {{onHand}} on hand', {
                  needed: s.needed, unit: s.unit, onHand: s.onHand,
                })}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-amber-600">
            {t('orders.shortfallHint', 'You can still complete the order — stock stops at 0 and never goes negative.')}
          </p>
        </div>
      )}
    </Modal>
  );
}
