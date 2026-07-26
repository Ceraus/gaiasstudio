import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ClipboardList,
  Download,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { Client, Recipe } from '@/types';
import {
  clientsRepo,
  recipesRepo,
  workOrdersRepo,
  type WorkOrderItemInput,
  type WorkOrderWithItems,
} from '@/db/repositories';
import { buildWorkOrderReceiptPdf, workOrderReceiptFilename } from '@/lib/workOrderPdf';
import { useAppStore } from '@/store/useAppStore';

interface DraftLine {
  recipeId: string;
  quantity: string;
  unitPrice: string;
}

const blankLine = (): DraftLine => ({ recipeId: '', quantity: '1', unitPrice: '' });

function bytesToBase64(bytes: Uint8Array) {
  let binary = '';
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

export default function WorkOrdersScreen() {
  const settings = useAppStore((state) => state.settings);
  const [orders, setOrders] = useState<WorkOrderWithItems[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [clientName, setClientName] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([blankLine()]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const reload = async () => {
    const [nextOrders, nextClients, nextRecipes] = await Promise.all([
      workOrdersRepo.all(),
      clientsRepo.all(),
      recipesRepo.all(),
    ]);
    setOrders(nextOrders);
    setClients(nextClients);
    setRecipes(nextRecipes);
  };

  useEffect(() => { void reload(); }, []);

  const subtotal = useMemo(
    () => lines.reduce(
      (sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0),
      0,
    ),
    [lines],
  );

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setLines((current) => current.map((line, lineIndex) =>
      lineIndex === index ? { ...line, ...patch } : line));
  };

  const createOrder = async () => {
    const name = clientName.trim();
    const itemInputs: WorkOrderItemInput[] = lines.map((line) => ({
      recipeId: line.recipeId,
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
    }));
    if (!name || itemInputs.some((item) =>
      !item.recipeId || item.quantity <= 0 || item.unitPrice < 0)) {
      setMessage('Enter a client, recipe, quantity, and retail price for every item.');
      return;
    }

    setBusyId('new');
    try {
      let client = clients.find((candidate) =>
        candidate.name.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0);
      client ??= await clientsRepo.create({ name });
      await workOrdersRepo.create(client, itemInputs, notes);
      setClientName('');
      setNotes('');
      setLines([blankLine()]);
      setShowForm(false);
      setMessage('Work order saved as a draft.');
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save work order.');
    } finally {
      setBusyId(null);
    }
  };

  const saveReceipt = async (record: WorkOrderWithItems) => {
    const bytes = await buildWorkOrderReceiptPdf(record, settings);
    const filename = workOrderReceiptFilename(record);
    const api = (window as unknown as {
      electronAPI?: {
        saveWorkOrderReceipt?: (name: string, base64: string) => Promise<string>;
      };
    }).electronAPI;
    if (api?.saveWorkOrderReceipt) {
      const outputPath = await api.saveWorkOrderReceipt(filename, bytesToBase64(bytes));
      setMessage(`Receipt saved to ${outputPath}`);
      return;
    }
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    const url = URL.createObjectURL(new Blob([copy.buffer], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(`Receipt downloaded as ${filename}`);
  };

  const completeOrder = async (record: WorkOrderWithItems) => {
    setBusyId(record.order.id);
    try {
      const completed = await workOrdersRepo.complete(record.order.id);
      await saveReceipt(completed);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete the order.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-gaia-50">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold text-gaia-900">
              <ClipboardList className="h-6 w-6 text-gaia-600" />
              Client Work Orders
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Track sales, deduct recipe ingredients, and generate receipts.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" /> New Order
          </button>
        </div>

        {message && (
          <div role="status" className="mt-4 flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm text-slate-700 ring-1 ring-gaia-200">
            <span>{message}</span>
            <button className="icon-btn h-7 w-7" onClick={() => setMessage(null)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {showForm && (
          <section className="mt-5 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-gaia-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gaia-900">New Work Order</h2>
              <button className="icon-btn" onClick={() => setShowForm(false)}>
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Client name</label>
                <input
                  className="input"
                  list="work-order-clients"
                  value={clientName}
                  onChange={(event) => setClientName(event.target.value)}
                  placeholder="Client name"
                />
                <datalist id="work-order-clients">
                  {clients.map((client) => <option key={client.id} value={client.name} />)}
                </datalist>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <input
                  className="input"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Pickup, scent, or packaging notes"
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {lines.map((line, index) => (
                <div key={index} className="grid grid-cols-[minmax(0,1fr)_80px_110px_36px] items-end gap-2">
                  <div>
                    <label className="label">Soap recipe</label>
                    <select
                      className="input"
                      value={line.recipeId}
                      onChange={(event) => updateLine(index, { recipeId: event.target.value })}
                    >
                      <option value="">Select recipe…</option>
                      {recipes.map((recipe) => (
                        <option key={recipe.id} value={recipe.id}>{recipe.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Qty</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      className="input"
                      value={line.quantity}
                      onChange={(event) => updateLine(index, { quantity: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Retail each</label>
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      className="input"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(index, { unitPrice: event.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <button
                    className="icon-btn text-rose-500"
                    disabled={lines.length === 1}
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button className="btn-secondary" onClick={() => setLines((current) => [...current, blankLine()])}>
                <Plus className="h-4 w-4" /> Add soap
              </button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-slate-500">
                  Total <strong className="text-lg text-gaia-800">${subtotal.toFixed(2)}</strong>
                </span>
                <button className="btn-primary" disabled={busyId === 'new'} onClick={() => void createOrder()}>
                  {busyId === 'new' && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Draft
                </button>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 space-y-3">
          {orders.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-14 text-center text-sm text-slate-500">
              No work orders yet.
            </div>
          ) : orders.map((record) => (
            <article key={record.order.id} className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-slate-900">{record.order.clientName}</h2>
                  <p className="text-xs text-slate-500">
                    {new Date(record.order.orderDate).toLocaleDateString()} · {record.items.length} item(s)
                  </p>
                </div>
                <span className={`chip ${
                  record.order.status === 'completed'
                    ? 'bg-emerald-100 text-emerald-700'
                    : record.order.status === 'cancelled'
                      ? 'bg-slate-200 text-slate-500'
                      : 'bg-amber-100 text-amber-700'
                }`}>
                  {record.order.status}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {record.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm text-slate-600">
                    <span>{item.quantity} × {item.recipeName}</span>
                    <span>${item.lineTotal.toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                <strong className="text-gaia-800">${record.order.subtotal.toFixed(2)}</strong>
                <div className="flex gap-2">
                  {record.order.status === 'draft' && (
                    <button
                      className="btn-primary"
                      disabled={busyId === record.order.id}
                      onClick={() => void completeOrder(record)}
                    >
                      {busyId === record.order.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="h-4 w-4" />}
                      Complete & Receipt
                    </button>
                  )}
                  {record.order.status === 'completed' && (
                    <button className="btn-secondary" onClick={() => void saveReceipt(record)}>
                      <Download className="h-4 w-4" /> Receipt
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
