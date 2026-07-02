import { Menu, LogOut, User } from 'lucide-react'
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
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <button onClick={onMenuClick} className="text-gray-500 hover:text-gray-700">
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-3 relative">
        <span className="text-sm text-gray-600 hidden sm:block">
          {user?.full_name}
        </span>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white text-sm font-semibold hover:bg-brand-700 transition-colors"
        >
          {user?.full_name ? getInitials(user.full_name) : <User className="w-4 h-4" />}
        </button>

        {dropdownOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
            <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-xl shadow-lg z-20 w-48 py-1">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.full_name}</p>
                <p className="text-xs text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={() => { signOut(); setDropdownOpen(false) }}
                className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
