import NotificationCenter from '../../todos/components/NotificationCenter'
import { usePortalStats } from '../../todos/hooks/use-todos'
import { Package, CheckSquare, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import AppCard, { PortalAppGrid } from '../components/AppCard'
import MemberSwitcher from '../components/MemberSwitcher'
import { Button } from '@/components/ui/button'

export default function PortalPage() {
  const { data: stats } = usePortalStats()

  return (
    <>
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <h1 className="text-lg font-semibold">家庭应用</h1>
          <div className="flex items-center gap-1">
            <MemberSwitcher />
            <NotificationCenter />
            <Button variant="ghost" size="icon-sm" asChild>
              <Link to="/settings" aria-label="设置">
                <Settings className="size-5" />
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <PortalAppGrid>
          <AppCard
            title="物品管理"
            description="管理家庭物品、区域与分类"
            to="/items"
            accentColor="#78716C"
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
            accentColor="#6366F1"
            icon={<CheckSquare className="size-6" />}
            stats={[
              { label: '进行中', value: stats?.activeTodos ?? '—' },
              { label: '今日到期', value: stats?.dueToday ?? '—' },
            ]}
          />
        </PortalAppGrid>
      </main>
    </>
  )
}
