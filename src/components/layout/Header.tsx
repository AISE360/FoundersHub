import { Menu, LogOut, User, Sparkles } from 'lucide-react'
import { useAuthStore } from '@/store/authStore'
import { getInitials } from '@/lib/utils'
import { useState } from 'react'

interface Props {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: Props) {
  const { user, signOut } = useAuthStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  return (
    <header className="h-20 bg-white border-b border-gray-200/80 flex items-center justify-between px-6 shrink-0 z-10">
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 transition-colors"
          title="Toggle Navigation"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>AISE360 Operations</span>
          <span>•</span>
          <span className="text-brand-600 font-bold flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> Live
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 relative">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-bold text-gray-900 leading-tight">
            {user?.full_name || 'Founder'}
          </p>
          <p className="text-[10px] text-gray-400 capitalize">{user?.role || 'Administrator'}</p>
        </div>

        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white text-xs font-bold shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all duration-150"
        >
          {user?.full_name ? getInitials(user.full_name) : <User className="w-4 h-4" />}
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-14 bg-white border border-gray-200/80 rounded-2xl shadow-xl z-20 w-56 py-2 animate-scale-in">
              <div className="px-4 py-2.5 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 leading-tight">{user?.full_name}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    signOut()
                    setDropdownOpen(false)
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
