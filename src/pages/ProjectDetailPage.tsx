import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { ArrowLeft, Plus, Edit, Trash2, IndianRupee } from 'lucide-react'
import type { Project, Task, Client, Expense } from '@/types'
import ProjectModal from '@/components/projects/ProjectModal'
import TaskModal from '@/components/tasks/TaskModal'

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [showEditModal, setShowEditModal] = useState(false)
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: proj }, { data: t }, { data: exp }, { data: cli }] = await Promise.all([
      supabase.from('projects').select('*, client:clients(*)').eq('id', id!).single(),
      supabase.from('tasks').select('*, assignee:profiles(*)').eq('project_id', id!).order('created_at'),
      supabase.from('expenses').select('*').eq('project_id', id!).order('date', { ascending: false }),
      supabase.from('clients').select('*'),
    ])
    setProject(proj as any)
    setTasks((t as any) ?? [])
    setExpenses(exp ?? [])
    setClients(cli ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>
  if (!project) return <div className="text-center py-16 text-gray-400">Project not found</div>

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const balance = (project.upfront_received ?? 0) - totalExpenses
  const pendingFromClient = (project.budget ?? 0) - (project.upfront_received ?? 0)

  const tasksByStatus = {
    todo: tasks.filter(t => t.status === 'todo'),
    'in-progress': tasks.filter(t => t.status === 'in-progress'),
    testing: tasks.filter(t => t.status === 'testing'),
    done: tasks.filter(t => t.status === 'done'),
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3">
        <Link to="/projects" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
          {(project.client as Client)?.company_name && (
            <p className="text-gray-500 text-sm">{(project.client as Client).company_name}</p>
          )}
        </div>
        <div className="flex gap-2">
          <span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span>
          <span className={`badge ${getPriorityColor(project.priority)}`}>{project.priority}</span>
          <button onClick={() => setShowEditModal(true)} className="btn-secondary flex items-center gap-1.5 text-sm">
            <Edit className="w-3.5 h-3.5" /> Edit
          </button>
        </div>
      </div>

      {/* Finance Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Budget', value: formatCurrency(project.budget ?? 0), color: 'text-gray-900' },
          { label: 'Received', value: formatCurrency(project.upfront_received ?? 0), color: 'text-green-600' },
          { label: 'Pending from Client', value: formatCurrency(pendingFromClient), color: 'text-yellow-600' },
          { label: 'Cash in Hand', value: formatCurrency(balance), color: balance >= 0 ? 'text-green-600' : 'text-red-600' },
        ].map(item => (
          <div key={item.label} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{item.label}</p>
            <p className={`text-xl font-bold ${item.color}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {project.description && (
        <div className="card p-5">
          <p className="text-sm text-gray-600">{project.description}</p>
          <div className="flex gap-6 mt-3 text-xs text-gray-500">
            {project.deadline && <span>📅 Deadline: {formatDate(project.deadline)}</span>}
            <span>📊 Progress: {project.progress ?? 0}%</span>
          </div>
          {(project.progress ?? 0) > 0 && (
            <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-brand-600 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Tasks ({tasks.length})</h2>
            <button onClick={() => setShowTaskModal(true)} className="btn-primary text-sm flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
          <div className="space-y-3">
            {(['todo', 'in-progress', 'testing', 'done'] as const).map(status => (
              tasksByStatus[status].length > 0 && (
                <div key={status}>
                  <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{status}</p>
                  {tasksByStatus[status].map(task => (
                    <div key={task.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50">
                      <p className="text-sm text-gray-800 truncate flex-1">{task.title}</p>
                      <span className={`badge ml-2 ${getPriorityColor(task.priority)}`}>{task.priority}</span>
                    </div>
                  ))}
                </div>
              )
            ))}
            {tasks.length === 0 && <p className="text-sm text-gray-400">No tasks yet</p>}
          </div>
        </div>

        {/* Expenses */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <IndianRupee className="w-4 h-4 text-red-500" />
              <h2 className="font-semibold text-gray-900">Expenses ({formatCurrency(totalExpenses)})</h2>
            </div>
            <Link to="/expenses" className="text-xs text-brand-600 hover:underline">Manage</Link>
          </div>
          <div className="space-y-2">
            {expenses.slice(0, 8).map(exp => (
              <div key={exp.id} className="flex items-center justify-between py-1.5">
                <div>
                  <p className="text-sm text-gray-800">{exp.description}</p>
                  <p className="text-xs text-gray-500">{exp.category} · {formatDate(exp.date)}</p>
                </div>
                <p className="text-sm font-medium text-red-600 ml-3">{formatCurrency(exp.amount)}</p>
              </div>
            ))}
            {expenses.length === 0 && <p className="text-sm text-gray-400">No expenses logged</p>}
          </div>
        </div>
      </div>

      {showEditModal && (
        <ProjectModal
          clients={clients}
          project={project}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); load() }}
        />
      )}

      {showTaskModal && (
        <TaskModal
          projectId={id!}
          onClose={() => setShowTaskModal(false)}
          onSaved={() => { setShowTaskModal(false); load() }}
        />
      )}
    </div>
  )
}
