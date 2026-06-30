import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../shared/lib/supabase'
import {
  toContainer,
  toDbContainer,
  type DbContainer,
  type Container,
  type ContainerInsert,
} from '../types/scene-types'

const CONTAINER_SELECT = '*'

export function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Container[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('containers')
        .select(CONTAINER_SELECT)
        .order('name')

      if (error) throw error
      return (data as DbContainer[]).map(toContainer)
    },
    staleTime: 1000 * 60,
  })
}

export function useContainer(id: string | undefined) {
  return useQuery({
    queryKey: ['containers', id],
    enabled: Boolean(supabase && id),
    queryFn: async (): Promise<Container | null> => {
      if (!supabase || !id) return null

      const { data, error } = await supabase
        .from('containers')
        .select(CONTAINER_SELECT)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data ? toContainer(data as DbContainer) : null
    },
    staleTime: 1000 * 60,
  })
}

export function useCreateContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ContainerInsert) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { data, error } = await supabase
        .from('containers')
        .insert(toDbContainer(input))
        .select(CONTAINER_SELECT)
        .single()

      if (error) throw error
      return toContainer(data as DbContainer)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

export function useCreateContainersBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: ContainerInsert[]) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const dbContainers = inputs.map(toDbContainer)
      const { data, error } = await supabase
        .from('containers')
        .insert(dbContainers)
        .select(CONTAINER_SELECT)

      if (error) throw error
      return (data as DbContainer[]).map(toContainer)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

export function useDeleteContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { error } = await supabase.from('containers').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

export function useUpdateContainersBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      updates: Array<{ id: string; position_3d: unknown }>,
    ): Promise<void> => {
      if (!supabase) throw new Error('未配置 Supabase')

      for (const u of updates) {
        const { error } = await supabase
          .from('containers')
          .update({ position_3d: u.position_3d })
          .eq('id', u.id)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}
