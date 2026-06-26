import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from './use-current-member'
import { supabase } from '../lib/supabase'

export function useRealtimeTodos() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  useEffect(() => {
    if (!supabase || !currentMemberId) return

    const channel = supabase
      .channel('todos-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todo_items' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['todos'] })
          void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'todo_notifications' },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['notifications'] })
        },
      )
      .subscribe()

    return () => {
      if (supabase) void supabase.removeChannel(channel)
    }
  }, [queryClient, currentMemberId])
}
