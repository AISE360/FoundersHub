import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { X, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import type { CompanyExpense, CompanyExpenseCategory } from '@/types'

const CATEGORIES: CompanyExpenseCategory[] = [
  'Domain',
  'Mailbox',
  'Business Meeting',
  'Return Filing',
  'CA Charges',
  'Food/Travel',
  'Software',
  'Office',
  'Salary',
  'Miscellaneous',
]

interface Props {
  expense?: CompanyExpense
  onClose: () => void
  onSaved: () => void
}

export default function CompanyExpenseModal({ expense, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const [date, setDate] = useState(
    expense?.expense_date ?? new Date().toISOString().split('T')[0]
  )
  const [category, setCategory] = useState<string>(expense?.category ?? 'Business Meeting')
  const [description, setDescription] = useState(expense?.description ?? '')
  const [amount, setAmount] = useState(expense ? String(expense.amount) : '')
  const [remarks, setRemarks] = useState(expense?.remarks ?? '')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numAmount = parseFloat(amount)
    if (!description.trim()) {
      setError('Please enter a description for the expense.')
      return
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Amount must be a valid positive number.')
      return
    }

    setLoading(true)

    const payload = {
      expense_date: date,
      category,
      description: description.trim(),
      amount: numAmount,
      remarks: remarks.trim() || null,
      created_by: user?.id ?? null,
      updated_at: new Date().toISOString(),
    }

    try {
      if (expense?.id) {
        const { error: err } = await supabase
          .from('company_expenses')
          .update(payload)
          .eq('id', expense.id)
        if (err) throw err
      } else {
        const { error: err } = await supabase
          .from('company_expenses')
          .insert(payload)
        if (err) throw err
      }
      onSaved()
    } catch (err: any) {
      setError(err.message || 'Failed to save company expense.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-base">
                {expense ? 'Edit Company Expense' : 'Add Company Expense'}
              </h2>
              <p className="text-xs text-gray-500">General business overheads & operations</p>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date *</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={e => setDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="label">Category *</label>
              <select
                className="input"
                value={category}
                onChange={e => setCategory(e.target.value)}
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="label">Expense Description *</label>
            <input
              type="text"
              className="input"
              placeholder="e.g. Return Filing, CA Charges, Business Meet, Domain renewal"
              value={description}
              onChange={e => setDescription(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="label">Amount (₹) *</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                min="0"
                step="any"
                className="input pl-7"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <label className="label">Remarks (Optional)</label>
            <textarea
              rows={2}
              className="input"
              placeholder="e.g. Paid to CA Firm, Client lunch at Cafe, Quarterly GST filing..."
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
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
              {expense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
