import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency } from '@/lib/utils'
import { X, Calculator, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { Client, FinancialEntry, Invoice } from '@/types'

const COMMON_SERVICES = [
  'Website',
  'Domain',
  'Domains',
  'Mail',
  'Mailbox',
  'Business Mail',
  'Hosting',
  'Admin Tab',
  'Website + Domain',
  'Maintenance',
  'SEO & Marketing',
]

interface Props {
  clients: Client[]
  projects: { id: string; name?: string; title?: string; client_id?: string }[]
  invoices?: Invoice[]
  entry?: FinancialEntry
  initialClientId?: string
  initialProjectId?: string
  onClose: () => void
  onSaved: () => void
}

export default function FinancialEntryModal({
  clients,
  projects,
  invoices = [],
  entry,
  initialClientId,
  initialProjectId,
  onClose,
  onSaved,
}: Props) {
  const { user } = useAuthStore()
  const [clientId, setClientId] = useState(entry?.client_id ?? initialClientId ?? '')
  const [projectId, setProjectId] = useState(entry?.project_id ?? initialProjectId ?? '')
  const [invoiceId, setInvoiceId] = useState(entry?.invoice_id ?? '')
  const [serviceName, setServiceName] = useState(entry?.service_name ?? '')
  const [entryDate, setEntryDate] = useState(
    entry?.entry_date ?? new Date().toISOString().split('T')[0]
  )
  const [charged, setCharged] = useState(entry ? String(entry.charged_amount) : '')
  const [advance, setAdvance] = useState(entry ? String(entry.advance_amount) : '')
  const [expense, setExpense] = useState(entry ? String(entry.expense_amount) : '')
  const [remarks, setRemarks] = useState(entry?.remarks ?? '')

  const [clientSearch, setClientSearch] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Filter projects by selected client
  const clientProjects = projects.filter(p => {
    if (!clientId) return true
    if (p.client_id) return p.client_id === clientId
    // Fallback matching by name
    const selectedClient = clients.find(c => c.id === clientId)
    if (!selectedClient) return true
    const cName = selectedClient.company_name.toLowerCase()
    const pName = ((p as any).title || p.name || '').toLowerCase()
    return pName.includes(cName)
  })

  // Filter invoices by selected client
  const clientInvoices = invoices.filter(i => !clientId || i.client_id === clientId)

  // Live calculations
  const numCharged = parseFloat(charged) || 0
  const numAdvance = parseFloat(advance) || 0
  const numExpense = parseFloat(expense) || 0

  const calculatedBalance = Math.max(0, numCharged - numAdvance)
  const calculatedProfit = numCharged - numExpense

  const isOverpaid = numAdvance > numCharged && numCharged > 0

  // Filter clients for searchable selection
  const filteredClients = clients.filter(c =>
    c.company_name.toLowerCase().includes(clientSearch.toLowerCase()) ||
    c.contact_person?.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!clientId) {
      setError('Please select a client.')
      return
    }
    if (!serviceName.trim()) {
      setError('Please enter or select a service name.')
      return
    }
    if (numCharged < 0 || numAdvance < 0 || numExpense < 0) {
      setError('Amounts cannot be negative.')
      return
    }

    setLoading(true)

    const payload: any = {
      client_id: clientId,
      project_id: projectId || null,
      invoice_id: invoiceId || null,
      service_name: serviceName.trim(),
      entry_date: entryDate,
      charged_amount: numCharged,
      advance_amount: numAdvance,
      expense_amount: numExpense,
      remarks: remarks.trim() || null,
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }

    try {
      if (entry?.id) {
        const { error: updateErr } = await supabase
          .from('financial_entries')
          .update(payload)
          .eq('id', entry.id)
        if (updateErr) throw updateErr
      } else {
        const { error: insertErr } = await supabase
          .from('financial_entries')
          .insert(payload)
        if (insertErr) throw insertErr
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save financial entry.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                {entry ? 'Edit Financial Entry' : 'Add Financial Entry'}
              </h2>
              <p className="text-xs text-gray-500">Service line-item & payment tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Client Selection */}
          <div>
            <label className="label">Client *</label>
            <div className="space-y-1.5">
              <select
                className="input"
                value={clientId}
                onChange={e => {
                  setClientId(e.target.value)
                  // Reset project if not matching new client
                  setProjectId('')
                }}
                required
              >
                <option value="">Select a Client...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.company_name} {c.contact_person ? `(${c.contact_person})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Project Selection (Filtered by Client) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label mb-0">Project (Optional)</label>
              <span className="text-[11px] text-gray-400">
                {clientId ? `${clientProjects.length} projects found` : 'Select client first'}
              </span>
            </div>
            <select
              className="input"
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
            >
              <option value="">No Project / General Client Service</option>
              {clientProjects.map(p => (
                <option key={p.id} value={p.id}>
                  {(p as any).title || p.name || 'Untitled Project'}
                </option>
              ))}
            </select>
          </div>

          {/* Service Name & Quick Suggestions */}
          <div>
            <label className="label">Service Name *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Website, Domains, Business Mail, Admin Tab"
              value={serviceName}
              onChange={e => setServiceName(e.target.value)}
              required
            />
            {/* Quick Suggestions Chips */}
            <div className="flex gap-1.5 flex-wrap mt-2">
              {COMMON_SERVICES.map(srv => (
                <button
                  key={srv}
                  type="button"
                  onClick={() => setServiceName(srv)}
                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                    serviceName === srv
                      ? 'bg-brand-50 border-brand-300 text-brand-700 font-medium'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {srv}
                </button>
              ))}
            </div>
          </div>

          {/* Date & Optional Invoice */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Entry Date *</label>
              <input
                type="date"
                className="input"
                value={entryDate}
                onChange={e => setEntryDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Linked Invoice (Optional)</label>
              <select
                className="input"
                value={invoiceId}
                onChange={e => {
                  setInvoiceId(e.target.value)
                  const matched = clientInvoices.find(i => i.id === e.target.value)
                  if (matched && !charged) {
                    setCharged(String(matched.amount))
                    if (matched.status === 'paid') {
                      setAdvance(String(matched.amount))
                    }
                  }
                }}
              >
                <option value="">No Linked Invoice</option>
                {clientInvoices.map(inv => (
                  <option key={inv.id} value={inv.id}>
                    #{inv.invoice_number} — {formatCurrency(inv.amount)} ({inv.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount Inputs: Charged, Advance, Expense */}
          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Financial Amounts (₹)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Charged Amount *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input pl-7"
                    placeholder="0"
                    value={charged}
                    onChange={e => setCharged(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Advance / Received
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input pl-7"
                    placeholder="0"
                    value={advance}
                    onChange={e => setAdvance(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Service Expense
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    className="input pl-7"
                    placeholder="0"
                    value={expense}
                    onChange={e => setExpense(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Overpayment Warning */}
            {isOverpaid && (
              <p className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Advance exceeds Charged amount.
              </p>
            )}

            {/* Live Automated Calculation Cards */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200">
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="text-[11px] text-gray-500 font-medium">Auto Balance (Pending)</p>
                <p className={`text-base font-bold ${calculatedBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(calculatedBalance)}
                </p>
                <span className="text-[10px] text-gray-400">Charged − Advance</span>
              </div>

              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <p className="text-[11px] text-gray-500 font-medium">Auto Gross Profit</p>
                <p className={`text-base font-bold ${calculatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {formatCurrency(calculatedProfit)}
                </p>
                <span className="text-[10px] text-gray-400">Charged − Expense</span>
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label className="label">Remarks (Optional)</label>
            <textarea
              rows={2}
              className="input"
              placeholder="e.g. 8 domains registered, setup completed, pending final payment..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {entry ? 'Update Entry' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
