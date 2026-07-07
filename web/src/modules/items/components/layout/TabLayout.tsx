import {
  Box,
  LayoutDashboard,
  LayoutPanelLeft,
  Package,
  Plus,
  Search,
  Settings,
} from 'lucide-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import AppTabBar, { tabBarBottomOffset } from '../../../../shared/components/AppTabBar'
import AppPressable from '../../../../shared/components/motion/AppPressable'
import { ItemsSearchFocusProvider, useItemsSearchFocus } from '../../context/items-search-focus'

const tabs = [
  { to: '/items', label: '物品', icon: Package, activeIcon: Box, end: true },
  {
    to: '/items/search',
    label: '搜索',
    icon: Search,
    activeIcon: Search,
    end: false,
  },
  {
    to: '/items/manage',
    label: '管理',
    icon: Settings,
    activeIcon: Settings,
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

function TabLayoutContent() {
  const location = useLocation()
  const { focusSearch } = useItemsSearchFocus()
  const showFab = location.pathname === '/items'

  const tabsWithHandlers = tabs.map((tab) =>
    tab.to === '/items/search'
      ? { ...tab, onRepeatActive: focusSearch }
      : tab,
  )

  return (
    <div className="flex min-h-svh flex-col">
      <main
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{
          paddingBottom: showFab
            ? `calc(${tabBarBottomOffset} + 3.5rem)`
            : tabBarBottomOffset,
        }}
      >
        <Outlet />
      </main>

      {showFab ? (
        <AppPressable
          as="div"
          className="fixed right-4 z-30"
          style={{ bottom: `calc(${tabBarBottomOffset} + 0.75rem)` }}
          aria-label="添加物品"
        >
          <Button
            size="icon-lg"
            className="size-12 rounded-full shadow-lg"
            asChild
          >
            <Link to="/items/new">
              <Plus className="size-6" />
            </Link>
          </Button>
        </AppPressable>
      ) : null}

      <AppTabBar tabs={tabsWithHandlers} />
    </div>
  )
}

export default function TabLayout() {
  return (
    <ItemsSearchFocusProvider>
      <TabLayoutContent />
    </ItemsSearchFocusProvider>
  )
}
