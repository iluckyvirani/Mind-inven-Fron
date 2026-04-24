import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Button, Badge } from '../../components/ui'
import { salesAPI } from '../../api/endpoints'

interface ReceiptData {
  invoiceNo: string
  date: string
  customer: { name: string; phone: string, age: string, address?: string }
  items: { name: string; qty: number; price: number; discount: number; amount: number }[]
  subtotal: number
  discount: number
  tax: number
  grandTotal: number
  paymentMode: string
  amountPaid: number
  balance: number
  status: string
  prescribedBy?: string
  shop?: { name?: string; address?: string; mobile?: string; tagline?: string; gstin?: string; licenseNo?: string }
}

const SaleReceipt = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [receipt, setReceipt] = useState<ReceiptData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchReceipt = async () => {
      if (!id) return
      try {
        setLoading(true)
        const res = await salesAPI.getReceipt(id)
        const { sale, shop } = res.data.data

        const items = (sale.items || []).map((item: any) => {
          const lineTotal = item.quantity * item.unitPrice
          const discountAmt = (lineTotal * (item.discount || 0)) / 100
          return {
            name: item.medicine?.name || '',
            qty: item.quantity,
            price: item.unitPrice,
            discount: item.discount || 0,
            amount: lineTotal - discountAmt,
          }
        })

        setReceipt({
          invoiceNo: sale.invoiceNo,
          date: sale.date || sale.createdAt,
          customer: {
            name: sale.customer?.name || 'Walk-in',
            phone: sale.customer?.phone || '',
            age: sale.customer?.age || '',
            address: sale.customer?.address || '',
          },
          items,
          subtotal: sale.subtotal || 0,
          prescribedBy: sale.prescribedby || '',
          discount: sale.discount || sale.totalDiscount || 0,
          tax: sale.tax || 0,
          grandTotal: sale.grandTotal,
          paymentMode: (sale.paymentMode || '').toLowerCase(),
          amountPaid: sale.amountPaid,
          balance: sale.balance || 0,
          status: (sale.paymentStatus || '').toLowerCase(),
          shop: shop || {},
        })
      } catch (err) {
        console.error('Failed to fetch receipt:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchReceipt()
  }, [id])

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const numberToWords = (amount: number): string => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
      'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
      'Seventeen', 'Eighteen', 'Nineteen']
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

    if (amount === 0) return 'Zero Rupees Only'
    const rupees = Math.floor(amount)
    const paise = Math.round((amount - rupees) * 100)

    const convert = (n: number): string => {
      if (n === 0) return ''
      if (n < 20) return ones[n] + ' '
      if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '') + ' '
      if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred ' + convert(n % 100)
      if (n < 100000) return convert(Math.floor(n / 1000)) + 'Thousand ' + convert(n % 1000)
      if (n < 10000000) return convert(Math.floor(n / 100000)) + 'Lakh ' + convert(n % 100000)
      return convert(Math.floor(n / 10000000)) + 'Crore ' + convert(n % 10000000)
    }

    let result = convert(rupees).trim() + ' Rupees'
    if (paise > 0) result += ' and ' + convert(paise).trim() + ' Paise'
    return result + ' Only'
  }

const handlePrint = () => {
  if (!receipt) return

  const safe = (v: unknown) => String(v ?? '').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const status = (receipt.status || 'pending').toLowerCase()
  const badgeStyle =
    status === 'paid'    ? 'color:#065f46;background:#d1fae5' :
    status === 'partial' ? 'color:#92400e;background:#fef3c7' :
                           'color:#991b1b;background:#fee2e2'

  const rows = receipt.items.map((item, i) => `
    <tr>
      <td>${i + 1}</td>
      <td>${safe(item.name)}</td>
      <td class="r">${item.qty}</td>
      <td class="r">${formatCurrency(item.price)}</td>
      <td class="r">${item.discount}%</td>
      <td class="r"><b>${formatCurrency(item.amount)}</b></td>
    </tr>`).join('')

  const amountInWords = numberToWords(receipt.grandTotal)
  const licNo = receipt.shop?.licenseNo || ''
  const licLine1 = licNo.slice(0, 14).trim()
  const licLine2 = licNo.slice(14).trim()

  const html = `<!doctype html><html><head><meta charset="utf-8">
<title> </title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#1f2937;background:#fff}

/* ── The slip sits in the TOP half of an A4 portrait page ── */
.slip{
  width:200mm;
  margin:0 auto;
  min-height:130mm;
  max-height:138mm;
  overflow:hidden;
  border:1.5px solid #1e293b;
  padding:5mm 9mm 4mm;
}

.shop-meta{display:flex;justify-content:space-between;font-size:8px;color:#475569;font-weight:600;margin-bottom:3px;line-height:1.4}
.shop-center{text-align:center;padding:5px 0 6px;border-bottom:2px dashed #334155;margin-bottom:5px}
.shop-name{font-size:26px;font-weight:800;color:#1e40af;line-height:1.1}
.shop-sub{font-size:9px;color:#475569;font-weight:700;margin-top:2px}

.info-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px dashed #94a3b8;margin-bottom:4px}
.lbl{font-size:7px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;font-weight:600}
.val{font-size:11px;font-weight:700;color:#1e293b}
.sm{font-size:8px;color:#64748b}
.badge{font-size:7px;font-weight:700;border-radius:999px;padding:2px 9px;text-transform:uppercase;letter-spacing:.4px;white-space:nowrap;${badgeStyle}}

.cust-row{display:flex;justify-content:space-between;align-items:flex-start;padding:3px 0 5px;border-bottom:1px dashed #94a3b8;margin-bottom:5px}
.cname{font-size:10px;font-weight:700;color:#1e293b}
.cdet{font-size:7.5px;color:#64748b;margin-top:1px;line-height:1.4}

table{width:100%;border-collapse:collapse;margin-bottom:4px}
th{font-size:7.5px;color:#475569;font-weight:700;background:#f1f5f9;text-transform:uppercase;letter-spacing:.3px;border:1px solid #cbd5e1;padding:3px 5px;text-align:left}
td{font-size:8.5px;border:1px solid #cbd5e1;padding:3px 5px}
.r{text-align:right}

.words{background:#f0f9ff;border:1px solid #bae6fd;border-radius:3px;padding:3px 7px;font-size:7.5px;color:#0c4a6e;margin-bottom:5px}

.bottom{display:flex;gap:10px;border-top:2px dashed #334155;padding-top:5px;margin-top:2px;align-items:flex-start}
.col{flex:1}
.col-title{font-size:7px;color:#475569;text-transform:uppercase;letter-spacing:.5px;font-weight:700;border-bottom:1px solid #e2e8f0;padding-bottom:2px;margin-bottom:3px}
.line{display:flex;justify-content:space-between;font-size:8.5px;margin:2px 0}
.grand-line{display:flex;justify-content:space-between;font-size:13px;font-weight:800;border-top:1.5px solid #334155;margin-top:4px;padding-top:3px}
.gs{color:#059669;font-weight:700}
.gd{color:#dc2626;font-weight:700}

.sig{text-align:center;min-width:90px;padding-top:22px}
.sig-line{border-top:1px solid #1e293b;width:90px;margin:0 auto 3px}
.sig-lbl{font-size:7px;color:#475569;font-weight:700}
.footer{text-align:center;margin-top:5px;padding-top:4px;border-top:1px dashed #334155;font-size:7.5px;color:#64748b;font-weight:600}

/* ── Print: A4 portrait, slip in top half ── */
@page{
  size:A4 portrait;
  margin:5mm 5mm 0;
}
@media print{
  html,body{width:210mm;height:148.5mm;margin:0;padding:0;overflow:hidden}
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .slip{page-break-inside:avoid;page-break-after:avoid}
}
</style></head><body>
<div class="slip">

  <div class="shop-meta">
    <span>${receipt.shop?.gstin ? `GSTIN: ${safe(receipt.shop.gstin)}` : ''}</span>
    <div style="text-align:right">
      ${licLine1 ? `<div>Drug Lic. No: ${safe(licLine1)}</div>` : ''}
      ${licLine2 ? `<div style="padding-left:70px">${safe(licLine2)}</div>` : ''}
    </div>
  </div>

  <div class="shop-center">
    <div class="shop-name">${safe(receipt.shop?.name || 'DIMAG PHARMACY')}</div>
    <div class="shop-sub">${safe(receipt.shop?.address || '')}</div>
    ${receipt.shop?.mobile ? `<div class="shop-sub" style="margin-top:1px">Mobile: ${safe(receipt.shop.mobile)}</div>` : ''}
  </div>

  <div class="info-row">
    <div><div class="lbl">Invoice No.</div><div class="val">${safe(receipt.invoiceNo)}</div></div>
    <div style="text-align:right">
      <div class="lbl">Date</div>
      <div class="val">${formatDate(receipt.date)}</div>
      <div class="sm">${formatTime(receipt.date)}</div>
    </div>
  </div>

  <div class="cust-row">
    <div>
      <div class="lbl">Customer</div>
      <div class="cname">${safe(receipt.customer.name)}</div>
      <div class="cdet">+91 ${safe(receipt.customer.phone)} &nbsp;·&nbsp; Age: ${safe(receipt.customer.age)} &nbsp;·&nbsp; ${safe(receipt.customer.address)}</div>
      ${receipt.prescribedBy ? `<div class="cdet"><b>Reference by:</b> ${safe(receipt.prescribedBy)}</div>` : ''}
    </div>
    <span class="badge">${safe(status)}</span>
  </div>

  <table>
    <thead>
      <tr><th>#</th><th>Medicine</th><th class="r">Qty</th><th class="r">Price</th><th class="r">Disc%</th><th class="r">Amount</th></tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>

  <div class="words">Amount in words: <b>${safe(amountInWords)}</b></div>

  <div class="bottom">
    <div class="col">
      <div class="col-title">Summary</div>
      <div class="line"><span>Subtotal</span><span>${formatCurrency(receipt.subtotal)}</span></div>
      ${receipt.discount > 0 ? `<div class="line"><span>Discount</span><span class="gd">-${formatCurrency(receipt.discount)}</span></div>` : ''}
      ${receipt.tax > 0 ? `<div class="line"><span>GST</span><span class="gs">+${formatCurrency(receipt.tax)}</span></div>` : ''}
      <div class="grand-line"><span>Grand Total</span><span class="gs">${formatCurrency(receipt.grandTotal)}</span></div>
    </div>
    <div class="col">
      <div class="col-title">Payment</div>
      <div class="line"><span>Mode</span><span style="text-transform:capitalize">${safe(receipt.paymentMode)}</span></div>
      <div class="line"><span>Amount Paid</span><span class="gs">${formatCurrency(receipt.amountPaid)}</span></div>
      ${receipt.balance > 0 ? `<div class="line"><span>Balance Due</span><span class="gd">${formatCurrency(receipt.balance)}</span></div>` : ''}
    </div>
    <div class="sig">
      <div class="sig-line"></div>
      <div class="sig-lbl">Authorized Signatory</div>
    </div>
  </div>

  <div class="footer">Thank you for your purchase! &nbsp;·&nbsp; Get well soon!</div>

</div>
</body></html>`

  const printWin = window.open('', '_blank')
  if (!printWin) { alert('Please allow pop-ups to print the receipt.'); return }
  printWin.document.write(html)
  printWin.document.close()
  printWin.onload = () => { printWin.focus(); printWin.print() }
}

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    )
  }

  if (!receipt) {
    return (
      <div className="text-center py-16">
        <p className="text-slate-600 font-medium">Receipt not found</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/sales')}>Back to Sales</Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 print:space-y-0">
      {/* Header (hidden on print) */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sale Receipt</h1>
          <p className="text-slate-500">Invoice {receipt.invoiceNo}</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => navigate('/sales')} className='cursor-pointer'>
            Back to Sales
          </Button>
          <Button onClick={handlePrint} className='bg-linear-to-r from-emerald-600 to-teal-500 cursor-pointer text-white text-sm font-semibold rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-xl hover:shadow-emerald-500/30 hover:-translate-y-0.5 hover:bg-green-700 transition-all duration-300'>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print Receipt
          </Button>
        </div>
      </div>

      {/* Receipt */}
      <div id="printable-bill" className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 print:max-w-none print:w-full print:mx-0 print:shadow-none print:border-none print:rounded-none">
        {/* Shop Header */}
        <div className="flex items-center justify-between gap-4 px-6 py-2 print:px-10 print:py-6">
          {receipt.shop?.gstin && <p className="text-sm print:text-[24px] text-slate-600 font-bold">GSTIN: {receipt.shop.gstin}</p>}
          {receipt.shop?.licenseNo &&
            <div className="text-right">
              <p className="text-sm print:text-[24px] text-slate-600 font-bold">Drug Lic. No: {receipt.shop.licenseNo.slice(0, 14).trim()}</p>
              <p className="text-sm print:text-[24px] text-slate-600 font-bold ml-auto">{receipt.shop.licenseNo.slice(14).trim()}</p>
            </div>
          }
        </div>
        <div className="text-center py-4 print:py-5 border-b border-dashed border-slate-300">
          <h2 className="text-2xl print:text-4xl font-bold text-blue-700">{receipt.shop?.name || 'DIMAG PHARMACY'}</h2>
          <p className="text-sm print:text-[26px] text-slate-600 mt-1 font-bold">{receipt.shop?.address || ''}</p>
          <p className="text-sm print:text-[24px] text-slate-600 font-bold">{receipt.shop?.mobile ? `Mobile: ${receipt.shop.mobile}` : ''}</p>
        </div>

        {/* Invoice Info */}
        <div className="px-6 py-5 border-b border-dashed border-slate-300">
          <div className="flex justify-between">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Invoice No.</p>
              <p className="text-sm font-semibold text-slate-800">{receipt.invoiceNo}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 uppercase tracking-wide">Date</p>
              <p className="text-sm font-semibold text-slate-800">{formatDate(receipt.date)}</p>
              <p className="text-xs text-slate-500">{formatTime(receipt.date)}</p>
            </div>
          </div>
        </div>

        {/* Customer Info */}
        <div className="px-6 py-5 border-b border-dashed border-slate-300">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Customer</p>
              <p className="text-sm font-semibold text-slate-800">{receipt.customer.name}</p>
              <p className="text-xs text-slate-500 py-2">+91 {receipt.customer.phone} &bull; Age: {receipt.customer.age} &bull; {receipt.customer.address}</p>
              <p className="text-xs text-slate-500 py-2">Reference by: {receipt.prescribedBy || 'N/A'}</p>
            </div>
            <Badge variant={receipt.status === 'paid' ? 'success' : receipt.status === 'partial' ? 'warning' : 'danger'}>
              {receipt.status.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Medicines Table */}
        <div className="px-6 py-5 border-b border-dashed border-slate-300">
          <p className="text-xs font-semibold text-slate-600 uppercase mb-3">Medicines</p>
          <table className="w-full">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 font-medium">#</th>
                <th className="text-left py-2 font-medium">Medicine</th>
                <th className="text-right py-2 font-medium">Qty</th>
                <th className="text-right py-2 font-medium">Price</th>
                <th className="text-right py-2 font-medium">Disc%</th>
                <th className="text-right py-2 font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.map((item, idx) => (
                <tr key={idx}>
                  <td className="py-2 text-sm text-slate-600">{idx + 1}</td>
                  <td className="py-2 text-sm text-slate-800">{item.name}</td>
                  <td className="py-2 text-sm text-right text-slate-600">{item.qty}</td>
                  <td className="py-2 text-sm text-right text-slate-600">{formatCurrency(item.price)}</td>
                  <td className="py-2 text-sm text-right text-slate-600">{item.discount}%</td>
                  <td className="py-2 text-sm text-right font-medium text-slate-800">{formatCurrency(item.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="px-6 py-5 border-b border-dashed border-slate-300 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal</span>
            <span className="text-slate-800">{formatCurrency(receipt.subtotal)}</span>
          </div>
          {receipt.discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Discount</span>
              <span className="text-red-600">-{formatCurrency(receipt.discount)}</span>
            </div>
          )}
          {receipt.tax > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">GST</span>
              <span className="text-slate-800">+{formatCurrency(receipt.tax)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold pt-2 border-t border-slate-200">
            <span className="text-slate-800">Grand Total</span>
            <span className="text-emerald-600">{formatCurrency(receipt.grandTotal)}</span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="px-6 py-5 border-b border-dashed border-slate-300">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Payment Mode</span>
            <span className="text-slate-800 capitalize font-medium">{receipt.paymentMode}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-slate-600">Amount Paid</span>
            <span className="text-emerald-600 font-medium">{formatCurrency(receipt.amountPaid)}</span>
          </div>
          {receipt.balance > 0 && (
            <div className="flex justify-between text-sm mt-1">
              <span className="text-slate-600">Balance Due</span>
              <span className="text-red-600 font-medium">{formatCurrency(receipt.balance)}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center py-6">
          <p className="text-sm text-slate-600 font-medium">Thank you for your purchase!</p>
          <p className="text-xs text-slate-400 mt-1">Get well soon!</p>
        </div>
      </div>
    </div>
  )
}

export default SaleReceipt
