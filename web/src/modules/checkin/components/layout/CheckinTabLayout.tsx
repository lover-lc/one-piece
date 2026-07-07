import {
  Activity,
  CalendarRange,
  ClipboardList,
  Droplets,
  LayoutDashboard,
  LayoutPanelLeft,
  UserRound,
  Utensils,
  UtensilsCrossed,
} from 'lucide-react'
import { Outlet } from 'react-router-dom'
import MemberSwitcher from '../../../portal/components/MemberSwitcher'
import AppTabBar, { tabBarBottomOffset } from '../../../../shared/components/AppTabBar'

const tabs = [
  { to: '/checkin', label: '记录', icon: ClipboardList, activeIcon: UtensilsCrossed, end: true },
  {
    to: '/checkin/exercise',
    label: '运动',
    icon: Activity,
    activeIcon: Activity,
    end: false,
  },
  {
    to: '/checkin/water',
    label: '喝水',
    icon: Droplets,
    activeIcon: Droplets,
    end: false,
  },
  {
    to: '/checkin/overview',
    label: '总览',
    icon: CalendarRange,
    activeIcon: CalendarRange,
    end: false,
  },
  {
    to: '/checkin/profile',
    label: '档案',
    icon: UserRound,
    activeIcon: UserRound,
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

export default function CheckinTabLayout() {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <header className="checkin-module-header shrink-0 border-b border-border bg-card/80 px-4 py-2 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Utensils className="size-4 text-primary" aria-hidden />
            <span className="font-[family-name:var(--font-heading)] tracking-wide">打卡</span>
          </div>
          <MemberSwitcher />
        </div>
      </header>

      <main
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        style={{ paddingBottom: tabBarBottomOffset }}
      >
        <Outlet />
      </main>

      <AppTabBar tabs={tabs} labelClassName="text-[10px]" />
    </div>
  )
}
