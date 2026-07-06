import { Bell } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePendingActions } from '../context/pending-actions-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export default function NotificationCenter() {
  const navigate = useNavigate()
  const location = useLocation()
  const inTodosModule = location.pathname.startsWith('/todos')
  const { pendingItems, openPendingModal } = usePendingActions()
  const pendingCount = pendingItems.length

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative"
      aria-label="待办提醒"
      onClick={() => {
        if (pendingCount === 0) return
        openPendingModal()
        if (!inTodosModule) navigate('/todos')
      }}
      disabled={pendingCount === 0}
    >
      <Bell className="size-5" />
      {pendingCount > 0 ? (
        <Badge
          variant="destructive"
          className="absolute -right-0.5 -top-0.5 flex size-4 min-w-4 items-center justify-center rounded-full p-0 text-[10px]"
        >
          {pendingCount > 9 ? '9+' : pendingCount}
        </Badge>
      ) : null}
    </Button>
  )
}
