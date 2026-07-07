import { useEffect, useRef, useState } from 'react'

function listKey<T extends { id: string }>(items: T[]): string {
  return items.map((item) => item.id).join('\0')
}

/**
 * Keeps a local sort order in sync with server props, while preserving
 * optimistic order across drag-end until the parent data catches up.
 */
export function useOptimisticSortableList<T extends { id: string }>(items: T[]) {
  const [sortedItems, setSortedItems] = useState(items)
  const pendingKeyRef = useRef<string | null>(null)

  useEffect(() => {
    const incomingKey = listKey(items)
    if (pendingKeyRef.current !== null) {
      if (pendingKeyRef.current === incomingKey) {
        pendingKeyRef.current = null
      }
      return
    }
    setSortedItems(items)
  }, [items])

  function applySortedItems(next: T[]) {
    pendingKeyRef.current = listKey(next)
    setSortedItems(next)
  }

  return { sortedItems, applySortedItems }
}
