import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import { DollarSign, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import type { Project, Expense } from '@/types'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function FinancePage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      supabase.from('projects').select('*, client:clients(company_name)').order('created_at', { ascending: false }),
      supabase.from('expenses').select('*'),
    ]).then(([{ data: p }, { data: e }]) => {
      setProjects((p as any) ?? [])
      setExpenses(e ?? [])
      setLoading(false)
    })
  }, [])

  const totalBudget = projects.reduce((s, p) => s + (p.budget ?? 0), 0)
  const totalReceived = projects.reduce((s, p) => s + (p.upfront_received ?? 0), 0)
  const totalPending = totalBudget - totalReceived
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = totalReceived - totalExpenses

  const projectFinance = projects.map(p => {
    const projExpenses = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
    return {
      name: p.name.slice(0, 12),
      budget: p.budget ?? 0,
      received: p.upfront_received ?? 0,
      expenses: projExpenses,
      profit: (p.upfront_received ?? 0) - projExpenses,
    }
  })

  const expenseByCategory = expenses.reduce((acc: Record<string, number>, e) => {
    acc[e.category] = (acc[e.category] ?? 0) + e.amount
    return acc
  }, {})
  const pieData = Object.entries(expenseByCategory).map(([name, value]) => ({ name, value }))
  const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316']

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900">Finance Overview</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Budget', value: formatCurrency(totalBudget), icon: DollarSign, color: 'text-brand-600', bg: 'bg-brand-50' },
          { label: 'Total Received', value: formatCurrency(totalReceived), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), icon: TrendingDown, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Net Profit', value: formatCurrency(netProfit), icon: netProfit >= 0 ? TrendingUp : AlertCircle, color: netProfit >= 0 ? 'text-green-600' : 'text-red-600', bg: netProfit >= 0 ? 'bg-green-50' : 'bg-red-50' },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Finance Chart */}
        <div className="card p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Per Project Breakdown</h2>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={projectFinance} barSize={16}>
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="budget" fill="#e0e9ff" radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="received" fill="#6366f1" radius={[4, 4, 0, 0]} name="Received" />
              <Bar dataKey="expenses" fill="#fca5a5" radius={[4, 4, 0, 0]} name="Expenses" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Expense by Category */}
        {pieData.length > 0 && (
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Expenses by Category</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Legend />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Project-by-Project Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">Project Finance Details</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {['Project', 'Client', 'Budget', 'Received', 'Pending', 'Expenses', 'Net', 'Status'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {projects.map(p => {
              const projExp = expenses.filter(e => e.project_id === p.id).reduce((s, e) => s + e.amount, 0)
              const net = (p.upfront_received ?? 0) - projExp
              const pending = (p.budget ?? 0) - (p.upfront_received ?? 0)
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{(p.client as any)?.company_name ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{formatCurrency(p.budget ?? 0)}</td>
                  <td className="px-4 py-3 text-sm text-green-600 font-medium">{formatCurrency(p.upfront_received ?? 0)}</td>
                  <td className="px-4 py-3 text-sm text-yellow-600">{formatCurrency(pending)}</td>
                  <td className="px-4 py-3 text-sm text-red-600">{formatCurrency(projExp)}</td>
                  <td className={`px-4 py-3 text-sm font-semibold ${net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(net)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge text-xs ${p.status === 'completed' ? 'bg-blue-100 text-blue-700' : p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
