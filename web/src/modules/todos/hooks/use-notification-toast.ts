import { useEffect, useRef, useState } from 'react'
import { usePendingActions } from '../context/pending-actions-context'

export function useNotificationToast() {
  const { pendingItems } = usePendingActions()
  const pendingCount = pendingItems.length
  const prevPendingRef = useRef<number | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    if (prevPendingRef.current === null) {
      prevPendingRef.current = pendingCount
      return
    }

    if (pendingCount > prevPendingRef.current) {
      setToast('有待办需要处理')
    }

    prevPendingRef.current = pendingCount
  }, [pendingCount])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 4000)
    return () => window.clearTimeout(timer)
  }, [toast])

  return toast
}
