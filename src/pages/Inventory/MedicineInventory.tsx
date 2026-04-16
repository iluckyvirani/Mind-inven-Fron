import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, Select } from '../../components/ui'
import { pharmacyAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

interface Medicine {
  id: string
  medicineCode: string
  name: string
  genericName: string
  form: string
  category: string
  batchNo: string
  expiryDate: string
  quantity: number
  minStock: number
  purchasePrice: number
  sellPrice: number
  mrp: number
  supplierId: string
  supplierName: string
  lastPurchaseDate: string
  rackNo: string
  status: string
}

const statusMap: Record<string, string> = {
  'IN_STOCK': 'in-stock',
  'LOW_STOCK': 'low-stock',
  'OUT_OF_STOCK': 'out-of-stock',
}

const categories = ['All', 'Pain Relief', 'Antibiotic', 'Antihistamine', 'Antacid', 'Diabetes', 'Cough & Cold', 'Cardiovascular', 'Vitamins']
const forms = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops']
const statusOptions = ['All', 'in-stock', 'low-stock', 'out-of-stock', 'expiring-soon']

const MedicineInventory = () => {
  const navigate = useNavigate()
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [medicines, setMedicines] = useState<Medicine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [formFilter, setFormFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedMedicine, setSelectedMedicine] = useState<Medicine | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => {
    const fetchMedicines = async () => {
      try {
        setLoading(true)
        const res = await pharmacyAPI.getMedicines({ limit: 100 })
        const data = res.data.data || []
        const now = new Date()
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

        const mapped: Medicine[] = data.map((m: any) => {
          let status = statusMap[m.status] || 'in-stock'
          if (m.expiryDate && new Date(m.expiryDate) <= thirtyDaysLater && status === 'in-stock') {
            status = 'expiring-soon'
          }
          return {
            id: m.id,
            medicineCode: m.medicineCode || '',
            name: m.name,
            genericName: m.genericName || '',
            form: m.form || '',
            category: m.category?.name || '',
            batchNo: m.batchNo || '',
            expiryDate: m.expiryDate || '',
            quantity: m.stock,
            minStock: m.minStock,
            purchasePrice: m.unitPrice,
            sellPrice: m.sellingPrice,
            mrp: m.mrp || 0,
            supplierId: m.supplier?.id || '',
            supplierName: m.supplier?.name || '',
            lastPurchaseDate: m.updatedAt || m.createdAt || '',
            rackNo: m.rackNo || '',
            status,
          }
        })
        setMedicines(mapped)
      } catch (err) {
        console.error('Failed to fetch medicines:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchMedicines()
  }, [])

  // Stats
  const totalMedicines = medicines.length
  const lowStockCount = medicines.filter(m => m.status === 'low-stock').length
  const outOfStockCount = medicines.filter(m => m.status === 'out-of-stock').length
  const expiringSoonCount = medicines.filter(m => m.status === 'expiring-soon').length
  const totalStockValue = medicines.reduce((sum, m) => sum + (m.quantity * m.purchasePrice), 0)

  const handleDeleteMedicine = async (id: string) => {
    try {
      await pharmacyAPI.deleteMedicine(id)
      setMedicines(prev => prev.filter(m => m.id !== id))
      setDeleteConfirm(null)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete medicine')
    }
  }

  // Filter medicines
  const filteredMedicines = medicines.filter(medicine => {
    const matchesSearch = 
      medicine.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.genericName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.medicineCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      medicine.batchNo.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesCategory = categoryFilter === 'All' || medicine.category === categoryFilter
    const matchesForm = formFilter === 'All' || medicine.form === formFilter
    const matchesStatus = statusFilter === 'All' || medicine.status === statusFilter

    return matchesSearch && matchesCategory && matchesForm && matchesStatus
  })

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: 'success' | 'warning' | 'danger' | 'info'; label: string }> = {
      'in-stock': { variant: 'success', label: 'In Stock' },
      'low-stock': { variant: 'warning', label: 'Low Stock' },
      'out-of-stock': { variant: 'danger', label: 'Out of Stock' },
      'expiring-soon': { variant: 'info', label: 'Expiring Soon' },
    }
    const statusInfo = config[status] || { variant: 'info' as const, label: status }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Medicine Inventory</h1>
            <p className="text-slate-500">Manage medicine stock, prices, and suppliers</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/suppliers')}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Suppliers
          </Button>
          <Button variant="outline" onClick={() => navigate('/suppliers', { state: { tab: 'ledger' } })}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            Supplier Ledger
          </Button>
          <Button onClick={() => navigate('/inventory/add-medicine')} className='from-emerald-600 to-teal-500'>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Medicine
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{totalMedicines}</p>
              <p className="text-sm text-slate-500">Total Medicines</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{lowStockCount}</p>
              <p className="text-sm text-slate-500">Low Stock</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{outOfStockCount}</p>
              <p className="text-sm text-slate-500">Out of Stock</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{expiringSoonCount}</p>
              <p className="text-sm text-slate-500">Expiring Soon</p>
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
              <p className="text-xl font-bold text-slate-800">{formatCurrency(totalStockValue)}</p>
              <p className="text-sm text-slate-500">Stock Value</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2 relative">
            <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search medicine name, code, batch..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <Select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            options={categories.map(cat => ({ value: cat, label: cat }))}
          />
          <Select
            value={formFilter}
            onChange={(e) => setFormFilter(e.target.value)}
            options={forms.map(form => ({ value: form, label: form }))}
          />
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={statusOptions.map(status => ({ 
              value: status, 
              label: status === 'All' ? 'All Status' : status.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ')
            }))}
          />
        </div>
      </div>

      {/* Medicine Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Medicine</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Category</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Batch / Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Stock</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Purchase Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Sell Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Supplier</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMedicines.map(medicine => (
                <tr key={medicine.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">{medicine.name}</p>
                      <p className="text-xs text-slate-500">{medicine.medicineCode} • {medicine.form}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{medicine.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm text-slate-800">{medicine.batchNo}</p>
                      <p className="text-xs text-slate-500">Exp: {formatDate(medicine.expiryDate)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${medicine.quantity <= medicine.minStock ? 'text-red-600' : 'text-slate-800'}`}>
                        {medicine.quantity}
                      </span>
                      {medicine.quantity <= medicine.minStock && (
                        <span className="text-xs text-red-500">(Min: {medicine.minStock})</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-800">{formatCurrency(medicine.purchasePrice)}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-sm font-medium text-emerald-600">{formatCurrency(medicine.sellPrice)}</span>
                      <p className="text-xs text-slate-500">MRP: {formatCurrency(medicine.mrp)}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-slate-600">{medicine.supplierName}</span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(medicine.status)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setSelectedMedicine(medicine)
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
                      {isAdmin && (
                      <button
                        onClick={() => navigate(`/inventory/edit-medicine/${medicine.id}`)}
                        className="p-2 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      )}
                      <button
                        onClick={() => navigate(`/inventory/add-stock/${medicine.id}`)}
                        className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Add Stock"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                      </button>
                      {isAdmin && (
                      <button
                        onClick={() => setDeleteConfirm(medicine.id)}
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
        {filteredMedicines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
            <p className="text-slate-600 font-medium">No medicines found</p>
            <p className="text-slate-400 text-sm">Try adjusting your search or filters</p>
          </div>
        )}
      </div>

      {/* Medicine Detail Modal */}
      {showDetailModal && selectedMedicine && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-slate-800">Medicine Details</h2>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-slate-800">{selectedMedicine.name}</h3>
                  <p className="text-slate-500">{selectedMedicine.genericName}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="px-2 py-1 bg-slate-100 rounded text-xs text-slate-600">{selectedMedicine.medicineCode}</span>
                    {getStatusBadge(selectedMedicine.status)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Form</p>
                  <p className="font-medium text-slate-800">{selectedMedicine.form}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="font-medium text-slate-800">{selectedMedicine.category}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Rack No</p>
                  <p className="font-medium text-slate-800">{selectedMedicine.rackNo}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Batch No</p>
                  <p className="font-medium text-slate-800">{selectedMedicine.batchNo}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Expiry Date</p>
                  <p className="font-medium text-slate-800">{formatDate(selectedMedicine.expiryDate)}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-sm text-slate-500">Current Stock</p>
                  <p className={`font-medium ${selectedMedicine.quantity <= selectedMedicine.minStock ? 'text-red-600' : 'text-slate-800'}`}>
                    {selectedMedicine.quantity} units
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Pricing Information</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 rounded-xl p-4">
                    <p className="text-sm text-red-600">Purchase Price</p>
                    <p className="text-xl font-bold text-red-700">{formatCurrency(selectedMedicine.purchasePrice)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-4">
                    <p className="text-sm text-emerald-600">Sell Price</p>
                    <p className="text-xl font-bold text-emerald-700">{formatCurrency(selectedMedicine.sellPrice)}</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-sm text-blue-600">MRP</p>
                    <p className="text-xl font-bold text-blue-700">{formatCurrency(selectedMedicine.mrp)}</p>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-amber-50 rounded-xl">
                  <p className="text-sm text-amber-700">
                    <span className="font-medium">Profit Margin:</span> {formatCurrency(selectedMedicine.sellPrice - selectedMedicine.purchasePrice)} per unit ({(((selectedMedicine.sellPrice - selectedMedicine.purchasePrice) / selectedMedicine.purchasePrice) * 100).toFixed(1)}%)
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4">
                <h4 className="font-semibold text-slate-800 mb-3">Supplier Information</h4>
                <div className="bg-slate-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">{selectedMedicine.supplierName || '—'}</p>
                      <p className="text-sm text-slate-500">Last Updated: {selectedMedicine.lastPurchaseDate ? formatDate(selectedMedicine.lastPurchaseDate) : '—'}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => navigate('/suppliers')}>
                      View Supplier
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setShowDetailModal(false)}>
                Close
              </Button>
              {isAdmin && (
              <Button variant="outline" className="flex-1" onClick={() => navigate(`/inventory/edit-medicine/${selectedMedicine.id}`)}>
                Edit Medicine
              </Button>
              )}
              <Button className="flex-1" onClick={() => navigate(`/inventory/add-stock/${selectedMedicine.id}`)}>
                Add Stock
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Delete Medicine</h3>
            <p className="text-slate-600 mb-1">Are you sure you want to delete this medicine?</p>
            <p className="text-sm text-red-600 mb-6">Medicines with sale history cannot be deleted.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button className="from-red-600 to-red-500" onClick={() => handleDeleteMedicine(deleteConfirm)}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default MedicineInventory
