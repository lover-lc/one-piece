import { describe, test, expect } from 'vitest'
import { toContainer, toDbContainer } from '../src/modules/everything/types/scene-types'
import type { DbContainer } from '../src/modules/everything/types/scene-types'

describe('container type mappers', () => {
  test('maps db row to frontend container', () => {
    const db: DbContainer = {
      id: 'c1',
      scene_id: null,
      name: '电视柜',
      area_id: 'a1',
      sort_order: 0,
      position_3d: { x: 0, y: 0, z: -8, rotationY: 0, scale: 1 },
      model_ref: 'cabinet_tv',
      model_type: 'builtin',
      metadata: null,
      created_at: '2026-06-30T00:00:00Z',
      updated_at: '2026-06-30T00:00:00Z',
    }

    const container = toContainer(db)
    expect(container.name).toBe('电视柜')
    expect(container.modelRef).toBe('cabinet_tv')
    expect(container.position.z).toBe(-8)
  })

  test('maps insert payload to db shape', () => {
    const row = toDbContainer({
      name: '测试容器',
      position: { x: 1, y: 0, z: 2, rotationY: 0, scale: 1 },
      modelRef: 'storage_box',
    })

    expect(row.name).toBe('测试容器')
    expect(row.model_ref).toBe('storage_box')
    expect(row.model_type).toBe('builtin')
  })
})
