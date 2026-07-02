import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate, getDaysOverdue } from '@/lib/utils'
import { Plus, FileText, X } from 'lucide-react'
import type { Invoice, Client } from '@/types'

type ProjectOption = { id: string; name: string }

export default function InvoicesPage() {
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [showForm, setShowForm] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [form, setForm] = useState({
    client_id: '', project_id: '', invoice_number: '',
    amount: '', due_date: '', description: '', status: 'draft' as Invoice['status'],
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: inv }, { data: cli }, { data: proj }] = await Promise.all([
      supabase.from('invoices').select('*, client:clients(*), project:projects(name)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*'),
      supabase.from('projects').select('id, name'),
    ])
    setInvoices((inv as any) ?? [])
    setClients(cli ?? [])
    setProjects(proj ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('invoices').insert({
      client_id: form.client_id,
      project_id: form.project_id || null,
      invoice_number: form.invoice_number,
      amount: parseFloat(form.amount),
      due_date: form.due_date,
      description: form.description || null,
      status: form.status,
      created_by: user!.id,
    })
    setShowForm(false)
    setForm({ client_id: '', project_id: '', invoice_number: '', amount: '', due_date: '', description: '', status: 'draft' })
    load()
    setSaving(false)
  }

  const updateStatus = async (id: string, status: Invoice['status']) => {
    await supabase.from('invoices').update({
      status,
      paid_at: status === 'paid' ? new Date().toISOString() : null,
    }).eq('id', id)
    load()
  }

  const filtered = statusFilter === 'all' ? invoices : invoices.filter(i => i.status === statusFilter)
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + i.amount, 0)
  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.amount, 0)

  const STATUS_COLORS: Record<string, string> = {
    draft: 'bg-gray-100 text-gray-600',
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Invoice
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4">
          <p className="text-xs text-gray-500">Total Paid</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-gray-500">Pending / Overdue</p>
          <p className="text-xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice Form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">New Invoice</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client *</label>
              <select className="input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })} required>
                <option value="">Select client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Invoice # *</label>
              <input className="input" value={form.invoice_number} onChange={e => setForm({ ...form, invoice_number: e.target.value })} placeholder="INV-001" required />
            </div>
            <div>
              <label className="label">Amount (₹) *</label>
              <input type="number" className="input" min="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div>
              <label className="label">Due Date *</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} required />
            </div>
            <div>
              <label className="label">Project</label>
              <select className="input" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                <option value="draft">Draft</option>
                <option value="sent">Sent</option>
                <option value="paid">Paid</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Description</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Create Invoice'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Invoices Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Invoice #', 'Client', 'Project', 'Amount', 'Due Date', 'Overdue', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(inv => {
              const overdueDays = inv.status !== 'paid' ? getDaysOverdue(inv.due_date) : 0
              return (
                <tr key={inv.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(inv.client as Client)?.company_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(inv as any).project?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-gray-900">{formatCurrency(inv.amount)}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{formatDate(inv.due_date)}</td>
                  <td className="px-4 py-3 text-sm">
                    {overdueDays > 0 ? <span className="text-red-600 font-medium">{overdueDays}d overdue</span> : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[inv.status]}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {inv.status !== 'paid' && (
                      <button onClick={() => updateStatus(inv.id, 'paid')} className="text-xs text-green-600 hover:underline">Mark Paid</button>
                    )}
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center py-10 text-gray-400">No invoices found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
