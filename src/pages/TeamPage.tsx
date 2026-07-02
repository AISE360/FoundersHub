import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatDate } from '@/lib/utils'
import { UserCheck } from 'lucide-react'
import type { Profile, DailyLog, Task } from '@/types'

export default function TeamPage() {
  const [team, setTeam] = useState<Profile[]>([])
  const [logs, setLogs] = useState<DailyLog[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)

  const today = new Date().toISOString().split('T')[0]

  // Last 7 days
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - i)
    return d.toISOString().split('T')[0]
  }).reverse()

  useEffect(() => {
    Promise.all([
      supabase.from('profiles').select('*').eq('is_active', true),
      supabase.from('daily_logs').select('*').gte('date', last7[0]),
      supabase.from('tasks').select('*').in('status', ['todo', 'in-progress', 'testing']),
    ]).then(([{ data: t }, { data: l }, { data: tk }]) => {
      setTeam(t ?? [])
      setLogs(l ?? [])
      setTasks(tk ?? [])
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-2">
        <UserCheck className="w-5 h-5 text-brand-600" />
        <h1 className="text-2xl font-bold text-gray-900">Team Overview</h1>
      </div>

      {/* Founder Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {team.map(member => {
          const memberLogs = logs.filter(l => l.founder_id === member.id)
          const todayLog = memberLogs.find(l => l.date === today)
          const totalHoursWeek = memberLogs.reduce((s, l) => s + l.hours, 0)
          const activeTasks = tasks.filter(t => t.assignee_id === member.id)
          const daysActive = new Set(memberLogs.map(l => l.date)).size

          return (
            <div key={member.id} className="card p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                  {member.full_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{member.full_name}</h3>
                  <p className="text-sm text-gray-500">{member.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-xs ${todayLog ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {todayLog ? '✓ Active today' : '○ No log today'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xl font-bold text-brand-600">{totalHoursWeek.toFixed(0)}h</p>
                  <p className="text-xs text-gray-500">This week</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-yellow-600">{activeTasks.length}</p>
                  <p className="text-xs text-gray-500">Open tasks</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-gray-700">{daysActive}/7</p>
                  <p className="text-xs text-gray-500">Days logged</p>
                </div>
              </div>

              {/* Activity Heatmap (last 7 days) */}
              <div>
                <p className="text-xs text-gray-400 mb-2">Last 7 days</p>
                <div className="flex gap-1">
                  {last7.map(date => {
                    const dayLog = memberLogs.find(l => l.date === date)
                    const hours = dayLog?.hours ?? 0
                    const intensity = hours === 0 ? 'bg-gray-100' : hours < 4 ? 'bg-brand-200' : hours < 8 ? 'bg-brand-400' : 'bg-brand-600'
                    return (
                      <div
                        key={date}
                        title={`${date}: ${hours}h`}
                        className={`flex-1 h-6 rounded ${intensity} cursor-default transition-colors`}
                      />
                    )
                  })}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{formatDate(last7[0]).slice(0, 6)}</span>
                  <span>Today</span>
                </div>
              </div>

              {/* Today's log */}
              {todayLog && (
                <div className="mt-3 p-2 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700 font-medium">Today: {todayLog.hours}h</p>
                  <p className="text-xs text-green-600 mt-0.5 line-clamp-2">{todayLog.description}</p>
                </div>
              )}

              {/* Active tasks */}
              {activeTasks.length > 0 && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 mb-1">Active tasks:</p>
                  {activeTasks.slice(0, 3).map(t => (
                    <p key={t.id} className="text-xs text-gray-600 truncate">• {t.title}</p>
                  ))}
                  {activeTasks.length > 3 && (
                    <p className="text-xs text-gray-400">+{activeTasks.length - 3} more</p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {team.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <UserCheck className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p>No team members yet. Everyone should sign up!</p>
        </div>
      )}
    </div>
  )
}
