import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Badge } from '../../components/ui'
import { customerAPI } from '../../api/endpoints'

interface Purchase {
  id: string
  invoiceNo: string
  date: string
  items: { name: string; qty: number; price: number; discount: number; amount: number }[]
  total: number
  paid: number
  paymentMode: string
  status: string
}

interface CustomerData {
  id: string
  name: string
  phone: string
  age: string
  address?: string
  email?: string
  bankName?: string
  accountNo?: string
  gstNo?: string
  lastPurchaseDate?: string
  totalPurchases: number
  totalSpent: number
  firstPurchase: string
  lastPurchase: string
  purchases: Purchase[]
}

const CustomerDetail = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [customer, setCustomer] = useState<CustomerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!id) return
      try {
        setLoading(true)
        const [custRes, purchRes] = await Promise.all([
          customerAPI.getById(id),
          customerAPI.getPurchaseHistory(id, { limit: 100 }),
        ])
        const c = custRes.data.data ?? custRes.data
        const purchData = purchRes.data.data ?? purchRes.data
        const purchasesRaw = Array.isArray(purchData) ? purchData : (purchData.sales || [])

        const purchases: Purchase[] = purchasesRaw.map((s: any) => ({
          id: s.id,
          invoiceNo: s.invoiceNo,
          date: s.date || s.createdAt,
          items: (s.items || []).map((item: any) => {
            const lineTotal = item.quantity * item.unitPrice
            const discAmt = (lineTotal * (item.discount || 0)) / 100
            return {
              name: item.medicine?.name || '',
              qty: item.quantity,
              price: item.unitPrice,
              discount: item.discount || 0,
              amount: lineTotal - discAmt,
            }
          }),
          total: s.grandTotal,
          paid: s.amountPaid,
          paymentMode: (s.paymentMode || '').toLowerCase(),
          status: (s.paymentStatus || '').toLowerCase(),
        }))

        setCustomer({
          id: c.id,
          name: c.name,
          phone: c.phone,
          age: c.age,
          address: c.address,
          email: c.email || '',
          bankName: c.bankName || '',
          accountNo: c.accountNo || '',
          gstNo: c.gstNo || '',
          lastPurchaseDate: c.lastPurchaseDate || '',
          totalPurchases: c.totalPurchases || purchases.length,
          totalSpent: c.totalSpent || 0,
          firstPurchase: purchases.length > 0 ? purchases[purchases.length - 1].date : '',
          lastPurchase: purchases.length > 0 ? purchases[0].date : '',
          purchases,
        })
      } catch (err) {
        console.error('Failed to fetch customer:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchCustomer()
  }, [id])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 font-medium">Customer not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/customers')}>Back to Customers</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/customers')}
          className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Customer Details</h1>
          <p className="text-slate-500">Purchase history and information</p>
        </div>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
              <span className="text-2xl font-bold text-emerald-600">
                {customer.name.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{customer.name}</h2>
              <p className="text-slate-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                +91 {customer.phone}
              </p>
              <p className="text-slate-500">Age: {customer.age}</p>
              <p className="text-slate-500">Address: {customer.address}</p>
              {customer.email && <p className="text-slate-500">Email: {customer.email}</p>}
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/customers')}>
              Back to List
            </Button>
          </div>
        </div>

        {/* Bank & GST Details */}
        {(customer.bankName || customer.accountNo || customer.gstNo) && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-slate-100">
            {customer.bankName && (
              <div>
                <p className="text-sm text-slate-500">Bank Name</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{customer.bankName}</p>
              </div>
            )}
            {customer.accountNo && (
              <div>
                <p className="text-sm text-slate-500">Account No</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{customer.accountNo}</p>
              </div>
            )}
            {customer.gstNo && (
              <div>
                <p className="text-sm text-slate-500">GST No</p>
                <p className="text-sm font-medium text-slate-800 mt-1">{customer.gstNo}</p>
              </div>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <div>
            <p className="text-sm text-slate-500">Total Purchases</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{customer.totalPurchases} bills</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Total Spent</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(customer.totalSpent)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">First Purchase</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatDate(customer.firstPurchase)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Last Purchase</p>
            <p className="text-xl font-bold text-slate-800 mt-1">{formatDate(customer.lastPurchase)}</p>
          </div>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h3 className="text-lg font-semibold text-slate-800">Purchase History</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Invoice #</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Items</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Total</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customer.purchases.map(purchase => (
                <>
                  <tr key={purchase.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedRow(expandedRow === purchase.id ? null : purchase.id)}
                        className="p-1 text-slate-400 hover:text-slate-600 rounded transition-transform"
                      >
                        <svg
                          className={`w-4 h-4 transition-transform ${expandedRow === purchase.id ? 'rotate-90' : ''}`}
                          fill="none" stroke="currentColor" viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className="text-sm font-medium text-blue-600 cursor-pointer hover:underline"
                        onClick={() => navigate(`/sales/receipt/${purchase.id}`)}
                      >
                        {purchase.invoiceNo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">{formatDateTime(purchase.date)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {purchase.items.length} item{purchase.items.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-800">{formatCurrency(purchase.total)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-emerald-600">{formatCurrency(purchase.paid)}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 capitalize">{purchase.paymentMode}</td>
                    <td className="px-4 py-3">{getStatusBadge(purchase.status)}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => navigate(`/sales/receipt/${purchase.id}`)}
                          className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="View Receipt"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => navigate(`/sales/receipt/${purchase.id}`)}
                          className="p-2 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="Print"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row — Medicine Details */}
                  {expandedRow === purchase.id && (
                    <tr key={`${purchase.id}-expanded`}>
                      <td colSpan={9} className="px-4 py-0">
                        <div className="bg-slate-50 rounded-xl p-4 my-2">
                          <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Medicine Details</p>
                          <table className="w-full">
                            <thead>
                              <tr className="text-xs text-slate-500">
                                <th className="text-left py-1 font-medium">#</th>
                                <th className="text-left py-1 font-medium">Medicine</th>
                                <th className="text-right py-1 font-medium">Qty</th>
                                <th className="text-right py-1 font-medium">Price</th>
                                <th className="text-right py-1 font-medium">Disc%</th>
                                <th className="text-right py-1 font-medium">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {purchase.items.map((item, idx) => (
                                <tr key={idx}>
                                  <td className="py-1.5 text-xs text-slate-600">{idx + 1}</td>
                                  <td className="py-1.5 text-xs text-slate-800 font-medium">{item.name}</td>
                                  <td className="py-1.5 text-xs text-right text-slate-600">{item.qty}</td>
                                  <td className="py-1.5 text-xs text-right text-slate-600">{formatCurrency(item.price)}</td>
                                  <td className="py-1.5 text-xs text-right text-slate-600">{item.discount}%</td>
                                  <td className="py-1.5 text-xs text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>

        {customer.purchases.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-slate-600 font-medium">No purchase history</p>
            <p className="text-slate-400 text-sm">This customer has no recorded purchases</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default CustomerDetail
