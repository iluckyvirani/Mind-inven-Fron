import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Input, Select, Badge } from '../../components/ui'
import { salesAPI, pharmacyAPI, customerAPI } from '../../api/endpoints'

interface MedicineItem {
  id: string
  name: string
  batchNo: string
  availableQty: number
  quantity: number
  unitPrice: number
  discount: number
  amount: number
}

interface SearchMedicine {
  id: string
  name: string
  batchNo: string
  stock: number
  price: number
}

const CreateSale = () => {
  const navigate = useNavigate()

  // Customer state
  const [customerPhone, setCustomerPhone] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [customerAge, setCustomerAge] = useState<string>('')
  const [customerAddress, setCustomerAddress] = useState('')
  const [customerStatus, setCustomerStatus] = useState<'none' | 'existing' | 'new'>('none')

  // Customer select dropdown state
  const [allCustomers, setAllCustomers] = useState<{ id: string; name: string; phone: string; age: number; address: string }[]>([])
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false)
  const [customerSearchTerm, setCustomerSearchTerm] = useState('')

  // Medicine state
  const [medicineSearch, setMedicineSearch] = useState('')
  const [showMedicineDropdown, setShowMedicineDropdown] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchMedicine[]>([])
  const [items, setItems] = useState<MedicineItem[]>([])

  // Payment state
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [amountPaid, setAmountPaid] = useState<number | ''>('')
  const [notes, setNotes] = useState('')
  const [prescribedBy, setPrescribedBy] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Fetch all customers for dropdown
  useEffect(() => {
    const fetchAllCustomers = async () => {
      try {
        const res = await customerAPI.getAll({ limit: 200 })
        const data = (res.data.data || []).map((c: any) => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          age: c.age || 0,
          address: c.address || '',
        }))
        setAllCustomers(data)
      } catch {
        // ignore
      }
    }
    fetchAllCustomers()
  }, [])

  // Filter customers for dropdown
  const filteredCustomers = allCustomers.filter(c =>
    c.name.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
    c.phone.includes(customerSearchTerm)
  )

  const selectCustomer = (c: { id: string; name: string; phone: string; age: number; address: string }) => {
    setCustomerPhone(c.phone)
    setCustomerName(c.name)
    setCustomerAge(c.age ? String(c.age) : '')
    setCustomerAddress(c.address || '')
    setCustomerStatus('existing')
    setShowCustomerDropdown(false)
    setCustomerSearchTerm('')
  }

  // Customer phone lookup (debounced)
  useEffect(() => {
    if (customerPhone.length < 10) {
      setCustomerStatus('none')
      setCustomerName('')
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await customerAPI.getAll({ search: customerPhone })
        const customers = res.data.data || []
        const found = customers.find((c: any) => c.phone === customerPhone)
        if (found) {
          setCustomerName(found.name)
          setCustomerAge(found.age ? String(found.age) : '')      // ← add
          setCustomerAddress(found.address || '')                  // ← add
          setCustomerStatus('existing')
        } else {
          setCustomerStatus('new')
          setCustomerAge('')          // ← add
          setCustomerAddress('')      // ← add
        }
      } catch {
        setCustomerStatus('new')
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [customerPhone])

  // Medicine search (debounced)
  useEffect(() => {
    if (medicineSearch.length < 2) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await pharmacyAPI.getMedicines({ search: medicineSearch, limit: 10 })
        const data = (res.data.data || [])
          .filter((m: any) => !items.some(i => i.id === m.id))
          .map((m: any) => ({
            id: m.id,
            name: m.name,
            batchNo: m.batchNo || '',
            stock: m.stock,
            price: m.sellingPrice,
          }))
        setSearchResults(data)
      } catch {
        setSearchResults([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [medicineSearch, items])

  // Filter medicines for search
  const filteredMedicines = searchResults

  const addMedicine = useCallback((med: SearchMedicine) => {
    setItems(prev => [
      ...prev,
      {
        id: med.id,
        name: med.name,
        batchNo: med.batchNo,
        availableQty: med.stock,
        quantity: 1,
        unitPrice: med.price,
        discount: 0,
        amount: med.price,
      },
    ])
    setMedicineSearch('')
    setShowMedicineDropdown(false)
  }, [])

  const updateItem = (index: number, field: keyof MedicineItem, value: number) => {
    setItems(prev => {
      const updated = [...prev]
      const item = { ...updated[index], [field]: value }
      const subtotal = item.quantity * item.unitPrice
      item.amount = subtotal - (subtotal * item.discount) / 100
      updated[index] = item
      return updated
    })
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  // Bill calculations
  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const totalDiscount = items.reduce((sum, item) => {
    const itemSubtotal = item.quantity * item.unitPrice
    return sum + (itemSubtotal * item.discount) / 100
  }, 0)
  const taxRate = 0 // GST if applicable
  const taxAmount = ((subtotal - totalDiscount) * taxRate) / 100
  const grandTotal = subtotal - totalDiscount + taxAmount
  const balance = grandTotal - (typeof amountPaid === 'number' ? amountPaid : 0)

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const handleSubmit = async (printAfter: boolean) => {
    if (!customerPhone || !customerName || items.length === 0) return

    const payload = {
      customerName,
      customerPhone,
      customerAge: customerAge ? parseInt(customerAge) : undefined,   // ← add
      customerAddress: customerAddress || undefined,
      items: items.map(i => ({
        medicineId: i.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discount: i.discount,
      })),
      paymentMode: paymentMode as 'cash' | 'card' | 'upi',
      amountPaid: typeof amountPaid === 'number' ? amountPaid : 0,
      notes,
      prescribedBy,
    }

    try {
      setSubmitting(true)
      const res = await salesAPI.create(payload)
      const saleId = res.data.data?.id

      if (printAfter && saleId) {
        navigate(`/sales/receipt/${saleId}`)
      } else {
        navigate('/sales')
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create sale')
    } finally {
      setSubmitting(false)
    }
  }

  const isValid = customerPhone.length >= 10 && customerName.trim() !== '' && items.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create New Sale</h1>
          <p className="text-slate-500">Add customer, medicines and generate bill</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/sales')}>
          Cancel
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Customer + Medicines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Customer Details */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Customer Details
            </h2>

            {/* Select Existing Customer */}
            <div className="relative mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Select Existing Customer</label>
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search customer by name or phone..."
                  value={customerSearchTerm}
                  onChange={e => {
                    setCustomerSearchTerm(e.target.value)
                    setShowCustomerDropdown(e.target.value.length > 0)
                  }}
                  onFocus={() => {
                    if (customerSearchTerm.length > 0) setShowCustomerDropdown(true)
                  }}
                  onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
              {showCustomerDropdown && filteredCustomers.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
                  {filteredCustomers.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center justify-between transition-colors"
                      onMouseDown={() => selectCustomer(c)}
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.phone}</p>
                      </div>
                      {c.address && <span className="text-xs text-slate-400">{c.address}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="relative mb-4 flex items-center gap-4">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-xs text-slate-400 font-medium uppercase">or enter manually</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Customer Phone"
                  type="tel"
                  placeholder="Enter 10-digit phone number"
                  value={customerPhone}
                  onChange={e => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                    setCustomerPhone(val)
                  }}
                  required
                />
                {customerStatus === 'existing' && (
                  <div className="mt-2">
                    <Badge variant="success">&#10003; Existing customer</Badge>
                  </div>
                )}
                {customerStatus === 'new' && (
                  <div className="mt-2">
                    <Badge variant="info">&#x1F195; New customer</Badge>
                  </div>
                )}
              </div>
              <Input
                label="Customer Name"
                placeholder="Customer name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                required
                disabled={customerStatus === 'existing'}
              />
              <Input
                label="Age"
                type="number"
                placeholder="e.g. 35"
                value={customerAge}
                onChange={e => setCustomerAge(e.target.value.replace(/\D/g, '').slice(0, 3))}
                disabled={customerStatus === 'existing'}
              />
              <Input
                label="Address"
                placeholder="Patient address"
                value={customerAddress}
                onChange={e => setCustomerAddress(e.target.value)}
                disabled={customerStatus === 'existing'}
              />
            </div>
          </div>

          {/* Section 2: Add Medicines */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Add Medicines
            </h2>

            {/* Medicine Search */}
            <div className="relative mb-4">
              <div className="relative">
                <svg className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search medicine by name..."
                  value={medicineSearch}
                  onChange={e => {
                    setMedicineSearch(e.target.value)
                    setShowMedicineDropdown(e.target.value.length > 0)
                  }}
                  onFocus={() => {
                    if (medicineSearch.length > 0) setShowMedicineDropdown(true)
                  }}
                  onBlur={() => setTimeout(() => setShowMedicineDropdown(false), 200)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              {showMedicineDropdown && filteredMedicines.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg max-h-60 overflow-y-auto">
                  {filteredMedicines.map(med => (
                    <button
                      key={med.id}
                      type="button"
                      className="w-full px-4 py-3 text-left hover:bg-emerald-50 flex items-center justify-between transition-colors"
                      onMouseDown={() => addMedicine(med)}
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

            {/* Medicine Items Table */}
            {items.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">#</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Medicine</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Batch</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Stock</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Qty</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Price</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Disc %</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase">Amount</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-3 py-2 text-sm text-slate-600">{idx + 1}</td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-800">{item.name}</td>
                        <td className="px-3 py-2 text-sm text-slate-500">{item.batchNo}</td>
                        <td className="px-3 py-2 text-sm text-slate-500">{item.availableQty}</td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={1}
                            max={item.availableQty}
                            value={item.quantity}
                            onChange={e => updateItem(idx, 'quantity', Math.min(Number(e.target.value) || 1, item.availableQty))}
                            className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            value={item.unitPrice}
                            onChange={e => updateItem(idx, 'unitPrice', Number(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            value={item.discount}
                            onChange={e => updateItem(idx, 'discount', Math.min(Number(e.target.value) || 0, 100))}
                            className="w-16 px-2 py-1 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                          />
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => removeItem(idx)}
                            className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Remove"
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
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
                <p className="text-sm">Search and add medicines above</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Bill Summary */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
              </svg>
              Bill Summary
            </h2>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Subtotal</span>
                <span className="font-medium text-slate-800">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Discount</span>
                <span className="font-medium text-red-600">-{formatCurrency(totalDiscount)}</span>
              </div>
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Tax ({taxRate}%)</span>
                  <span className="font-medium text-slate-800">{formatCurrency(taxAmount)}</span>
                </div>
              )}
              <div className="border-t border-slate-200 pt-3 flex justify-between">
                <span className="text-base font-semibold text-slate-800">Grand Total</span>
                <span className="text-base font-bold text-emerald-600">{formatCurrency(grandTotal)}</span>
              </div>
            </div>

            <div className="space-y-4">
              <Select
                label="Payment Mode"
                value={paymentMode}
                onChange={e => setPaymentMode(e.target.value)}
                options={[
                  { value: 'CASH', label: 'Cash' },
                  { value: 'CARD', label: 'Card' },
                  { value: 'UPI', label: 'UPI' },
                ]}
              />

              <Input
                label="Amount Paid"
                type="number"
                placeholder="0"
                value={amountPaid === '' ? '' : amountPaid}
                onChange={e => {
                  const val = e.target.value
                  setAmountPaid(val === '' ? '' : Number(val))
                }}
              />

              <div className={`flex justify-between p-3 rounded-xl ${balance > 0 ? 'bg-red-50' : balance < 0 ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                <span className="text-sm font-medium text-slate-700">Balance</span>
                <span className={`text-sm font-bold ${balance > 0 ? 'text-red-600' : balance < 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(Math.abs(balance))}
                  {balance > 0 ? ' Due' : balance < 0 ? ' Change' : ''}
                </span>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Reference By (optional)</label>
                <input
                  type="text"
                  value={prescribedBy}
                  onChange={e => setPrescribedBy(e.target.value)}
                  placeholder="Reference name..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-sm"
                />
              </div>


              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Notes (optional)</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 resize-none text-sm"
                />
              </div>
            </div>

            <div className="mt-6 space-y-3">
              <Button
                className="w-full"
                disabled={!isValid || submitting}
                onClick={() => handleSubmit(true)}
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {submitting ? 'Saving...' : 'Save & Print Receipt'}
              </Button>
              <Button
                variant="outline"
                className="w-full"
                disabled={!isValid || submitting}
                onClick={() => handleSubmit(false)}
              >
                Save Only
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CreateSale
