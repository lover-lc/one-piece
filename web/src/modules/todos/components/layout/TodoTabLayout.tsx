import {
  Calendar,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  LayoutPanelLeft,
  ListChecks,
  ListTodo,
  Plus,
  Settings2,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import NotificationCenter from '../NotificationCenter'
import MemberSwitcher from '../../../portal/components/MemberSwitcher'
import AppTabBar, { tabBarBottomOffset } from '../../../../shared/components/AppTabBar'
import { Button } from '@/components/ui/button'

const tabs = [
  { to: '/todos', label: '待办', icon: ListTodo, activeIcon: ListChecks, end: true },
  {
    to: '/todos/timeline',
    label: '时间轴',
    icon: Calendar,
    activeIcon: CalendarDays,
    end: false,
  },
  {
    to: '/todos/manage',
    label: '管理',
    icon: Settings2,
    activeIcon: FolderKanban,
    end: false,
  },
  {
    to: '/portal',
    label: '主页',
    icon: LayoutDashboard,
    activeIcon: LayoutPanelLeft,
    end: true,
  },
] as const

const FAB_SIZE = '3.5rem'

export default function TodoTabLayout() {
  const location = useLocation()
  const showFab = location.pathname === '/todos'

  const mainPaddingBottom = showFab
    ? `calc(${tabBarBottomOffset} + ${FAB_SIZE})`
    : tabBarBottomOffset

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-end gap-1">
          <MemberSwitcher />
          <NotificationCenter />
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: mainPaddingBottom }}
      >
        <Outlet />
      </main>

      {showFab ? (
        <Button
          size="icon-lg"
          className="fixed right-4 z-30 size-12 rounded-full shadow-lg"
          style={{ bottom: `calc(${tabBarBottomOffset} + 0.75rem)` }}
          asChild
        >
          <Link to="/todos/new" aria-label="新建待办">
            <Plus className="size-6" />
          </Link>
        </Button>
      ) : null}

      <AppTabBar tabs={tabs} labelClassName="text-[10px]" />
    </div>
  )
}
