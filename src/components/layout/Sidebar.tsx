import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Columns,
  BookOpen,
  Users,
  DollarSign,
  Receipt,
  FileText,
  Bell,
  TrendingUp,
  UserCheck,
  X,
  LineChart,
  ChevronRight,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavSection {
  title: string
  items: {
    label: string
    to: string
    icon: React.ComponentType<{ className?: string }>
    badge?: string
  }[]
}

const navSections: NavSection[] = [
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
      { label: 'Projects', to: '/projects', icon: FolderKanban },
      { label: 'Tasks', to: '/tasks', icon: CheckSquare },
      { label: 'Kanban', to: '/kanban', icon: Columns },
      { label: 'Daily Log', to: '/daily-log', icon: BookOpen },
      { label: 'Clients', to: '/clients', icon: Users },
    ],
  },
  {
    title: 'FINANCIALS',
    items: [
      { label: 'Performance', to: '/financial-performance', icon: LineChart, badge: 'New' },
      { label: 'Finance Overview', to: '/finance', icon: DollarSign },
      { label: 'Expenses', to: '/expenses', icon: Receipt },
      { label: 'Invoices', to: '/invoices', icon: FileText },
    ],
  },
  {
    title: 'GROWTH & TEAM',
    items: [
      { label: 'Follow-Ups', to: '/follow-ups', icon: Bell },
      { label: 'CRM Leads', to: '/crm', icon: TrendingUp },
      { label: 'Team', to: '/team', icon: UserCheck },
      { label: 'Ideas', to: '/ideas', icon: Lightbulb },
    ],
  },
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function Sidebar({ open, onClose }: Props) {
  return (
    <>
      {/* Mobile backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed lg:static inset-y-0 left-0 z-40 flex flex-col w-64 bg-white border-r border-gray-200/90 shadow-sm transition-all duration-300 ease-in-out',
          open
            ? 'translate-x-0'
            : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden'
        )}
      >
        {/* Scaled-up & zoomed header logo */}
        <div className="flex items-center justify-between px-5 h-20 border-b border-gray-100 shrink-0 bg-gradient-to-b from-white to-gray-50/50">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative">
              <img
                src="/logo.png"
                alt="AISE360 PVT LTD"
                className="w-11 h-11 rounded-xl object-contain shadow-sm border border-gray-200/60 bg-white p-0.5 hover:scale-105 transition-transform duration-200"
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-gray-900 text-[14px] leading-tight tracking-tight truncate">
                AISE360 PVT LTD
              </h1>
              <p className="text-[10px] font-semibold text-brand-600 uppercase tracking-wider mt-0.5">
                Executive Hub
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 overflow-y-auto py-5 px-3 space-y-6">
          {navSections.map(section => (
            <div key={section.title} className="space-y-1">
              <p className="px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 select-none">
                {section.title}
              </p>

              {section.items.map(item => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      cn(
                        'group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200 ease-out',
                        isActive
                          ? 'bg-gradient-to-r from-brand-50 to-brand-100/50 text-brand-700 font-semibold shadow-sm border-l-4 border-brand-600'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100/80 hover:translate-x-1'
                      )
                    }
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge ? (
                      <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-brand-600 text-white shadow-sm">
                        {item.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
                    )}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Bottom Status Card */}
        <div className="p-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5 p-2 rounded-lg bg-white border border-gray-200/60 shadow-sm">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-medium text-gray-600 truncate">
              System Online & Synced
            </span>
          </div>
        </div>
      </aside>
    </>
  )
}
