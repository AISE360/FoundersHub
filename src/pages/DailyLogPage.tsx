import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { formatDate } from '@/lib/utils'
import { Plus, BookOpen, X } from 'lucide-react'
import type { DailyLog, Profile } from '@/types'

type ProjectOption = { id: string; name: string }

export default function DailyLogPage() {
  const { user } = useAuthStore()
  const [logs, setLogs] = useState<(DailyLog & { founder: Profile; project?: { name: string } })[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [founders, setFounders] = useState<Profile[]>([])
  const [founderFilter, setFounderFilter] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    project_id: '',
    description: '',
    hours: '1',
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const [{ data: l }, { data: p }, { data: f }] = await Promise.all([
      supabase.from('daily_logs').select('*, founder:profiles(*), project:projects(name)').order('date', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name'),
      supabase.from('profiles').select('*').eq('is_active', true),
    ])
    setLogs((l as any) ?? [])
    setProjects(p ?? [])
    setFounders(f ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    await supabase.from('daily_logs').insert({
      founder_id: user!.id,
      date: form.date,
      project_id: form.project_id || null,
      description: form.description,
      hours: parseFloat(form.hours) || 1,
    })
    setShowForm(false)
    setForm({ date: new Date().toISOString().split('T')[0], project_id: '', description: '', hours: '1' })
    load()
    setSaving(false)
  }

  const filteredLogs = founderFilter === 'all' ? logs : logs.filter(l => l.founder_id === founderFilter)

  // Group by date
  const grouped: Record<string, typeof filteredLogs> = {}
  filteredLogs.forEach(log => {
    const d = log.date
    if (!grouped[d]) grouped[d] = []
    grouped[d].push(log)
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-brand-600" />
          <h1 className="text-2xl font-bold text-gray-900">Daily Log</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Today
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-3">
        <select className="input w-auto" value={founderFilter} onChange={e => setFounderFilter(e.target.value)}>
          <option value="all">All Team Members</option>
          {founders.map(f => <option key={f.id} value={f.id}>{f.full_name}</option>)}
        </select>
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Add Log Entry</h2>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} required />
              </div>
              <div>
                <label className="label">Hours</label>
                <input type="number" className="input" min="0.5" max="24" step="0.5" value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} required />
              </div>
            </div>
            <div>
              <label className="label">Project (optional)</label>
              <select className="input" value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">No specific project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">What did you work on? *</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Describe your work today..."
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                required
              />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" className="btn-primary flex-1" disabled={saving}>
                {saving ? 'Saving...' : 'Save Log'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Logs grouped by date */}
      <div className="space-y-6">
        {Object.entries(grouped).map(([date, dateLogs]) => (
          <div key={date}>
            <div className="flex items-center gap-3 mb-3">
              <div className="text-sm font-semibold text-gray-700">{formatDate(date)}</div>
              <div className="flex-1 h-px bg-gray-200" />
              <div className="text-xs text-gray-500">
                {dateLogs.reduce((s, l) => s + l.hours, 0)}h total
              </div>
            </div>
            <div className="space-y-2">
              {dateLogs.map(log => (
                <div key={log.id} className="card p-4 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 text-xs font-bold shrink-0">
                    {log.founder?.full_name?.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-gray-900">{log.founder?.full_name}</span>
                      {log.project && (
                        <span className="text-xs bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full">
                          {(log.project as any).name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 ml-auto">{log.hours}h</span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        {Object.keys(grouped).length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No logs yet. Start logging your daily work!</p>
          </div>
        )}
      </div>
    </div>
  )
}
