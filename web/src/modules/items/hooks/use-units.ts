import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toUnit, type DbUnit, type Unit } from '../lib/types'
import { supabase } from '../../../shared/lib/supabase'

export function useUnits() {
  return useQuery({
    queryKey: ['units'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Unit[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('units')
        .select('*')
        .order('name')

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

      const { data, error } = await supabase
        .from('units')
        .insert({
          name: input.name,
          is_system_reserved: input.isSystemReserved ?? false,
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
    mutationFn: async (input: { id: string; name: string }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { data, error } = await supabase
        .from('units')
        .update({ name: input.name })
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
