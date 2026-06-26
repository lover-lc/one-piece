import type { SortField, SortOrder } from '../store/ui-store'
import { dailyCost as calcDailyCost, usedDays } from './cost-calculator'
import { parseISODate } from '../../../shared/lib/date-utils'
import type { Area, Category, Item } from './types'

export function computeItemUsedDays(item: Item, today: Date = new Date()): number {
  const startDate = parseISODate(item.startDate)
  const endDate = item.endDate ? parseISODate(item.endDate) : today
  return usedDays(startDate, endDate)
}

export function computeItemDailyCost(item: Item, today: Date = new Date()): number {
  const days = computeItemUsedDays(item, today)
  return calcDailyCost(item.purchasePrice, days)
}

export function countItemsByField(
  items: Item[],
  field: 'areaId' | 'categoryId',
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const id = item[field]
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

export function filterItems(
  items: Item[],
  areaFilterIds: string[],
  categoryFilterIds: string[],
): Item[] {
  return items.filter((item) => {
    if (areaFilterIds.length > 0 && !areaFilterIds.includes(item.areaId)) {
      return false
    }
    if (
      categoryFilterIds.length > 0 &&
      !categoryFilterIds.includes(item.categoryId)
    ) {
      return false
    }
    return true
  })
}

export function sortItems(
  items: Item[],
  sortField: SortField,
  sortOrder: SortOrder,
  today: Date = new Date(),
): Item[] {
  const sorted = [...items].sort((a, b) => {
    let cmp = 0
    switch (sortField) {
      case 'name':
        cmp = a.name.localeCompare(b.name, 'zh-CN')
        break
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt)
        break
      case 'dailyCost':
        cmp = computeItemDailyCost(a, today) - computeItemDailyCost(b, today)
        break
      case 'purchasePrice':
        cmp = a.purchasePrice - b.purchasePrice
        break
      case 'startDate':
        cmp = a.startDate.localeCompare(b.startDate)
        break
    }
    return sortOrder === 'asc' ? cmp : -cmp
  })
  return sorted
}

export function itemsForArea(items: Item[], areaId: string): Item[] {
  return items.filter((item) => item.areaId === areaId)
}

export function displayedAreas(
  areas: Area[],
  areaFilterIds: string[],
  items: Item[],
): Area[] {
  const counts = countItemsByField(items, 'areaId')
  return areas.filter((area) => {
    if ((counts[area.id] ?? 0) === 0) return false
    if (areaFilterIds.length > 0 && !areaFilterIds.includes(area.id)) {
      return false
    }
    return true
  })
}

export function areasWithItems(areas: Area[], items: Item[]): Area[] {
  const counts = countItemsByField(items, 'areaId')
  return areas.filter((area) => (counts[area.id] ?? 0) > 0)
}

export function categoriesWithItems(
  categories: Category[],
  items: Item[],
): Category[] {
  const counts = countItemsByField(items, 'categoryId')
  return categories.filter((category) => (counts[category.id] ?? 0) > 0)
}

export const SORT_FIELD_LABELS: Record<SortField, string> = {
  name: '名称',
  createdAt: '创建时间',
  dailyCost: '每日成本',
  purchasePrice: '买入价格',
  startDate: '开始使用时间',
}

export const SORT_ORDER_LABELS: Record<SortOrder, string> = {
  asc: '升序',
  desc: '降序',
}
