import { describe, expect, it } from 'vitest'
import { highlightNameParts, searchItems } from '../src/modules/items/lib/search'
import type { Area, Category, Item } from '../src/modules/items/lib/types'

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
  {
    id: 'area-1',
    name: '厨房',
    isSystemReserved: false,
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'area-2',
    name: '卧室',
    isSystemReserved: false,
    createdAt: '2026-06-01T00:00:00Z',
  },
]

const categories: Category[] = [
  {
    id: 'cat-1',
    name: '食品',
    isSystemReserved: false,
    createdAt: '2026-06-01T00:00:00Z',
  },
  {
    id: 'cat-2',
    name: '电器',
    isSystemReserved: false,
    createdAt: '2026-06-01T00:00:00Z',
  },
]

describe('searchItems', () => {
  const items = [
    makeItem({
      id: '1',
      name: '苹果',
      areaId: 'area-1',
      categoryId: 'cat-1',
      specificLocation: '冰箱',
    }),
    makeItem({
      id: '2',
      name: '台灯',
      areaId: 'area-2',
      categoryId: 'cat-2',
      specificLocation: '床头柜',
    }),
    makeItem({
      id: '3',
      name: '大米',
      areaId: 'area-1',
      categoryId: 'cat-1',
      specificLocation: '橱柜',
    }),
  ]

  it('returns empty array for empty query', () => {
    expect(searchItems(items, '', areas, categories)).toEqual([])
    expect(searchItems(items, '   ', areas, categories)).toEqual([])
  })

  it('matches item name case-insensitively', () => {
    expect(searchItems(items, '苹', areas, categories).map((i) => i.id)).toEqual(['1'])
    expect(searchItems(items, 'APPLE', areas, categories)).toEqual([])
  })

  it('matches area name via lookup', () => {
    expect(searchItems(items, '厨房', areas, categories).map((i) => i.id)).toEqual([
      '1',
      '3',
    ])
  })

  it('matches category name', () => {
    expect(searchItems(items, '电器', areas, categories).map((i) => i.id)).toEqual(['2'])
  })

  it('matches specific location', () => {
    expect(searchItems(items, '床头', areas, categories).map((i) => i.id)).toEqual(['2'])
  })

  it('uses nested area/category when present', () => {
    const nested = [
      makeItem({
        id: '4',
        name: '测试',
        area: areas[1],
        category: categories[1],
        specificLocation: '角落',
      }),
    ]
    expect(searchItems(nested, '卧室', areas, categories)).toHaveLength(1)
    expect(searchItems(nested, '电器', areas, categories)).toHaveLength(1)
  })
})

describe('highlightNameParts', () => {
  it('returns null when query is empty or no match', () => {
    expect(highlightNameParts('苹果', '')).toBeNull()
    expect(highlightNameParts('苹果', '梨')).toBeNull()
  })

  it('splits name around case-insensitive match', () => {
    expect(highlightNameParts('Red Apple', 'apple')).toEqual({
      before: 'Red ',
      match: 'Apple',
      after: '',
    })
  })
})
