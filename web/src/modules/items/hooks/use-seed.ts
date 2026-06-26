import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import {
  buildDefaultAreaRows,
  buildDefaultCategoryRows,
} from '../lib/seed-defaults'
import { supabase } from '../../../shared/lib/supabase'

export function useSeedUserDefaults() {
  const queryClient = useQueryClient()
  const seedingRef = useRef(false)

  useEffect(() => {
    if (!supabase || seedingRef.current) return

    let cancelled = false

    async function seedIfNeeded() {
      if (!supabase) return

      const { count, error: countError } = await supabase
        .from('areas')
        .select('*', { count: 'exact', head: true })

      if (cancelled) return
      if (countError) {
        console.error('Failed to check areas count:', countError.message)
        return
      }
      if (count && count > 0) return

      seedingRef.current = true

      const [{ error: areaError }, { error: categoryError }] =
        await Promise.all([
          supabase.from('areas').insert(buildDefaultAreaRows()),
          supabase.from('categories').insert(buildDefaultCategoryRows()),
        ])

      if (cancelled) return

      if (areaError) {
        console.error('Failed to seed default areas:', areaError.message)
      }
      if (categoryError) {
        console.error('Failed to seed default categories:', categoryError.message)
      }

      if (!areaError && !categoryError) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['areas'] }),
          queryClient.invalidateQueries({ queryKey: ['categories'] }),
        ])
      }

      seedingRef.current = false
    }

    void seedIfNeeded()

    return () => {
      cancelled = true
    }
  }, [queryClient])
}
