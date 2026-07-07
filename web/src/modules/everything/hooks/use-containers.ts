import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  nextContainerSortOrder,
  persistContainerSortOrder,
} from '../../../shared/lib/container-sort-order'
import { createGroupedReorderMutationHandlers } from '../../../shared/lib/reorder-mutation'
import { supabase } from '../../../shared/lib/supabase'
import {
  toContainer,
  toDbContainer,
  type DbContainer,
  type Container,
  type ContainerInsert,
  type Position3D,
} from '../types/scene-types'

const CONTAINER_SELECT = '*'

export const DEFAULT_CONTAINER_POSITION: Position3D = {
  x: 0,
  y: 0,
  z: 0,
  rotationY: 0,
  scale: 1,
}

export function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Container[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('containers')
        .select(CONTAINER_SELECT)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true })

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
      if (!input.areaId) throw new Error('容器必须指定区域')

      const sortOrder = await nextContainerSortOrder(supabase, input.areaId)

      const { data, error } = await supabase
        .from('containers')
        .insert({ ...toDbContainer(input), sort_order: sortOrder })
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
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useUpdateContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      areaId?: string
    }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const updates: Partial<DbContainer> = {}
      if (input.name !== undefined) updates.name = input.name
      if (input.areaId !== undefined) updates.area_id = input.areaId

      const { data, error } = await supabase
        .from('containers')
        .update(updates)
        .eq('id', input.id)
        .select(CONTAINER_SELECT)
        .single()

      if (error) throw error
      return toContainer(data as DbContainer)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useReorderContainers() {
  const queryClient = useQueryClient()
  const handlers = createGroupedReorderMutationHandlers<Container>(
    queryClient,
    ['containers'],
    (item, input) => item.areaId === input.areaId,
  )

  return useMutation({
    mutationFn: async (input: { areaId: string; orderedIds: string[] }) => {
      if (!supabase) throw new Error('未配置 Supabase')
      await persistContainerSortOrder(
        supabase,
        input.areaId,
        input.orderedIds,
      )
    },
    ...handlers,
  })
}

export function useMigrateContainerToArea() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { containerId: string; targetAreaId: string }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { error: containerError } = await supabase
        .from('containers')
        .update({ area_id: input.targetAreaId })
        .eq('id', input.containerId)

      if (containerError) throw containerError

      const { error: itemsError } = await supabase
        .from('items')
        .update({ area_id: input.targetAreaId })
        .eq('container_id', input.containerId)

      if (itemsError) throw itemsError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
      queryClient.invalidateQueries({ queryKey: ['items'] })
    },
  })
}

export function useDeleteAllContainers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { error } = await supabase
        .from('containers')
        .delete()
        .not('id', 'is', null)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

export function useDeleteContainersBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!supabase) throw new Error('未配置 Supabase')
      if (ids.length === 0) return

      const { error } = await supabase.from('containers').delete().in('id', ids)

      if (error) throw error
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['containers'] })
      const previous = queryClient.getQueryData<Container[]>(['containers'])
      if (previous) {
        queryClient.setQueryData<Container[]>(
          ['containers'],
          previous.filter((c) => !ids.includes(c.id)),
        )
      }
      return { previous }
    },
    onError: (_err, _ids, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['containers'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

export function useUpdateContainersBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (
      updates: Array<{ id: string; position_3d: Position3D }>,
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
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['containers'] })
      const previous = queryClient.getQueryData<Container[]>(['containers'])
      if (previous) {
        const byId = new Map(updates.map((u) => [u.id, u.position_3d]))
        queryClient.setQueryData<Container[]>(
          ['containers'],
          previous.map((c) => {
            const nextPosition = byId.get(c.id)
            if (!nextPosition) return c
            return { ...c, position: nextPosition }
          }),
        )
      }
      return { previous }
    },
    onError: (_err, _updates, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['containers'], context.previous)
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}
