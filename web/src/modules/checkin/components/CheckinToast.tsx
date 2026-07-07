import { useEffect } from 'react'
import { cn } from '@/lib/utils'

type CheckinToastProps = {
  message: string | null
  onDismiss: () => void
  durationMs?: number
}

export default function CheckinToast({
  message,
  onDismiss,
  durationMs = 2000,
}: CheckinToastProps) {
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, durationMs)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss, durationMs])

  if (!message) return null

  return (
    <div
      role="status"
      className={cn(
        'fixed left-1/2 z-50 -translate-x-1/2 rounded-lg bg-foreground px-4 py-2',
        'text-sm text-background shadow-lg',
        'bottom-[calc(5.5rem+env(safe-area-inset-bottom))]',
      )}
    >
      {message}
    </div>
  )
}
