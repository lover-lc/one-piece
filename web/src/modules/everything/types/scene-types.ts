/**
 * 3D position in scene space.
 */
export interface Position3D {
  x: number
  y: number
  z: number
  rotationY: number
  scale: number
}

export interface DbContainer {
  id: string
  scene_id: string | null
  name: string
  area_id: string | null
  sort_order: number
  position_3d: Position3D
  model_ref: string
  model_type: 'builtin' | 'custom'
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface Container {
  id: string
  sceneId: string | null
  name: string
  areaId: string | null
  sortOrder: number
  position: Position3D
  modelRef: string
  modelType: 'builtin' | 'custom'
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface ContainerInsert {
  name: string
  areaId?: string | null
  position: Position3D
  modelRef: string
  modelType?: 'builtin' | 'custom'
  metadata?: Record<string, unknown> | null
}

export interface SceneConfig {
  id: string
  version: number
  camera: {
    position: [number, number, number]
    rotation: [number, number, number]
  }
  lighting: {
    ambient: number
    directional: {
      intensity: number
      position: [number, number, number]
    }
  }
  environment: {
    floor: {
      material: string
      size: [number, number]
    }
    walls: Array<{
      id: string
      points: [[number, number], [number, number]]
      height: number
    }>
  }
  lastModified: number
}

export type BuiltinModelType =
  | 'cabinet_tv'
  | 'wardrobe_large'
  | 'wardrobe_small'
  | 'shoe_cabinet'
  | 'bookshelf'
  | 'nightstand'
  | 'sideboard'
  | 'drawer_chest'
  | 'storage_box'
  | 'kitchen_cabinet'

export interface BuiltinModelConfig {
  id: BuiltinModelType
  name: string
  size: [number, number, number]
  color: string
  category: '容器'
}

export function toContainer(db: DbContainer): Container {
  return {
    id: db.id,
    sceneId: db.scene_id,
    name: db.name,
    areaId: db.area_id,
    sortOrder: db.sort_order ?? 0,
    position: db.position_3d,
    modelRef: db.model_ref,
    modelType: db.model_type,
    metadata: db.metadata,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

export function toDbContainer(container: ContainerInsert): Partial<DbContainer> {
  return {
    name: container.name,
    area_id: container.areaId ?? null,
    position_3d: container.position,
    model_ref: container.modelRef,
    model_type: container.modelType ?? 'builtin',
    metadata: container.metadata ?? null,
  }
}
