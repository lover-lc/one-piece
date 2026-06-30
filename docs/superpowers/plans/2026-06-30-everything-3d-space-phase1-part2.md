# Everything 3D空间管理 - 阶段1实现计划（第二部分）

> 接续 `2026-06-30-everything-3d-space-phase1.md`

---

### Task 6: Demo场景数据

**Files:**
- Create: `web/src/modules/everything/lib/demo-scene.ts`

- [ ] **Step 1: 创建demo场景配置**

```typescript
// web/src/modules/everything/lib/demo-scene.ts
import type { SceneConfig, ContainerInsert } from '../types/scene-types'

/**
 * 默认场景配置
 */
export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  id: 'default-scene',
  version: 1,
  camera: {
    position: [0, 1.6, 5],  // 人眼高度，后退5米
    rotation: [0, 0, 0],
  },
  lighting: {
    ambient: 0.4,  // 环境光
    directional: {
      intensity: 0.8,  // 主光源
      position: [10, 15, 10],
    },
  },
  environment: {
    floor: {
      material: 'wood',
      size: [20, 20],  // 20x20米房间
    },
    walls: [
      // 四面墙
      { id: 'wall-north', points: [[-10, 10], [10, 10]], height: 3 },
      { id: 'wall-south', points: [[-10, -10], [10, -10]], height: 3 },
      { id: 'wall-east', points: [[10, -10], [10, 10]], height: 3 },
      { id: 'wall-west', points: [[-10, -10], [-10, 10]], height: 3 },
    ],
  },
  lastModified: Date.now(),
}

/**
 * Demo容器列表（待写入Supabase）
 * 注意：areaId需要在运行时填充为实际的area ID
 */
export function getDemoContainers(clientRoomAreaId: string): ContainerInsert[] {
  return [
    {
      name: '客厅电视柜',
      areaId: clientRoomAreaId,
      position: { x: 0, y: 0, z: -8, rotationY: 0, scale: 1 },
      modelRef: 'cabinet_tv',
      modelType: 'builtin',
    },
    {
      name: '客厅书架左',
      areaId: clientRoomAreaId,
      position: { x: -7, y: 0, z: -5, rotationY: Math.PI / 2, scale: 1 },
      modelRef: 'bookshelf',
      modelType: 'builtin',
    },
    {
      name: '客厅书架右',
      areaId: clientRoomAreaId,
      position: { x: 7, y: 0, z: -5, rotationY: -Math.PI / 2, scale: 1 },
      modelRef: 'bookshelf',
      modelType: 'builtin',
    },
    {
      name: '玄关鞋柜',
      areaId: clientRoomAreaId,
      position: { x: -5, y: 0, z: 8, rotationY: Math.PI, scale: 1 },
      modelRef: 'shoe_cabinet',
      modelType: 'builtin',
    },
    {
      name: '餐边柜',
      areaId: clientRoomAreaId,
      position: { x: 5, y: 0, z: 5, rotationY: Math.PI, scale: 1 },
      modelRef: 'sideboard',
      modelType: 'builtin',
    },
    {
      name: '储物箱1',
      areaId: clientRoomAreaId,
      position: { x: -3, y: 0, z: 0, rotationY: 0, scale: 1 },
      modelRef: 'storage_box',
      modelType: 'builtin',
    },
    {
      name: '储物箱2',
      areaId: clientRoomAreaId,
      position: { x: 3, y: 0, z: 0, rotationY: 0, scale: 1 },
      modelRef: 'storage_box',
      modelType: 'builtin',
    },
    {
      name: '抽屉柜',
      areaId: clientRoomAreaId,
      position: { x: 0, y: 0, z: 3, rotationY: Math.PI, scale: 1 },
      modelRef: 'drawer_chest',
      modelType: 'builtin',
    },
  ]
}
```

- [ ] **Step 2: 验证数据结构**

运行TypeScript检查：
```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 7: Zustand状态管理

**Files:**
- Create: `web/src/modules/everything/store/scene-store.ts`

- [ ] **Step 1: 创建场景状态store**

```typescript
// web/src/modules/everything/store/scene-store.ts
import { create } from 'zustand'
import type { Container } from '../types/scene-types'

interface SceneState {
  // 当前选中的容器ID
  selectedContainerId: string | null
  setSelectedContainerId: (id: string | null) => void

  // 是否显示物品列表模态框
  showItemsModal: boolean
  setShowItemsModal: (show: boolean) => void

  // 是否锁定鼠标（PointerLock状态）
  isPointerLocked: boolean
  setPointerLocked: (locked: boolean) => void

  // 场景加载状态
  isSceneLoading: boolean
  setSceneLoading: (loading: boolean) => void

  // 相机位置（用于恢复）
  cameraState: {
    position: [number, number, number]
    rotation: [number, number, number]
  } | null
  saveCameraState: (position: [number, number, number], rotation: [number, number, number]) => void
  clearCameraState: () => void
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedContainerId: null,
  setSelectedContainerId: (id) => set({ selectedContainerId: id }),

  showItemsModal: false,
  setShowItemsModal: (show) => set({ showItemsModal: show }),

  isPointerLocked: false,
  setPointerLocked: (locked) => set({ isPointerLocked: locked }),

  isSceneLoading: true,
  setSceneLoading: (loading) => set({ isSceneLoading: loading }),

  cameraState: null,
  saveCameraState: (position, rotation) =>
    set({ cameraState: { position, rotation } }),
  clearCameraState: () => set({ cameraState: null }),
}))

/**
 * 打开容器物品查看模态框
 */
export function openContainerModal(containerId: string) {
  const store = useSceneStore.getState()
  store.setSelectedContainerId(containerId)
  store.setShowItemsModal(true)
  store.setPointerLocked(false)  // 退出PointerLock以便交互模态框
}

/**
 * 关闭物品查看模态框
 */
export function closeContainerModal() {
  const store = useSceneStore.getState()
  store.setSelectedContainerId(null)
  store.setShowItemsModal(false)
}
```

- [ ] **Step 2: 验证store**

创建临时测试：
```typescript
import { useSceneStore, openContainerModal } from './scene-store'

const state = useSceneStore.getState()
openContainerModal('test-id')

console.log(state.selectedContainerId) // 'test-id'
console.log(state.showItemsModal) // true
```

在浏览器console验证

- [ ] **Step 3: 删除临时测试**

---

### Task 8: 场景配置Hook

**Files:**
- Create: `web/src/modules/everything/hooks/use-scene-config.ts`

- [ ] **Step 1: 创建hook**

```typescript
// web/src/modules/everything/hooks/use-scene-config.ts
import { useEffect, useState } from 'react'
import {
  loadSceneConfig,
  saveSceneConfig,
  hasSceneConfig,
} from '../lib/scene-db'
import type { SceneConfig } from '../types/scene-types'

/**
 * 加载场景配置
 */
export function useSceneConfig() {
  const [config, setConfig] = useState<SceneConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    loadSceneConfig()
      .then((loaded) => {
        setConfig(loaded)
        setLoading(false)
      })
      .catch((err) => {
        setError(err)
        setLoading(false)
      })
  }, [])

  return { config, loading, error }
}

/**
 * 检查是否已初始化场景
 */
export function useHasScene() {
  const [hasScene, setHasScene] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    hasSceneConfig()
      .then((exists) => {
        setHasScene(exists)
        setLoading(false)
      })
      .catch(() => {
        setHasScene(false)
        setLoading(false)
      })
  }, [])

  return { hasScene, loading }
}

/**
 * 保存场景配置
 */
export function useSaveSceneConfig() {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const save = async (config: SceneConfig) => {
    setSaving(true)
    setError(null)
    try {
      await saveSceneConfig(config)
      setSaving(false)
    } catch (err) {
      setError(err as Error)
      setSaving(false)
      throw err
    }
  }

  return { save, saving, error }
}
```

- [ ] **Step 2: 验证hook类型**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 9: 容器CRUD Hooks

**Files:**
- Create: `web/src/modules/everything/hooks/use-containers.ts`
- Create: `web/tests/use-containers.test.ts`

- [ ] **Step 1: 编写failing测试**

```typescript
// web/tests/use-containers.test.ts
import { describe, test, expect } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useContainers, useCreateContainer } from '../src/modules/everything/hooks/use-containers'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
})

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
)

describe('use-containers', () => {
  test('加载容器列表', async () => {
    const { result } = renderHook(() => useContainers(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeDefined()
    expect(Array.isArray(result.current.data)).toBe(true)
  })

  test('创建容器', async () => {
    const { result } = renderHook(() => useCreateContainer(), { wrapper })

    await waitFor(() => {
      result.current.mutate({
        name: '测试容器',
        position: { x: 0, y: 0, z: 0, rotationY: 0, scale: 1 },
        modelRef: 'cabinet_tv',
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeDefined()
    expect(result.current.data?.name).toBe('测试容器')
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm run test use-containers.test.ts
```

预期：FAIL - "useContainers is not defined"

- [ ] **Step 3: 实现容器hooks**

```typescript
// web/src/modules/everything/hooks/use-containers.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../../shared/lib/supabase'
import type {
  DbContainer,
  Container,
  ContainerInsert,
  toContainer,
  toDbContainer,
} from '../types/scene-types'

const CONTAINER_SELECT = '*, area:areas(*)'

/**
 * 查询所有容器
 */
export function useContainers() {
  return useQuery({
    queryKey: ['containers'],
    enabled: Boolean(supabase),
    queryFn: async (): Promise<Container[]> => {
      if (!supabase) return []

      const { data, error } = await supabase
        .from('containers')
        .select(CONTAINER_SELECT)
        .order('name')

      if (error) throw error
      return (data as DbContainer[]).map(toContainer)
    },
    staleTime: 1000 * 60,
  })
}

/**
 * 查询单个容器
 */
export function useContainer(id: string | undefined) {
  return useQuery({
    queryKey: ['containers', id],
    enabled: Boolean(supabase && id),
    queryFn: async (): Promise<Container | null> => {
      if (!supabase || !id) return null

      const { data, error } = await supabase
        .from('containers')
        .select(CONTAINER_SELECT)
        .eq('id', id)
        .maybeSingle()

      if (error) throw error
      return data ? toContainer(data as DbContainer) : null
    },
    staleTime: 1000 * 60,
  })
}

/**
 * 创建容器
 */
export function useCreateContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: ContainerInsert) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { data, error } = await supabase
        .from('containers')
        .insert(toDbContainer(input))
        .select(CONTAINER_SELECT)
        .single()

      if (error) throw error
      return toContainer(data as DbContainer)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

/**
 * 批量创建容器
 */
export function useCreateContainersBatch() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (inputs: ContainerInsert[]) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const dbContainers = inputs.map(toDbContainer)
      const { data, error } = await supabase
        .from('containers')
        .insert(dbContainers)
        .select(CONTAINER_SELECT)

      if (error) throw error
      return (data as DbContainer[]).map(toContainer)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}

/**
 * 删除容器
 */
export function useDeleteContainer() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { error } = await supabase.from('containers').delete().eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['containers'] })
    },
  })
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm run test use-containers.test.ts
```

预期：PASS

---

### Task 10: 容器物品查询Hook

**Files:**
- Create: `web/src/modules/everything/hooks/use-container-items.ts`

- [ ] **Step 1: 创建hook**

```typescript
// web/src/modules/everything/hooks/use-container-items.ts
import { useItems } from '../../items/hooks/use-items'
import type { Item } from '../../items/lib/types'

/**
 * 查询容器内的物品
 */
export function useContainerItems(containerId: string | null) {
  const { data: allItems, isLoading, error } = useItems()

  const items: Item[] = containerId
    ? (allItems || []).filter((item) => item.containerId === containerId)
    : []

  return {
    items,
    isLoading,
    error,
    isEmpty: items.length === 0,
  }
}
```

- [ ] **Step 2: 验证类型**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

## Week 2: 核心功能

### Task 11: 内置模型组件

**Files:**
- Create: `web/src/modules/everything/components/scene/BuiltinModel.tsx`

- [ ] **Step 1: 创建基础几何体模型组件**

```typescript
// web/src/modules/everything/components/scene/BuiltinModel.tsx
import { Box } from '@react-three/drei'
import { getBuiltinModel } from '../../lib/builtin-models'
import type { BuiltinModelType } from '../../types/scene-types'

interface BuiltinModelProps {
  modelRef: BuiltinModelType
  onClick?: () => void
  onPointerOver?: () => void
  onPointerOut?: () => void
}

/**
 * 内置模型渲染组件（简化几何体）
 */
export default function BuiltinModel({
  modelRef,
  onClick,
  onPointerOver,
  onPointerOut,
}: BuiltinModelProps) {
  const config = getBuiltinModel(modelRef)

  return (
    <group>
      <Box
        args={config.size}
        onClick={onClick}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <meshStandardMaterial color={config.color} roughness={0.7} metalness={0.2} />
      </Box>
      {/* 添加边缘线 */}
      <Box args={config.size}>
        <meshBasicMaterial color="#000000" wireframe />
      </Box>
    </group>
  )
}
```

- [ ] **Step 2: 验证组件编译**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 12: Container3D组件

**Files:**
- Create: `web/src/modules/everything/components/scene/Container3D.tsx`

- [ ] **Step 1: 创建可点击容器组件**

```typescript
// web/src/modules/everything/components/scene/Container3D.tsx
import { useState } from 'react'
import { Html } from '@react-three/drei'
import BuiltinModel from './BuiltinModel'
import type { Container } from '../../types/scene-types'

interface Container3DProps {
  container: Container
  onClick: (id: string) => void
}

/**
 * 3D容器组件（可点击）
 */
export default function Container3D({ container, onClick }: Container3DProps) {
  const [hovered, setHovered] = useState(false)

  const { position, modelRef } = container
  const { x, y, z, rotationY, scale } = position

  return (
    <group
      position={[x, y + 0.01, z]}
      rotation={[0, rotationY, 0]}
      scale={scale}
    >
      <BuiltinModel
        modelRef={modelRef as any}
        onClick={() => onClick(container.id)}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      />

      {/* 悬停时显示名称标签 */}
      {hovered && (
        <Html distanceFactor={10} position={[0, 1, 0]}>
          <div className="rounded bg-black/80 px-2 py-1 text-sm text-white">
            {container.name}
          </div>
        </Html>
      )}
    </group>
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 13: 环境组件

**Files:**
- Create: `web/src/modules/everything/components/scene/Environment.tsx`

- [ ] **Step 1: 创建地板和光照**

```typescript
// web/src/modules/everything/components/scene/Environment.tsx
import { useRef } from 'react'
import type { Mesh } from 'three'

interface EnvironmentProps {
  floorSize?: [number, number]
}

/**
 * 场景环境（地板、墙体、光照）
 */
export default function Environment({ floorSize = [20, 20] }: EnvironmentProps) {
  const floorRef = useRef<Mesh>(null)

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.4} />

      {/* 主光源 */}
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />

      {/* 地板 */}
      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={floorSize} />
        <meshStandardMaterial color="#D2B48C" roughness={0.8} />
      </mesh>

      {/* 简化墙体（四面墙） */}
      {/* 北墙 */}
      <mesh position={[0, 1.5, -floorSize[1] / 2]} receiveShadow>
        <boxGeometry args={[floorSize[0], 3, 0.2]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      {/* 南墙 */}
      <mesh position={[0, 1.5, floorSize[1] / 2]} receiveShadow>
        <boxGeometry args={[floorSize[0], 3, 0.2]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      {/* 东墙 */}
      <mesh position={[floorSize[0] / 2, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3, floorSize[1]]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      {/* 西墙 */}
      <mesh position={[-floorSize[0] / 2, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3, floorSize[1]]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>
    </>
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 14: 第一人称相机控制

**Files:**
- Create: `web/src/modules/everything/components/scene/FirstPersonCamera.tsx`

- [ ] **Step 1: 创建PointerLockControls组件**

```typescript
// web/src/modules/everything/components/scene/FirstPersonCamera.tsx
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { PointerLockControls as PointerLockControlsImpl } from 'three-stdlib'
import { useSceneStore } from '../../store/scene-store'

/**
 * 第一人称相机控制
 */
export default function FirstPersonCamera() {
  const { camera, gl } = useThree()
  const controlsRef = useRef<PointerLockControlsImpl>(null)
  const setPointerLocked = useSceneStore((s) => s.setPointerLocked)
  const cameraState = useSceneStore((s) => s.cameraState)

  // 初始化相机位置
  useEffect(() => {
    if (cameraState) {
      camera.position.set(...cameraState.position)
      camera.rotation.set(...cameraState.rotation)
    } else {
      camera.position.set(0, 1.6, 5)
    }
  }, [camera, cameraState])

  // PointerLock事件监听
  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return

    const onLock = () => setPointerLocked(true)
    const onUnlock = () => setPointerLocked(false)

    controls.addEventListener('lock', onLock)
    controls.addEventListener('unlock', onUnlock)

    return () => {
      controls.removeEventListener('lock', onLock)
      controls.removeEventListener('unlock', onUnlock)
    }
  }, [setPointerLocked])

  // WASD移动控制
  useEffect(() => {
    const moveSpeed = 0.1
    const keys: Record<string, boolean> = {}

    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true
    }

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const interval = setInterval(() => {
      if (!controlsRef.current?.isLocked) return

      const forward = camera.getWorldDirection(new THREE.Vector3())
      const right = new THREE.Vector3()
      right.crossVectors(camera.up, forward).normalize()

      if (keys['w']) camera.position.addScaledVector(forward, moveSpeed)
      if (keys['s']) camera.position.addScaledVector(forward, -moveSpeed)
      if (keys['a']) camera.position.addScaledVector(right, moveSpeed)
      if (keys['d']) camera.position.addScaledVector(right, -moveSpeed)

      // 限制高度（不能穿地板和天花板）
      camera.position.y = Math.max(0.5, Math.min(camera.position.y, 2.5))
    }, 16)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      clearInterval(interval)
    }
  }, [camera])

  return (
    <pointerLockControls
      ref={controlsRef}
      args={[camera, gl.domElement]}
    />
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

## （续：由于内容较长，将分段写入第三部分）
