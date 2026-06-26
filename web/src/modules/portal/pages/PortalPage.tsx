import NotificationCenter from '../../todos/components/NotificationCenter'
import { usePortalStats } from '../../todos/hooks/use-todos'
import { useRealtimeTodos } from '../../../shared/hooks/use-realtime'
import { Package, CheckSquare, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppCard from '../components/AppCard'
import MemberSwitcher from '../components/MemberSwitcher'

export default function PortalPage() {
  const { data: stats } = usePortalStats()
  useRealtimeTodos()

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <h1 className="text-lg font-medium text-text">家庭应用</h1>
          <div className="flex items-center gap-2">
            <MemberSwitcher />
            <NotificationCenter />
            <Link
              to="/settings"
              className="rounded-button p-2 text-text-secondary hover:bg-bg-hover"
              aria-label="设置"
            >
              <Settings className="size-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <AppCard
          title="物品管理"
          description="管理家庭物品、区域与分类"
          to="/items"
          accentColor="#2c3e50"
          icon={<Package className="size-6" />}
          stats={[
            { label: '物品总数', value: stats?.itemCount ?? '—' },
            { label: '即将过期', value: stats?.expiringCount ?? '—' },
          ]}
        />

        <AppCard
          title="待办管理"
          description="家庭成员协作待办事项"
          to="/todos"
          accentColor="#3498db"
          icon={<CheckSquare className="size-6" />}
          stats={[
            { label: '进行中', value: stats?.activeTodos ?? '—' },
            { label: '今日到期', value: stats?.dueToday ?? '—' },
          ]}
        />
      </main>
    </div>
  )
}
