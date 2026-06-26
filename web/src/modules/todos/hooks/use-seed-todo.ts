import { useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { supabase } from '../../../shared/lib/supabase'

export function useSeedDefaultTodoList() {
  const { currentMemberId } = useCurrentMember()
  const queryClient = useQueryClient()
  const seedingRef = useRef(false)

  useEffect(() => {
    if (!supabase || !currentMemberId || seedingRef.current) return

    let cancelled = false

    async function seed() {
      if (!supabase || !currentMemberId) return

      const { count, error } = await supabase
        .from('todo_lists')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', currentMemberId)

      if (cancelled || error) return
      if (count && count > 0) return

      seedingRef.current = true
      await supabase.from('todo_lists').insert({
        name: '默认清单',
        owner_id: currentMemberId,
        color: '#2c3e50',
        sort_order: 0,
      })
      await queryClient.invalidateQueries({ queryKey: ['todo-lists'] })
      seedingRef.current = false
    }

    void seed()
    return () => {
      cancelled = true
    }
  }, [currentMemberId, queryClient])
}
