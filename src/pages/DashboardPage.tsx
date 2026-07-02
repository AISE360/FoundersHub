import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate, getStatusColor } from '@/lib/utils'
import {
  FolderKanban, DollarSign, Clock, CheckCircle,
  TrendingUp, AlertCircle, Activity
} from 'lucide-react'
import type { Project, DailyLog, Profile, Task } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [todayLogs, setTodayLogs] = useState<(DailyLog & { founder: Profile })[]>([])
  const [pendingTasks, setPendingTasks] = useState<Task[]>([])
  const [founders, setFounders] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  useEffect(() => {
    async function load() {
      const [{ data: proj }, { data: logs }, { data: tasks }, { data: team }] = await Promise.all([
        supabase.from('projects').select('*').order('created_at', { ascending: false }),
        supabase.from('daily_logs').select('*, founder:profiles(*)').eq('date', today),
        supabase.from('tasks').select('*').in('status', ['todo', 'in-progress']).order('due_date'),
        supabase.from('profiles').select('*').eq('is_active', true),
      ])
      setProjects(proj ?? [])
      setTodayLogs((logs as any) ?? [])
      setPendingTasks(tasks ?? [])
      setFounders(team ?? [])
      setLoading(false)
    }
    load()
  }, [today])

  const activeProjects = projects.filter(p => p.status === 'active').length
  const completedProjects = projects.filter(p => p.status === 'completed').length
  const totalRevenue = projects.reduce((s, p) => s + (p.upfront_received ?? 0), 0)
  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const pendingAmount = totalBudget - totalRevenue

  const revenueData = projects
    .filter(p => p.status === 'completed')
    .slice(0, 6)
    .map(p => ({ name: p.name.slice(0, 10), budget: p.budget, received: p.upfront_received }))

  const loggedFounderIds = new Set(todayLogs.map(l => l.founder_id))

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{formatDate(today)} — Here's what's happening</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Active Projects', value: activeProjects, icon: FolderKanban, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Total Revenue', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Pending Amount', value: formatCurrency(pendingAmount), icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
          { label: 'Completed', value: completedProjects, icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map(stat => (
          <div key={stat.label} className="card p-5">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Activity Today */}
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Team Today</h2>
          </div>
          <div className="space-y-3">
            {founders.map(founder => {
              const isLogged = loggedFounderIds.has(founder.id)
              const log = todayLogs.find(l => l.founder_id === founder.id)
              return (
                <div key={founder.id} className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isLogged ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {founder.full_name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900 truncate">{founder.full_name}</p>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full ${isLogged ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isLogged ? 'Active' : 'No log'}
                      </span>
                    </div>
                    {log && <p className="text-xs text-gray-500 truncate mt-0.5">{log.description}</p>}
                  </div>
                </div>
              )
            })}
            {founders.length === 0 && <p className="text-sm text-gray-400">No team members yet</p>}
          </div>
          <Link to="/daily-log" className="mt-4 block text-center text-sm text-brand-600 hover:underline">
            + Add today's log
          </Link>
        </div>

        {/* Active Projects */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-brand-600" />
              <h2 className="font-semibold text-gray-900">Active Projects</h2>
            </div>
            <Link to="/projects" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-3">
            {projects.filter(p => p.status === 'active').slice(0, 5).map(project => (
              <Link key={project.id} to={`/projects/${project.id}`} className="block">
                <div className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{project.name}</p>
                    <p className="text-xs text-gray-500">
                      {project.deadline ? `Due ${formatDate(project.deadline)}` : 'No deadline'}
                    </p>
                  </div>
                  <span className={`badge ml-2 ${getStatusColor(project.priority)}`}>
                    {project.priority}
                  </span>
                </div>
              </Link>
            ))}
            {projects.filter(p => p.status === 'active').length === 0 && (
              <p className="text-sm text-gray-400">No active projects</p>
            )}
          </div>
        </div>

        {/* Pending Tasks */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-500" />
              <h2 className="font-semibold text-gray-900">Pending Tasks</h2>
            </div>
            <Link to="/tasks" className="text-xs text-brand-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2">
            {pendingTasks.slice(0, 6).map(task => (
              <div key={task.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                <p className="text-sm text-gray-800 truncate flex-1">{task.title}</p>
                <span className={`badge ml-2 ${getStatusColor(task.status)}`}>
                  {task.status}
                </span>
              </div>
            ))}
            {pendingTasks.length === 0 && <p className="text-sm text-gray-400">All caught up! 🎉</p>}
          </div>
        </div>
      </div>

      {/* Revenue Chart */}
      {revenueData.length > 0 && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-600" />
            <h2 className="font-semibold text-gray-900">Completed Projects — Budget vs Received</h2>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={revenueData} barSize={20}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="budget" fill="#e0e9ff" radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="received" fill="#6366f1" radius={[4, 4, 0, 0]} name="Received" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
