import { useCallback, useState } from 'react'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { supabase } from '../../../shared/lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
}

export function usePushSubscription() {
  const { currentMemberId } = useCurrentMember()
  const [isSupported] = useState(
    () => 'serviceWorker' in navigator && 'PushManager' in window,
  )
  const [permission, setPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== 'undefined' ? Notification.permission : 'default'),
  )

  const subscribe = useCallback(async () => {
    if (!isSupported || !currentMemberId || !supabase || !VAPID_PUBLIC_KEY) {
      return false
    }

    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm !== 'granted') return false

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })

    const json = subscription.toJSON()
    const { error } = await supabase.from('todo_push_subscriptions').upsert(
      {
        member_id: currentMemberId,
        endpoint: json.endpoint!,
        keys: json.keys,
      },
      { onConflict: 'member_id,endpoint' },
    )

    if (error) throw error
    return true
  }, [isSupported, currentMemberId])

  const unsubscribe = useCallback(async () => {
    if (!isSupported || !currentMemberId || !supabase) return

    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      await supabase
        .from('todo_push_subscriptions')
        .delete()
        .eq('member_id', currentMemberId)
        .eq('endpoint', subscription.endpoint)
    }
  }, [isSupported, currentMemberId])

  return { isSupported, permission, subscribe, unsubscribe }
}
