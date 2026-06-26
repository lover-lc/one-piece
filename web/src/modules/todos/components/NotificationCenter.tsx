import { Bell } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '../hooks/use-notifications'

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const { data: notifications = [] } = useNotifications()
  const unreadCount = useUnreadNotificationCount()
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const deleteNotification = useDeleteNotification()

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-button p-2 text-text-secondary hover:bg-bg-hover"
        aria-label="通知"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-status-expired text-[10px] text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="关闭"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-1 w-80 max-h-[24rem] overflow-y-auto rounded-card border border-bg-hover bg-bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-bg-hover px-3 py-2">
              <span className="text-sm font-medium">通知</span>
              {unreadCount > 0 ? (
                <button
                  type="button"
                  onClick={() => markAllRead.mutate()}
                  className="text-xs text-primary"
                >
                  全部已读
                </button>
              ) : null}
            </div>
            {notifications.length === 0 ? (
              <p className="p-4 text-center text-sm text-text-secondary">暂无通知</p>
            ) : (
              <ul>
                {notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`border-b border-bg-hover px-3 py-2 text-sm last:border-0 ${n.isRead ? 'text-text-secondary' : 'bg-bg-hover/50'}`}
                  >
                    {n.todoItemId ? (
                      <Link
                        to={`/todos/${n.todoItemId}`}
                        onClick={() => {
                          if (!n.isRead) markRead.mutate(n.id)
                          setOpen(false)
                        }}
                        className="block"
                      >
                        {n.message}
                      </Link>
                    ) : (
                      <span>{n.message}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => deleteNotification.mutate(n.id)}
                      className="mt-1 text-xs text-text-tertiary"
                    >
                      删除
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}
