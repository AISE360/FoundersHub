import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getDaysOverdue } from '@/lib/utils'
import { Plus, Bell, CheckCircle, X } from 'lucide-react'
import type { FollowUp, Profile } from '@/types'

type ProjectOption = { id: string; name: string }

const TYPES = ['maintenance', 'next-phase', 'payment', 'review', 'other'] as const

export default function FollowUpsPage() {
  const [followUps, setFollowUps] = useState<FollowUp[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [team, setTeam] = useState<Profile[]>([])
  const [showForm, setShowForm] = useState(false)
  const [doneFilter, setDoneFilter] = useState<'pending' | 'done' | 'all'>('pending')
  const [form, setForm] = useState({
    project_id: '', title: '', description: '', due_date: '',
    assigned_to: '', type: 'other' as FollowUp['type'],
  })
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: fu }, { data: proj }, { data: t }] = await Promise.all([
      supabase.from('follow_ups').select('*, project:projects(name), assigned_user:profiles(full_name)').order('due_date'),
      supabase.from('projects').select('id, name').in('status', ['completed', 'active']),
      supabase.from('profiles').select('*').eq('is_active', true),
    ])
    setFollowUps((fu as any) ?? [])
    setProjects(proj ?? [])
    setTeam(t ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('follow_ups').insert({
      project_id: form.project_id || null,
      title: form.title,
      description: form.description || null,
      due_date: form.due_date,
      assigned_to: form.assigned_to || null,
      type: form.type,
      is_done: false,
    })
    setShowForm(false)
    setForm({ project_id: '', title: '', description: '', due_date: '', assigned_to: '', type: 'other' })
    load()
    setSaving(false)
  }

  const toggleDone = async (id: string, isDone: boolean) => {
    await supabase.from('follow_ups').update({ is_done: !isDone }).eq('id', id)
    load()
  }

  const deleteFollowUp = async (id: string) => {
    if (!confirm('Delete this follow-up?')) return
    await supabase.from('follow_ups').delete().eq('id', id)
    load()
  }

  const filtered = followUps.filter(fu => {
    if (doneFilter === 'pending') return !fu.is_done
    if (doneFilter === 'done') return fu.is_done
    return true
  })

  const TYPE_COLORS: Record<string, string> = {
    maintenance: 'bg-blue-100 text-blue-700',
    'next-phase': 'bg-purple-100 text-purple-700',
    payment: 'bg-green-100 text-green-700',
    review: 'bg-yellow-100 text-yellow-700',
    other: 'bg-gray-100 text-gray-700',
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Follow-Ups</h1>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Follow-Up
        </button>
      </div>

      <div className="flex gap-2">
        {(['pending', 'all', 'done'] as const).map(f => (
          <button
            key={f}
            onClick={() => setDoneFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${doneFilter === f ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-500">
          {followUps.filter(f => !f.is_done).length} pending
        </span>
      </div>

      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">New Follow-Up</h2>
            <button onClick={() => setShowForm(false)}><X className="w-4 h-4 text-gray-400" /></button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="label">Title *</label>
              <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value as any })}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
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
              <label className="label">Assign To</label>
              <select className="input" value={form.assigned_to} onChange={e => setForm({ ...form, assigned_to: e.target.value })}>
                <option value="">Anyone</option>
                {team.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="label">Notes</label>
              <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Add'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(fu => {
          const overdue = !fu.is_done ? getDaysOverdue(fu.due_date) : 0
          return (
            <div key={fu.id} className={`card p-4 flex items-start gap-4 ${fu.is_done ? 'opacity-60' : ''}`}>
              <button
                onClick={() => toggleDone(fu.id, fu.is_done)}
                className={`shrink-0 mt-0.5 ${fu.is_done ? 'text-green-500' : 'text-gray-300 hover:text-green-400'}`}
              >
                <CheckCircle className="w-5 h-5" />
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className={`text-sm font-medium ${fu.is_done ? 'line-through text-gray-400' : 'text-gray-900'}`}>{fu.title}</p>
                  <span className={`badge ${TYPE_COLORS[fu.type]}`}>{fu.type}</span>
                  {overdue > 0 && <span className="badge bg-red-100 text-red-700">{overdue}d overdue</span>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                  <span>📅 {formatDate(fu.due_date)}</span>
                  {(fu as any).project && <span>📁 {(fu as any).project.name}</span>}
                  {(fu as any).assigned_user && <span>👤 {(fu as any).assigned_user.full_name}</span>}
                </div>
                {fu.description && <p className="text-xs text-gray-500 mt-1">{fu.description}</p>}
              </div>
              <button onClick={() => deleteFollowUp(fu.id)} className="text-xs text-red-400 hover:text-red-600">✕</button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Bell className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No follow-ups {doneFilter === 'pending' ? 'pending' : ''}</p>
          </div>
        )}
      </div>
    </div>
  )
}
