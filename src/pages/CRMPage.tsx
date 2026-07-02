import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Plus, TrendingUp, X } from 'lucide-react'
import type { Lead, Profile } from '@/types'

const STAGES: Lead['status'][] = ['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

const STAGE_COLORS: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700 border-gray-200',
  qualified: 'bg-blue-50 text-blue-700 border-blue-200',
  proposal: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  negotiation: 'bg-orange-50 text-orange-700 border-orange-200',
  won: 'bg-green-50 text-green-700 border-green-200',
  lost: 'bg-red-50 text-red-700 border-red-200',
}

export default function CRMPage() {
  const { user } = useAuthStore()
  const [leads, setLeads] = useState<Lead[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editLead, setEditLead] = useState<Lead | undefined>()
  const [form, setForm] = useState({
    company_name: '', contact_person: '', phone: '', email: '',
    status: 'lead' as Lead['status'], value: '', notes: '', assigned_to: '',
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: l }, { data: t }] = await Promise.all([
      supabase.from('leads').select('*, assigned_user:profiles(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').eq('is_active', true),
    ])
    setLeads((l as any) ?? [])
    setTeam(t ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const openForm = (lead?: Lead) => {
    setEditLead(lead)
    setForm(lead ? {
      company_name: lead.company_name,
      contact_person: lead.contact_person,
      phone: lead.phone ?? '',
      email: lead.email ?? '',
      status: lead.status,
      value: lead.value?.toString() ?? '',
      notes: lead.notes ?? '',
      assigned_to: lead.assigned_to ?? '',
    } : { company_name: '', contact_person: '', phone: '', email: '', status: 'lead', value: '', notes: '', assigned_to: '' })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const payload = {
      company_name: form.company_name,
      contact_person: form.contact_person,
      phone: form.phone || null,
      email: form.email || null,
      status: form.status,
      value: parseFloat(form.value) || null,
      notes: form.notes || null,
      assigned_to: form.assigned_to || null,
      created_by: user!.id,
      updated_at: new Date().toISOString(),
    }
    if (editLead) {
      await supabase.from('leads').update(payload).eq('id', editLead.id)
    } else {
      await supabase.from('leads').insert(payload)
    }
    setShowForm(false)
    load()
    setSaving(false)
  }

  const moveStage = async (id: string, status: Lead['status']) => {
    await supabase.from('leads').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l))
  }

  const deleteLead = async (id: string) => {
    if (!confirm('Delete this lead?')) return
    await supabase.from('leads').delete().eq('id', id)
    load()
  }

  const totalPipeline = leads.filter(l => !['won', 'lost'].includes(l.status)).reduce((s, l) => s + (l.value ?? 0), 0)
  const wonValue = leads.filter(l => l.status === 'won').reduce((s, l) => s + (l.value ?? 0), 0)

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">CRM Pipeline</h1>
        </div>
        <button onClick={() => openForm()} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Lead
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Leads', value: leads.length },
          { label: 'Active Pipeline', value: formatCurrency(totalPipeline) },
          { label: 'Won', value: leads.filter(l => l.status === 'won').length },
          { label: 'Won Value', value: formatCurrency(wonValue) },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Pipeline Board */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {STAGES.map(stage => {
          const stageLeads = leads.filter(l => l.status === stage)
          return (
            <div key={stage}>
              <div className={`text-xs font-bold px-2 py-1.5 rounded-t-lg border ${STAGE_COLORS[stage]} mb-1`}>
                {stage.toUpperCase()} ({stageLeads.length})
              </div>
              <div className="space-y-2 min-h-24">
                {stageLeads.map(lead => (
                  <div key={lead.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-xs font-semibold text-gray-900 leading-tight">{lead.company_name}</p>
                      <button onClick={() => openForm(lead)} className="text-gray-300 hover:text-brand-500 ml-1 shrink-0">✎</button>
                    </div>
                    <p className="text-xs text-gray-500">{lead.contact_person}</p>
                    {lead.value && <p className="text-xs font-medium text-green-600 mt-1">{formatCurrency(lead.value)}</p>}
                    {(lead as any).assigned_user && (
                      <p className="text-xs text-gray-400 mt-1">→ {(lead as any).assigned_user.full_name}</p>
                    )}
                    {/* Move buttons */}
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {stage !== 'won' && stage !== 'lost' && (
                        <button
                          onClick={() => moveStage(lead.id, STAGES[STAGES.indexOf(stage) + 1])}
                          className="text-xs bg-brand-50 text-brand-600 px-1.5 py-0.5 rounded hover:bg-brand-100"
                        >Next →</button>
                      )}
                      {stage === 'negotiation' && (
                        <>
                          <button onClick={() => moveStage(lead.id, 'won')} className="text-xs bg-green-50 text-green-600 px-1.5 py-0.5 rounded hover:bg-green-100">Won</button>
                          <button onClick={() => moveStage(lead.id, 'lost')} className="text-xs bg-red-50 text-red-600 px-1.5 py-0.5 rounded hover:bg-red-100">Lost</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Lead Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
              <h2 className="font-semibold">{editLead ? 'Edit Lead' : 'New Lead'}</h2>
              <button onClick={() => setShowForm(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">Company *</label>
                <input className="input" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required />
              </div>
              <div>
                <label className="label">Contact Person *</label>
                <input className="input" value={form.contact_person} onChange={e => setForm({ ...form, contact_person: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Stage</label>
                  <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as Lead['status'] })}>
                    {STAGES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Est. Value (₹)</label>
                  <input type="number" className="input" min="0" value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="label">Assign To</label>
                <select className="input" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                  <option value="">Unassigned</option>
                  {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Notes</label>
                <textarea className="input" rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" className="btn-primary flex-1" disabled={saving}>
                  {saving ? 'Saving...' : editLead ? 'Update' : 'Add Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
