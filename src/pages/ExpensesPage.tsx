import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, Receipt, X } from 'lucide-react'
import type { Expense } from '@/types'

type ProjectOption = { id: string; name: string }

const CATEGORIES = ['travel', 'hosting', 'server', 'software', 'office', 'salary', 'misc'] as const

export default function ExpensesPage() {
  const { user } = useAuthStore()
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [form, setForm] = useState({
    project_id: '', category: 'misc' as Expense['category'],
    description: '', amount: '', date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: exp }, { data: proj }] = await Promise.all([
      supabase.from('expenses').select('*, project:projects(name)').order('date', { ascending: false }),
      supabase.from('projects').select('id, name'),
    ])
    setExpenses((exp as any) ?? [])
    setProjects(proj ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('expenses').insert({
      project_id: form.project_id || null,
      category: form.category,
      description: form.description,
      amount: parseFloat(form.amount),
      date: form.date,
      added_by: user!.id,
    })
    setShowForm(false)
    setForm({ project_id: '', category: 'misc', description: '', amount: '', date: new Date().toISOString().split('T')[0] })
    load()
    setSaving(false)
  }

  const deleteExpense = async (id: string) => {
    if (!confirm('Delete this expense?')) return
    await supabase.from('expenses').delete().eq('id', id)
    load()
  }

  const filtered = categoryFilter === 'all' ? expenses : expenses.filter(e => e.category === categoryFilter)
  const total = filtered.reduce((s, e) => s + e.amount, 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Expense
        </button>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 flex-wrap">
        {['all', ...CATEGORIES].map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${categoryFilter === cat ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
        <div className="ml-auto text-sm font-semibold text-red-600">
          Total: {formatCurrency(total)}
        </div>
      </div>

      {/* Add Expense Form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Add Expense</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Description *</label>
              <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} required />
            </div>
            <div>
              <label className="label">Category</label>
              <select className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value as any })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <label className="label">Project (optional)</label>
              <select className="input" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">General</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Add Expense'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Expenses List */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Description', 'Category', 'Project', 'Amount', 'Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(exp => (
              <tr key={exp.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-900">{exp.description}</td>
                <td className="px-4 py-3">
                  <span className="badge bg-gray-100 text-gray-700">{exp.category}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{(exp as any).project?.name ?? '—'}</td>
                <td className="px-4 py-3 text-sm font-semibold text-red-600">{formatCurrency(exp.amount)}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{formatDate(exp.date)}</td>
                <td className="px-4 py-3">
                  <button onClick={() => deleteExpense(exp.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-gray-400">No expenses found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
