import { useEffect, useRef, useState } from 'react'
import { useNotifications } from './use-notifications'

export function useNotificationToast() {
  const { data: notifications = [] } = useNotifications()
  const unreadCount = notifications.filter((n) => !n.isRead).length
  const prevUnreadRef = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (prevUnreadRef.current === null) {
      prevUnreadRef.current = unreadCount
      return
    }

    if (unreadCount > prevUnreadRef.current) {
      setToast('您有新通知')
    }

    prevUnreadRef.current = unreadCount
  }, [unreadCount])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  return toast
}
