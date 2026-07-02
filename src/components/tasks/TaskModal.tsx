import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { X } from 'lucide-react'
import type { Task, Profile } from '@/types'

interface Props {
  projectId: string
  task?: Task
  onClose: () => void
  onSaved: () => void
}

export default function TaskModal({ projectId, task, onClose, onSaved }: Props) {
  const { user } = useAuthStore()
  const [founders, setFounders] = useState<Profile[]>([])
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    assignee_id: task?.assignee_id ?? '',
    priority: task?.priority ?? 'medium',
    status: task?.status ?? 'todo',
    due_date: task?.due_date ?? '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('profiles').select('*').eq('is_active', true).then(({ data }) => {
      setFounders(data ?? [])
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const payload = {
      project_id: projectId,
      title: form.title,
      description: form.description || null,
      assignee_id: form.assignee_id || null,
      priority: form.priority,
      status: form.status,
      due_date: form.due_date || null,
      created_by: user!.id,
      updated_at: new Date().toISOString(),
    }

    const { error: err } = task
      ? await supabase.from('tasks').update(payload).eq('id', task.id)
      : await supabase.from('tasks').insert(payload)

    if (err) setError(err.message)
    else onSaved()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{task ? 'Edit Task' : 'New Task'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

          <div>
            <label className="label">Title *</label>
            <input className="input" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea className="input" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Assign To</label>
              <select className="input" value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">Unassigned</option>
                {founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Priority</label>
              <select className="input" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value as any })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value as any })}>
                <option value="todo">Todo</option>
                <option value="in-progress">In Progress</option>
                <option value="testing">Testing</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1" disabled={loading}>
              {loading ? 'Saving...' : task ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
