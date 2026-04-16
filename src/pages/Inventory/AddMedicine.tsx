import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Input, Select, Textarea } from '../../components/ui'
import { pharmacyAPI } from '../../api/endpoints'

const AddMedicine = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditMode = !!id

  const [suppliers, setSuppliers] = useState<{ id: string; name: string }[]>([])
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    genericName: '',
    categoryId: '',
    description: '',
    manufacturer: '',
    minStock: 10,
    rackNo: '',
    hsnCode: '',
    gstPercent: 12,
    supplierId: '',
    batchNo: '',
    expiryDate: '',
    quantity: '',
    purchasePrice: '',
    sellPrice: '',
    mrp: '',
    invoiceNo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    paymentStatus: 'paid',
    amountPaid: '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load suppliers, categories, and edit data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        const [suppRes, catRes] = await Promise.all([
          pharmacyAPI.getSuppliers({ limit: 100 }),
          pharmacyAPI.getCategories(),
        ])
        setSuppliers((suppRes.data.data || []).map((s: any) => ({ id: s.id, name: s.name })))
        setCategories((catRes.data.data || []).map((c: any) => ({ id: c.id, name: c.name })))

        if (isEditMode && id) {
          const medRes = await pharmacyAPI.getMedicineById(id)
          const m = medRes.data.data
          setFormData(prev => ({
            ...prev,
            name: m.name || '',
            genericName: m.genericName || '',
            categoryId: m.categoryId || '',
            description: m.description || '',
            manufacturer: m.manufacturer || '',
            minStock: m.minStock || 10,
            rackNo: m.rackNo || '',
            hsnCode: m.hsnCode || '',
            gstPercent: m.gstPercent || 12,
          }))
        }
      } catch (err) {
        console.error('Failed to load form data:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id, isEditMode])

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) newErrors.name = 'Medicine name is required'
    // if (!formData.genericName.trim()) newErrors.genericName = 'Generic name is required'
    // if (!formData.form) newErrors.form = 'Form is required'
    if (!formData.categoryId) newErrors.categoryId = 'Category is required'
    
    // Stock validation (only if adding stock)
    if (!isEditMode || formData.quantity) {
      if (!formData.supplierId) newErrors.supplierId = 'Supplier is required'
      if (!formData.batchNo.trim()) newErrors.batchNo = 'Batch number is required'
      if (!formData.expiryDate) newErrors.expiryDate = 'Expiry date is required'
      if (!formData.quantity || Number(formData.quantity) <= 0) newErrors.quantity = 'Valid quantity is required'
      if (!formData.purchasePrice || Number(formData.purchasePrice) <= 0) newErrors.purchasePrice = 'Purchase price is required'
      if (!formData.sellPrice || Number(formData.sellPrice) <= 0) newErrors.sellPrice = 'Sell price is required'
      if (!formData.mrp || Number(formData.mrp) <= 0) newErrors.mrp = 'MRP is required'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return

    try {
      setSubmitting(true)
      const payload: Record<string, any> = {
        name: formData.name,
        genericName: formData.genericName,
        categoryId: formData.categoryId,
        description: formData.description,
        manufacturer: formData.manufacturer,
        minStock: Number(formData.minStock),
        rackNo: formData.rackNo,
        hsnCode: formData.hsnCode,
        gstPercent: Number(formData.gstPercent),
      }

      if (!isEditMode) {
        payload.supplierId = formData.supplierId
        payload.batchNo = formData.batchNo
        payload.expiryDate = formData.expiryDate
        payload.stock = Number(formData.quantity)
        payload.unitPrice = Number(formData.purchasePrice)
        payload.sellingPrice = Number(formData.sellPrice)
        payload.mrp = Number(formData.mrp)
      }

      if (isEditMode && id) {
        await pharmacyAPI.updateMedicine(id, payload)
      } else {
        await pharmacyAPI.addMedicine(payload)

        // Record supplier payment if amount was paid
        if (formData.supplierId && formData.paymentStatus !== 'pending') {
          const totalPurchaseAmount = Number(formData.quantity) * Number(formData.purchasePrice)
          const paidAmount = formData.paymentStatus === 'paid'
            ? totalPurchaseAmount
            : Number(formData.amountPaid) || 0

          if (paidAmount > 0) {
            try {
              await pharmacyAPI.addSupplierPayment(formData.supplierId, {
                amount: paidAmount,
                paymentMode: 'CASH',
                note: `Payment for ${formData.name}${formData.invoiceNo ? ` (Inv: ${formData.invoiceNo})` : ''}`,
              })
            } catch (payErr) {
              console.error('Medicine added but supplier payment failed:', payErr)
            }
          }
        }
      }

      navigate('/inventory')
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to save medicine'
      alert(msg)
    } finally {
      setSubmitting(false)
    }
  }

  const calculateProfit = () => {
    const purchase = Number(formData.purchasePrice) || 0
    const sell = Number(formData.sellPrice) || 0
    if (purchase === 0) return { margin: 0, percent: 0 }
    return {
      margin: sell - purchase,
      percent: ((sell - purchase) / purchase * 100).toFixed(1)
    }
  }

  const profit = calculateProfit()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {isEditMode ? 'Edit Medicine' : 'Add New Medicine'}
          </h1>
          <p className="text-slate-500">
            {isEditMode ? 'Update medicine details' : 'Add medicine with stock and pricing'}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
            </svg>
            Medicine Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Medicine Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                placeholder="e.g., Paracetamol 500mg"
                error={errors.name}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Generic Name
              </label>
              <Input
                value={formData.genericName}
                onChange={(e) => handleChange('genericName', e.target.value)}
                placeholder="e.g., Paracetamol"
                error={errors.genericName}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Manufacturer
              </label>
              <Input
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                placeholder="e.g., Sun Pharma"
              />
            </div>
            {/* <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Form <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.form}
                onChange={(e) => handleChange('form', e.target.value)}
                options={[
                  { value: '', label: 'Select Form' },
                  ...forms.map(f => ({ value: f, label: f }))
                ]}
                error={errors.form}
              />
            </div> */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                options={[
                  { value: '', label: 'Select Category' },
                  ...categories.map(c => ({ value: c.id, label: c.name }))
                ]}
                error={errors.categoryId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Minimum Stock Level
              </label>
              <Input
                type="number"
                value={formData.minStock}
                onChange={(e) => handleChange('minStock', e.target.value)}
                placeholder="10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Rack/Shelf Number
              </label>
              <Input
                value={formData.rackNo}
                onChange={(e) => handleChange('rackNo', e.target.value)}
                placeholder="e.g., A-01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                HSN Code
              </label>
              <Input
                value={formData.hsnCode}
                onChange={(e) => handleChange('hsnCode', e.target.value)}
                placeholder="e.g., 30049099"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                GST %
              </label>
              <Select
                value={formData.gstPercent.toString()}
                onChange={(e) => handleChange('gstPercent', e.target.value)}
                options={[
                  { value: '0', label: '0%' },
                  { value: '5', label: '5%' },
                  { value: '12', label: '12%' },
                  { value: '18', label: '18%' },
                ]}
              />
            </div>
            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Description
              </label>
              <Textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Brief description of the medicine..."
                rows={2}
              />
            </div>
          </div>
        </div>

        {/* Stock & Purchase Details */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            Stock & Purchase Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Supplier <span className="text-red-500">*</span>
              </label>
              <Select
                value={formData.supplierId}
                onChange={(e) => handleChange('supplierId', e.target.value)}
                options={[
                  { value: '', label: 'Select Supplier' },
                  ...suppliers.map(s => ({ value: s.id, label: s.name }))
                ]}
                error={errors.supplierId}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Batch Number <span className="text-red-500">*</span>
              </label>
              <Input
                value={formData.batchNo}
                onChange={(e) => handleChange('batchNo', e.target.value)}
                placeholder="e.g., BAT-2026-001"
                error={errors.batchNo}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Expiry Date <span className="text-red-500">*</span>
              </label>
              <Input
                type="date"
                value={formData.expiryDate}
                onChange={(e) => handleChange('expiryDate', e.target.value)}
                error={errors.expiryDate}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quantity <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => handleChange('quantity', e.target.value)}
                placeholder="Enter quantity"
                error={errors.quantity}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invoice Number
              </label>
              <Input
                value={formData.invoiceNo}
                onChange={(e) => handleChange('invoiceNo', e.target.value)}
                placeholder="e.g., INV-2026-001"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Invoice Date
              </label>
              <Input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleChange('invoiceDate', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Pricing Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pricing Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Purchase Price (per unit) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.purchasePrice}
                onChange={(e) => handleChange('purchasePrice', e.target.value)}
                placeholder="₹0.00"
                error={errors.purchasePrice}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Sell Price (per unit) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.sellPrice}
                onChange={(e) => handleChange('sellPrice', e.target.value)}
                placeholder="₹0.00"
                error={errors.sellPrice}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                MRP (per unit) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                value={formData.mrp}
                onChange={(e) => handleChange('mrp', e.target.value)}
                placeholder="₹0.00"
                error={errors.mrp}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Profit Margin
              </label>
              <div className="h-10 px-3 flex items-center bg-emerald-50 rounded-xl border border-emerald-200">
                <span className="text-emerald-700 font-medium">
                  ₹{profit.margin.toFixed(2)} ({profit.percent}%)
                </span>
              </div>
            </div>
          </div>

          {/* Total Purchase Amount */}
          {formData.quantity && formData.purchasePrice && (
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-700">Total Purchase Amount</p>
                  <p className="text-xs text-blue-600">{formData.quantity} units × ₹{formData.purchasePrice}</p>
                </div>
                <p className="text-2xl font-bold text-blue-700">
                  ₹{(Number(formData.quantity) * Number(formData.purchasePrice)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Payment Information */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
            Payment to Supplier
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Payment Status
              </label>
              <Select
                value={formData.paymentStatus}
                onChange={(e) => handleChange('paymentStatus', e.target.value)}
                options={[
                  { value: 'paid', label: 'Fully Paid' },
                  { value: 'partial', label: 'Partially Paid' },
                  { value: 'pending', label: 'Pending' },
                ]}
              />
            </div>
            {formData.paymentStatus !== 'pending' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount Paid
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => handleChange('amountPaid', e.target.value)}
                  placeholder="₹0.00"
                />
              </div>
            )}
            {formData.paymentStatus !== 'pending' && formData.quantity && formData.purchasePrice && formData.amountPaid && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Pending Amount
                </label>
                <div className="h-10 px-3 flex items-center bg-red-50 rounded-xl border border-red-200">
                  <span className="text-red-700 font-medium">
                    ₹{(Number(formData.quantity) * Number(formData.purchasePrice) - Number(formData.amountPaid)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <Button variant="outline" type="button" onClick={() => navigate(-1)}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {submitting ? 'Saving...' : isEditMode ? 'Update Medicine' : 'Add Medicine'}
          </Button>
        </div>
      </form>
      )}
    </div>
  )
}

export default AddMedicine
