import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, FolderKanban, CheckSquare, Columns,
  BookOpen, Users, DollarSign, Receipt, FileText,
  Bell, TrendingUp, UserCheck, X, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

const nav = [
  { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
  { label: 'Projects', to: '/projects', icon: FolderKanban },
  { label: 'Tasks', to: '/tasks', icon: CheckSquare },
  { label: 'Kanban', to: '/kanban', icon: Columns },
  { label: 'Daily Log', to: '/daily-log', icon: BookOpen },
  { label: 'Clients', to: '/clients', icon: Users },
  { divider: true },
  { label: 'Finance', to: '/finance', icon: DollarSign },
  { label: 'Expenses', to: '/expenses', icon: Receipt },
  { label: 'Invoices', to: '/invoices', icon: FileText },
  { divider: true },
  { label: 'Follow-Ups', to: '/follow-ups', icon: Bell },
  { label: 'CRM', to: '/crm', icon: TrendingUp },
  { label: 'Team', to: '/team', icon: UserCheck },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside className={cn(
        'fixed lg:static inset-y-0 left-0 z-30 flex flex-col w-60 bg-white border-r border-gray-200 transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">FounderHub</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
          {nav.map((item, i) => {
            if ('divider' in item) return <div key={i} className="my-3 border-t border-gray-100" />
            const Icon = item.icon
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}
