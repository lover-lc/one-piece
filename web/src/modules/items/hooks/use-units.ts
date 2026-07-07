import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  nextEntitySortOrder,
  persistEntitySortOrder,
} from '../../../shared/lib/entity-sort-order'
import { createReorderMutationHandlers } from '../../../shared/lib/reorder-mutation'
import { supabase } from '../../../shared/lib/supabase'
import { toUnit, type DbUnit, type Unit } from '../lib/types'

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Unit[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      return (data as DbUnit[]).map(toUnit)
    },
    staleTime: 1000 * 60,
  })
}

export function useCreateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; isSystemReserved?: boolean }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const sortOrder = await nextEntitySortOrder(supabase, 'units')

      const { data, error } = await supabase
        .from('units')
        .insert({
          name: input.name,
          is_system_reserved: input.isSystemReserved ?? false,
          sort_order: sortOrder,
        })
        .select()
        .single()

      if (error) throw error
      return toUnit(data as DbUnit)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useUpdateUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      isDisabled?: boolean
    }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const update: { name?: string; is_disabled?: boolean } = {}
      if (input.name !== undefined) update.name = input.name
      if (input.isDisabled !== undefined) update.is_disabled = input.isDisabled

      const { data, error } = await supabase
        .from('units')
        .update(update)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return toUnit(data as DbUnit)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
    },
  })
}

export function useReorderUnits() {
  const queryClient = useQueryClient()
  const handlers = createReorderMutationHandlers<Unit>(queryClient, ['units'])

  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      if (!supabase) throw new Error('未配置 Supabase')
      await persistEntitySortOrder(supabase, 'units', orderedIds)
    },
    ...handlers,
  })
}

export function useDeleteUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { error } = await supabase.from('units').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['units'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
