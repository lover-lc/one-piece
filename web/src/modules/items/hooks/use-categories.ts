import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toCategory, type Category, type DbCategory } from '../lib/types'
import { supabase } from '../../../shared/lib/supabase'

export function useCategories() {
  return useQuery({
    queryKey: ['categories'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Category[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name')

      if (error) throw error
      return (data as DbCategory[]).map(toCategory)
    },
    staleTime: 1000 * 60,
  })
}

export function useCreateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string; isSystemReserved?: boolean }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { data, error } = await supabase
        .from('categories')
        .insert({
          name: input.name,
          is_system_reserved: input.isSystemReserved ?? false,
        })
        .select()
        .single()

      if (error) throw error
      return toCategory(data as DbCategory)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useUpdateCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { data, error } = await supabase
        .from('categories')
        .update({ name: input.name })
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return toCategory(data as DbCategory)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
  })
}

export function useDeleteCategory() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) {
        throw new Error('未配置 Supabase')
      }

      const { error } = await supabase.from('categories').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}
