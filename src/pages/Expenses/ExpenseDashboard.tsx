import { useState, useEffect } from 'react'
import { Button, Input, Select } from '../../components/ui'
import { expenseAPI } from '../../api/endpoints'
import { useAppSelector } from '../../hooks/useRedux'

// Expense Categories
const expenseCategories = [
  { id: 'rent', name: 'Rent', icon: '🏢', color: 'bg-indigo-500' },
  { id: 'utilities', name: 'Utilities', icon: '💡', color: 'bg-yellow-500' },
  { id: 'salaries', name: 'Salaries', icon: '👥', color: 'bg-blue-500' },
  { id: 'equipment', name: 'Equipment', icon: '🖥️', color: 'bg-purple-500' },
  { id: 'marketing', name: 'Marketing', icon: '📢', color: 'bg-pink-500' },
  { id: 'maintenance', name: 'Maintenance', icon: '🔧', color: 'bg-orange-500' },
  { id: 'insurance', name: 'Insurance', icon: '🛡️', color: 'bg-teal-500' },
  { id: 'miscellaneous', name: 'Miscellaneous', icon: '📦', color: 'bg-slate-500' },
]

interface Expense {
  id: string
  title: string
  category: string
  amount: number
  date: string
  paymentMode: string
  description: string
  isRecurring: boolean
  recurringPeriod: string | null
  receiptUrl: string | null
}

const ExpenseDashboard = () => {
  const { user } = useAppSelector((state) => state.auth)
  const isAdmin = user?.role === 'ADMIN'
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'recurring'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [viewingExpense, setViewingExpense] = useState<Expense | null>(null)
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [modeFilter, setModeFilter] = useState('')
  
  // New Expense Form
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: '',
    amount: '',
    date: new Date().toISOString().slice(0, 10),
    paymentMode: 'CASH',
    description: '',
    isRecurring: false,
    recurringPeriod: 'MONTHLY',
  })

  const fetchExpenses = async () => {
    try {
      setLoading(true)
      const res = await expenseAPI.getAll({ limit: 200 })
      const data = res.data?.data || res.data || []
      const mapped = (Array.isArray(data) ? data : []).map((e: any) => ({
        id: e.id,
        title: e.title || '',
        category: (e.category || 'miscellaneous').toLowerCase(),
        amount: e.amount || 0,
        date: e.date ? e.date.slice(0, 10) : '',
        paymentMode: (e.paymentMode || 'CASH'),
        description: e.note || e.description || '',
        isRecurring: e.isRecurring || false,
        recurringPeriod: e.recurringPeriod || null,
        receiptUrl: e.receiptUrl || null,
      }))
      setExpenses(mapped)
    } catch (err) {
      console.error('Failed to fetch expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchExpenses() }, [])

  // Calculate Stats
  const today = new Date().toISOString().slice(0, 10)
  const thisMonth = new Date().toISOString().slice(0, 7)
  const thisYear = new Date().getFullYear().toString()
  
  const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0)
  const weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - 7)
  const weekExpenses = expenses.filter(e => new Date(e.date) >= weekStart).reduce((sum, e) => sum + e.amount, 0)
  const monthExpenses = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((sum, e) => sum + e.amount, 0)
  const yearExpenses = expenses.filter(e => e.date.startsWith(thisYear)).reduce((sum, e) => sum + e.amount, 0)

  // Category breakdown
  const categoryBreakdown = expenseCategories.map(cat => ({
    ...cat,
    total: expenses.filter(e => e.category === cat.id).reduce((sum, e) => sum + e.amount, 0),
    count: expenses.filter(e => e.category === cat.id).length,
  })).sort((a, b) => b.total - a.total)

  // Filter expenses
  const filteredExpenses = expenses.filter(expense => {
    if (activeTab === 'recurring' && !expense.isRecurring) return false
    if (searchTerm && !expense.title.toLowerCase().includes(searchTerm.toLowerCase())) return false
    if (categoryFilter && expense.category !== categoryFilter) return false
    if (dateFrom && expense.date < dateFrom) return false
    if (dateTo && expense.date > dateTo) return false
    if (modeFilter && expense.paymentMode !== modeFilter) return false
    return true
  })

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const getCategoryInfo = (categoryId: string) => {
    return expenseCategories.find(c => c.id === categoryId) || { name: 'Unknown', icon: '❓', color: 'bg-slate-500' }
  }

  const handleAddExpense = async () => {
    try {
      setSubmitting(true)
      await expenseAPI.create({
        title: newExpense.title,
        category: newExpense.category.charAt(0).toUpperCase() + newExpense.category.slice(1).toLowerCase(),
        amount: parseInt(newExpense.amount) || 0,
        date: newExpense.date,
        paymentMode: newExpense.paymentMode,
        note: newExpense.description,
        isRecurring: newExpense.isRecurring,
        recurringPeriod: newExpense.isRecurring ? newExpense.recurringPeriod : null,
      })
      setNewExpense({
        title: '',
        category: '',
        amount: '',
        date: new Date().toISOString().slice(0, 10),
        paymentMode: 'CASH',
        description: '',
        isRecurring: false,
        recurringPeriod: 'MONTHLY',
      })
      setShowAddModal(false)
      fetchExpenses()
    } catch (err) {
      console.error('Failed to add expense:', err)
      alert('Failed to add expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleUpdateExpense = async () => {
    if (!editingExpense) return
    try {
      setSubmitting(true)
      await expenseAPI.update(editingExpense.id, {
        title: editingExpense.title,
        category: editingExpense.category.charAt(0).toUpperCase() + editingExpense.category.slice(1).toLowerCase(),
        amount: editingExpense.amount,
        date: editingExpense.date,
        paymentMode: editingExpense.paymentMode,
        note: editingExpense.description,
        isRecurring: editingExpense.isRecurring,
        recurringPeriod: editingExpense.isRecurring ? editingExpense.recurringPeriod : null,
      })
      setEditingExpense(null)
      fetchExpenses()
    } catch (err) {
      console.error('Failed to update expense:', err)
      alert('Failed to update expense')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExpense = async (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      try {
        await expenseAPI.delete(id)
        fetchExpenses()
      } catch (err) {
        console.error('Failed to delete expense:', err)
        alert('Failed to delete expense')
      }
    }
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Expense Management</h1>
          <p className="text-slate-500">Track and manage all shop expenses</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className='from-emerald-600 to-teal-500'>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add Expense
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">Today's Expenses</p>
              <p className="text-2xl font-bold text-slate-800">₹{todayExpenses.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Week</p>
              <p className="text-2xl font-bold text-slate-800">₹{weekExpenses.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Month</p>
              <p className="text-2xl font-bold text-slate-800">₹{monthExpenses.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-500">This Year</p>
              <p className="text-2xl font-bold text-slate-800">₹{yearExpenses.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Category Breakdown & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Category Breakdown</h3>
          <div className="space-y-3">
            {categoryBreakdown.filter(c => c.total > 0).map(cat => (
              <div key={cat.id} className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center text-xl`}>
                  {cat.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700">{cat.name}</span>
                    <span className="font-semibold text-slate-800">₹{cat.total.toLocaleString()}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${cat.color} rounded-full transition-all`}
                      style={{ width: `${(cat.total / monthExpenses) * 100}%` }}
                    />
                  </div>
                </div>
                <span className="text-sm text-slate-500 w-16 text-right">
                  {((cat.total / monthExpenses) * 100).toFixed(1)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recurring Expenses Due */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Recurring Expenses</h3>
          <div className="space-y-3">
            {expenses.filter(e => e.isRecurring).slice(0, 5).map(expense => (
              <div key={expense.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className={`w-8 h-8 rounded-lg ${getCategoryInfo(expense.category).color} flex items-center justify-center text-sm`}>
                  {getCategoryInfo(expense.category).icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-700 truncate">{expense.title}</p>
                  <p className="text-xs text-slate-500 capitalize">{expense.recurringPeriod?.toLowerCase()}</p>
                </div>
                <span className="text-sm font-semibold text-slate-800">₹{expense.amount.toLocaleString()}</span>
              </div>
            ))}
            {expenses.filter(e => e.isRecurring).length === 0 && (
              <p className="text-center text-slate-500 py-4">No recurring expenses</p>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="flex border-b border-slate-100">
          <button
            onClick={() => setActiveTab('all')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Expenses ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'recurring'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Recurring ({expenses.filter(e => e.isRecurring).length})
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <Input
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: '', label: 'All Categories' },
                ...expenseCategories.map(c => ({ value: c.id, label: c.name }))
              ]}
            />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
            />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              placeholder="To Date"
            />
            <Select
              value={modeFilter}
              onChange={(e) => setModeFilter(e.target.value)}
              options={[
                { value: '', label: 'All Modes' },
                { value: 'CASH', label: 'Cash' },
                { value: 'CARD', label: 'Card' },
                { value: 'UPI', label: 'UPI' },
              ]}
            />
          </div>
        </div>

        {/* Expense Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Date</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Title</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Category</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Amount</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-slate-600">Mode</th>
                <th className="text-center px-6 py-4 text-sm font-semibold text-slate-600">Receipt</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.map(expense => {
                const catInfo = getCategoryInfo(expense.category)
                return (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-600">{formatDate(expense.date)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-800">{expense.title}</span>
                        {expense.isRecurring && (
                          <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-medium">
                            {expense.recurringPeriod?.toLowerCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-md ${catInfo.color} flex items-center justify-center text-xs`}>
                          {catInfo.icon}
                        </span>
                        <span className="text-sm text-slate-600">{catInfo.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-800">₹{expense.amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium">
                        {expense.paymentMode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {expense.receiptUrl ? (
                        <button className="text-blue-600 hover:text-blue-700">
                          <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </button>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setViewingExpense(expense)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="View"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {isAdmin && (
                        <button
                          onClick={() => setEditingExpense(expense)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        )}
                        {isAdmin && (
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredExpenses.length === 0 && (
            <div className="text-center py-12">
              <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <p className="text-slate-500">No expenses found</p>
            </div>
          )}
        </div>

        {/* Summary */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600">
              Showing {filteredExpenses.length} of {expenses.length} expenses
            </span>
            <span className="font-semibold text-slate-800">
              Total: ₹{filteredExpenses.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Add New Expense</h3>
              <button onClick={() => setShowAddModal(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Title *</label>
                <Input
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({ ...newExpense, title: e.target.value })}
                  placeholder="e.g., Electricity Bill - March"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <Select
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                    options={[
                      { value: '', label: 'Select Category' },
                      ...expenseCategories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <Input
                    type="number"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    placeholder="Enter amount"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expense Date *</label>
                  <Input
                    type="date"
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode *</label>
                  <Select
                    value={newExpense.paymentMode}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                    options={[
                      { value: 'CASH', label: 'Cash' },
                      { value: 'CARD', label: 'Card' },
                      { value: 'UPI', label: 'UPI' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  rows={2}
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  placeholder="Additional details..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Receipt/Bill</label>
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center hover:border-blue-300 transition-colors cursor-pointer">
                  <svg className="w-8 h-8 text-slate-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  <p className="text-sm text-slate-500">Click to upload receipt</p>
                  <p className="text-xs text-slate-400">PDF, JPG, PNG up to 5MB</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newExpense.isRecurring}
                    onChange={(e) => setNewExpense({ ...newExpense, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Recurring Expense</span>
                </label>
                {newExpense.isRecurring && (
                  <Select
                    value={newExpense.recurringPeriod}
                    onChange={(e) => setNewExpense({ ...newExpense, recurringPeriod: e.target.value })}
                    options={[
                      { value: 'WEEKLY', label: 'Weekly' },
                      { value: 'MONTHLY', label: 'Monthly' },
                      { value: 'QUARTERLY', label: 'Quarterly' },
                      { value: 'YEARLY', label: 'Yearly' },
                    ]}
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setShowAddModal(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAddExpense} disabled={submitting}>
                {submitting ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Edit Expense</h3>
              <button onClick={() => setEditingExpense(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Expense Title *</label>
                <Input
                  value={editingExpense.title}
                  onChange={(e) => setEditingExpense({ ...editingExpense, title: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Category *</label>
                  <Select
                    value={editingExpense.category}
                    onChange={(e) => setEditingExpense({ ...editingExpense, category: e.target.value })}
                    options={expenseCategories.map(c => ({ value: c.id, label: `${c.icon} ${c.name}` }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₹) *</label>
                  <Input
                    type="number"
                    value={editingExpense.amount}
                    onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expense Date *</label>
                  <Input
                    type="date"
                    value={editingExpense.date}
                    onChange={(e) => setEditingExpense({ ...editingExpense, date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Payment Mode *</label>
                  <Select
                    value={editingExpense.paymentMode}
                    onChange={(e) => setEditingExpense({ ...editingExpense, paymentMode: e.target.value })}
                    options={[
                      { value: 'CASH', label: 'Cash' },
                      { value: 'CARD', label: 'Card' },
                      { value: 'UPI', label: 'UPI' },
                    ]}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                <textarea
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all resize-none"
                  rows={2}
                  value={editingExpense.description}
                  onChange={(e) => setEditingExpense({ ...editingExpense, description: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingExpense.isRecurring}
                    onChange={(e) => setEditingExpense({ ...editingExpense, isRecurring: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Recurring Expense</span>
                </label>
                {editingExpense.isRecurring && (
                  <Select
                    value={editingExpense.recurringPeriod || 'MONTHLY'}
                    onChange={(e) => setEditingExpense({ ...editingExpense, recurringPeriod: e.target.value })}
                    options={[
                      { value: 'WEEKLY', label: 'Weekly' },
                      { value: 'MONTHLY', label: 'Monthly' },
                      { value: 'QUARTERLY', label: 'Quarterly' },
                      { value: 'YEARLY', label: 'Yearly' },
                    ]}
                  />
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setEditingExpense(null)}>Cancel</Button>
              <Button className="flex-1" onClick={handleUpdateExpense} disabled={submitting}>
                {submitting ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* View Expense Modal */}
      {viewingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-semibold text-slate-800">Expense Details</h3>
              <button onClick={() => setViewingExpense(null)} className="p-1 hover:bg-slate-100 rounded-lg">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-xl ${getCategoryInfo(viewingExpense.category).color} flex items-center justify-center text-2xl`}>
                  {getCategoryInfo(viewingExpense.category).icon}
                </div>
                <div>
                  <h4 className="text-xl font-semibold text-slate-800">{viewingExpense.title}</h4>
                  <p className="text-slate-500">{getCategoryInfo(viewingExpense.category).name}</p>
                </div>
              </div>
              <div className="bg-slate-50 rounded-xl p-4 mb-4">
                <p className="text-3xl font-bold text-slate-800">₹{viewingExpense.amount.toLocaleString()}</p>
                {viewingExpense.isRecurring && (
                  <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-700 text-sm font-medium rounded-lg capitalize">
                    {viewingExpense.recurringPeriod?.toLowerCase()} recurring
                  </span>
                )}
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">{formatDate(viewingExpense.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Payment Mode</span>
                  <span className="font-medium text-slate-800">{viewingExpense.paymentMode}</span>
                </div>
                {viewingExpense.description && (
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-slate-500 mb-1">Description</p>
                    <p className="text-slate-800">{viewingExpense.description}</p>
                  </div>
                )}
                {viewingExpense.receiptUrl && (
                  <div className="pt-3 border-t border-slate-200">
                    <p className="text-slate-500 mb-2">Receipt</p>
                    <Button variant="outline" className="w-full">
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download Receipt
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-slate-100">
              <Button variant="outline" className="flex-1" onClick={() => setViewingExpense(null)}>Close</Button>
              {isAdmin && (
              <Button className="flex-1" onClick={() => {
                setEditingExpense(viewingExpense)
                setViewingExpense(null)
              }}>Edit</Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
    )}
    </div>
  )
}

export default ExpenseDashboard
