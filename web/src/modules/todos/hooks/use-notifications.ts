import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { supabase } from '../../../shared/lib/supabase'
import { toNotification, type DbNotification } from '../services/todo-service'

export function useNotifications() {
  const { currentMemberId } = useCurrentMember()

  return useQuery({
    queryKey: ['notifications', currentMemberId],
    enabled: Boolean(currentMemberId && supabase),
    refetchInterval: 10_000,
    refetchIntervalInBackground: false,
    queryFn: async () => {
      if (!supabase || !currentMemberId) return []

      const { data, error } = await supabase
        .from('todo_notifications')
        .select('*')
        .eq('recipient_id', currentMemberId)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      return (data as DbNotification[]).map(toNotification)
    },
  })
}

export function useUnreadNotificationCount() {
  const { data: notifications = [] } = useNotifications()
  return notifications.filter((n) => !n.isRead).length
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('未配置 Supabase')
      const { error } = await supabase
        .from('todo_notifications')
        .update({ is_read: true })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async () => {
      if (!supabase || !currentMemberId) return
      const { error } = await supabase
        .from('todo_notifications')
        .update({ is_read: true })
        .eq('recipient_id', currentMemberId)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useDeleteNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('未配置 Supabase')
      const { error } = await supabase.from('todo_notifications').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkTodoNotificationsRead() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (todoItemId: string) => {
      if (!supabase || !currentMemberId) return
      const { error } = await supabase
        .from('todo_notifications')
        .update({ is_read: true })
        .eq('todo_item_id', todoItemId)
        .eq('recipient_id', currentMemberId)
        .eq('is_read', false)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
