import { useState, useEffect, useCallback } from 'react'
import { salesAPI, pharmacyAPI } from '../../api/endpoints'

type TabType = 'sale' | 'supplier'

interface SaleReturnRow {
  id: string
  returnNo: string
  invoiceNo: string
  customerName: string
  customerPhone: string
  itemsCount: number
  totalAmount: number
  reason: string | null
  date: string
}

interface SupplierReturnRow {
  id: string
  returnNo: string
  supplierName: string
  supplierPhone: string
  itemsCount: number
  totalAmount: number
  reason: string | null
  date: string
}

const ReturnsPage = () => {
  const [tab, setTab] = useState<TabType>('sale')
  const [saleReturns, setSaleReturns] = useState<SaleReturnRow[]>([])
  const [supplierReturns, setSupplierReturns] = useState<SupplierReturnRow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const fetchSaleReturns = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { limit: 100 }
      if (searchTerm) params.search = searchTerm
      if (fromDate) params.dateFrom = fromDate
      if (toDate) params.dateTo = toDate
      const res = await salesAPI.getAllReturns(params)
      const data = (res.data.data || []).map((r: any) => ({
        id: r.id,
        returnNo: r.returnNo,
        invoiceNo: r.sale?.invoiceNo || '',
        customerName: r.customer?.name || 'Walk-in',
        customerPhone: r.customer?.phone || '',
        itemsCount: r._count?.items || 0,
        totalAmount: r.totalAmount,
        reason: r.reason,
        date: r.date || r.createdAt,
      }))
      setSaleReturns(data)
    } catch (err) {
      console.error('Failed to fetch sale returns:', err)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, fromDate, toDate])

  const fetchSupplierReturns = useCallback(async () => {
    try {
      setLoading(true)
      const res = await pharmacyAPI.getSuppliers({ limit: 100 })
      const suppliers = res.data.data || []
      const allReturns: SupplierReturnRow[] = []
      await Promise.all(suppliers.map(async (s: any) => {
        try {
          const retRes = await pharmacyAPI.getSupplierReturns(s.id)
          const returns = retRes.data.data || []
          for (const r of returns) {
            allReturns.push({
              id: r.id,
              returnNo: r.returnNo,
              supplierName: s.name,
              supplierPhone: s.phone || '',
              itemsCount: (r.items || []).length,
              totalAmount: r.totalAmount,
              reason: r.reason,
              date: r.date || r.createdAt,
            })
          }
        } catch { /* skip */ }
      }))
      allReturns.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      setSupplierReturns(allReturns)
    } catch (err) {
      console.error('Failed to fetch supplier returns:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'sale') fetchSaleReturns()
    else fetchSupplierReturns()
  }, [tab, fetchSaleReturns, fetchSupplierReturns])

  // Filter supplier returns client-side
  const filteredSupplierReturns = supplierReturns.filter(r => {
    if (searchTerm) {
      const q = searchTerm.toLowerCase()
      if (!r.returnNo.toLowerCase().includes(q) && !r.supplierName.toLowerCase().includes(q)) return false
    }
    if (fromDate && new Date(r.date) < new Date(fromDate)) return false
    if (toDate) {
      const end = new Date(toDate)
      end.setHours(23, 59, 59, 999)
      if (new Date(r.date) > end) return false
    }
    return true
  })

  const totalSaleReturnAmount = saleReturns.reduce((s, r) => s + r.totalAmount, 0)
  const totalSupplierReturnAmount = (tab === 'supplier' ? filteredSupplierReturns : supplierReturns).reduce((s, r) => s + r.totalAmount, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Returns</h1>
        <p className="text-slate-500">View all medicine returns — customer sale returns and supplier returns</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setTab('sale')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'sale' ? 'bg-orange-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Customer Returns
        </button>
        <button
          onClick={() => setTab('supplier')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${tab === 'supplier' ? 'bg-purple-500 text-white shadow-sm' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
        >
          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
          Supplier Returns
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">{tab === 'sale' ? 'Total Sale Returns' : 'Total Supplier Returns'}</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{tab === 'sale' ? saleReturns.length : filteredSupplierReturns.length}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">{tab === 'sale' ? 'Total Return Amount' : 'Total Return Amount'}</p>
          <p className="text-xl font-bold text-orange-600 mt-1">{formatCurrency(tab === 'sale' ? totalSaleReturnAmount : totalSupplierReturnAmount)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={tab === 'sale' ? 'Search return #, invoice, customer...' : 'Search return #, supplier...'}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
            />
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
          />
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            className="px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 text-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          {tab === 'sale' ? (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Return #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invoice #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reason</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={7}>
                      <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-slate-100">
                  {saleReturns.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-400">No sale returns found</td>
                    </tr>
                  ) : saleReturns.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-orange-600">{r.returnNo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-blue-600 font-medium">{r.invoiceNo}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{r.customerName}</p>
                        <p className="text-xs text-slate-500">{r.customerPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(r.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.itemsCount}</td>
                      <td className="px-4 py-3 text-sm font-medium text-orange-600">{formatCurrency(r.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          ) : (
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Return #</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Items</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Reason</th>
                </tr>
              </thead>
              {loading ? (
                <tbody>
                  <tr>
                    <td colSpan={6}>
                      <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-purple-500" />
                      </div>
                    </td>
                  </tr>
                </tbody>
              ) : (
                <tbody className="divide-y divide-slate-100">
                  {filteredSupplierReturns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-400">No supplier returns found</td>
                    </tr>
                  ) : filteredSupplierReturns.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-purple-600">{r.returnNo}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-slate-800">{r.supplierName}</p>
                        <p className="text-xs text-slate-500">{r.supplierPhone}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(r.date)}</td>
                      <td className="px-4 py-3 text-sm text-slate-600">{r.itemsCount}</td>
                      <td className="px-4 py-3 text-sm font-medium text-purple-600">{formatCurrency(r.totalAmount)}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 max-w-[200px] truncate">{r.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

export default ReturnsPage
