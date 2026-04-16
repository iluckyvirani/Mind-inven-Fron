import { useState, useEffect } from 'react'
import { Button, Select } from '../../components/ui'
import { reportAPI } from '../../api/endpoints'

// Types
type ReportType = 'sales' | 'inventory' | 'financial' | 'supplier'
type DateRange = 'today' | 'yesterday' | 'this-week' | 'this-month' | 'this-year' | 'custom'

// Default fallback structures
const defaultSalesData = {
  summary: { dailySales: 0, weeklySales: 0, monthlySales: 0, totalBills: 0, avgBillValue: 0 },
  dailyData: [] as { date: string; sales: number; bills: number }[],
  customerWise: [] as { name: string; phone: string; purchases: number; totalSpent: number }[],
  paymentModes: [] as { mode: string; amount: number; percentage: number }[],
  topMedicines: [] as { name: string; unitsSold: number; revenue: number }[],
}

const defaultInventoryData = {
  summary: { totalMedicines: 0, totalStockValue: 0, lowStockCount: 0, expiringCount: 0 },
  lowStock: [] as { name: string; currentStock: number; minStock: number; category: string }[],
  expiring: [] as { name: string; batch: string; stock: number; expiryDate: string }[],
  categoryWise: [] as { category: string; count: number; value: number }[],
}

const defaultFinancialData = {
  incomeStatement: {
    revenue: { medicineSales: 0, other: 0, total: 0 },
    expenses: { purchases: 0, salaries: 0, rent: 0, utilities: 0, marketing: 0, maintenance: 0, insurance: 0, other: 0, total: 0 },
    netProfit: 0,
    profitMargin: 0,
  },
  outstanding: [] as { invoiceNo: string; customer: string; phone: string; amount: number; dueDate: string; days: number }[],
  collections: [] as { date: string; cash: number; card: number; upi: number; total: number }[],
}

const defaultSupplierData = {
  suppliers: [] as { name: string; purchases: number; totalAmount: number; lastPurchase: string; paymentDue: number }[],
  recentPurchases: [] as { date: string; supplier: string; invoice: string; items: number; amount: number; status: string }[],
}

const ReportsDashboard = () => {
  const [activeSection, setActiveSection] = useState<ReportType>('sales')
  const [dateRange, setDateRange] = useState<DateRange>('this-month')
  const [customDateFrom, setCustomDateFrom] = useState('')
  const [customDateTo, setCustomDateTo] = useState('')
  const [loading, setLoading] = useState(false)

  const [salesData, setSalesData] = useState(defaultSalesData)
  const [inventoryData, setInventoryData] = useState(defaultInventoryData)
  const [financialData, setFinancialData] = useState(defaultFinancialData)
  const [supplierData, setSupplierData] = useState(defaultSupplierData)

  const getDateParams = (): Record<string, string> => {
    const params: Record<string, string> = {}
    const now = new Date()
    if (dateRange === 'custom') {
      if (customDateFrom) params.dateFrom = customDateFrom
      if (customDateTo) params.dateTo = customDateTo
      return params
    }
    const fmt = (d: Date) => d.toISOString().slice(0, 10)
    switch (dateRange) {
      case 'today': params.dateFrom = fmt(now); params.dateTo = fmt(now); break
      case 'yesterday': { const y = new Date(now); y.setDate(y.getDate() - 1); params.dateFrom = fmt(y); params.dateTo = fmt(y); break }
      case 'this-week': { const w = new Date(now); w.setDate(w.getDate() - 7); params.dateFrom = fmt(w); params.dateTo = fmt(now); break }
      case 'this-month': { params.dateFrom = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`; params.dateTo = fmt(now); break }
      case 'this-year': { params.dateFrom = `${now.getFullYear()}-01-01`; params.dateTo = fmt(now); break }
    }
    return params
  }

  const fetchData = (type: string, params: Record<string, string>) =>
    reportAPI.get(type, params).then(r => {
      const outer = r.data?.data ?? r.data ?? {}
      // API returns { reportType, dateFrom, dateTo, data: [...] } — unwrap inner .data if present
      if (outer && !Array.isArray(outer) && Array.isArray(outer.data)) return outer.data
      return outer
    }).catch(() => null)

  const fetchReport = async (type: ReportType) => {
    try {
      setLoading(true)
      const p = getDateParams()

      if (type === 'sales') {
        const [daily, byCustomer, byMedicine, payModes] = await Promise.all([
          fetchData('daily-sales', p),
          fetchData('sales-by-customer', p),
          fetchData('sales-by-medicine', p),
          fetchData('payment-mode-summary', p),
        ])
        const dailyArr: any[] = Array.isArray(daily) ? daily : []
        const totalSales = dailyArr.reduce((s, d) => s + (d.totalSales || 0), 0)
        const totalBills = dailyArr.reduce((s, d) => s + (d.billCount || 0), 0)
        const todaySales = dailyArr.length > 0 ? dailyArr[dailyArr.length - 1]?.totalSales || 0 : 0
        const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
        const weeklySales = dailyArr.filter(d => new Date(d.date) >= weekAgo).reduce((s, d) => s + (d.totalSales || 0), 0)
        const pmArr: any[] = Array.isArray(payModes) ? payModes : []
        const pmTotal = pmArr.reduce((s, m) => s + (m.totalAmount || 0), 0)
        setSalesData({
          summary: { dailySales: todaySales, weeklySales, monthlySales: totalSales, totalBills, avgBillValue: totalBills > 0 ? Math.round(totalSales / totalBills) : 0 },
          dailyData: dailyArr.map(d => ({ date: d.date, sales: d.totalSales || 0, bills: d.billCount || 0 })),
          customerWise: (Array.isArray(byCustomer) ? byCustomer : []).map((c: any) => ({ name: c.customerName, phone: c.phone || '', purchases: c.purchaseCount || 0, totalSpent: c.totalSpent || 0 })),
          paymentModes: pmArr.map((m: any) => ({ mode: m.paymentMode, amount: m.totalAmount || 0, percentage: pmTotal > 0 ? Math.round((m.totalAmount / pmTotal) * 100) : 0 })),
          topMedicines: (Array.isArray(byMedicine) ? byMedicine : []).slice(0, 10).map((m: any) => ({ name: m.medicineName, unitsSold: m.totalQuantity || 0, revenue: m.totalAmount || 0 })),
        })
      } else if (type === 'inventory') {
        const [stock, low, expiring, catVal] = await Promise.all([
          fetchData('current-stock', {}),
          fetchData('low-stock', {}),
          fetchData('expiring-medicines', {}),
          fetchData('category-stock-value', {}),
        ])
        const stockArr: any[] = Array.isArray(stock) ? stock : []
        const lowArr: any[] = Array.isArray(low) ? low : []
        const expArr: any[] = Array.isArray(expiring) ? expiring : []
        const catArr: any[] = Array.isArray(catVal) ? catVal : []
        const totalValue = stockArr.reduce((s, m) => s + (m.totalValue || 0), 0)
        setInventoryData({
          summary: { totalMedicines: stockArr.length, totalStockValue: totalValue, lowStockCount: lowArr.length, expiringCount: expArr.length },
          lowStock: lowArr.map((m: any) => ({ name: m.name, currentStock: m.stock || 0, minStock: m.minStock || 0, category: m.category || '' })),
          expiring: expArr.map((m: any) => ({ name: m.name, batch: m.batchNo || '', stock: m.stock || 0, expiryDate: m.expiryDate ? String(m.expiryDate).slice(0, 10) : '' })),
          categoryWise: catArr.map((c: any) => ({ category: c.categoryName, count: c.medicineCount || 0, value: c.totalValue || 0 })),
        })
      } else if (type === 'financial') {
        const [profitLoss, expReport, outstanding] = await Promise.all([
          fetchData('profit-loss', p),
          fetchData('expense-report', p),
          fetchData('outstanding-payments', {}),
        ])
        const pl = profitLoss || {}
        const expCats: any[] = Array.isArray(expReport) ? expReport : []
        const catMap: Record<string, number> = {}
        expCats.forEach((c: any) => { catMap[(c.category || '').toLowerCase()] = c.totalAmount || 0 })
        const outData = outstanding || {}
        const outSales: any[] = Array.isArray(outData.sales) ? outData.sales : []
        setFinancialData({
          incomeStatement: {
            revenue: { medicineSales: pl.totalRevenue || 0, other: 0, total: pl.totalRevenue || 0 },
            expenses: {
              purchases: pl.costOfGoodsSold || 0,
              salaries: catMap['salaries'] || 0, rent: catMap['rent'] || 0, utilities: catMap['utilities'] || 0,
              marketing: catMap['marketing'] || 0, maintenance: catMap['maintenance'] || 0, insurance: catMap['insurance'] || 0,
              other: catMap['miscellaneous'] || catMap['equipment'] || 0, total: pl.totalExpenses || 0,
            },
            netProfit: pl.netProfit || 0,
            profitMargin: pl.profitMargin || 0,
          },
          outstanding: outSales.map((s: any) => ({
            invoiceNo: s.invoiceNo || '', customer: s.customer?.name || '', phone: s.customer?.phone || '',
            amount: s.balance || 0, dueDate: s.date ? String(s.date).slice(0, 10) : '', days: Math.ceil((Date.now() - new Date(s.date).getTime()) / 86400000),
          })),
          collections: [],
        })
      } else if (type === 'supplier') {
        const supPurchases = await fetchData('supplier-purchases', {})
        const supArr: any[] = Array.isArray(supPurchases) ? supPurchases : []
        setSupplierData({
          suppliers: supArr.map((s: any) => ({ name: s.supplierName, purchases: s.medicineCount || 0, totalAmount: s.totalPurchase || 0, lastPurchase: '', paymentDue: s.balance || 0 })),
          recentPurchases: [],
        })
      }
    } catch (err) {
      console.error(`Failed to fetch ${type} report:`, err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchReport(activeSection) }, [activeSection, dateRange, customDateFrom, customDateTo])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  }

  const handleExport = (format: 'pdf' | 'excel') => {
    alert(`Exporting report as ${format.toUpperCase()}...`)
  }

  const handlePrint = () => {
    window.print()
  }

  // Simple bar chart component
  const SimpleBarChart = ({ data, maxValue }: { data: { label: string; value: number; color: string }[]; maxValue: number }) => (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-slate-700">{item.label}</span>
            <span className="font-medium text-slate-900">{formatCurrency(item.value)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${item.color} rounded-full transition-all duration-500`}
              style={{ width: `${(item.value / maxValue) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )

  // Sales Reports Section
  const SalesReports = () => (
    <div className="space-y-6">
      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <span className="text-slate-600 text-sm">Today's Sales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(salesData.summary.dailySales)}</p>
          <p className="text-xs text-green-600 mt-1">{"\u2191"} 8% from yesterday</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
            </div>
            <span className="text-slate-600 text-sm">Weekly Sales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(salesData.summary.weeklySales)}</p>
          <p className="text-xs text-green-600 mt-1">{"\u2191"} 12% from last week</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <span className="text-slate-600 text-sm">Monthly Sales</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{formatCurrency(salesData.summary.monthlySales)}</p>
          <p className="text-xs text-green-600 mt-1">{"\u2191"} 15% from last month</p>
        </div>

        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
              <span className="text-xl">🧾</span>
            </div>
            <span className="text-slate-600 text-sm">Total Bills</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{salesData.summary.totalBills}</p>
          <p className="text-xs text-slate-500 mt-1">Avg: {formatCurrency(salesData.summary.avgBillValue)}</p>
        </div>

        <div className="bg-linear-to-br from-emerald-600 to-teal-600 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
            <span className="text-white/80 text-sm">Monthly Revenue</span>
          </div>
          <p className="text-2xl font-bold text-white">{formatCurrency(salesData.summary.monthlySales)}</p>
          <p className="text-xs text-white/80 mt-1">{"\u2191"} 15% from last month</p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Sales Trend</h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {salesData.dailyData.map((day, index) => {
              const maxHeight = 200
              const height = (day.sales / 25000) * maxHeight
              return (
                <div key={index} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-slate-600">{formatCurrency(day.sales)}</span>
                  <div className="w-full flex flex-col justify-end" style={{ height: maxHeight }}>
                    <div
                      className="w-full bg-emerald-500 rounded-t-md"
                      style={{ height }}
                      title={`${day.bills} bills`}
                    />
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(day.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Payment Mode Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Payment Mode Distribution</h3>
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-48 h-48">
              <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                {salesData.paymentModes.reduce((acc, mode, index) => {
                  const colors = ['#10b981', '#3b82f6', '#8b5cf6']
                  const offset = acc.offset
                  const dash = mode.percentage
                  acc.elements.push(
                    <circle
                      key={index}
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke={colors[index]}
                      strokeWidth="3"
                      strokeDasharray={`${dash} ${100 - dash}`}
                      strokeDashoffset={-offset}
                    />
                  )
                  acc.offset += dash
                  return acc
                }, { elements: [] as React.ReactElement[], offset: 0 }).elements}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-2xl font-bold text-slate-800">{formatCurrency(salesData.summary.monthlySales)}</p>
                <p className="text-xs text-slate-500">Total</p>
              </div>
            </div>
          </div>
          <div className="space-y-3">
            {salesData.paymentModes.map((mode, index) => {
              const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500']
              return (
                <div key={index} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className={`w-3 h-3 ${colors[index]} rounded-sm`} />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{mode.mode}</p>
                  </div>
                  <p className="text-sm text-slate-500">{mode.percentage}%</p>
                  <p className="text-sm font-semibold text-slate-700">{formatCurrency(mode.amount)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Top Selling Medicines */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Selling Medicines</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">#</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Medicine</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Units Sold</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {salesData.topMedicines.map((med, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-500">{index + 1}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                        <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                      </div>
                      <span className="font-medium text-slate-800">{med.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">{med.unitsSold.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right font-semibold text-emerald-600">{formatCurrency(med.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer-wise Sales */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Top Customers</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Phone</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Purchases</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {salesData.customerWise.map((customer, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                        {customer.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{customer.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{customer.phone}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{customer.purchases}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(customer.totalSpent)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Inventory Reports Section
  const InventoryReports = () => (
    <div className="space-y-6">
      {/* Inventory Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Medicines', value: inventoryData.summary.totalMedicines, icon: '\u{1F48A}', color: 'bg-emerald-100' },
          { label: 'Stock Value', value: formatCurrency(inventoryData.summary.totalStockValue), icon: '\u{1F4B0}', color: 'bg-blue-100' },
          { label: 'Low Stock Items', value: inventoryData.summary.lowStockCount, icon: '\u26A0\uFE0F', color: 'bg-amber-100' },
          { label: 'Expiring Soon', value: inventoryData.summary.expiringCount, icon: '\u{1F4C5}', color: 'bg-red-100' },
        ].map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
            <div className={`w-10 h-10 ${stat.color} rounded-lg flex items-center justify-center mb-3`}>
              <span className="text-xl">{stat.icon}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Low Stock Alerts */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Low Stock Alerts</h3>
          <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium">
            {inventoryData.lowStock.length} Items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Medicine</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Category</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Current Stock</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Min Stock</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.lowStock.map((item, index) => {
                const ratio = item.currentStock / item.minStock
                return (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                          <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                        </div>
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{item.category}</td>
                    <td className="py-3 px-4 text-center font-semibold text-red-600">{item.currentStock}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{item.minStock}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${ratio <= 0.3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        {ratio <= 0.3 ? 'Critical' : 'Low'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expiring Soon */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Medicines Expiring Soon</h3>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            {inventoryData.expiring.length} Items
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Medicine</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Batch No</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Stock</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Expiry Date</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Days Left</th>
              </tr>
            </thead>
            <tbody>
              {inventoryData.expiring.map((item, index) => {
                const daysLeft = Math.ceil((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                return (
                  <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-slate-800">{item.name}</td>
                    <td className="py-3 px-4 text-slate-600">{item.batch}</td>
                    <td className="py-3 px-4 text-center text-slate-600">{item.stock}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(item.expiryDate)}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${daysLeft <= 7 ? 'bg-red-100 text-red-700' :
                          daysLeft <= 30 ? 'bg-amber-100 text-amber-700' :
                            'bg-green-100 text-green-700'
                        }`}>
                        {daysLeft} days
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category-wise Stock Value */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Category-wise Stock Value</h3>
        <SimpleBarChart
          data={inventoryData.categoryWise.map((cat, index) => {
            const colors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500', 'bg-pink-500', 'bg-amber-500', 'bg-slate-500']
            return { label: `${cat.category} (${cat.count} items)`, value: cat.value, color: colors[index] }
          })}
          maxValue={Math.max(...inventoryData.categoryWise.map(c => c.value))}
        />
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
          <span className="font-medium text-slate-700">Total Stock Value</span>
          <span className="font-bold text-emerald-600">{formatCurrency(inventoryData.summary.totalStockValue)}</span>
        </div>
      </div>
    </div>
  )

  // Financial Reports Section
  const FinancialReports = () => (
    <div className="space-y-6">
      {/* Income & Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Revenue Breakdown</h3>
          <SimpleBarChart
            data={[
              { label: 'Medicine Sales', value: financialData.incomeStatement.revenue.medicineSales, color: 'bg-emerald-500' },
              { label: 'Other Income', value: financialData.incomeStatement.revenue.other, color: 'bg-slate-500' },
            ]}
            maxValue={financialData.incomeStatement.revenue.medicineSales}
          />
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
            <span className="font-medium text-slate-700">Total Revenue</span>
            <span className="font-bold text-green-600">{formatCurrency(financialData.incomeStatement.revenue.total)}</span>
          </div>
        </div>

        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Expense Breakdown</h3>
          <SimpleBarChart
            data={[
              { label: 'Purchases', value: financialData.incomeStatement.expenses.purchases, color: 'bg-red-500' },
              { label: 'Salaries', value: financialData.incomeStatement.expenses.salaries, color: 'bg-pink-500' },
              { label: 'Rent', value: financialData.incomeStatement.expenses.rent, color: 'bg-amber-500' },
              { label: 'Utilities', value: financialData.incomeStatement.expenses.utilities, color: 'bg-yellow-500' },
              { label: 'Other', value: financialData.incomeStatement.expenses.marketing + financialData.incomeStatement.expenses.maintenance + financialData.incomeStatement.expenses.insurance + financialData.incomeStatement.expenses.other, color: 'bg-slate-500' },
            ]}
            maxValue={financialData.incomeStatement.expenses.purchases}
          />
          <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between">
            <span className="font-medium text-slate-700">Total Expenses</span>
            <span className="font-bold text-red-600">{formatCurrency(financialData.incomeStatement.expenses.total)}</span>
          </div>
        </div>
      </div>

      {/* Profit & Loss Summary */}
      <div className="bg-linear-to-r from-emerald-600 to-teal-600 rounded-xl p-6 shadow-lg">
        <h3 className="text-lg font-semibold text-white mb-6">Profit & Loss Summary - March 2026</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Total Revenue</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(financialData.incomeStatement.revenue.total)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Total Expenses</p>
            <p className="text-2xl font-bold text-white">{formatCurrency(financialData.incomeStatement.expenses.total)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Net Profit</p>
            <p className="text-2xl font-bold text-green-300">{formatCurrency(financialData.incomeStatement.netProfit)}</p>
          </div>
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/70 text-sm mb-1">Profit Margin</p>
            <p className="text-2xl font-bold text-green-300">{financialData.incomeStatement.profitMargin}%</p>
          </div>
        </div>
      </div>

      {/* Outstanding Payments */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Outstanding Customer Payments</h3>
          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
            {financialData.outstanding.length} Pending
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Invoice No</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Customer</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Phone</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Due Date</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {financialData.outstanding.map((bill, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-emerald-600">{bill.invoiceNo}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{bill.customer}</td>
                  <td className="py-3 px-4 text-slate-600">{bill.phone}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(bill.amount)}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(bill.dueDate)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bill.days > 0 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                      {bill.days > 0 ? `Due in ${bill.days} days` : `Overdue ${Math.abs(bill.days)} days`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
          <span className="text-slate-600">Total Outstanding</span>
          <span className="text-xl font-bold text-red-600">
            {formatCurrency(financialData.outstanding.reduce((sum, b) => sum + b.amount, 0))}
          </span>
        </div>
      </div>

      {/* Daily Collections */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Collections</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Cash</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Card</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">UPI</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total</th>
              </tr>
            </thead>
            <tbody>
              {financialData.collections.map((collection, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{formatDate(collection.date)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.cash)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.card)}</td>
                  <td className="py-3 px-4 text-right text-slate-600">{formatCurrency(collection.upi)}</td>
                  <td className="py-3 px-4 text-right font-semibold text-green-600">{formatCurrency(collection.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  // Supplier Reports Section
  const SupplierReports = () => (
    <div className="space-y-6">
      {/* Supplier Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
          </div>
          <p className="text-2xl font-bold text-slate-800">{supplierData.suppliers.length}</p>
          <p className="text-xs text-slate-500 mt-1">Active Suppliers</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {supplierData.suppliers.reduce((sum, s) => sum + s.purchases, 0)}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total Purchases</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-2xl font-bold text-slate-800">
            {formatCurrency(supplierData.suppliers.reduce((sum, s) => sum + s.totalAmount, 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total Purchase Value</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-100">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(supplierData.suppliers.reduce((sum, s) => sum + s.paymentDue, 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">Total Payment Due</p>
        </div>
      </div>

      {/* Supplier-wise Purchases */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Supplier-wise Purchases</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Supplier</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Orders</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Total Amount</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Last Purchase</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Payment Due</th>
              </tr>
            </thead>
            <tbody>
              {supplierData.suppliers.map((supplier, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white text-sm font-medium">
                        {supplier.name.charAt(0)}
                      </div>
                      <span className="font-medium text-slate-800">{supplier.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600">{supplier.purchases}</td>
                  <td className="py-3 px-4 text-right text-slate-800">{formatCurrency(supplier.totalAmount)}</td>
                  <td className="py-3 px-4 text-slate-600">{formatDate(supplier.lastPurchase)}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`font-semibold ${supplier.paymentDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {supplier.paymentDue > 0 ? formatCurrency(supplier.paymentDue) : 'Cleared'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50">
                <td className="py-3 px-4 font-semibold text-slate-800">Total</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-800">
                  {supplierData.suppliers.reduce((sum, s) => sum + s.purchases, 0)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-slate-800">
                  {formatCurrency(supplierData.suppliers.reduce((sum, s) => sum + s.totalAmount, 0))}
                </td>
                <td className="py-3 px-4" />
                <td className="py-3 px-4 text-right font-bold text-red-600">
                  {formatCurrency(supplierData.suppliers.reduce((sum, s) => sum + s.paymentDue, 0))}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Recent Purchase Orders */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Purchase Orders</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Supplier</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-600">Invoice</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Items</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-600">Amount</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {supplierData.recentPurchases.map((purchase, index) => (
                <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-600">{formatDate(purchase.date)}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{purchase.supplier}</td>
                  <td className="py-3 px-4 text-emerald-600 font-medium">{purchase.invoice}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{purchase.items}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-800">{formatCurrency(purchase.amount)}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${purchase.status === 'Received' ? 'bg-green-100 text-green-700' :
                        purchase.status === 'Partial' ? 'bg-amber-100 text-amber-700' :
                          'bg-blue-100 text-blue-700'
                      }`}>
                      {purchase.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-slate-500 mt-1">Comprehensive reports and insights for your pharmacy</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => handleExport('pdf')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => handleExport('excel')}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </Button>
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-600">Date Range:</span>
            <Select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              options={[
                { value: 'today', label: 'Today' },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'this-week', label: 'This Week' },
                { value: 'this-month', label: 'This Month' },
                { value: 'this-year', label: 'This Year' },
                { value: 'custom', label: 'Custom Range' },
              ]}
              className="w-40"
            />
          </div>
          {dateRange === 'custom' && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">From:</span>
                <input
                  type="date"
                  value={customDateFrom}
                  onChange={(e) => setCustomDateFrom(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500">To:</span>
                <input
                  type="date"
                  value={customDateTo}
                  onChange={(e) => setCustomDateTo(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Report Section Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100">
        <div className="border-b border-slate-200">
          <div className="flex flex-wrap">
            {[
              { id: 'sales', label: 'Sales Reports', icon: '\u{1F4B0}' },
              { id: 'inventory', label: 'Inventory Reports', icon: '\u{1F4E6}' },
              { id: 'financial', label: 'Financial Reports', icon: '\u{1F4CA}' },
              { id: 'supplier', label: 'Supplier Reports', icon: '\u{1F3ED}' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSection(tab.id as ReportType)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${activeSection === tab.id
                    ? 'text-emerald-600 border-b-2 border-emerald-600'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
                  }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Report Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 animate-spin">
                <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">Loading report...</p>
            </div>
          ) : (
            <>
              {activeSection === 'sales' && <SalesReports />}
              {activeSection === 'inventory' && <InventoryReports />}
              {activeSection === 'financial' && <FinancialReports />}
              {activeSection === 'supplier' && <SupplierReports />}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReportsDashboard
