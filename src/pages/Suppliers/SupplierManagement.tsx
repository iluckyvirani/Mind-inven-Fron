import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Input, Select } from '../../components/ui'
import { pharmacyAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

interface Supplier {
  id: string
  supplierCode: string
  name: string
  contactPerson: string
  phone: string
  email: string
  address: string
  gstNo: string
  panNo: string
  bankName: string
  accountNo: string
  ifscCode: string
  totalPurchases: number
  totalPaid: number
  pendingAmount: number
  lastPurchaseDate: string
  status: string
  createdAt: string
}

interface LedgerEntry {
  id: string
  date: string
  type: 'purchase' | 'payment'
  description: string
  debit: number
  credit: number
  balance: number
}

const SupplierManagement = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [paymentNote, setPaymentNote] = useState('')
  const [activeTab, setActiveTab] = useState<'suppliers' | 'ledger'>('suppliers')
  const [submitting, setSubmitting] = useState(false)
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([])
  const [ledgerLoading, setLedgerLoading] = useState(false)
  const [ledgerSupplier, setLedgerSupplier] = useState<string>('')
  const [addForm, setAddForm] = useState({
    name: '', contactPerson: '', phone: '', email: '',
    address: '', gstNo: '', panNo: '', bankName: '',
    accountNo: '', ifscCode: '', status: 'ACTIVE',
  })
  const [editForm, setEditForm] = useState({
    name: '', contactPerson: '', phone: '', email: '',
    address: '', gstNo: '', panNo: '', bankName: '',
    accountNo: '', ifscCode: '', status: 'ACTIVE',
  })

  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const res = await pharmacyAPI.getSuppliers({ limit: 100 })
      const data = res.data?.data || res.data || []
      const mapped = (Array.isArray(data) ? data : []).map((s: any) => ({
        id: s.id,
        supplierCode: s.supplierCode || '',
        name: s.name || '',
        contactPerson: s.contactPerson || '',
        phone: s.phone || '',
        email: s.email || '',
        address: s.address || '',
        gstNo: s.gstNo || '',
        panNo: s.panNo || '',
        bankName: s.bankName || '',
        accountNo: s.accountNo || '',
        ifscCode: s.ifscCode || '',
        totalPurchases: s.totalPurchase || 0,
        totalPaid: s.totalPaid || 0,
        pendingAmount: s.balance ?? (s.totalPurchase || 0) - (s.totalPaid || 0),
        lastPurchaseDate: s.lastPurchaseDate || '',
        status: (s.status || 'active').toLowerCase(),
        createdAt: s.createdAt || '',
      }))
      setSuppliers(mapped)
    } catch (err) {
      console.error('Failed to fetch suppliers:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchSuppliers() }, [])

  // Stats
  const totalSuppliers = suppliers.filter(s => s.status === 'active').length
  const totalPurchases = suppliers.reduce((sum, s) => sum + s.totalPurchases, 0)
  const totalPaid = suppliers.reduce((sum, s) => sum + s.totalPaid, 0)
  const totalPending = suppliers.reduce((sum, s) => sum + s.pendingAmount, 0)

  // Filter suppliers
  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.supplierCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone.includes(searchTerm)
    
    const matchesStatus = !statusFilter || supplier.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'danger' | 'warning'; label: string }> = {
      'active': { variant: 'success', label: 'Active' },
      'inactive': { variant: 'danger', label: 'Inactive' },
      'paid': { variant: 'success', label: 'Paid' },
      'partial': { variant: 'warning', label: 'Partial' },
      'pending': { variant: 'danger', label: 'Pending' },
    }
    const statusInfo = config[status] || { variant: 'warning' as const, label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleMakePayment = async () => {
    if (!selectedSupplier || !paymentAmount) return
    try {
      setSubmitting(true)
      await pharmacyAPI.addSupplierPayment(selectedSupplier.id, {
        amount: Number(paymentAmount),
        paymentMode: paymentMode,
        note: paymentNote || null,
      })
      alert(`Payment of ${formatCurrency(Number(paymentAmount))} recorded for ${selectedSupplier.name}`)
      setShowPaymentModal(false)
      setPaymentAmount('')
      setPaymentNote('')
      setPaymentMode('CASH')
      setSelectedSupplier(null)
      fetchSuppliers()
    } catch (err) {
      console.error('Payment failed:', err)
      alert('Failed to record payment')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAddSupplier = async () => {
    if (!addForm.name || !addForm.contactPerson || !addForm.phone) return
    try {
      setSubmitting(true)
      await pharmacyAPI.addSupplier({
        ...addForm,
        status: addForm.status.toUpperCase(),
      })
      setShowAddModal(false)
      setAddForm({
        name: '', contactPerson: '', phone: '', email: '',
        address: '', gstNo: '', panNo: '', bankName: '',
        accountNo: '', ifscCode: '', status: 'ACTIVE',
      })
      fetchSuppliers()
    } catch (err) {
      console.error('Failed to add supplier:', err)
      alert('Failed to add supplier')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditSupplier = async () => {
    if (!selectedSupplier || !editForm.name || !editForm.phone) return
    try {
      setSubmitting(true)
      await pharmacyAPI.updateSupplier(selectedSupplier.id, {
        ...editForm,
        status: editForm.status.toUpperCase(),
      })
      setShowEditModal(false)
      setSelectedSupplier(null)
      fetchSuppliers()
    } catch (err) {
      console.error('Failed to update supplier:', err)
      alert('Failed to update supplier')
    } finally {
      setSubmitting(false)
    }
  }

  const openEditModal = (supplier: Supplier) => {
    setSelectedSupplier(supplier)
    setEditForm({
      name: supplier.name,
      contactPerson: supplier.contactPerson,
      phone: supplier.phone,
      email: supplier.email,
      address: supplier.address,
      gstNo: supplier.gstNo,
      panNo: supplier.panNo,
      bankName: supplier.bankName,
      accountNo: supplier.accountNo,
      ifscCode: supplier.ifscCode,
      status: supplier.status.toUpperCase(),
    })
    setShowEditModal(true)
  }

  const handleDeleteSupplier = async (id: string) => {
    try {
      await pharmacyAPI.deleteSupplier(id)
      setSuppliers(prev => prev.filter(s => s.id !== id))
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete supplier')
    }
  }

  const fetchLedger = async (supplierId: string) => {
    try {
      setLedgerLoading(true)
      const [supplierRes, paymentsRes] = await Promise.all([
        pharmacyAPI.getSupplierById(supplierId),
        pharmacyAPI.getSupplierPayments(supplierId, { limit: 200 }),
      ])

      const supplierData = supplierRes.data?.data || supplierRes.data
      const medicines = supplierData?.medicines || []
      const paymentsData = paymentsRes.data?.data || paymentsRes.data
      const payments = paymentsData?.payments || []

      const entries: LedgerEntry[] = []

      // Purchases (debit): derive from medicines linked to this supplier
      medicines.forEach((m: any) => {
        entries.push({
          id: `med-${m.id}`,
          date: m.createdAt || supplierData.createdAt,
          type: 'purchase',
          description: `${m.name} — ${m.stock} units @ ₹${m.sellingPrice}`,
          debit: (m.stock || 0) * (m.sellingPrice || 0),
          credit: 0,
          balance: 0,
        })
      })

      // Payments (credit)
      payments.forEach((p: any) => {
        entries.push({
          id: `pay-${p.id}`,
          date: p.date || p.createdAt,
          type: 'payment',
          description: `Payment via ${p.paymentMode}${p.note ? ` — ${p.note}` : ''}`,
          debit: 0,
          credit: p.amount,
          balance: 0,
        })
      })

      // Sort by date ascending and calculate running balance
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

  const safeFormatDate = (dateStr: string) => {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : (
      <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/inventory')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Supplier Management</h1>
            <p className="text-slate-500">Manage suppliers, purchases and payments</p>
          </div>
        </div>
        <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Supplier
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalSuppliers}</p>
              <p className="text-sm text-slate-500">Active Suppliers</p>
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
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalPurchases)}</p>
              <p className="text-sm text-slate-500">Total Purchases</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalPaid)}</p>
              <p className="text-sm text-slate-500">Total Paid</p>
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
              <p className="text-xl font-bold text-red-600">{formatCurrency(totalPending)}</p>
              <p className="text-sm text-slate-500">Pending Amount</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'suppliers'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Suppliers
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-xl font-medium transition-colors ${
            activeTab === 'ledger'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          Supplier Ledger
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 relative">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search supplier name, code, contact..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: '', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
            ]}
          />
        </div>
      </div>

      {/* Suppliers Tab */}
      {activeTab === 'suppliers' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Supplier</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total Purchases</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Pending</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Last Purchase</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-800">{supplier.name}</p>
                        <p className="text-xs text-slate-500">{supplier.supplierCode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-slate-800">{supplier.contactPerson}</p>
                        <p className="text-xs text-slate-500">{supplier.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-slate-800">{formatCurrency(supplier.totalPurchases)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-emerald-600">{formatCurrency(supplier.totalPaid)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${supplier.pendingAmount > 0 ? 'text-red-600' : 'text-slate-600'}`}>
                        {formatCurrency(supplier.pendingAmount)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-slate-600">{safeFormatDate(supplier.lastPurchaseDate)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(supplier.status)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setSelectedSupplier(supplier)
                            setShowDetailModal(true)
                          }}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {supplier.pendingAmount > 0 && (
                          <button
                            onClick={() => {
                              setSelectedSupplier(supplier)
                              setShowPaymentModal(true)
                            }}
                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Make Payment"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                          </button>
                        )}
                        {isAdmin && (
                        <button
                          onClick={() => openEditModal(supplier)}
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
                          onClick={() => setDeleteConfirm(supplier.id)}
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

          {/* Empty State */}
          {filteredSuppliers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">No suppliers found</p>
              <p className="text-slate-400 text-sm">Try adjusting your search or add a new supplier</p>
            </div>
          )}
        </div>
      )}

      {/* Supplier Ledger Tab */}
      {activeTab === 'ledger' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 mb-1">Select Supplier</label>
            <Select
              value={ledgerSupplier}
              onChange={(e) => {
                setLedgerSupplier(e.target.value)
                if (e.target.value) fetchLedger(e.target.value)
                else setLedgerEntries([])
              }}
              options={[
                { value: '', label: 'Choose a supplier...' },
                ...suppliers.map(s => ({ value: s.id, label: `${s.name} (${s.supplierCode})` }))
              ]}
            />
          </div>

          {!ledgerSupplier && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-slate-600 font-medium">Select a supplier to view ledger</p>
              <p className="text-slate-400 text-sm">The ledger shows all purchases (debits) and payments (credits)</p>
            </div>
          )}

          {ledgerLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
            </div>
          )}

          {ledgerSupplier && !ledgerLoading && (
            <>
              {/* Ledger Summary */}
              {ledgerEntries.length > 0 && (
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600">Total Purchases (Debit)</p>
                    <p className="text-xl font-bold text-purple-700">
                      {formatCurrency(ledgerEntries.reduce((sum, e) => sum + e.debit, 0))}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-sm text-emerald-600">Total Paid (Credit)</p>
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
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Debit (Purchase)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Credit (Payment)</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerEntries.map(entry => (
                      <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-slate-600">{safeFormatDate(entry.date)}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${entry.type === 'purchase' ? 'bg-purple-500' : 'bg-emerald-500'}`} />
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
                  <p className="text-slate-400 text-sm">Add medicines from this supplier to see purchase entries</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Supplier Detail Modal */}
      {showDetailModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Supplier Details</h2>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-xl bg-blue-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">{selectedSupplier.name}</h3>
                  <p className="text-slate-500">{selectedSupplier.supplierCode}</p>
                  <div className="flex items-center gap-2 mt-2">
                    {getStatusBadge(selectedSupplier.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Contact Person</p>
                  <p className="font-medium text-slate-800">{selectedSupplier.contactPerson}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="font-medium text-slate-800">{selectedSupplier.phone}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="font-medium text-slate-800">{selectedSupplier.email}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">GST No</p>
                  <p className="font-medium text-slate-800">{selectedSupplier.gstNo}</p>
                </div>
                <div className="md:col-span-2 bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Address</p>
                  <p className="font-medium text-slate-800">{selectedSupplier.address}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Financial Summary</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-purple-50 rounded-xl p-4">
                    <p className="text-sm text-purple-600">Total Purchases</p>
                    <p className="text-xl font-bold text-purple-700">{formatCurrency(selectedSupplier.totalPurchases)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-sm text-emerald-600">Total Paid</p>
                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedSupplier.totalPaid)}</p>
                  </div>
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-sm text-red-600">Pending Amount</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(selectedSupplier.pendingAmount)}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Bank Details</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Bank Name</p>
                    <p className="font-medium text-slate-800">{selectedSupplier.bankName}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">Account No</p>
                    <p className="font-medium text-slate-800">{selectedSupplier.accountNo}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl p-4">
                    <p className="text-sm text-slate-500">IFSC Code</p>
                    <p className="font-medium text-slate-800">{selectedSupplier.ifscCode}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              {selectedSupplier.pendingAmount > 0 && (
                <Button className="flex-1" onClick={() => {
                  setShowDetailModal(false)
                  setShowPaymentModal(true)
                }}>
                  Make Payment
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Make Payment</h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-xl p-4">
                <p className="text-sm text-slate-500">Supplier</p>
                <p className="font-medium text-slate-800">{selectedSupplier.name}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-4">
                <p className="text-sm text-red-600">Pending Amount</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(selectedSupplier.pendingAmount)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Amount
                </label>
                <Input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Mode
                </label>
                <Select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  options={[
                    { value: 'CASH', label: 'Cash' },
                    { value: 'CARD', label: 'Card / Bank Transfer' },
                    { value: 'UPI', label: 'UPI' },
                  ]}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Note (optional)
                </label>
                <Input
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="e.g., Partial payment for March invoice"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleMakePayment} disabled={!paymentAmount || submitting}>
                {submitting ? 'Recording...' : 'Record Payment'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Add New Supplier</h2>
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
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                  <Input placeholder="Enter supplier name" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person *</label>
                  <Input placeholder="Enter contact person name" value={addForm.contactPerson} onChange={(e) => setAddForm(f => ({ ...f, contactPerson: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <Input placeholder="Enter phone number" value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input type="email" placeholder="Enter email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <Input placeholder="Enter full address" value={addForm.address} onChange={(e) => setAddForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST No</label>
                  <Input placeholder="Enter GST number" value={addForm.gstNo} onChange={(e) => setAddForm(f => ({ ...f, gstNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN No</label>
                  <Input placeholder="Enter PAN number" value={addForm.panNo} onChange={(e) => setAddForm(f => ({ ...f, panNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                  <Input placeholder="Enter bank name" value={addForm.bankName} onChange={(e) => setAddForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account No</label>
                  <Input placeholder="Enter account number" value={addForm.accountNo} onChange={(e) => setAddForm(f => ({ ...f, accountNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                  <Input placeholder="Enter IFSC code" value={addForm.ifscCode} onChange={(e) => setAddForm(f => ({ ...f, ifscCode: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <Select
                    value={addForm.status}
                    onChange={(e) => setAddForm(f => ({ ...f, status: e.target.value }))}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleAddSupplier} disabled={submitting || !addForm.name || !addForm.contactPerson || !addForm.phone}>
                {submitting ? 'Adding...' : 'Add Supplier'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Modal */}
      {showEditModal && selectedSupplier && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Edit Supplier</h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-xl"
                >
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Supplier Name *</label>
                  <Input placeholder="Enter supplier name" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Contact Person</label>
                  <Input placeholder="Enter contact person name" value={editForm.contactPerson} onChange={(e) => setEditForm(f => ({ ...f, contactPerson: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Phone *</label>
                  <Input placeholder="Enter phone number" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <Input type="email" placeholder="Enter email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
                  <Input placeholder="Enter full address" value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">GST No</label>
                  <Input placeholder="Enter GST number" value={editForm.gstNo} onChange={(e) => setEditForm(f => ({ ...f, gstNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">PAN No</label>
                  <Input placeholder="Enter PAN number" value={editForm.panNo} onChange={(e) => setEditForm(f => ({ ...f, panNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Bank Name</label>
                  <Input placeholder="Enter bank name" value={editForm.bankName} onChange={(e) => setEditForm(f => ({ ...f, bankName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Account No</label>
                  <Input placeholder="Enter account number" value={editForm.accountNo} onChange={(e) => setEditForm(f => ({ ...f, accountNo: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">IFSC Code</label>
                  <Input placeholder="Enter IFSC code" value={editForm.ifscCode} onChange={(e) => setEditForm(f => ({ ...f, ifscCode: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                  <Select
                    value={editForm.status}
                    onChange={(e) => setEditForm(f => ({ ...f, status: e.target.value }))}
                    options={[
                      { value: 'ACTIVE', label: 'Active' },
                      { value: 'INACTIVE', label: 'Inactive' },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleEditSupplier} disabled={submitting || !editForm.name || !editForm.phone}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Supplier</h3>
            <p className="text-slate-600 mb-1">Are you sure you want to delete this supplier?</p>
            <p className="text-sm text-red-600 mb-6">Suppliers with medicines or payments cannot be deleted.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="from-red-600 to-red-500" onClick={() => handleDeleteSupplier(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </>
    )}
    </div>
  )
}

export default SupplierManagement
