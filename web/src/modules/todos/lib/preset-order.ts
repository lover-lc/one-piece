/** Order preset lists by user-defined id order; unknown ids append in default order. */
export function orderByPresetIds<T extends { id: string }>(
  items: T[],
  order: string[],
  defaultOrder: string[],
): T[] {
  const map = new Map(items.map((item) => [item.id, item]))
  const result: T[] = []
  const seen = new Set<string>()
  const effectiveOrder = order.length > 0 ? order : defaultOrder

  for (const id of effectiveOrder) {
    const item = map.get(id)
    if (item) {
      result.push(item)
      seen.add(id)
    }
  }

  for (const id of defaultOrder) {
    if (seen.has(id)) continue
    const item = map.get(id)
    if (item) {
      result.push(item)
      seen.add(id)
    }
  }

  for (const item of items) {
    if (!seen.has(item.id)) result.push(item)
  }

  return result
}

export function filterDisabledPresets<T extends { id: string }>(
  items: T[],
  disabled: string[],
): T[] {
  const disabledSet = new Set(disabled)
  return items.filter((item) => !disabledSet.has(item.id))
}
