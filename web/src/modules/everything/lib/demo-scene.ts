import type { SceneConfig, ContainerInsert } from '../types/scene-types'

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  id: 'default-scene',
  version: 1,
  camera: {
    position: [1.8, 1.4, 1.8],
    rotation: [0, 0, 0],
  },
  lighting: {
    ambient: 0.4,
    directional: {
      intensity: 0.8,
      position: [10, 15, 10],
    },
  },
  environment: {
    floor: {
      material: 'wood',
      size: [6, 6],
    },
    walls: [
      { id: 'wall-north', points: [[-3, -3], [3, -3]], height: 3 },
      { id: 'wall-west', points: [[-3, -3], [-3, 3]], height: 3 },
    ],
  },
  lastModified: Date.now(),
}

export function getDemoContainers(clientRoomAreaId: string): ContainerInsert[] {
  return [
    {
      name: '沙发',
      areaId: clientRoomAreaId,
      position: { x: -1.4, y: 0, z: -1.4, rotationY: 0, scale: 1 },
      modelRef: 'everything-models/sofa_glb.glb',
      modelType: 'custom',
    },
  ]
}
