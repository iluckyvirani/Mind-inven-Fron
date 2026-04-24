import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Select, Input } from '../../components/ui'
import { salesAPI, pharmacyAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

interface Sale {
  id: string
  invoiceNo: string
  customerName: string
  phone: string
  date: string
  items: number
  total: number
  paid: number
  balance: number
  paymentMode: string
  status: string
}

interface EditItem {
  id?: string
  medicineId: string
  name: string
  batchNo: string
  availableQty: number
  quantity: number
  unitPrice: number
  discount: number
  amount: number
}

interface EditSaleData {
  id: string
  invoiceNo: string
  items: EditItem[]
  paymentMode: string
  amountPaid: number
  notes: string
}

const SalesList = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [modeFilter, setModeFilter] = useState('All')
  const [dateFilter, setDateFilter] = useState<'today' | 'week' | 'month' | 'all'>('all')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')

  // Edit modal state
  const [editModal, setEditModal] = useState(false)
  const [editData, setEditData] = useState<EditSaleData | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)

  // Medicine search for edit modal
  const [medSearch, setMedSearch] = useState('')
  const [medResults, setMedResults] = useState<Array<{ id: string; name: string; batchNo: string; stock: number; price: number }>>([])
  const [showMedDropdown, setShowMedDropdown] = useState(false)

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Make Payment modal state
  const [paymentModal, setPaymentModal] = useState(false)
  const [paymentSale, setPaymentSale] = useState<Sale | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // Return modal state
  const [returnModal, setReturnModal] = useState(false)
  const [returnSaleId, setReturnSaleId] = useState<string | null>(null)
  const [returnItems, setReturnItems] = useState<Array<{ medicineId: string; name: string; batchNo: string; soldQty: number; alreadyReturned: number; maxQty: number; quantity: number; unitPrice: number; discount: number }>>([])
  const [returnReason, setReturnReason] = useState('')
  const [returnLoading, setReturnLoading] = useState(false)
  const [returnSubmitting, setReturnSubmitting] = useState(false)
  const [returnSuccess, setReturnSuccess] = useState(false)

  // Export PDF state
  const [exporting, setExporting] = useState(false)

  const handleExportPdf = async () => {
    try {
      setExporting(true)
      const params: Record<string, any> = {}
      if (fromDate) params.dateFrom = fromDate
      if (toDate) params.dateTo = toDate
      if (statusFilter !== 'All') params.status = statusFilter.toUpperCase()
      if (modeFilter !== 'All') params.paymentMode = modeFilter.toUpperCase()
      if (searchTerm) params.search = searchTerm

      const res = await salesAPI.exportPdf(params)
      const blob = new Blob([res.data], { type: 'application/pdf' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Sales_Report_${fromDate || 'all'}_${toDate || 'all'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to export PDF. Make sure there are sales for the selected filters.')
    } finally {
      setExporting(false)
    }
  }

  const fetchSales = useCallback(async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { limit: 100 }
      if (searchTerm) params.search = searchTerm
      if (statusFilter !== 'All') params.status = statusFilter.toUpperCase()
      if (modeFilter !== 'All') params.paymentMode = modeFilter.toUpperCase()
      if (fromDate) params.dateFrom = fromDate
      if (toDate) params.dateTo = toDate

      const res = await salesAPI.getAll(params)
      const data = (res.data.data || []).map((s: any) => ({
        id: s.id,
        invoiceNo: s.invoiceNo,
        customerName: s.customer?.name || 'Walk-in',
        phone: s.customer?.phone || '',
        date: s.date || s.createdAt,
        items: s._count?.items || 0,
        total: s.grandTotal,
        paid: s.amountPaid,
        balance: s.balance,
        paymentMode: (s.paymentMode || '').toLowerCase(),
        status: (s.paymentStatus || '').toLowerCase(),
      }))
      setSales(data)
    } catch (err) {
      console.error('Failed to fetch sales:', err)
    } finally {
      setLoading(false)
    }
  }, [searchTerm, statusFilter, modeFilter, fromDate, toDate])

  useEffect(() => { fetchSales() }, [fetchSales])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger'; label: string }> = {
      paid: { variant: 'success', label: 'Paid' },
      partial: { variant: 'warning', label: 'Partial' },
      pending: { variant: 'danger', label: 'Pending' },
    }
    const s = config[status] || { variant: 'warning' as const, label: status }
    return <Badge variant={s.variant}>{s.label}</Badge>
  }

  // Client-side date filtering for quick buttons
  const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString()
  const isThisWeek = (d: string) => {
    const now = new Date()
    const date = new Date(d)
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    return date >= startOfWeek
  }
  const isThisMonth = (d: string) => {
    const now = new Date()
    const date = new Date(d)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }

  const filteredSales = sales.filter(sale => {
    let matchesDate = true
    if (dateFilter === 'today') matchesDate = isToday(sale.date)
    else if (dateFilter === 'week') matchesDate = isThisWeek(sale.date)
    else if (dateFilter === 'month') matchesDate = isThisMonth(sale.date)
    return matchesDate
  })

  // Daily summary based on filtered data
  const summary = {
    totalSales: filteredSales.reduce((sum, s) => sum + s.total, 0),
    billsCount: filteredSales.length,
    cashTotal: filteredSales.filter(s => s.paymentMode === 'cash').reduce((sum, s) => sum + s.paid, 0),
    cardTotal: filteredSales.filter(s => s.paymentMode === 'card').reduce((sum, s) => sum + s.paid, 0),
    upiTotal: filteredSales.filter(s => s.paymentMode === 'upi').reduce((sum, s) => sum + s.paid, 0),
    pending: filteredSales.reduce((sum, s) => sum + s.balance, 0),
  }

  // Open edit modal — fetch full sale details
  const openEditModal = async (saleId: string) => {
    try {
      setEditLoading(true)
      setEditModal(true)
      const res = await salesAPI.getById(saleId)
      const sale = res.data.data
      setEditData({
        id: sale.id,
        invoiceNo: sale.invoiceNo,
        items: (sale.items || []).map((item: any) => ({
          id: item.id,
          medicineId: item.medicineId || item.medicine?.id,
          name: item.medicine?.name || '',
          batchNo: item.medicine?.batchNo || '',
          availableQty: (item.medicine?.stock || 0) + item.quantity,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
          amount: item.amount,
        })),
        paymentMode: sale.paymentMode || 'CASH',
        amountPaid: sale.amountPaid || 0,
        notes: sale.notes || '',
      })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load sale details')
      setEditModal(false)
    } finally {
      setEditLoading(false)
    }
  }

  // Medicine search for edit modal
  useEffect(() => {
    if (medSearch.length < 2) { setMedResults([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await pharmacyAPI.getMedicines({ search: medSearch, limit: 10 })
        const existing = editData?.items.map(i => i.medicineId) || []
        setMedResults(
          (res.data.data || [])
            .filter((m: any) => !existing.includes(m.id))
            .map((m: any) => ({ id: m.id, name: m.name, batchNo: m.batchNo || '', stock: m.stock, price: m.sellingPrice }))
        )
      } catch { setMedResults([]) }
    }, 300)
    return () => clearTimeout(timer)
  }, [medSearch, editData?.items])

  const addMedicineToEdit = (med: { id: string; name: string; batchNo: string; stock: number; price: number }) => {
    if (!editData) return
    setEditData({
      ...editData,
      items: [...editData.items, {
        medicineId: med.id,
        name: med.name,
        batchNo: med.batchNo,
        availableQty: med.stock,
        quantity: 1,
        unitPrice: med.price,
        discount: 0,
        amount: med.price,
      }],
    })
    setMedSearch('')
    setShowMedDropdown(false)
  }

  const updateEditItem = (index: number, field: keyof EditItem, value: number) => {
    if (!editData) return
    const updated = [...editData.items]
    const item = { ...updated[index], [field]: value }
    const sub = item.quantity * item.unitPrice
    item.amount = sub - (sub * item.discount) / 100
    updated[index] = item
    setEditData({ ...editData, items: updated })
  }

  const removeEditItem = (index: number) => {
    if (!editData) return
    setEditData({ ...editData, items: editData.items.filter((_, i) => i !== index) })
  }

  const editSubtotal = editData?.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0) || 0
  const editTotalDiscount = editData?.items.reduce((sum, i) => {
    const sub = i.quantity * i.unitPrice
    return sum + (sub * i.discount) / 100
  }, 0) || 0
  const editGrandTotal = editSubtotal - editTotalDiscount
  const editBalance = editGrandTotal - (editData?.amountPaid || 0)

  const handleEditSave = async () => {
    if (!editData || editData.items.length === 0) return
    try {
      setEditSubmitting(true)
      await salesAPI.update(editData.id, {
        items: editData.items.map(i => ({
          medicineId: i.medicineId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        paymentMode: editData.paymentMode,
        amountPaid: editData.amountPaid,
        notes: editData.notes,
      })
      setEditModal(false)
      setEditData(null)
      fetchSales()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update sale')
    } finally {
      setEditSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await salesAPI.delete(id)
      setDeleteConfirm(null)
      fetchSales()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete sale')
    }
  }

  const openPaymentModal = (sale: Sale) => {
    setPaymentSale(sale)
    setPaymentAmount(sale.balance.toFixed(2))
    setPaymentMode('CASH')
    setPaymentModal(true)
  }

  const handleMakePayment = async () => {
    if (!paymentSale || !paymentAmount) return
    const amt = parseFloat(paymentAmount)
    if (isNaN(amt) || amt <= 0) return
    try {
      setPaymentSubmitting(true)
      await salesAPI.updatePayment(paymentSale.id, { amount: amt, paymentMode })
      setPaymentModal(false)
      setPaymentSale(null)
      setPaymentAmount('')
      fetchSales()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to record payment')
    } finally {
      setPaymentSubmitting(false)
    }
  }

  // Open return modal — fetch sale details + previous returns
  const openReturnModal = async (saleId: string) => {
    try {
      setReturnLoading(true)
      setReturnModal(true)
      setReturnSaleId(saleId)
      setReturnReason('')
      const [saleRes, returnsRes] = await Promise.all([
        salesAPI.getById(saleId),
        salesAPI.getReturns(saleId),
      ])
      const sale = saleRes.data.data
      const previousReturns = returnsRes.data.data || []

      // Calculate already-returned qty per medicine
      const alreadyReturnedMap: Record<string, number> = {}
      for (const ret of previousReturns) {
        for (const ri of (ret.items || [])) {
          const medId = ri.medicineId || ri.medicine?.id
          alreadyReturnedMap[medId] = (alreadyReturnedMap[medId] || 0) + ri.quantity
        }
      }

      setReturnItems((sale.items || []).map((item: any) => {
        const medId = item.medicineId || item.medicine?.id
        const alreadyReturned = alreadyReturnedMap[medId] || 0
        const remainingQty = item.quantity - alreadyReturned
        return {
          medicineId: medId,
          name: item.medicine?.name || '',
          batchNo: item.medicine?.batchNo || '',
          soldQty: item.quantity,
          alreadyReturned,
          maxQty: Math.max(0, remainingQty),
          quantity: 0,
          unitPrice: item.unitPrice,
          discount: item.discount || 0,
        }
      }).filter((item: any) => item.maxQty > 0))
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load sale details')
      setReturnModal(false)
    } finally {
      setReturnLoading(false)
    }
  }

  const handleReturnSubmit = async () => {
    if (!returnSaleId) return
    const itemsToReturn = returnItems.filter(i => i.quantity > 0)
    if (itemsToReturn.length === 0) {
      alert('Please select at least one item to return')
      return
    }
    try {
      setReturnSubmitting(true)
      await salesAPI.createReturn(returnSaleId, {
        items: itemsToReturn.map(i => ({ medicineId: i.medicineId, quantity: i.quantity })),
        reason: returnReason || undefined,
      })
      setReturnModal(false)
      setReturnSaleId(null)
      setReturnSuccess(true)
      fetchSales()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process return')
    } finally {
      setReturnSubmitting(false)
    }
  }

  const returnTotal = returnItems.reduce((sum, i) => {
    if (i.quantity <= 0) return sum
    const lineTotal = i.quantity * i.unitPrice
    const disc = (lineTotal * i.discount) / 100
    return sum + lineTotal - disc
  }, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sales / Billing</h1>
          <p className="text-slate-500">Manage all sales and invoices</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleExportPdf}
            disabled={exporting}
            variant="outline"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {exporting ? 'Exporting...' : 'Export PDF'}
          </Button>
          <Button onClick={() => navigate('/sales/create')} className='from-emerald-600 to-teal-500'>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Sale
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">Total Sales</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{formatCurrency(summary.totalSales)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">Bills Count</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{summary.billsCount}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">Cash</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(summary.cashTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">Card</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{formatCurrency(summary.cardTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">UPI</p>
          <p className="text-xl font-bold text-purple-600 mt-1">{formatCurrency(summary.upiTotal)}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <p className="text-sm text-slate-500">Pending</p>
          <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(summary.pending)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 space-y-4">
        {/* Quick Date Buttons */}
        <div className="flex flex-wrap gap-2">
          {(['today', 'week', 'month', 'all'] as const).map(range => (
            <button
              key={range}
              onClick={() => { setDateFilter(range); setFromDate(''); setToDate('') }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${dateFilter === range ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
            >
              {range === 'today' ? 'Today' : range === 'week' ? 'This Week' : range === 'month' ? 'This Month' : 'All Time'}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2 relative">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search invoice, customer name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Status' },
              { value: 'paid', label: 'Paid' },
              { value: 'partial', label: 'Partial' },
              { value: 'pending', label: 'Pending' },
            ]}
          />
          <Select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            options={[
              { value: 'All', label: 'All Modes' },
              { value: 'cash', label: 'Cash' },
              { value: 'card', label: 'Card' },
              { value: 'upi', label: 'UPI' },
            ]}
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => { setFromDate(e.target.value); setDateFilter('all') }}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => { setToDate(e.target.value); setDateFilter('all') }}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Sales Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Customer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Balance</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                <tr>
                  <td colSpan={10}>
                    <div className="flex flex-col items-center justify-center py-16">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 animate-spin">
                        <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                      </div>
                      <p className="text-slate-600 font-medium">Loading sales...</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map(sale => (
                  <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-blue-600 cursor-pointer hover:underline" onClick={() => navigate(`/sales/receipt/${sale.id}`)}>
                        {sale.invoiceNo}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-800">{sale.customerName}</p>
                      <p className="text-xs text-slate-500">{sale.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(sale.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{sale.items}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(sale.total)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(sale.paid)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${sale.balance > 0 ? 'text-red-600' : 'text-slate-400'}`}>
                        {formatCurrency(sale.balance)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{sale.paymentMode}</td>
                    <td className="px-4 py-3">{getStatusBadge(sale.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/sales/receipt/${sale.id}`)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Receipt"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {sale.balance > 0 && (
                          <button
                            onClick={() => openPaymentModal(sale)}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Make Payment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        )}
                        <button
                          onClick={() => openReturnModal(sale.id)}
                          className="p-2 text-slate-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                          title="Return Items"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>
                        {isAdmin && (
                        <button
                          onClick={() => openEditModal(sale.id)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Sale"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        )}
                        {isAdmin && (
                        <button
                          onClick={() => setDeleteConfirm(sale.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete Sale"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No sales found</p>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Make Payment Modal */}
      {paymentModal && paymentSale && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Make Payment</h3>
                <p className="text-sm text-slate-500">{paymentSale.invoiceNo} — {paymentSale.customerName}</p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-5 grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-xs text-slate-500 mb-1">Total</p>
                <p className="text-sm font-bold text-slate-800">{formatCurrency(paymentSale.total)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Paid</p>
                <p className="text-sm font-bold text-emerald-600">{formatCurrency(paymentSale.paid)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Balance Due</p>
                <p className="text-sm font-bold text-red-600">{formatCurrency(paymentSale.balance)}</p>
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Amount Paying <span className="text-red-500">*</span></label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={paymentSale.balance}
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                {parseFloat(paymentAmount) > 0 && (
                  <p className="mt-1 text-xs text-slate-500">
                    Remaining after payment: {formatCurrency(Math.max(0, paymentSale.balance - parseFloat(paymentAmount)))}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode</label>
                <Select
                  value={paymentMode}
                  onChange={e => setPaymentMode(e.target.value)}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'CARD', label: 'Card' },
                    { value: 'UPI', label: 'UPI' },
                  ]}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setPaymentModal(false); setPaymentSale(null) }}>Cancel</Button>
              <Button
                onClick={handleMakePayment}
                disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                className="from-emerald-600 to-teal-500"
              >
                {paymentSubmitting ? 'Processing...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Sale</h3>
            <p className="text-slate-600 mb-1">Are you sure you want to delete this sale?</p>
            <p className="text-sm text-red-600 mb-6">This will restore medicine stock and update customer stats. This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="from-red-600 to-red-500" onClick={() => handleDelete(deleteConfirm)}>Delete Sale</Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Modal */}
      {returnModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">Sale Return</h3>
                  <p className="text-sm text-slate-500">Select items and quantities to return. Stock will be restored.</p>
                </div>
              </div>
            </div>

            {returnLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-orange-500" />
              </div>
            ) : (
              <div className="p-6 space-y-4">
                {returnItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Medicine</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Batch</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Sold</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Returned</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Returnable</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Return Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Return Amt</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {returnItems.map((item, idx) => {
                          const lineTotal = item.quantity * item.unitPrice
                          const disc = (lineTotal * item.discount) / 100
                          const amt = lineTotal - disc
                          return (
                            <tr key={item.medicineId} className="hover:bg-slate-50">
                              <td className="px-3 py-2 text-sm font-medium text-slate-800">{item.name}</td>
                              <td className="px-3 py-2 text-sm text-slate-500">{item.batchNo}</td>
                              <td className="px-3 py-2 text-sm text-slate-600">{item.soldQty}</td>
                              <td className="px-3 py-2 text-sm text-orange-600">{item.alreadyReturned > 0 ? item.alreadyReturned : '—'}</td>
                              <td className="px-3 py-2 text-sm font-medium text-slate-800">{item.maxQty}</td>
                              <td className="px-3 py-2">
                                <input
                                  type="number"
                                  min={0}
                                  max={item.maxQty}
                                  value={item.quantity}
                                  onChange={e => {
                                    const val = Math.min(Math.max(0, Number(e.target.value) || 0), item.maxQty)
                                    setReturnItems(prev => prev.map((ri, i) => i === idx ? { ...ri, quantity: val } : ri))
                                  }}
                                  className="w-20 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-sm text-slate-600">{formatCurrency(item.unitPrice)}</td>
                              <td className="px-3 py-2 text-sm font-medium text-orange-600">
                                {item.quantity > 0 ? formatCurrency(amt) : '—'}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10">
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-slate-600 font-medium">All items fully returned</p>
                    <p className="text-sm text-slate-400">No more items available for return on this sale.</p>
                  </div>
                )}

                <div className="bg-orange-50 rounded-xl p-4 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">Total Return Amount</span>
                  <span className="text-lg font-bold text-orange-600">{formatCurrency(returnTotal)}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Return (optional)</label>
                  <textarea
                    value={returnReason}
                    onChange={e => setReturnReason(e.target.value)}
                    rows={2}
                    placeholder="e.g. Expired, Wrong medicine, Customer changed mind..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setReturnModal(false); setReturnSaleId(null) }}>Cancel</Button>
              <Button
                onClick={handleReturnSubmit}
                disabled={returnSubmitting || returnItems.every(i => i.quantity === 0)}
                className="from-emerald-600 to-teal-500"
              >
                {returnSubmitting ? 'Processing...' : 'Process Return'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Return Success Modal */}
      {returnSuccess && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 w-full max-w-sm mx-4 text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Return Processed!</h3>
            <p className="text-slate-500 mb-6">The return has been processed successfully. Stock has been restored and ledger updated.</p>
            <Button
              onClick={() => setReturnSuccess(false)}
              className="from-emerald-600 to-teal-500 w-full"
            >
              Done
            </Button>
          </div>
        </div>
      )}

      {/* Edit Sale Modal */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">
                Edit Sale {editData?.invoiceNo ? `— ${editData.invoiceNo}` : ''}
              </h3>
              <p className="text-sm text-slate-500 mt-1">Modify items, quantities, prices, and payment details. Changes cascade to stock and customer stats.</p>
            </div>

            {editLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
              </div>
            ) : editData && (
              <div className="p-6 space-y-6">
                {/* Add medicine search */}
                <div className="relative">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Add Medicine</label>
                  <input
                    type="text"
                    placeholder="Search medicine to add..."
                    value={medSearch}
                    onChange={e => { setMedSearch(e.target.value); setShowMedDropdown(e.target.value.length > 0) }}
                    onFocus={() => medSearch.length > 0 && setShowMedDropdown(true)}
                    onBlur={() => setTimeout(() => setShowMedDropdown(false), 200)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  {showMedDropdown && medResults.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-48 overflow-y-auto">
                      {medResults.map(med => (
                        <button
                          key={med.id}
                          type="button"
                          className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center justify-between"
                          onMouseDown={() => addMedicineToEdit(med)}
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-800">{med.name}</p>
                            <p className="text-xs text-slate-500">Batch: {med.batchNo} | Stock: {med.stock}</p>
                          </div>
                          <span className="text-sm font-medium text-emerald-600">{formatCurrency(med.price)}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Items table */}
                {editData.items.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Medicine</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Batch</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Price</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Disc %</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                          <th className="px-3 py-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {editData.items.map((item, idx) => (
                          <tr key={item.medicineId + idx} className="hover:bg-slate-50">
                            <td className="px-3 py-2 text-sm text-slate-600">{idx + 1}</td>
                            <td className="px-3 py-2 text-sm font-medium text-slate-800">{item.name}</td>
                            <td className="px-3 py-2 text-sm text-slate-500">{item.batchNo}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={1}
                                max={item.availableQty}
                                value={item.quantity}
                                onChange={e => updateEditItem(idx, 'quantity', Math.min(Number(e.target.value) || 1, item.availableQty))}
                                className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                value={item.unitPrice}
                                onChange={e => updateEditItem(idx, 'unitPrice', Number(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                value={item.discount}
                                onChange={e => updateEditItem(idx, 'discount', Math.min(Number(e.target.value) || 0, 100))}
                                className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                            <td className="px-3 py-2">
                              <button
                                type="button"
                                onClick={() => removeEditItem(idx)}
                                className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Totals & Payment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Select
                      label="Payment Mode"
                      value={editData.paymentMode}
                      onChange={e => setEditData({ ...editData, paymentMode: e.target.value })}
                      options={[
                        { value: 'CASH', label: 'Cash' },
                        { value: 'CARD', label: 'Card' },
                        { value: 'UPI', label: 'UPI' },
                      ]}
                    />
                    <Input
                      label="Amount Paid"
                      type="number"
                      min={0}
                      value={editData.amountPaid}
                      onChange={e => setEditData({ ...editData, amountPaid: Number(e.target.value) || 0 })}
                    />
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
                      <textarea
                        value={editData.notes}
                        onChange={e => setEditData({ ...editData, notes: e.target.value })}
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Subtotal</span>
                      <span>{formatCurrency(editSubtotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Discount</span>
                      <span className="text-red-600">-{formatCurrency(editTotalDiscount)}</span>
                    </div>
                    <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-800">
                      <span>Grand Total</span>
                      <span>{formatCurrency(editGrandTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-600">
                      <span>Paid</span>
                      <span className="text-emerald-600">{formatCurrency(editData.amountPaid)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span>Balance</span>
                      <span className={editBalance > 0 ? 'text-red-600' : 'text-slate-400'}>{formatCurrency(Math.max(0, editBalance))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <Button variant="outline" onClick={() => { setEditModal(false); setEditData(null) }}>Cancel</Button>
              <Button
                onClick={handleEditSave}
                disabled={editSubmitting || !editData || editData.items.length === 0}
                className="from-emerald-600 to-teal-500"
              >
                {editSubmitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesList
