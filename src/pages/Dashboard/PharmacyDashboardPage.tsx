import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { StatCard } from '../../components/dashboard'
import { Button, Badge } from '../../components/ui'
import { pharmacyDashboardAPI } from '../../api/endpoints'

interface DashboardStats {
  todaySales: number
  totalMedicines: number
  lowStockAlerts: number
  expiringSoon: number
  monthlyRevenue: number
  pendingPayments: number
}

interface RecentSale {
  id: string
  invoiceNo: string
  customerName: string
  phone: string
  total: number
  paymentMode: string
  status: string
  time: string
}

interface LowStockItem {
  id: string
  name: string
  quantity: number
  minStock: number
  category: string
}

interface ExpiryAlert {
  id: string
  name: string
  batchNo: string
  expiryDate: string
  quantity: number
}

interface ChartPoint {
  day: string
  amount: number
}

const PharmacyDashboardPage = () => {
  const navigate = useNavigate()
  const [revenueRange, setRevenueRange] = useState<'7days' | '30days'>('7days')
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState<DashboardStats>({ todaySales: 0, totalMedicines: 0, lowStockAlerts: 0, expiringSoon: 0, monthlyRevenue: 0, pendingPayments: 0 })
  const [recentSales, setRecentSales] = useState<RecentSale[]>([])
  const [lowStock, setLowStock] = useState<LowStockItem[]>([])
  const [expiryAlerts, setExpiryAlerts] = useState<ExpiryAlert[]>([])
  const [chartData, setChartData] = useState<ChartPoint[]>([])

  // Fetch all dashboard data
  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true)
        const [statsRes, salesRes, lowStockRes, expiryRes] = await Promise.all([
          pharmacyDashboardAPI.getStats(),
          pharmacyDashboardAPI.getRecentSales(),
          pharmacyDashboardAPI.getLowStockAlerts(),
          pharmacyDashboardAPI.getExpiryAlerts(),
        ])

        // Map stats
        const s = statsRes.data.data
        setStats({
          todaySales: s.todaySales || 0,
          totalMedicines: s.totalMedicines || 0,
          lowStockAlerts: s.lowStockCount || 0,
          expiringSoon: s.expiringSoonCount || 0,
          monthlyRevenue: s.monthlyRevenue || 0,
          pendingPayments: s.pendingPayments || 0,
        })

        // Map recent sales — flatten customer + lowercase enums
        const sales = (salesRes.data.data || []).map((sale: any) => ({
          id: sale.id,
          invoiceNo: sale.invoiceNo,
          customerName: sale.customer?.name || 'Walk-in',
          phone: sale.customer?.phone || '',
          total: sale.grandTotal,
          paymentMode: sale.paymentMode?.toLowerCase(),
          status: sale.paymentStatus?.toLowerCase(),
          time: new Date(sale.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }),
        }))
        setRecentSales(sales)

        // Map low stock — flatten category
        const low = (lowStockRes.data.data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          quantity: m.stock,
          minStock: m.minStock,
          category: m.category?.name || '',
        }))
        setLowStock(low)

        // Map expiry alerts
        const expiry = (expiryRes.data.data || []).map((m: any) => ({
          id: m.id,
          name: m.name,
          batchNo: m.batchNo,
          expiryDate: m.expiryDate,
          quantity: m.stock,
        }))
        setExpiryAlerts(expiry)
      } catch (err) {
        console.error('Dashboard fetch error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  // Fetch revenue chart when range changes
  useEffect(() => {
    const fetchChart = async () => {
      try {
        const period = revenueRange === '7days' ? 7 : 30
        const res = await pharmacyDashboardAPI.getRevenueChart({ period })
        const data = res.data.data || []

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
        const mapped: ChartPoint[] = data.map((d: any) => {
          const dateObj = new Date(d.date + 'T00:00:00')
          let day: string
          if (period <= 7) {
            day = dayNames[dateObj.getDay()]
          } else {
            day = `${dateObj.getDate()}/${dateObj.getMonth() + 1}`
          }
          return { day, amount: d.total || 0 }
        })
        setChartData(mapped)
      } catch (err) {
        console.error('Chart fetch error:', err)
      }
    }
    fetchChart()
  }, [revenueRange])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
      paid: { variant: 'success', label: 'Paid' },
      partial: { variant: 'warning', label: 'Partial' },
      pending: { variant: 'danger', label: 'Pending' },
    }
    const s = config[status] || { variant: 'warning' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const maxAmount = Math.max(...chartData.map(d => d.amount), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-slate-500">Welcome back! Here's your pharmacy overview.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/reports')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Reports
          </Button>
          <Button onClick={() => navigate('/sales/create')} className='from-emerald-600 to-teal-500'>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Sale
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard
          title="Today's Sales"
          value={formatCurrency(stats.todaySales)}
          change="+12% from yesterday"
          changeType="increase"
          color="bg-emerald-100"
          icon={<svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Total Medicines"
          value={stats.totalMedicines}
          change="8 added this week"
          changeType="neutral"
          color="bg-blue-100"
          icon={<svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>}
        />
        <StatCard
          title="Low Stock"
          value={stats.lowStockAlerts}
          change="3 critical"
          changeType="decrease"
          color="bg-amber-100"
          icon={<svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          title="Expiring Soon"
          value={stats.expiringSoon}
          change="Within 30 days"
          changeType="decrease"
          color="bg-red-100"
          icon={<svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          title="Monthly Revenue"
          value={formatCurrency(stats.monthlyRevenue)}
          change="+8% from last month"
          changeType="increase"
          color="bg-purple-100"
          icon={<svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
        <StatCard
          title="Pending Payments"
          value={formatCurrency(stats.pendingPayments)}
          change="2 bills unpaid"
          changeType="decrease"
          color="bg-orange-100"
          icon={<svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => navigate('/sales/create')}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800">New Sale</p>
            <p className="text-sm text-slate-500">Create a new bill</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/inventory/add-medicine')}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800">Add Medicine</p>
            <p className="text-sm text-slate-500">Add to inventory</p>
          </div>
        </button>
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-purple-200 transition-all group"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-slate-800">View Reports</p>
            <p className="text-sm text-slate-500">Sales & inventory reports</p>
          </div>
        </button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales — 2 cols */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Recent Sales</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/sales')}>View All</Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mode</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/sales/receipt/${sale.id}`)}>
                    <td className="px-4 py-3 text-sm font-medium text-blue-600">{sale.invoiceNo}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{sale.customerName}</p>
                      <p className="text-xs text-slate-500">{sale.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{sale.paymentMode}</td>
                    <td className="px-4 py-3">{getStatusBadge(sale.status)}</td>
                    <td className="px-4 py-3 text-sm text-slate-500">{sale.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Low Stock Alerts — 1 col */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Low Stock Alerts</h2>
            <Badge variant="danger">{lowStock.length}</Badge>
          </div>
          <div className="p-4 space-y-3">
            {lowStock.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-amber-50 transition-colors cursor-pointer"
                onClick={() => navigate('/inventory')}
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.category}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${item.quantity === 0 ? 'text-red-600' : 'text-amber-600'}`}>
                    {item.quantity === 0 ? 'Out of Stock' : `${item.quantity} left`}
                  </p>
                  <p className="text-xs text-slate-400">Min: {item.minStock}</p>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full mt-2" onClick={() => navigate('/inventory')}>
              View All Inventory
            </Button>
          </div>
        </div>
      </div>

      {/* Second Row: Revenue Chart + Expiry Alerts + Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Revenue Overview</h2>
            <div className="flex bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setRevenueRange('7days')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${revenueRange === '7days' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => setRevenueRange('30days')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${revenueRange === '30days' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                30 Days
              </button>
            </div>
          </div>
          <div className="p-5">
            <div className="flex items-end justify-between gap-2 h-48">
              {chartData.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs text-slate-500">{formatCurrency(d.amount)}</span>
                  <div className="w-full bg-slate-100 rounded-t-lg relative" style={{ height: '100%' }}>
                    <div
                      className="absolute bottom-0 w-full bg-linear-to-t from-emerald-500 to-teal-400 rounded-t-lg transition-all duration-500"
                      style={{ height: `${(d.amount / maxAmount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-600">{d.day}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Expiry Alerts */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">Expiry Alerts</h2>
            <Badge variant="warning">{expiryAlerts.length}</Badge>
          </div>
          <div className="p-4 space-y-3">
            {expiryAlerts.map(item => (
              <div key={item.id} className="p-3 bg-red-50 rounded-xl border border-red-100">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-800">{item.name}</p>
                  <span className="text-xs font-medium text-red-600">{item.quantity} units</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <p className="text-xs text-slate-500">Batch: {item.batchNo}</p>
                  <p className="text-xs text-red-600 font-medium">Exp: {formatDate(item.expiryDate)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Selling Medicines */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-lg font-semibold text-slate-800">Top Selling Medicines (This Month)</h2>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <p className="text-sm text-slate-500 col-span-5 text-center py-4">Top selling data will be available soon.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PharmacyDashboardPage
