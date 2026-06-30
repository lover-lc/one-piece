import { useNotificationToast } from '../hooks/use-notification-toast'

export default function NotificationToast() {
  const toast = useNotificationToast()

  if (!toast) return null

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-button bg-foreground px-4 py-2 text-sm text-background shadow-lg"
    >
      {toast}
    </div>
  )
}
