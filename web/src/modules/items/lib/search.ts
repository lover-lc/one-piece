import type { Area, Category, Item } from './types'

function includesIgnoreCase(text: string, query: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase())
}

function areaNameFor(item: Item, areas: Area[]): string {
  return item.area?.name ?? areas.find((area) => area.id === item.areaId)?.name ?? ''
}

function categoryNameFor(item: Item, categories: Category[]): string {
  return (
    item.category?.name ??
    categories.find((category) => category.id === item.categoryId)?.name ??
    ''
  )
}

export function searchItems(
  items: Item[],
  query: string,
  areas: Area[],
  categories: Category[],
): Item[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  return items.filter((item) => {
    if (includesIgnoreCase(item.name, trimmed)) return true
    if (includesIgnoreCase(areaNameFor(item, areas), trimmed)) return true
    if (includesIgnoreCase(categoryNameFor(item, categories), trimmed)) return true
    if (includesIgnoreCase(item.specificLocation, trimmed)) return true
    return false
  })
}

export function highlightNameParts(
  name: string,
  query: string,
): { before: string; match: string; after: string } | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const lowerName = name.toLowerCase()
  const lowerQuery = trimmed.toLowerCase()
  const index = lowerName.indexOf(lowerQuery)
  if (index === -1) return null

  return {
    before: name.slice(0, index),
    match: name.slice(index, index + trimmed.length),
    after: name.slice(index + trimmed.length),
  }
}
