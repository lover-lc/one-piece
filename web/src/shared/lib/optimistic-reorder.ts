export type SortableById = { id: string; sortOrder: number }

export function reorderByIds<T extends SortableById>(
  items: T[],
  orderedIds: string[],
): T[] {
  const byId = new Map(items.map((item) => [item.id, item]))
  return orderedIds
    .map((id, index) => {
      const item = byId.get(id)
      if (!item) return null
      return { ...item, sortOrder: index }
    })
    .filter((item): item is T => item != null)
}
