import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, TrendingUp, TrendingDown, DollarSign, Package, PieChart, BarChart2 } from 'lucide-react';
import { recipesRepo, ingredientsRepo, receiptsRepo, workOrdersRepo } from '@/db/repositories';
import { calculateRecipeUnitCogs } from '@/lib/inventoryMath';
import { useAppStore } from '@/store/useAppStore';
import type { Recipe, Ingredient, Receipt, WorkOrder, WorkOrderItem } from '@/types';

// Simple date helpers
const startOfMonth = (date = new Date()) => new Date(date.getFullYear(), date.getMonth(), 1).getTime();
const startOfYear = (date = new Date()) => new Date(date.getFullYear(), 0, 1).getTime();

// SVG Bar Chart Component
const BarChart = ({ data }: { data: { label: string; revenue: number; expense: number }[] }) => {
  const { t } = useTranslation();
  
  if (data.length === 0) return null;

  const maxVal = Math.max(...data.flatMap(d => [d.revenue, d.expense]), 100);
  const chartHeight = 240;
  const padding = 40;
  const usableHeight = chartHeight - padding * 2;
  const barWidth = 16;
  const groupSpacing = 40;
  
  return (
    <div className="w-full overflow-x-auto">
      <svg width={data.length * (barWidth * 2 + groupSpacing) + padding * 2} height={chartHeight} className="text-sm">
        {/* Gridlines */}
        {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
          const y = padding + usableHeight * (1 - ratio);
          return (
            <g key={ratio}>
              <line x1={padding} y1={y} x2="100%" y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
              <text x={padding - 8} y={y + 4} textAnchor="end" fill="#6b7280" fontSize="10">
                ${Math.round(maxVal * ratio).toLocaleString()}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const xOffset = padding + i * (barWidth * 2 + groupSpacing) + 20;
          const revHeight = (d.revenue / maxVal) * usableHeight;
          const expHeight = (d.expense / maxVal) * usableHeight;
          
          return (
            <g key={d.label} className="group">
              {/* Revenue Bar */}
              <rect
                x={xOffset}
                y={padding + usableHeight - revHeight}
                width={barWidth}
                height={revHeight}
                className="fill-gaia-500 transition-all duration-300"
                rx={4}
              />
              <title>{t('reports.revenue', 'Revenue')}: ${d.revenue.toFixed(2)}</title>

              {/* Expense Bar */}
              <rect
                x={xOffset + barWidth + 2}
                y={padding + usableHeight - expHeight}
                width={barWidth}
                height={expHeight}
                className="fill-amber-400 transition-all duration-300"
                rx={4}
              />
              <title>{t('reports.expenses', 'Expenses')}: ${d.expense.toFixed(2)}</title>

              <text x={xOffset + barWidth} y={chartHeight - 10} textAnchor="middle" fill="#374151" fontSize="12">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default function ReportsScreen() {
  const { t } = useTranslation();
  const baseLaborRate = useAppStore((s) => s.settings.baseLaborRate ?? 20);
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [orderItems, setOrderItems] = useState<WorkOrderItem[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [o, oi, r, rec, ing] = await Promise.all([
          workOrdersRepo.all(),
          workOrdersRepo.allItems(),
          receiptsRepo.all(),
          recipesRepo.all(),
          ingredientsRepo.all(),
        ]);
        setOrders(o);
        setOrderItems(oi);
        setReceipts(r);
        setRecipes(rec);
        setIngredients(ing);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    void loadData();
  }, []);

  const completedOrders = useMemo(() => orders.filter(o => o.status === 'completed' && o.completedAt), [orders]);

  // Analytics computation
  const { summary, chartData, topProducts, marginData, expenseBreakdown } = useMemo(() => {
    const monthStart = startOfMonth();
    const yearStart = startOfYear();

    let thisMonthRev = 0, thisMonthExp = 0;
    let thisYearRev = 0, thisYearExp = 0;
    let allTimeRev = 0, allTimeExp = 0;

    // Monthly aggregation for chart (last 12 months)
    const monthlyRev = new Map<string, number>();
    const monthlyExp = new Map<string, number>();
    
    const last12Months: string[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      last12Months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
    }

    last12Months.forEach(m => {
      monthlyRev.set(m, 0);
      monthlyExp.set(m, 0);
    });

    completedOrders.forEach(o => {
      const ts = o.completedAt!;
      const amt = o.subtotal || 0;
      allTimeRev += amt;
      if (ts >= monthStart) thisMonthRev += amt;
      if (ts >= yearStart) thisYearRev += amt;

      const d = new Date(ts);
      const mKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (monthlyRev.has(mKey)) {
        monthlyRev.set(mKey, monthlyRev.get(mKey)! + amt);
      }
    });

    receipts.forEach(r => {
      const ts = r.date;
      const amt = r.total || 0;
      allTimeExp += amt;
      if (ts >= monthStart) thisMonthExp += amt;
      if (ts >= yearStart) thisYearExp += amt;

      const d = new Date(ts);
      const mKey = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (monthlyExp.has(mKey)) {
        monthlyExp.set(mKey, monthlyExp.get(mKey)! + amt);
      }
    });

    const chartData = last12Months.map(label => ({
      label,
      revenue: monthlyRev.get(label) || 0,
      expense: monthlyExp.get(label) || 0,
    }));

    // Top Products
    const productSales = new Map<string, { name: string; units: number; revenue: number }>();
    const completedOrderIds = new Set(completedOrders.map(o => o.id));
    
    orderItems.forEach(item => {
      if (!completedOrderIds.has(item.workOrderId)) return;
      if (!productSales.has(item.recipeId)) {
        productSales.set(item.recipeId, { name: item.recipeName, units: 0, revenue: 0 });
      }
      const data = productSales.get(item.recipeId)!;
      data.units += item.quantity;
      data.revenue += item.lineTotal;
    });

    const topProducts = Array.from(productSales.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 10)
      .map(p => ({ ...p, avgPrice: p.units > 0 ? p.revenue / p.units : 0 }));

    // Margin Data
    const marginData = recipes.map(r => {
      const unitCogs = calculateRecipeUnitCogs(r, ingredients, baseLaborRate);
      const retail = r.retailPrice || 0;
      const margin = retail > 0 ? ((retail - unitCogs) / retail) * 100 : 0;
      return { name: r.name, retail, cogs: unitCogs, margin };
    }).sort((a, b) => b.margin - a.margin);

    // Expense Breakdown
    const categoryTotals: Record<string, number> = {
      ingredients: 0,
      packaging: 0,
      shipping: 0,
      equipment: 0,
      other: 0,
    };
    receipts.forEach(r => {
      const cat = r.category || 'other';
      if (cat in categoryTotals) {
        categoryTotals[cat] += r.total || 0;
      } else {
        categoryTotals['other'] += r.total || 0;
      }
    });

    return {
      summary: {
        thisMonth: { rev: thisMonthRev, exp: thisMonthExp, profit: thisMonthRev - thisMonthExp },
        thisYear: { rev: thisYearRev, exp: thisYearExp, profit: thisYearRev - thisYearExp },
        allTime: { rev: allTimeRev, exp: allTimeExp, profit: allTimeRev - allTimeExp },
      },
      chartData,
      topProducts,
      marginData,
      expenseBreakdown: Object.entries(categoryTotals).map(([name, val]) => ({ name, value: val })),
    };
  }, [orders, completedOrders, orderItems, receipts, recipes, ingredients, baseLaborRate]);


  const downloadCsv = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportSales = () => {
    const headers = t('reports.exportSalesHeaders', 'Order Number,Date,Client,Total').split(',');
    const rows = completedOrders.map(o => [
      o.orderNumber || '',
      new Date(o.completedAt!).toLocaleDateString(),
      o.clientName || '',
      o.subtotal.toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(`sales-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleExportExpenses = () => {
    const headers = t('reports.exportExpensesHeaders', 'Date,Supplier,Category,Total').split(',');
    const rows = receipts.map(r => [
      new Date(r.date).toLocaleDateString(),
      r.vendor || '',
      r.category || '',
      (r.total || 0).toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(`expenses-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const handleExportInventory = () => {
    const headers = t('reports.exportInventoryHeaders', 'Ingredient,Stock On Hand,Unit Cost,Total Value').split(',');
    const rows = ingredients.map(i => [
      i.name,
      (i.stockOnHand || 0).toString(),
      (i.fractionalCost || 0).toFixed(4),
      ((i.stockOnHand || 0) * (i.fractionalCost || 0)).toFixed(2)
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadCsv(`inventory-${new Date().toISOString().split('T')[0]}.csv`, csv);
  };

  const formatMoney = (val: number) => `$${val.toFixed(2)}`;

  const summaryCard = (title: string, data: { rev: number, exp: number, profit: number }) => (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-gray-500 text-sm font-medium mb-4">{title}</h3>
      <div className="flex items-end gap-2 mb-4">
        <span className={`text-3xl font-bold ${data.profit >= 0 ? 'text-gaia-600' : 'text-red-500'}`}>
          {formatMoney(data.profit)}
        </span>
        <span className="text-gray-400 text-sm mb-1">{t('reports.netProfit', 'Net Profit')}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between items-center text-gaia-600">
          <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4" /> {t('reports.revenue', 'Revenue')}</div>
          <span className="font-medium">{formatMoney(data.rev)}</span>
        </div>
        <div className="flex justify-between items-center text-amber-600">
          <div className="flex items-center gap-2"><TrendingDown className="w-4 h-4" /> {t('reports.expenses', 'Expenses')}</div>
          <span className="font-medium">{formatMoney(data.exp)}</span>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="p-8 text-gray-500">{t('common.loading', 'Loading...')}</div>;

  const totalExpense = expenseBreakdown.reduce((a, b) => a + b.value, 0);

  return (
    <div className="h-full overflow-y-auto bg-gray-50/50 text-gray-900 px-6 py-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Export Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('reports.title', 'Reports & Analytics')}</h1>
            <p className="text-gray-500">{t('reports.subtitle', 'Track your business performance')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportSales} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm text-gray-700">
              <Download className="w-4 h-4" /> {t('reports.exportSales', 'Export Sales')}
            </button>
            <button onClick={handleExportExpenses} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm text-gray-700">
              <Download className="w-4 h-4" /> {t('reports.exportExpenses', 'Export Expenses')}
            </button>
            <button onClick={handleExportInventory} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors shadow-sm text-gray-700">
              <Download className="w-4 h-4" /> {t('reports.exportInventory', 'Export Inventory')}
            </button>
          </div>
        </div>

        {/* Top Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {summaryCard(t('reports.thisMonth', 'This Month'), summary.thisMonth)}
          {summaryCard(t('reports.thisYear', 'This Year'), summary.thisYear)}
          {summaryCard(t('reports.allTime', 'All Time'), summary.allTime)}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Chart */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <BarChart2 className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">{t('reports.monthlyRevenue', 'Monthly Revenue vs Expenses')}</h2>
            </div>
            {summary.allTime.rev === 0 && summary.allTime.exp === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                {t('reports.noDataChart', 'Not enough data to display chart')}
              </div>
            ) : (
              <BarChart data={chartData} />
            )}
          </div>

          {/* Expense Breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <PieChart className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">{t('reports.expenseBreakdown', 'Expenses by Category')}</h2>
            </div>
            {totalExpense === 0 ? (
              <div className="py-8 text-center text-gray-400">{t('reports.noExpenses', 'No expenses recorded yet')}</div>
            ) : (
              <div className="space-y-4">
                {expenseBreakdown.sort((a, b) => b.value - a.value).map(cat => {
                  if (cat.value === 0) return null;
                  const pct = Math.round((cat.value / totalExpense) * 100);
                  return (
                    <div key={cat.name} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="capitalize text-gray-600">{cat.name}</span>
                        <span className="font-medium text-gray-900">{formatMoney(cat.value)} ({pct}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-400" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-12">
          {/* Top Products */}
          <div className="bg-white rounded-xl border border-gray-200 p-0 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">{t('reports.topProducts', 'Top Selling Products')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">#</th>
                    <th className="px-6 py-3 font-medium">{t('common.product', 'Product')}</th>
                    <th className="px-6 py-3 font-medium text-right">{t('reports.unitsSold', 'Units Sold')}</th>
                    <th className="px-6 py-3 font-medium text-right">{t('reports.revenue', 'Revenue')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {topProducts.length === 0 ? (
                    <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">{t('reports.noSales', 'No sales data yet')}</td></tr>
                  ) : topProducts.map((p, i) => (
                    <tr key={p.name} className="hover:bg-gray-50/50">
                      <td className="px-6 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{p.name}</td>
                      <td className="px-6 py-3 text-right">{p.units}</td>
                      <td className="px-6 py-3 text-right font-medium text-gaia-600">{formatMoney(p.revenue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Margin Analysis */}
          <div className="bg-white rounded-xl border border-gray-200 p-0 shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-gray-400" />
              <h2 className="text-lg font-semibold">{t('reports.profitMargins', 'Profit Margins')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3 font-medium">{t('common.product', 'Product')}</th>
                    <th className="px-6 py-3 font-medium text-right">{t('reports.retail', 'Retail')}</th>
                    <th className="px-6 py-3 font-medium text-right">{t('reports.cogs', 'COGS')}</th>
                    <th className="px-6 py-3 font-medium text-right">{t('reports.margin', 'Margin %')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {marginData.length === 0 ? (
                     <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-400">{t('reports.noProducts', 'No products to analyze')}</td></tr>
                  ) : marginData.map((m) => {
                    let marginColor = 'text-red-600 bg-red-50';
                    if (m.margin >= 50) marginColor = 'text-gaia-700 bg-gaia-50';
                    else if (m.margin >= 25) marginColor = 'text-amber-700 bg-amber-50';
                    
                    return (
                      <tr key={m.name} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3 font-medium text-gray-900">{m.name}</td>
                        <td className="px-6 py-3 text-right">{formatMoney(m.retail)}</td>
                        <td className="px-6 py-3 text-right text-gray-500">{formatMoney(m.cogs)}</td>
                        <td className="px-6 py-3 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium ${marginColor}`}>
                            {m.margin.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
