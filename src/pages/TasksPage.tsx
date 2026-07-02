import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { Plus, Search } from 'lucide-react'
import type { Task } from '@/types'

type ProjectOption = { id: string; name: string }
import TaskModal from '@/components/tasks/TaskModal'

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [projects, setProjects] = useState<ProjectOption[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [projectFilter, setProjectFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [editTask, setEditTask] = useState<Task | undefined>()
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: t }, { data: p }] = await Promise.all([
      supabase.from('tasks').select('*, assignee:profiles(*), project:projects(name)').order('created_at', { ascending: false }),
      supabase.from('projects').select('id, name').eq('status', 'active'),
    ])
    setTasks((t as any) ?? [])
    setProjects(p ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = tasks.filter(t => {
    const matchSearch = t.title.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || t.status === statusFilter
    const matchProject = projectFilter === 'all' || t.project_id === projectFilter
    return matchSearch && matchStatus && matchProject
  })

  const deleteTask = async (id: string) => {
    if (!confirm('Delete this task?')) return
    await supabase.from('tasks').delete().eq('id', id)
    load()
  }

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        <button onClick={() => { setEditTask(undefined); setShowModal(true) }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Task
        </button>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="todo">Todo</option>
          <option value="in-progress">In Progress</option>
          <option value="testing">Testing</option>
          <option value="done">Done</option>
        </select>
        <select className="input w-auto" value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="all">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Task', 'Project', 'Assignee', 'Priority', 'Status', 'Due Date', ''].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(task => (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">{task.title}</p>
                  {task.description && <p className="text-xs text-gray-500 truncate max-w-xs">{task.description}</p>}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(task as any).project?.name ?? '—'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {(task as any).assignee?.full_name ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${getStatusColor(task.status)}`}>{task.status}</span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {task.due_date ? formatDate(task.due_date) : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => { setEditTask(task); setShowModal(true) }}
                      className="text-xs text-brand-600 hover:underline"
                    >Edit</button>
                    <button onClick={() => deleteTask(task.id)} className="text-xs text-red-500 hover:underline">Del</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-10 text-gray-400">No tasks found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <TaskModal
          projectId={projectFilter !== 'all' ? projectFilter : (projects[0]?.id ?? '')}
          task={editTask}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
