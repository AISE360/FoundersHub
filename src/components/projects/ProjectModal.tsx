import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { X } from 'lucide-react'
import type { Client, Project } from '@/types'

interface Props {
  clients: Client[]
  project?: Project
  onClose: () => void
  onSaved: () => void
}

export default function ProjectModal({ clients, project, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const [form, setForm] = useState({
    name: project?.name ?? '',
    description: project?.description ?? '',
    client_id: project?.client_id ?? '',
    status: project?.status ?? 'active',
    priority: project?.priority ?? 'medium',
    budget: project?.budget?.toString() ?? '',
    upfront_received: project?.upfront_received?.toString() ?? '',
    deadline: project?.deadline ?? '',
    progress: project?.progress?.toString() ?? '0',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      name: form.name,
      description: form.description || null,
      client_id: form.client_id || null,
      status: form.status,
      priority: form.priority,
      budget: parseFloat(form.budget) || 0,
      upfront_received: parseFloat(form.upfront_received) || 0,
      deadline: form.deadline || null,
      progress: parseInt(form.progress) || 0,
      created_by: user!.id,
    }

    const { error: err } = project
      ? await supabase.from('projects').update(payload).eq('id', project.id)
      : await supabase.from('projects').insert(payload)

    if (err) setError(err.message)
    else onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-200 sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-900">{project ? 'Edit Project' : 'New Project'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="label">Project Name *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Client</label>
              <select className="input" value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">No client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.company_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="label">Deadline</label>
              <input type="date" className="input" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Budget (₹)</label>
              <input type="number" className="input" min="0" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label className="label">Upfront Received (₹)</label>
              <input type="number" className="input" min="0" value={form.upfront_received} onChange={e => setForm({ ...form, upfront_received: e.target.value })} />
            </div>
          </div>

          <div>
            <label className="label">Progress ({form.progress}%)</label>
            <input
              type="range" min="0" max="100" value={form.progress}
              onChange={e => setForm({ ...form, progress: e.target.value })}
              className="w-full accent-brand-600"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : project ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
