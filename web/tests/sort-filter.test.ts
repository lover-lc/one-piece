import { describe, expect, it } from 'vitest'
import {
  areasWithItems,
  categoriesWithItems,
  computeItemDailyCost,
  countItemsByField,
  displayedAreas,
  filterItems,
  sortItems,
} from '../src/modules/items/lib/sort-filter'
import type { Area, Category, Item } from '../src/modules/items/lib/types'

const today = new Date('2026-06-26')

function makeItem(overrides: Partial<Item> = {}): Item {
  return {
    id: '1',
    name: '物品A',
    purchasePrice: 100,
    purchaseDate: '2026-06-01',
    quantity: null,
    startDate: '2026-06-01',
    endDate: null,
    expiryDate: null,
    areaId: 'area-1',
    categoryId: 'cat-1',
    unitId: null,
    specificLocation: '柜子',
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

const areas: Area[] = [
  { id: 'area-1', name: '厨房', isSystemReserved: false, createdAt: '', updatedAt: '' },
  { id: 'area-2', name: '卧室', isSystemReserved: false, createdAt: '', updatedAt: '' },
  { id: 'area-3', name: '空区域', isSystemReserved: false, createdAt: '', updatedAt: '' },
]

const categories: Category[] = [
  { id: 'cat-1', name: '食品', isSystemReserved: false, createdAt: '', updatedAt: '' },
  { id: 'cat-2', name: '空分类', isSystemReserved: false, createdAt: '', updatedAt: '' },
]

describe('filterItems', () => {
  const items = [
    makeItem({ id: '1', areaId: 'area-1', categoryId: 'cat-1' }),
    makeItem({ id: '2', areaId: 'area-2', categoryId: 'cat-1' }),
    makeItem({ id: '3', areaId: 'area-1', categoryId: 'cat-2' }),
  ]

  it('returns all items when no filters', () => {
    expect(filterItems(items, [], [])).toHaveLength(3)
  })

  it('filters by single area', () => {
    expect(filterItems(items, ['area-1'], [])).toHaveLength(2)
  })

  it('filters by multiple areas with OR', () => {
    expect(filterItems(items, ['area-1', 'area-2'], [])).toHaveLength(3)
  })

  it('filters by category', () => {
    expect(filterItems(items, [], ['cat-1'])).toHaveLength(2)
  })

  it('combines area and category with AND', () => {
    expect(filterItems(items, ['area-1'], ['cat-1'])).toHaveLength(1)
    expect(filterItems(items, ['area-1'], ['cat-1'])[0].id).toBe('1')
  })
})

describe('displayedAreas', () => {
  const items = [
    makeItem({ id: '1', areaId: 'area-1' }),
    makeItem({ id: '2', areaId: 'area-2' }),
  ]

  it('hides areas with no items', () => {
    const result = displayedAreas(areas, [], items)
    expect(result.map((a) => a.id)).toEqual(['area-1', 'area-2'])
  })

  it('respects area filter ids', () => {
    const result = displayedAreas(areas, ['area-1'], items)
    expect(result.map((a) => a.id)).toEqual(['area-1'])
  })
})

describe('areasWithItems and categoriesWithItems', () => {
  const items = [
    makeItem({ id: '1', areaId: 'area-1', categoryId: 'cat-1' }),
    makeItem({ id: '2', areaId: 'area-2', categoryId: 'cat-1' }),
  ]

  it('returns only areas that have items', () => {
    expect(areasWithItems(areas, items).map((a) => a.id)).toEqual([
      'area-1',
      'area-2',
    ])
  })

  it('returns only categories that have items', () => {
    expect(categoriesWithItems(categories, items).map((c) => c.id)).toEqual([
      'cat-1',
    ])
  })
})

describe('countItemsByField', () => {
  it('counts items per area', () => {
    const items = [
      makeItem({ id: '1', areaId: 'area-1' }),
      makeItem({ id: '2', areaId: 'area-1' }),
      makeItem({ id: '3', areaId: 'area-2' }),
    ]
    expect(countItemsByField(items, 'areaId')).toEqual({
      'area-1': 2,
      'area-2': 1,
    })
  })
})

describe('sortItems', () => {
  it('sorts by name ascending', () => {
    const items = [
      makeItem({ id: '1', name: '香蕉' }),
      makeItem({ id: '2', name: '苹果' }),
    ]
    const sorted = sortItems(items, 'name', 'asc', today)
    expect(sorted.map((i) => i.name)).toEqual(['苹果', '香蕉'])
  })

  it('sorts by purchase price descending', () => {
    const items = [
      makeItem({ id: '1', purchasePrice: 50 }),
      makeItem({ id: '2', purchasePrice: 200 }),
    ]
    const sorted = sortItems(items, 'purchasePrice', 'desc', today)
    expect(sorted.map((i) => i.purchasePrice)).toEqual([200, 50])
  })
})

describe('computeItemDailyCost', () => {
  it('uses end date when item is used up', () => {
    const item = makeItem({
      purchasePrice: 100,
      startDate: '2026-06-01',
      endDate: '2026-06-10',
    })
    expect(computeItemDailyCost(item, today)).toBe(10)
  })

  it('uses today when item is still active', () => {
    const item = makeItem({
      purchasePrice: 100,
      startDate: '2026-06-01',
      endDate: null,
    })
    expect(computeItemDailyCost(item, today)).toBe(3.85)
  })
})
