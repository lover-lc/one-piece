import { describe, expect, it } from 'vitest'
import { reorderByIds } from '../src/shared/lib/optimistic-reorder'

describe('reorderByIds', () => {
  it('reorders items and updates sortOrder indices', () => {
    const items = [
      { id: 'a', sortOrder: 0 },
      { id: 'b', sortOrder: 1 },
      { id: 'c', sortOrder: 2 },
    ]

    expect(reorderByIds(items, ['c', 'a', 'b'])).toEqual([
      { id: 'c', sortOrder: 0 },
      { id: 'a', sortOrder: 1 },
      { id: 'b', sortOrder: 2 },
    ])
  })
})
