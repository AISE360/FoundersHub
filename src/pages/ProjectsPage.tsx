import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor, getPriorityColor } from '@/lib/utils'
import { Plus, Search, FolderKanban } from 'lucide-react'
import type { Project, Client } from '@/types'
import ProjectModal from '@/components/projects/ProjectModal'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    const [{ data: proj }, { data: cli }] = await Promise.all([
      supabase.from('projects').select('*, client:clients(*)').order('created_at', { ascending: false }),
      supabase.from('clients').select('*').order('company_name'),
    ])
    setProjects((proj as any) ?? [])
    setClients(cli ?? [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const filtered = projects.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || p.status === statusFilter
    return matchSearch && matchStatus
  })

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Search projects..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input w-auto" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="on-hold">On Hold</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map(project => {
          const remaining = (project.budget ?? 0) - (project.upfront_received ?? 0)
          return (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center">
                      <FolderKanban className="w-4 h-4 text-brand-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 text-sm leading-tight">{project.name}</h3>
                      {project.client && (
                        <p className="text-xs text-gray-500">{(project.client as Client).company_name}</p>
                      )}
                    </div>
                  </div>
                  <span className={`badge ${getStatusColor(project.status)}`}>{project.status}</span>
                </div>

                {project.description && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{project.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <p className="text-gray-400">Budget</p>
                    <p className="font-semibold text-gray-800">{formatCurrency(project.budget ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Received</p>
                    <p className="font-semibold text-green-600">{formatCurrency(project.upfront_received ?? 0)}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Pending</p>
                    <p className={`font-semibold ${remaining > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {formatCurrency(remaining)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Deadline</p>
                    <p className="font-semibold text-gray-800">
                      {project.deadline ? formatDate(project.deadline) : '—'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className={`badge ${getPriorityColor(project.priority)}`}>{project.priority}</span>
                  {project.progress !== undefined && (
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-600 rounded-full"
                          style={{ width: `${project.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{project.progress}%</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}

        {filtered.length === 0 && (
          <div className="col-span-3 text-center py-16 text-gray-400">
            <FolderKanban className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No projects found</p>
          </div>
        )}
      </div>

      {showModal && (
        <ProjectModal
          clients={clients}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
