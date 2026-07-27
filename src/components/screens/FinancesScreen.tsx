import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, ChevronUp, Download, Loader2, Package, Plus,
  Receipt as ReceiptIcon, Trash2, X,
} from 'lucide-react';
import type { CustomMaterial, ExpenseCategory, Ingredient, Receipt, ReceiptLineItem } from '@/types';
import { customMaterialsRepo, ingredientsRepo, receiptsRepo } from '@/db/repositories';
import { getIngredientDisplayName } from '@/lib/ingredientI18n';

const EXPENSE_CATEGORIES: ExpenseCategory[] = ['ingredients', 'packaging', 'shipping', 'equipment', 'other'];

function genId() {
  return `li-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function todayTimestamp(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function dateInputValue(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

function formatMoney(n: number): string {
  return `$${n.toFixed(2)}`;
}

export default function FinancesScreen() {
  const { t } = useTranslation();
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [materials, setMaterials] = useState<CustomMaterial[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const reload = async () => {
    const [r, ings, mats] = await Promise.all([
      receiptsRepo.all(),
      ingredientsRepo.active(),
      customMaterialsRepo.active(),
    ]);
    setReceipts(r);
    setIngredients(ings);
    setMaterials(mats);
  };

  useEffect(() => { void reload(); }, []);

  const summary = useMemo(() => receiptsRepo.summarize(receipts), [receipts]);

  const handleDelete = async (id: string) => {
    await receiptsRepo.remove(id);
    void reload();
  };

  const handleExportCsv = () => {
    const header = ['Date', 'Vendor', 'Category', 'Item', 'Qty', 'Unit Cost', 'Line Total', 'Tax', 'Total'];
    const rows: string[][] = [];
    for (const r of receipts) {
      const dateStr = dateInputValue(r.date);
      r.lineItems.forEach((li, idx) => {
        rows.push([
          dateStr,
          r.vendor,
          r.category,
          li.description,
          String(li.quantity),
          li.unitCost.toFixed(2),
          li.lineTotal.toFixed(2),
          idx === 0 ? (r.tax ?? 0).toFixed(2) : '',
          idx === 0 ? r.total.toFixed(2) : '',
        ]);
      });
      if (r.lineItems.length === 0) {
        rows.push([dateStr, r.vendor, r.category, '', '', '', '', (r.tax ?? 0).toFixed(2), r.total.toFixed(2)]);
      }
    }
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gaia-receipts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto bg-gaia-50">
        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-semibold text-gaia-900">
                <ReceiptIcon className="h-6 w-6 text-gaia-600" />
                {t('finances.title', 'Finances')}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">
                {t('finances.subtitle', 'Log receipts to track spending and keep Inventory prices current.')}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn-secondary text-sm"
                onClick={handleExportCsv}
                disabled={receipts.length === 0}
              >
                <Download className="h-3.5 w-3.5" />
                {t('finances.exportCsv', 'Export CSV')}
              </button>
              <button
                type="button"
                className="btn-primary text-sm"
                onClick={() => setShowForm((v) => !v)}
              >
                <Plus className="h-3.5 w-3.5" />
                {t('finances.newReceipt', 'New Receipt')}
              </button>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label={t('finances.thisMonth', 'This Month')} value={summary.thisMonth} />
            <StatCard label={t('finances.thisYear', 'This Year')} value={summary.thisYear} />
            <StatCard label={t('finances.allTime', 'All Time')} value={summary.allTime} highlight />
          </div>

          {summary.byCategory.length > 0 && (
            <div className="mt-6 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
              <p className="mb-3 text-sm font-semibold text-slate-800">
                {t('finances.categoryBreakdown', 'Spending by Category')}
              </p>
              <div className="space-y-2">
                {summary.byCategory.map(([cat, total]) => {
                  const pct = summary.allTime > 0 ? (total / summary.allTime) * 100 : 0;
                  return (
                    <div key={cat} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 truncate text-xs font-medium text-slate-600">
                        {t(`finances.categories.${cat}`, cat)}
                      </span>
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gaia-500"
                          style={{ width: `${Math.max(pct, 2)}%` }}
                        />
                      </div>
                      <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-700">
                        {formatMoney(total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {showForm && (
            <div className="mt-6">
              <NewReceiptForm
                ingredients={ingredients}
                materials={materials}
                onSaved={() => { setShowForm(false); void reload(); }}
                onCancel={() => setShowForm(false)}
              />
            </div>
          )}

          <div className="mt-6">
            <p className="mb-3 text-sm font-semibold text-slate-800">{t('finances.receipts', 'Receipts')}</p>
            {receipts.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-gaia-200 bg-white py-12 text-center">
                <ReceiptIcon className="mx-auto mb-3 h-10 w-10 text-gaia-300" />
                <p className="font-medium text-slate-600">{t('finances.noReceipts', 'No receipts logged yet.')}</p>
                <p className="mt-1 text-sm text-slate-400">
                  {t('finances.noReceiptsHint', 'Log your first purchase receipt to start tracking expenses.')}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {receipts.map((r) => (
                  <ReceiptRow
                    key={r.id}
                    receipt={r}
                    expanded={expandedId === r.id}
                    onToggle={() => setExpandedId((id) => (id === r.id ? null : r.id))}
                    onDelete={() => void handleDelete(r.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stat cards
// ---------------------------------------------------------------------------

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-2xl px-4 py-3 ring-1 ${
        highlight ? 'bg-gaia-600 text-white ring-gaia-600' : 'bg-white text-slate-800 ring-slate-200'
      }`}
    >
      <p className={`text-[11px] font-semibold uppercase tracking-wide ${highlight ? 'text-gaia-100' : 'text-slate-400'}`}>
        {label}
      </p>
      <p className="text-2xl font-bold">{formatMoney(value)}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Receipt list row — collapsible with line items, edit-free (delete only)
// ---------------------------------------------------------------------------

function ReceiptRow({
  receipt,
  expanded,
  onToggle,
  onDelete,
}: {
  receipt: Receipt;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <ReceiptIcon className="h-4 w-4 shrink-0 text-gaia-500" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800">{receipt.vendor}</p>
          <p className="text-xs text-slate-400">
            {dateInputValue(receipt.date)} · {t(`finances.categories.${receipt.category}`, receipt.category)}
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-slate-700">{formatMoney(receipt.total)}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label={t('finances.deleteReceipt', 'Delete receipt')}
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4 text-slate-300 transition-colors hover:text-rose-500" />
        </button>
        {expanded ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-400" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />}
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-slate-100 px-5 pb-5 pt-4">
          {receipt.lineItems.map((li) => (
            <div key={li.id} className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
              <Package className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              <span className="flex-1 truncate font-medium text-slate-700">{li.description}</span>
              <span className="shrink-0 text-slate-400">{li.quantity} × {formatMoney(li.unitCost)}</span>
              <span className="shrink-0 font-semibold text-slate-700">{formatMoney(li.lineTotal)}</span>
            </div>
          ))}
          {receipt.notes && <p className="text-xs italic text-slate-400">{receipt.notes}</p>}
          <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
            <span className="text-slate-500">{t('finances.subtotal', 'Subtotal')}: {formatMoney(receipt.subtotal)}</span>
            {receipt.tax !== undefined && receipt.tax > 0 && (
              <span className="text-slate-500">{t('finances.tax', 'Tax ($)')}: {formatMoney(receipt.tax)}</span>
            )}
            <span className="font-semibold text-slate-700">{t('finances.total', 'Total')}: {formatMoney(receipt.total)}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// New Receipt form
// ---------------------------------------------------------------------------

interface LineItemDraft {
  id: string;
  description: string;
  ingredientId?: string;
  materialId?: string;
  quantity: string;
  unitCost: string;
  syncPrice: boolean;
}

function emptyLineItem(): LineItemDraft {
  return { id: genId(), description: '', quantity: '1', unitCost: '', syncPrice: false };
}

function NewReceiptForm({
  ingredients,
  materials,
  onSaved,
  onCancel,
}: {
  ingredients: Ingredient[];
  materials: CustomMaterial[];
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [vendor, setVendor] = useState('');
  const [date, setDate] = useState(dateInputValue(todayTimestamp()));
  const [category, setCategory] = useState<ExpenseCategory>('ingredients');
  const [lineItems, setLineItems] = useState<LineItemDraft[]>([emptyLineItem()]);
  const [tax, setTax] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const computedLines = useMemo(
    () =>
      lineItems.map((li) => {
        const qty = parseFloat(li.quantity) || 0;
        const unitCost = parseFloat(li.unitCost) || 0;
        return { ...li, lineTotal: qty * unitCost };
      }),
    [lineItems],
  );

  const subtotal = useMemo(() => computedLines.reduce((sum, li) => sum + li.lineTotal, 0), [computedLines]);
  const taxAmount = parseFloat(tax) || 0;
  const total = subtotal + taxAmount;

  const updateLine = (id: string, patch: Partial<LineItemDraft>) => {
    setLineItems((items) => items.map((li) => (li.id === id ? { ...li, ...patch } : li)));
  };

  const handleLinkChange = (id: string, value: string) => {
    if (!value) {
      updateLine(id, { ingredientId: undefined, materialId: undefined, syncPrice: false });
      return;
    }
    const [kind, refId] = value.split(':');
    if (kind === 'ingredient') {
      const ing = ingredients.find((i) => i.id === refId);
      if (!ing) return;
      updateLine(id, {
        ingredientId: ing.id,
        materialId: undefined,
        description: getIngredientDisplayName(ing.name, t),
        unitCost: ing.fractionalCost !== undefined ? String(ing.fractionalCost) : '',
        syncPrice: true,
      });
    } else if (kind === 'material') {
      const mat = materials.find((m) => m.id === refId);
      if (!mat) return;
      updateLine(id, {
        materialId: mat.id,
        ingredientId: undefined,
        description: mat.name,
        unitCost: String(mat.cost),
        syncPrice: true,
      });
    }
  };

  const addLine = () => setLineItems((items) => [...items, emptyLineItem()]);
  const removeLine = (id: string) => setLineItems((items) => items.filter((li) => li.id !== id));

  const canSave =
    vendor.trim().length > 0 &&
    computedLines.some((li) => li.description.trim().length > 0 && li.lineTotal > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const finalLineItems: ReceiptLineItem[] = computedLines
        .filter((li) => li.description.trim().length > 0)
        .map((li) => ({
          id: li.id,
          description: li.description.trim(),
          ingredientId: li.ingredientId,
          materialId: li.materialId,
          quantity: parseFloat(li.quantity) || 0,
          unitCost: parseFloat(li.unitCost) || 0,
          lineTotal: li.lineTotal,
          syncPrice: li.syncPrice,
        }));

      await receiptsRepo.create({
        vendor: vendor.trim(),
        date: new Date(date).getTime(),
        category,
        lineItems: finalLineItems,
        tax: taxAmount || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-slate-800">{t('finances.newReceipt', 'New Receipt')}</p>
        <button type="button" onClick={onCancel} className="text-slate-400 hover:text-slate-600" aria-label="Cancel">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('finances.vendor', 'Vendor')}</label>
          <input
            className="input text-sm"
            placeholder={t('finances.vendorPlaceholder', 'e.g. Bulk Apothecary')}
            value={vendor}
            onChange={(e) => setVendor(e.target.value)}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('finances.date', 'Date')}</label>
          <input type="date" className="input text-sm" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('finances.category', 'Category')}</label>
          <select className="input text-sm" value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)}>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{t(`finances.categories.${c}`, c)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
          {t('finances.lineItems', 'Line Items')}
        </p>
        <div className="space-y-2">
          {computedLines.map((li) => (
            <div key={li.id} className="grid grid-cols-1 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-6">
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-medium text-slate-500">
                  {t('finances.linkTo', 'Link to')}
                </label>
                <select
                  className="input text-sm"
                  value={li.ingredientId ? `ingredient:${li.ingredientId}` : li.materialId ? `material:${li.materialId}` : ''}
                  onChange={(e) => handleLinkChange(li.id, e.target.value)}
                >
                  <option value="">{t('finances.linkNone', 'No link (one-off)')}</option>
                  {ingredients.length > 0 && (
                    <optgroup label={t('nav.ingredients', 'Ingredients')}>
                      {ingredients.map((ing) => (
                        <option key={ing.id} value={`ingredient:${ing.id}`}>
                          {getIngredientDisplayName(ing.name, t)}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {materials.length > 0 && (
                    <optgroup label={t('materials.title', 'Custom Materials & Packaging')}>
                      {materials.map((mat) => (
                        <option key={mat.id} value={`material:${mat.id}`}>{mat.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
              <div className="col-span-2">
                <label className="mb-1 block text-[10px] font-medium text-slate-500">
                  {t('finances.description', 'Description')}
                </label>
                <input
                  className="input text-sm"
                  placeholder={t('finances.descriptionPlaceholder', 'e.g. Shea Butter, restock')}
                  value={li.description}
                  onChange={(e) => updateLine(li.id, { description: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-500">
                  {t('finances.quantity', 'Quantity')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input text-sm"
                  value={li.quantity}
                  onChange={(e) => updateLine(li.id, { quantity: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-[10px] font-medium text-slate-500">
                  {t('finances.unitCost', 'Unit cost ($)')}
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className="input text-sm"
                  value={li.unitCost}
                  onChange={(e) => updateLine(li.id, { unitCost: e.target.value })}
                />
              </div>
              <div className="col-span-2 flex items-center justify-between sm:col-span-6">
                <label
                  className={`flex items-center gap-2 text-[11px] ${
                    li.ingredientId || li.materialId ? 'text-slate-500' : 'text-slate-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 accent-gaia-600"
                    checked={li.syncPrice}
                    disabled={!li.ingredientId && !li.materialId}
                    onChange={(e) => updateLine(li.id, { syncPrice: e.target.checked })}
                  />
                  {t('finances.syncPrice', 'Update price in Inventory')}
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {t('finances.lineTotal', 'Line total')}: {formatMoney(li.lineTotal)}
                  </span>
                  {lineItems.length > 1 && (
                    <button type="button" onClick={() => removeLine(li.id)} aria-label="Remove line item">
                      <Trash2 className="h-3.5 w-3.5 text-slate-300 transition-colors hover:text-rose-500" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addLine}
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-gaia-200 py-2 text-xs font-medium text-gaia-600 transition hover:border-gaia-400 hover:bg-gaia-50"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('finances.addLineItem', 'Add Line Item')}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('finances.tax', 'Tax ($)')}</label>
          <input type="number" min={0} step={0.01} className="input text-sm" value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">{t('finances.notes', 'Notes')}</label>
          <input className="input text-sm" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
        <span className="text-sm font-semibold text-emerald-800">
          {t('finances.subtotal', 'Subtotal')}: {formatMoney(subtotal)}
        </span>
        <span className="text-xl font-bold text-emerald-700">
          {t('finances.total', 'Total')}: {formatMoney(total)}
        </span>
      </div>

      <button className="btn-primary w-full" disabled={!canSave || saving} onClick={() => void handleSave()}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ReceiptIcon className="h-4 w-4" />}
        {t('finances.saveReceipt', 'Save Receipt')}
      </button>
    </div>
  );
}
