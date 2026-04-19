import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Input, Select } from '../../components/ui'
import { customerAPI, salesAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

interface Customer {
  id: string
  name: string
  phone: string
  age: number
  address: string
  email: string
  bankName: string
  accountNo: string
  gstNo: string
  lastPurchaseDate: string
  totalPurchases: number
  totalSpent: number
  totalPaid: number
  pendingAmount: number
  lastPurchase: string
}

interface LedgerEntry {
  id: string
  date: string
  type: 'sale' | 'payment' | 'return'
  description: string
  debit: number
  credit: number
  balance: number
}

const CustomerList = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'totalSpent' | 'lastPurchase'>('lastPurchase')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [activeTab, setActiveTab] = useState<'customers' | 'ledger'>('customers')

  // Add customer modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', phone: '', age: '', address: '', email: '', bankName: '', accountNo: '', gstNo: '' })
  const [submitting, setSubmitting] = useState(false)

  // Edit modal state
  const [editModal, setEditModal] = useState<{ open: boolean; customer: Customer | null }>({ open: false, customer: null })
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', bankName: '', accountNo: '', gstNo: '' })

  // Delete confirm state
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // Ledger state
  const [ledgerCustomer, setLedgerCustomer] = useState<string>('')
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params: Record<string, any> = { limit: 100 }
      if (searchTerm) params.search = searchTerm
      const res = await customerAPI.getAll(params)
      const data = (res.data.data || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        age: c.age || 0,
        address: c.address || '',
        email: c.email || '',
        bankName: c.bankName || '',
        accountNo: c.accountNo || '',
        gstNo: c.gstNo || '',
        lastPurchaseDate: c.lastPurchaseDate || '',
        totalPurchases: c.totalPurchases || 0,
        totalSpent: c.totalSpent || 0,
        totalPaid: c.totalPaid || c.totalSpent || 0,
        pendingAmount: c.pendingAmount || 0,
        lastPurchase: c.lastPurchase || c.updatedAt || c.createdAt || '',
      }))
      setCustomers(data)
    } catch (err) {
      console.error('Failed to fetch customers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCustomers() }, [searchTerm])

  // Stats
  const totalCustomers = customers.length
  const totalSpentAll = customers.reduce((sum, c) => sum + c.totalSpent, 0)
  const totalPurchasesAll = customers.reduce((sum, c) => sum + c.totalPurchases, 0)
  const totalPendingAll = customers.reduce((sum, c) => sum + c.pendingAmount, 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  const filtered = customers
    .sort((a, b) => {
      let cmp = 0
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name)
      else if (sortBy === 'totalSpent') cmp = a.totalSpent - b.totalSpent
      else cmp = new Date(a.lastPurchase).getTime() - new Date(b.lastPurchase).getTime()
      return sortOrder === 'desc' ? -cmp : cmp
    })

  const toggleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ field }: { field: typeof sortBy }) => (
    <svg className={`w-3 h-3 inline ml-1 ${sortBy === field ? 'text-emerald-600' : 'text-slate-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {sortBy === field && sortOrder === 'asc'
        ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      }
    </svg>
  )

  const openEditModal = (customer: Customer) => {
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || '',
      bankName: customer.bankName || '',
      accountNo: customer.accountNo || '',
      gstNo: customer.gstNo || '',
    })
    setEditModal({ open: true, customer })
  }

  const handleEditSave = async () => {
    if (!editModal.customer) return
    try {
      await customerAPI.update(editModal.customer.id, editForm)
      setCustomers(prev => prev.map(c => c.id === editModal.customer!.id ? { ...c, ...editForm } : c))
      setEditModal({ open: false, customer: null })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update customer')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await customerAPI.delete(id)
      setCustomers(prev => prev.filter(c => c.id !== id))
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete customer')
    }
  }

  const handleAddCustomer = async () => {
    if (!addForm.name || !addForm.phone) return
    try {
      setSubmitting(true)
      await customerAPI.create({
        name: addForm.name,
        phone: addForm.phone,
        age: addForm.age ? parseInt(addForm.age) : undefined,
        address: addForm.address || undefined,
        email: addForm.email || undefined,
        bankName: addForm.bankName || undefined,
        accountNo: addForm.accountNo || undefined,
        gstNo: addForm.gstNo || undefined,
      })
      setShowAddModal(false)
      setAddForm({ name: '', phone: '', age: '', address: '', email: '', bankName: '', accountNo: '', gstNo: '' })
      fetchCustomers()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add customer')
    } finally {
      setSubmitting(false)
    }
  }

  const fetchLedger = async (customerId: string) => {
    try {
      setLedgerLoading(true)
      const purchRes = await customerAPI.getPurchaseHistory(customerId, { limit: 200 })
      const purchData = purchRes.data.data ?? purchRes.data
      const sales = Array.isArray(purchData) ? purchData : (purchData.sales || [])

      const entries: LedgerEntry[] = []

      // Sales (debit — amount owed by customer)
      for (const s of sales) {
        entries.push({
          id: `sale-${s.id}`,
          date: s.date || s.createdAt,
          type: 'sale',
          description: `Invoice ${s.invoiceNo} — ${(s.items || []).length} item(s)`,
          debit: s.grandTotal || 0,
          credit: 0,
          balance: 0,
        })

        // Payment received for this sale
        if (s.amountPaid > 0) {
          entries.push({
            id: `pay-${s.id}`,
            date: s.date || s.createdAt,
            type: 'payment',
            description: `Payment for ${s.invoiceNo} via ${(s.paymentMode || '').toUpperCase()}`,
            debit: 0,
            credit: s.amountPaid,
            balance: 0,
          })
        }

        // Fetch returns for this sale
        try {
          const retRes = await salesAPI.getReturns(s.id)
          const returns = retRes.data?.data || retRes.data || []
          ;(Array.isArray(returns) ? returns : []).forEach((r: any) => {
            const itemNames = (r.items || []).map((i: any) => `${i.medicine?.name || 'Medicine'} x${i.quantity}`).join(', ')
            entries.push({
              id: `ret-${r.id}`,
              date: r.date || r.createdAt,
              type: 'return',
              description: `Return ${r.returnNo}${itemNames ? ` — ${itemNames}` : ''}${r.reason ? ` (${r.reason})` : ''}`,
              debit: 0,
              credit: r.totalAmount,
              balance: 0,
            })
          })
        } catch { /* no returns */ }
      }

      // Sort by date and calculate running balance
      entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      let runningBalance = 0
      entries.forEach(entry => {
        runningBalance += entry.debit - entry.credit
        entry.balance = runningBalance
      })

      setLedgerEntries(entries)
    } catch (err) {
      console.error('Failed to fetch ledger:', err)
    } finally {
      setLedgerLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customers</h1>
          <p className="text-slate-500">Manage customers, view purchase history and ledger</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalCustomers}</p>
              <p className="text-sm text-slate-500">Total Customers</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{totalPurchasesAll}</p>
              <p className="text-sm text-slate-500">Total Bills</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-emerald-700">{formatCurrency(totalSpentAll)}</p>
              <p className="text-sm text-slate-500">Total Revenue</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalPendingAll)}</p>
              <p className="text-sm text-slate-500">Pending Amount</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('customers')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'customers'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Customers
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'ledger'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Customer Ledger
        </button>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or phone number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Badge variant="info">{filtered.length} customer{filtered.length !== 1 ? 's' : ''}</Badge>
        </div>
      </div>

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:text-emerald-600"
                    onClick={() => toggleSort('name')}
                  >
                    Name <SortIcon field="name" />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Purchases</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:text-emerald-600"
                    onClick={() => toggleSort('totalSpent')}
                  >
                    Total Spent <SortIcon field="totalSpent" />
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase cursor-pointer hover:text-emerald-600"
                    onClick={() => toggleSort('lastPurchase')}
                  >
                    Last Purchase <SortIcon field="lastPurchase" />
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((customer, idx) => (
                  <tr key={customer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/customers/${customer.id}`)}
                      >
                        {customer.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{customer.phone}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{customer.totalPurchases} bills</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(customer.totalSpent)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDate(customer.lastPurchase)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/customers/${customer.id}`)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {isAdmin && (
                        <button
                          onClick={() => openEditModal(customer)}
                          className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        )}
                        {isAdmin && (
                        <button
                          onClick={() => setDeleteConfirm(customer.id)}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
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
            </table>
          </div>

          {filtered.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No customers found</p>
              <p className="text-slate-400 text-sm">Try a different search term or add a new customer</p>
            </div>
          )}
        </div>
      )}

      {/* Customer Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Customer</label>
            <Select
              value={ledgerCustomer}
              onChange={(e) => {
                setLedgerCustomer(e.target.value)
                if (e.target.value) fetchLedger(e.target.value)
                else setLedgerEntries([])
              }}
              options={[
                { value: '', label: 'Choose a customer...' },
                ...customers.map(c => ({ value: c.id, label: `${c.name} (${c.phone})` }))
              ]}
            />
          </div>

          {!ledgerCustomer && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">Select a customer to view ledger</p>
              <p className="text-slate-400 text-sm">The ledger shows all sales (debits) and payments (credits)</p>
            </div>
          )}

          {ledgerLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500" />
            </div>
          )}

          {ledgerCustomer && !ledgerLoading && (
            <>
              {/* Ledger Summary */}
              {ledgerEntries.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600">Total Sales (Debit)</p>
                    <p className="text-xl font-bold text-purple-700">
                      {formatCurrency(ledgerEntries.reduce((sum, e) => sum + e.debit, 0))}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-sm text-emerald-600">Total Received (Credit)</p>
                    <p className="text-xl font-bold text-emerald-700">
                      {formatCurrency(ledgerEntries.reduce((sum, e) => sum + e.credit, 0))}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-sm text-red-600">Outstanding Balance</p>
                    <p className="text-xl font-bold text-red-700">
                      {formatCurrency(ledgerEntries.length > 0 ? ledgerEntries[ledgerEntries.length - 1].balance : 0)}
                    </p>
                  </div>
                </div>
              )}

              {/* Ledger Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Description</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Debit (Sale)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Credit (Payment/Return)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">{formatDate(entry.date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${entry.type === 'sale' ? 'bg-purple-500' : entry.type === 'return' ? 'bg-orange-500' : 'bg-emerald-500'}`} />
                            <span className="text-sm text-slate-800">{entry.description}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-purple-700">
                          {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-medium text-emerald-700">
                          {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                        </td>
                        <td className={`px-4 py-3 text-right text-sm font-bold ${entry.balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                          {formatCurrency(entry.balance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {ledgerEntries.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-slate-600 font-medium">No ledger entries found</p>
                  <p className="text-slate-400 text-sm">Create sales for this customer to see ledger entries</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">Add New Customer</h2>
                    <p className="text-sm text-slate-500">Fill in the customer details below</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              {/* Personal Information */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Personal Information
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Customer Name *</label>
                    <Input
                      placeholder="Enter customer name"
                      value={addForm.name}
                      onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                    <Input
                      placeholder="Enter 10-digit phone number"
                      value={addForm.phone}
                      onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Age</label>
                    <Input
                      type="number"
                      placeholder="e.g. 35"
                      value={addForm.age}
                      onChange={(e) => setAddForm(f => ({ ...f, age: e.target.value.replace(/\D/g, '').slice(0, 3) }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                    <Input
                      type="email"
                      placeholder="Enter email address"
                      value={addForm.email}
                      onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                    <Input
                      placeholder="Enter full address"
                      value={addForm.address}
                      onChange={(e) => setAddForm(f => ({ ...f, address: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Bank & Tax Details */}
              <div>
                <h3 className="text-sm font-semibold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                  Bank &amp; Tax Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                    <Input
                      placeholder="Enter bank name"
                      value={addForm.bankName}
                      onChange={(e) => setAddForm(f => ({ ...f, bankName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Account No</label>
                    <Input
                      placeholder="Enter account number"
                      value={addForm.accountNo}
                      onChange={(e) => setAddForm(f => ({ ...f, accountNo: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">GST No</label>
                    <Input
                      placeholder="Enter GST number"
                      value={addForm.gstNo}
                      onChange={(e) => setAddForm(f => ({ ...f, gstNo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddCustomer} disabled={submitting || !addForm.name || !addForm.phone}>
                {submitting ? 'Adding...' : 'Add Customer'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Edit Customer</h3>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={e => setEditForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bank Name</label>
                <input
                  type="text"
                  value={editForm.bankName}
                  onChange={e => setEditForm(f => ({ ...f, bankName: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Enter bank name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Account No</label>
                <input
                  type="text"
                  value={editForm.accountNo}
                  onChange={e => setEditForm(f => ({ ...f, accountNo: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Enter account number"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">GST No</label>
                <input
                  type="text"
                  value={editForm.gstNo}
                  onChange={e => setEditForm(f => ({ ...f, gstNo: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="Enter GST number"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <Button variant="outline" onClick={() => setEditModal({ open: false, customer: null })}>
                Cancel
              </Button>
              <Button onClick={handleEditSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Delete Customer</h3>
                <p className="text-sm text-slate-500">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              Are you sure you want to delete this customer?
            </p>
            <p className="text-sm text-red-600 mb-6">
              Customers with sales history cannot be deleted.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={() => handleDelete(deleteConfirm)}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
      </>
      )}
    </div>
  )
}

export default CustomerList
