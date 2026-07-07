import type { QueryClient } from '@tanstack/react-query'
import { reorderByIds, type SortableById } from './optimistic-reorder'

export function createReorderMutationHandlers<T extends SortableById>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
) {
  return {
    onMutate: async (orderedIds: string[]) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<T[]>(queryKey)
      if (previous) {
        queryClient.setQueryData<T[]>(queryKey, reorderByIds(previous, orderedIds))
      }
      return { previous }
    },
    onError: (
      _error: unknown,
      _orderedIds: string[],
      context: { previous?: T[] } | undefined,
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  }
}

export function createGroupedReorderMutationHandlers<T extends SortableById & { areaId?: string | null; visibility?: string }>(
  queryClient: QueryClient,
  queryKey: readonly unknown[],
  matchGroup: (item: T, input: { areaId?: string; visibility?: string }) => boolean,
) {
  return {
    onMutate: async (input: { areaId?: string; visibility?: string; orderedIds: string[] }) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<T[]>(queryKey)
      if (previous) {
        const inGroup = previous.filter((item) => matchGroup(item, input))
        const other = previous.filter((item) => !matchGroup(item, input))
        const reordered = reorderByIds(inGroup, input.orderedIds)
        queryClient.setQueryData<T[]>(queryKey, [...other, ...reordered])
      }
      return { previous }
    },
    onError: (
      _error: unknown,
      _input: { orderedIds: string[] },
      context: { previous?: T[] } | undefined,
    ) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey })
    },
  }
}
