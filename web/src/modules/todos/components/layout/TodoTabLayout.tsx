import {
  Calendar,
  CheckSquare,
  Home,
  List,
  Plus,
} from 'lucide-react'
import { NavLink, Outlet, Link } from 'react-router-dom'
import NotificationCenter from '../NotificationCenter'
import MemberSwitcher from '../../../portal/components/MemberSwitcher'

const tabs = [
  { to: '/todos', label: '待办', icon: Home, end: true },
  { to: '/todos/timeline', label: '时间轴', icon: Calendar, end: false },
  { to: '/todos/assigned', label: '分配给我', icon: CheckSquare, end: false },
  { to: '/todos/lists', label: '清单', icon: List, end: false },
] as const

export default function TodoTabLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <header className="border-b border-bg-hover bg-bg-card px-4 py-2">
        <div className="flex items-center justify-between gap-2">
          <Link to="/portal" className="text-xs text-primary">
            门户
          </Link>
          <div className="flex items-center gap-1">
            <MemberSwitcher />
            <NotificationCenter />
          </div>
        </div>
      </header>

      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+3.5rem)]">
        <Outlet />
      </main>

      <Link
        to="/todos/new"
        className="fixed bottom-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.75rem)] right-4 z-30 flex size-12 items-center justify-center rounded-full bg-primary text-white shadow-lg"
        aria-label="新建待办"
      >
        <Plus className="size-6" />
      </Link>

      <nav className="fixed inset-x-0 bottom-0 border-t border-bg-hover bg-bg-card pb-safe-bottom">
        <div className="mx-auto flex h-14 max-w-lg">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] transition-colors',
                  isActive ? 'text-primary' : 'text-text-secondary',
                ].join(' ')
              }
            >
              <Icon className="size-5" strokeWidth={1.75} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
