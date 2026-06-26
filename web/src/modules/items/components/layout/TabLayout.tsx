import { Home, Search, SlidersHorizontal } from 'lucide-react'
import { NavLink, Outlet, Link } from 'react-router-dom'

const tabs = [
  { to: '/items', label: '物品', icon: Home, end: true },
  { to: '/items/search', label: '搜索', icon: Search, end: false },
  { to: '/items/manage', label: '管理', icon: SlidersHorizontal, end: false },
] as const

export default function TabLayout() {
  return (
    <div className="flex min-h-svh flex-col bg-bg">
      <header className="border-b border-bg-hover bg-bg-card px-4 py-2">
        <Link to="/portal" className="text-xs text-primary">
          返回门户
        </Link>
      </header>
      <main className="flex-1 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-bg-hover bg-bg-card pb-safe-bottom">
        <div className="mx-auto flex h-14 max-w-lg">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                [
                  'flex flex-1 flex-col items-center justify-center gap-0.5 text-xs transition-colors',
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
