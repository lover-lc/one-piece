import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toArea, type Area, type DbArea } from '../lib/types'
import { supabase } from '../../../shared/lib/supabase'

export function useAreas() {
  return useQuery({
    queryKey: ['areas'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Area[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('areas')
        .select('*')
        .order('name')

      if (error) throw error
      return (data as DbArea[]).map(toArea)
    },
    staleTime: 1000 * 60,
  })
}

export function useCreateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; isSystemReserved?: boolean }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { data, error } = await supabase
        .from('areas')
        .insert({
          name: input.name,
          is_system_reserved: input.isSystemReserved ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return toArea(data as DbArea)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
  })
}

export function useUpdateArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { data, error } = await supabase
        .from('areas')
        .update({ name: input.name })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return toArea(data as DbArea)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
    },
  })
}

export function useDeleteArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { error } = await supabase.from('areas').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['areas'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
