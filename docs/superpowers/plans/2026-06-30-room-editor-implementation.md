# 3D 房间编辑器实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Everything 3D 场景改造为封闭房间编辑器，支持拖拽移动容器、2D 控件旋转缩放、模型选择弹窗

**Architecture:** 保留现有 React Three Fiber 架构，移除 TransformControls，改用射线检测实现拖拽 + HTML 2D 控件。新增 Room 组件渲染封闭房间，修改相机添加碰撞检测。

**Tech Stack:** React Three Fiber, @react-three/drei, Zustand, React Query, TypeScript, Tailwind CSS

---

## 文件结构概览

### 新增文件
- `web/src/modules/everything/components/scene/Room.tsx` - 封闭房间组件（地板、墙壁、天花板）
- `web/src/modules/everything/components/ui/ContainerControlsOverlay.tsx` - 2D 旋转/缩放控件
- `web/src/modules/everything/components/ui/ModelSelectionModal.tsx` - 模型选择弹窗
- `web/src/modules/everything/lib/available-models.ts` - 可用模型配置
- `web/src/modules/everything/hooks/use-drag-container.ts` - 拖拽容器 hook
- `web/src/modules/everything/lib/projection-utils.ts` - 3D→2D 投影工具函数
- `web/tests/projection-utils.test.ts` - 投影工具测试

### 修改文件
- `web/src/modules/everything/store/scene-store.ts` - 状态管理调整
- `web/src/modules/everything/components/scene/SceneCanvas.tsx` - 添加 Room 组件
- `web/src/modules/everything/components/scene/Container3D.tsx` - 移除 TransformControls，添加拖拽支持
- `web/src/modules/everything/components/scene/FirstPersonCamera.tsx` - 添加碰撞检测
- `web/src/modules/everything/components/editor/EditorToolbar.tsx` - 修改添加容器按钮
- `web/src/modules/everything/pages/SceneViewPage.tsx` - 添加新组件

---

## 任务分解

### Task 1: 状态管理更新

**Files:**
- Modify: `web/src/modules/everything/store/scene-store.ts`

- [ ] **Step 1: 添加新状态到 scene-store**

```typescript
import type { RefObject } from 'react'
import type { Group } from 'three'

// 在 SceneState 接口中添加新状态
interface SceneState {
  // ... 现有状态

  // 新增
  isDraggingObject: boolean
  setDraggingObject: (dragging: boolean) => void

  hoveredObjectId: string | null
  setHoveredObjectId: (id: string | null) => void

  showModelSelectionModal: boolean
  setShowModelSelectionModal: (show: boolean) => void

  containerGroupRefs: Record<string, RefObject<Group>>
  setContainerGroupRef: (id: string, ref: RefObject<Group>) => void
}
```

- [ ] **Step 2: 实现新状态的 setter**

```typescript
// 在 create 函数中添加
export const useSceneStore = create<SceneState>((set) => ({
  // ... 现有状态

  isDraggingObject: false,
  setDraggingObject: (dragging) => set({ isDraggingObject: dragging }),

  hoveredObjectId: null,
  setHoveredObjectId: (id) => set({ hoveredObjectId: id }),

  showModelSelectionModal: false,
  setShowModelSelectionModal: (show) => set({ showModelSelectionModal: show }),

  containerGroupRefs: {},
  setContainerGroupRef: (id, ref) =>
    set((state) => ({
      containerGroupRefs: { ...state.containerGroupRefs, [id]: ref }
    })),
}))
```

- [ ] **Step 3: 移除 transformMode 相关状态**

删除以下内容：
- `transformMode: 'rotate' | 'scale'`
- `setTransformMode: (mode: 'rotate' | 'scale') => void`

以及对应的实现。

- [ ] **Step 4: 验证类型检查通过**

Run: `cd web && npm run type-check`
Expected: No errors related to scene-store


---

### Task 2: 模型配置文件

**Files:**
- Create: `web/src/modules/everything/lib/available-models.ts`

- [ ] **Step 1: 创建模型配置类型和常量**

```typescript
export interface AvailableModel {
  id: string
  name: string
  modelRef: string // 相对于 public/ 的路径
  modelType: 'builtin' | 'custom'
  icon: string
  description?: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    id: 'sofa',
    name: '沙发',
    modelRef: 'everything-models/sofa_glb.glb',
    modelType: 'custom',
    icon: '🛋️',
    description: '三人座沙发'
  },
  {
    id: 'cabinet',
    name: '浴室柜',
    modelRef: 'everything-models/bathroom_sink_cabinet.glb',
    modelType: 'custom',
    icon: '🚿',
    description: '带水槽的浴室柜'
  }
]

export function getAvailableModel(id: string): AvailableModel | undefined {
  return AVAILABLE_MODELS.find(m => m.id === id)
}
```

- [ ] **Step 2: 验证文件没有语法错误**

Run: `cd web && npx tsc --noEmit web/src/modules/everything/lib/available-models.ts`
Expected: No errors


---

### Task 3: 投影工具函数

**Files:**
- Create: `web/src/modules/everything/lib/projection-utils.ts`
- Create: `web/tests/projection-utils.test.ts`

- [ ] **Step 1: 编写测试（TDD）**

```typescript
// web/tests/projection-utils.test.ts
import { describe, it, expect } from 'vitest'
import { Vector3, PerspectiveCamera, Object3D } from 'three'
import { getScreenPosition } from '../web/src/modules/everything/lib/projection-utils'

describe('getScreenPosition', () => {
  it('should return visible=false when object is behind camera', () => {
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    
    const object = new Object3D()
    object.position.set(0, 0, 10) // 在相机后方
    
    const result = getScreenPosition(object, camera)
    expect(result.visible).toBe(false)
  })
  
  it('should return visible=true when object is in front', () => {
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    
    const object = new Object3D()
    object.position.set(0, 0, 0) // 在相机前方
    
    const result = getScreenPosition(object, camera)
    expect(result.visible).toBe(true)
  })
  
  it('should project center point to screen center', () => {
    const camera = new PerspectiveCamera(75, 1, 0.1, 1000)
    camera.position.set(0, 0, 5)
    camera.lookAt(0, 0, 0)
    
    const object = new Object3D()
    object.position.set(0, 0, 0)
    
    // 模拟窗口尺寸
    global.window = { innerWidth: 800, innerHeight: 600 } as any
    
    const result = getScreenPosition(object, camera)
    expect(result.x).toBeCloseTo(400, 0)
    expect(result.y).toBeCloseTo(300, 0)
  })
})
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd web && npm test projection-utils.test.ts`
Expected: FAIL - getScreenPosition is not defined

- [ ] **Step 3: 实现最小功能让测试通过**

```typescript
// web/src/modules/everything/lib/projection-utils.ts
import { Vector3, type Object3D, type Camera } from 'three'

export interface ScreenPosition {
  x: number
  y: number
  visible: boolean
}

export function getScreenPosition(
  object3D: Object3D,
  camera: Camera
): ScreenPosition {
  const vector = new Vector3()
  object3D.getWorldPosition(vector)
  vector.project(camera)

  // 检查是否在相机前方和视锥内
  const visible =
    vector.z < 1 && // 在相机前方
    vector.x >= -1 && vector.x <= 1 && // 水平视野内
    vector.y >= -1 && vector.y <= 1 // 垂直视野内

  const x = (vector.x * 0.5 + 0.5) * window.innerWidth
  const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight

  return { x, y, visible }
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd web && npm test projection-utils.test.ts`
Expected: PASS - All tests pass


---

### Task 4: Room 组件

**Files:**
- Create: `web/src/modules/everything/components/scene/Room.tsx`

- [ ] **Step 1: 创建 Room 组件**

```typescript
import { BackSide } from 'three'

export default function Room() {
  return (
    <group>
      {/* 地板 */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.8} />
      </mesh>

      {/* 北墙 (z = -2.5) */}
      <mesh position={[0, 1.5, -2.5]} receiveShadow>
        <boxGeometry args={[5, 3, 0.1]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.9} />
      </mesh>

      {/* 南墙 (z = 2.5) */}
      <mesh position={[0, 1.5, 2.5]} receiveShadow>
        <boxGeometry args={[5, 3, 0.1]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.9} />
      </mesh>

      {/* 东墙 (x = 2.5) */}
      <mesh position={[2.5, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.1, 3, 5]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.9} />
      </mesh>

      {/* 西墙 (x = -2.5) */}
      <mesh position={[-2.5, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.1, 3, 5]} />
        <meshStandardMaterial color="#F5F5DC" roughness={0.9} />
      </mesh>

      {/* 天花板 */}
      <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[5, 5]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.7} side={BackSide} />
      </mesh>
    </group>
  )
}
```

- [ ] **Step 2: 在 SceneCanvas 中添加 Room 组件**

修改 `web/src/modules/everything/components/scene/SceneCanvas.tsx`:

```typescript
import Room from './Room'

// 在 Canvas 内的 Suspense 中添加
<Suspense fallback={null}>
  <FirstPersonCamera />
  <Room />  {/* 新增 */}
  <Environment />
  
  {containers?.map((container) => (
    <Container3D
      key={container.id}
      container={container}
      onClick={openContainerModal}
    />
  ))}
</Suspense>
```

- [ ] **Step 3: 验证房间渲染**

Run: `cd web && npm run dev`
手动测试: 访问 `/everything/scene`，应该看到封闭房间


---

### Task 5: 相机碰撞检测

**Files:**
- Modify: `web/src/modules/everything/components/scene/FirstPersonCamera.tsx`

- [ ] **Step 1: 添加边界限制函数**

在 `FirstPersonCamera.tsx` 中添加:

```typescript
const ROOM_BOUNDARY = {
  x: { min: -2.3, max: 2.3 },
  y: { min: 0.5, max: 2.8 },
  z: { min: -2.3, max: 2.3 }
}

function clampPosition(position: Vector3): Vector3 {
  return new Vector3(
    Math.max(ROOM_BOUNDARY.x.min, Math.min(ROOM_BOUNDARY.x.max, position.x)),
    Math.max(ROOM_BOUNDARY.y.min, Math.min(ROOM_BOUNDARY.y.max, position.y)),
    Math.max(ROOM_BOUNDARY.z.min, Math.min(ROOM_BOUNDARY.z.max, position.z))
  )
}
```

- [ ] **Step 2: 在相机位置更新时应用限制**

修改 `useFrame` 中的相机位置更新逻辑:

```typescript
useFrame((state, delta) => {
  // ... 现有的移动逻辑
  
  // 应用边界限制
  const clampedPos = clampPosition(camera.position)
  camera.position.copy(clampedPos)
  
  // ... 其余逻辑
})
```

- [ ] **Step 3: 修改初始相机位置为房间中心**

```typescript
useEffect(() => {
  camera.position.set(0, 1.6, 0) // 房间中心，人眼高度
  camera.rotation.set(0, 0, 0)
}, [camera])
```

- [ ] **Step 4: 手动测试碰撞检测**

Run: `cd web && npm run dev`
测试: 尝试走到墙边，应该无法穿墙


---

### Task 6: 拖拽容器 Hook

**Files:**
- Create: `web/src/modules/everything/hooks/use-drag-container.ts`

- [ ] **Step 1: 创建拖拽 hook**

```typescript
import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Plane, Vector3, Vector2 } from 'three'
import type { ThreeEvent } from '@react-three/fiber'
import { useSceneStore } from '../store/scene-store'

const ROOM_BOUNDARY = { min: -2.3, max: 2.3 }

export function useDragContainer(containerId: string) {
  const { camera, size } = useThree()
  const raycasterRef = useRef(new Raycaster())
  const floorPlaneRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const mouseRef = useRef(new Vector2())

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    useSceneStore.getState().setSelectedObjectId(containerId)
    useSceneStore.getState().setDraggingObject(true)
  }

  useEffect(() => {
    const unsubscribe = useSceneStore.subscribe(
      (state) => state.isDraggingObject,
      (isDragging) => {
        if (!isDragging) return

        function handlePointerMove(e: PointerEvent) {
          const { isDraggingObject, draftTransformsById, setDraftTransform } = useSceneStore.getState()
          if (!isDraggingObject) return

          // 计算标准化设备坐标
          const mouse = mouseRef.current
          mouse.x = (e.clientX / size.width) * 2 - 1
          mouse.y = -(e.clientY / size.height) * 2 + 1

          // 射线与地板平面求交
          const raycaster = raycasterRef.current
          raycaster.setFromCamera(mouse, camera)
          const intersection = new Vector3()
          const hit = raycaster.ray.intersectPlane(floorPlaneRef.current, intersection)

          if (!hit) return

          // 边界限制
          const clampedX = Math.max(ROOM_BOUNDARY.min, Math.min(ROOM_BOUNDARY.max, intersection.x))
          const clampedZ = Math.max(ROOM_BOUNDARY.min, Math.min(ROOM_BOUNDARY.max, intersection.z))

          // 获取当前位置（使用 getState 避免闭包问题）
          const draft = draftTransformsById[containerId]
          if (!draft) return

          // 更新位置到 draft
          setDraftTransform(containerId, {
            ...draft,
            x: clampedX,
            z: clampedZ
          })
        }

        function handlePointerUp() {
          useSceneStore.getState().setDraggingObject(false)
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)

        return () => {
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerup', handlePointerUp)
        }
      }
    )

    return unsubscribe
  }, [camera, size, containerId])

  return { handlePointerDown }
}
```

- [ ] **Step 2: 验证类型检查通过**

Run: `cd web && npm run type-check`
Expected: No errors


---

### Task 7: 修改 Container3D 支持拖拽

**Files:**
- Modify: `web/src/modules/everything/components/scene/Container3D.tsx`

- [ ] **Step 1: 移除 TransformControls 导入和使用**

删除:
```typescript
import { TransformControls } from '@react-three/drei'
```

删除组件中的 `<TransformControls>` 部分（约125-143行）。

- [ ] **Step 2: 集成拖拽 hook**

```typescript
import { useDragContainer } from '../../hooks/use-drag-container'

export default function Container3D({ container, onClick }: Container3DProps) {
  // ... 现有代码
  const { handlePointerDown } = useDragContainer(container.id)
  const setDraftTransform = useSceneStore((s) => s.setDraftTransform)

  // 在 handlePointerDown 前初始化 draft（如果不存在）
  function handleDragStart(e: ThreeEvent<PointerEvent>) {
    const { draftTransformsById } = useSceneStore.getState()
    if (!draftTransformsById[container.id]) {
      // 初始化 draft 为当前位置
      setDraftTransform(container.id, { ...container.position })
    }
    handlePointerDown(e)
  }

  // 修改 handleClick 函数
  function handleClick() {
    const { pointerDragDistance, isCameraDragging } = useSceneStore.getState()
    if (isCameraDragging || pointerDragDistance >= DRAG_THRESHOLD_PX) {
      return
    }

    // 编辑模式下不触发模态框
    if (isEditMode) {
      return
    }
    onClick(container.id)
  }

  // ... 其余代码
}
```

- [ ] **Step 3: 修改 group 的事件处理**

```typescript
<group
  ref={groupRef}
  position={[x, y + 0.01, z]}
  rotation={[0, rotationY, 0]}
  scale={scale}
  onPointerDown={isEditMode ? handleDragStart : undefined}
  onClick={!isEditMode ? handleClick : undefined}
>
```

- [ ] **Step 4: 验证类型检查**

Run: `cd web && npm run type-check`
Expected: No errors

- [ ] **Step 5: 手动测试拖拽**

Run: `cd web && npm run dev`
测试: 进入编辑模式，拖拽容器应该可以移动


---

### Task 8: 模型选择弹窗

**Files:**
- Create: `web/src/modules/everything/components/ui/ModelSelectionModal.tsx`

- [ ] **Step 1: 创建模型选择弹窗组件**

```typescript
import { useSceneStore } from '../../store/scene-store'
import { useCreateContainer } from '../../hooks/use-containers'
import { AVAILABLE_MODELS, type AvailableModel } from '../../lib/available-models'

export default function ModelSelectionModal() {
  const showModal = useSceneStore((s) => s.showModelSelectionModal)
  const setShowModal = useSceneStore((s) => s.setShowModelSelectionModal)
  const setSelectedObjectId = useSceneStore((s) => s.setSelectedObjectId)
  const createContainer = useCreateContainer()

  async function handleSelectModel(model: AvailableModel) {
    setShowModal(false)

    try {
      const newContainer = await createContainer.mutateAsync({
        name: model.name,
        position: { x: 0, y: 0, z: 0, rotationY: 0, scale: 1 },
        modelRef: model.modelRef,
        modelType: model.modelType
      })

      // 自动选中新容器
      setSelectedObjectId(newContainer.id)
    } catch (error) {
      console.error('创建容器失败:', error)
    }
  }

  if (!showModal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => setShowModal(false)}
    >
      <div
        className="mx-4 w-full max-w-lg rounded-lg bg-bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-xl font-semibold text-text">选择容器类型</h2>

        <div className="grid grid-cols-2 gap-4">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelectModel(model)}
              disabled={createContainer.isPending}
              className="flex flex-col items-center rounded-lg border-2 border-bg-hover p-4 transition hover:border-primary disabled:opacity-50"
            >
              <span className="text-5xl">{model.icon}</span>
              <span className="mt-2 font-medium text-text">{model.name}</span>
              {model.description && (
                <span className="mt-1 text-sm text-text-secondary">
                  {model.description}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(false)}
          className="mt-4 w-full rounded-button py-2 text-text hover:bg-bg-hover"
        >
          取消
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在 SceneViewPage 中添加弹窗**

修改 `web/src/modules/everything/pages/SceneViewPage.tsx`:

```typescript
import ModelSelectionModal from '../components/ui/ModelSelectionModal'

// 在 return 中添加
<SceneErrorBoundary>
  <SceneCanvas />
  <EditorToolbar />
  <MobileJoystick />
  <ControlsHint />
  <ContainerItemsModal />
  <ModelSelectionModal />  {/* 新增 */}
</SceneErrorBoundary>
```

- [ ] **Step 3: 验证类型检查**

Run: `cd web && npm run type-check`
Expected: No errors


---

### Task 9: 修改 EditorToolbar

**Files:**
- Modify: `web/src/modules/everything/components/editor/EditorToolbar.tsx`

- [ ] **Step 1: 移除旋转和缩放按钮**

删除:
- `transformMode` 相关状态
- `setTransformMode` 调用
- 旋转按钮（RotateCcw）
- 缩放按钮（Scale）

- [ ] **Step 2: 修改添加容器按钮**

```typescript
import { useSceneStore } from '../../store/scene-store'

export default function EditorToolbar() {
  // ... 现有代码
  const setShowModelSelectionModal = useSceneStore((s) => s.setShowModelSelectionModal)
  
  // 移除 handleAddCabinet 函数
  
  // ... 其他代码保持不变
```

修改按钮部分:

```typescript
{/* 移除旋转和缩放按钮的分隔线和按钮本身 */}

<div className="h-6 w-px bg-bg-hover" />

<button
  type="button"
  onClick={() => setShowModelSelectionModal(true)}
  disabled={!isEditMode}
  className={[
    'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm text-text',
    !isEditMode ? 'opacity-40' : 'hover:bg-bg-hover',
  ].join(' ')}
>
  <Plus className="size-4" />
  添加容器
</button>
```

- [ ] **Step 3: 移除未使用的导入**

删除:
```typescript
import { RotateCcw, Scale } from 'lucide-react'

const SOFA_MODEL = 'everything-models/sofa_glb.glb'  // 也可以删除
const CABINET_MODEL = 'everything-models/bathroom_sink_cabinet.glb'
```

- [ ] **Step 4: 验证类型检查**

Run: `cd web && npm run type-check`
Expected: No errors

- [ ] **Step 5: 手动测试工具栏**

Run: `cd web && npm run dev`
测试: 点击"添加容器"应该弹出选择菜单


---

### Task 10: 2D 控件覆盖层

**Files:**
- Create: `web/src/modules/everything/components/ui/ContainerControlsOverlay.tsx`

- [ ] **Step 1: 创建控件覆盖层组件框架**

```typescript
import { useEffect, useState, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../store/scene-store'
import { getScreenPosition } from '../../lib/projection-utils'

export default function ContainerControlsOverlay() {
  const { camera } = useThree()
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const isEditMode = useSceneStore((s) => s.isEditMode)
  const isDraggingObject = useSceneStore((s) => s.isDraggingObject)
  const isCameraDragging = useSceneStore((s) => s.isCameraDragging)
  const draftTransformsById = useSceneStore((s) => s.draftTransformsById)
  const setDraftTransform = useSceneStore((s) => s.setDraftTransform)

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [scale, setScale] = useState(1)
  const rotateIntervalRef = useRef<number | null>(null)

  // 暂时返回 null，后续步骤添加实现
  if (!isEditMode || !selectedObjectId || isDraggingObject || isCameraDragging) {
    return null
  }

  return null
}
```

- [ ] **Step 2: 添加位置跟踪逻辑**

说明：为了让 ContainerControlsOverlay 获取容器的 3D 位置，我们使用 store 共享容器的 group ref。

在 `scene-store.ts` 中添加：
```typescript
// 新增状态
containerGroupRefs: Record<string, React.RefObject<Group>>
setContainerGroupRef: (id: string, ref: React.RefObject<Group>) => void

// 实现
containerGroupRefs: {},
setContainerGroupRef: (id, ref) =>
  set((state) => ({
    containerGroupRefs: { ...state.containerGroupRefs, [id]: ref }
  })),
```

在 `Container3D.tsx` 中注册 ref：
```typescript
const setContainerGroupRef = useSceneStore((s) => s.setContainerGroupRef)

useEffect(() => {
  if (groupRef.current) {
    setContainerGroupRef(container.id, groupRef)
  }
}, [container.id, setContainerGroupRef])
```

在 `ContainerControlsOverlay.tsx` 中使用：
```typescript
import { useEffect, useState, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../../store/scene-store'
import { useContainers } from '../../hooks/use-containers'
import { getScreenPosition } from '../../lib/projection-utils'

export default function ContainerControlsOverlay() {
  const { camera } = useThree()
  const { data: containers = [] } = useContainers()
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const isEditMode = useSceneStore((s) => s.isEditMode)
  const isDraggingObject = useSceneStore((s) => s.isDraggingObject)
  const isCameraDragging = useSceneStore((s) => s.isCameraDragging)
  const draftTransformsById = useSceneStore((s) => s.draftTransformsById)
  const setDraftTransform = useSceneStore((s) => s.setDraftTransform)
  const containerGroupRefs = useSceneStore((s) => s.containerGroupRefs)

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [scale, setScale] = useState(1)
  const rotateIntervalRef = useRef<number | null>(null)

  // 使用 requestAnimationFrame 更新位置（而不是 useFrame）
  useEffect(() => {
    if (!selectedObjectId || !isEditMode || isDraggingObject || isCameraDragging) {
      setPosition(null)
      return
    }

    let animationFrameId: number

    const updatePosition = () => {
      const groupRef = containerGroupRefs[selectedObjectId]
      if (!groupRef?.current) {
        setPosition(null)
      } else {
        const screenPos = getScreenPosition(groupRef.current, camera)
        if (screenPos.visible) {
          setPosition({ x: screenPos.x, y: screenPos.y })
        } else {
          setPosition(null)
        }
      }

      animationFrameId = requestAnimationFrame(updatePosition)
    }

    updatePosition()

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
    }
  }, [selectedObjectId, isEditMode, isDraggingObject, isCameraDragging, containerGroupRefs, camera])

  // 初始化 scale 状态
  useEffect(() => {
    if (!selectedObjectId) return

    const draft = draftTransformsById[selectedObjectId]
    if (draft) {
      setScale(draft.scale)
    } else {
      // 从容器原始数据获取
      const container = containers.find((c) => c.id === selectedObjectId)
      if (container) {
        setScale(container.position.scale)
      }
    }
  }, [selectedObjectId, draftTransformsById, containers])

  // ... 其余代码
}
```

- [ ] **Step 3: 添加旋转控件**

```typescript
function startRotateLeft() {
  if (!selectedObjectId) return
  
  const rotate = () => {
    const current = draftTransformsById[selectedObjectId]
    if (!current) return
    
    setDraftTransform(selectedObjectId, {
      ...current,
      rotationY: current.rotationY - 0.05 // ~2.86度每帧
    })
    
    rotateIntervalRef.current = requestAnimationFrame(rotate) as unknown as number
  }
  
  rotate()
}

function startRotateRight() {
  if (!selectedObjectId) return
  
  const rotate = () => {
    const current = draftTransformsById[selectedObjectId]
    if (!current) return
    
    setDraftTransform(selectedObjectId, {
      ...current,
      rotationY: current.rotationY + 0.05
    })
    
    rotateIntervalRef.current = requestAnimationFrame(rotate) as unknown as number
  }
  
  rotate()
}

function stopRotate() {
  if (rotateIntervalRef.current !== null) {
    cancelAnimationFrame(rotateIntervalRef.current)
    rotateIntervalRef.current = null
  }
}

// 清理
useEffect(() => {
  return () => stopRotate()
}, [])
```

- [ ] **Step 4: 添加缩放控件**

```typescript
function handleScaleChange(newScale: number) {
  if (!selectedObjectId) return

  const { draftTransformsById, setDraftTransform } = useSceneStore.getState()
  const current = draftTransformsById[selectedObjectId]
  if (!current) return

  setDraftTransform(selectedObjectId, {
    ...current,
    scale: newScale
  })

  setScale(newScale)
}

// 从 draft 或容器数据获取当前缩放值
useEffect(() => {
  if (!selectedObjectId) return

  const draft = draftTransformsById[selectedObjectId]
  if (draft) {
    setScale(draft.scale)
  }
  // 如果没有 draft，从容器的原始数据获取
  // 这需要访问 containers 数据
}, [selectedObjectId, draftTransformsById])
```

- [ ] **Step 5: 渲染 UI**

```typescript
if (!position) return null

return (
  <>
    {/* 旋转按钮 */}
    <div
      className="fixed z-50"
      style={{
        left: position.x - 50,
        top: position.y + 40
      }}
    >
      <div className="flex gap-2 rounded-lg bg-black/80 p-2 shadow-lg">
        <button
          onPointerDown={startRotateLeft}
          onPointerUp={stopRotate}
          onPointerLeave={stopRotate}
          className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-white hover:bg-white/30"
          title="逆时针旋转"
        >
          ↺
        </button>
        <button
          onPointerDown={startRotateRight}
          onPointerUp={stopRotate}
          onPointerLeave={stopRotate}
          className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-white hover:bg-white/30"
          title="顺时针旋转"
        >
          ↻
        </button>
      </div>
    </div>

    {/* 缩放滑块 */}
    <div
      className="fixed z-50"
      style={{
        left: position.x + 60,
        top: position.y - 60
      }}
    >
      <div className="flex h-32 flex-col items-center rounded-lg bg-black/80 p-2 shadow-lg">
        <input
          type="range"
          min="0.5"
          max="2.0"
          step="0.1"
          value={scale}
          onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
          className="h-full cursor-pointer"
          style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          title="缩放"
        />
        <span className="mt-1 text-xs text-white">{scale.toFixed(1)}x</span>
      </div>
    </div>
  </>
)
```

- [ ] **Step 6: 在 SceneViewPage 中添加控件**

修改 `web/src/modules/everything/pages/SceneViewPage.tsx`:

```typescript
import ContainerControlsOverlay from '../components/ui/ContainerControlsOverlay'

<SceneErrorBoundary>
  <SceneCanvas />
  <EditorToolbar />
  <ContainerControlsOverlay />  {/* 新增 */}
  <MobileJoystick />
  <ControlsHint />
  <ContainerItemsModal />
  <ModelSelectionModal />
</SceneErrorBoundary>
```

- [ ] **Step 7: 验证类型检查**

Run: `cd web && npm run type-check`
Expected: No errors

- [ ] **Step 8: 手动测试控件**

Run: `cd web && npm run dev`
测试: 
1. 选中容器后应该显示旋转和缩放控件
2. 按住旋转按钮应该持续旋转
3. 拖动滑块应该改变尺寸


---

### Task 11: 优化和完善

**Files:**
- Modify: `web/src/modules/everything/components/scene/CustomModel.tsx`
- Modify: `web/src/modules/everything/components/scene/Container3D.tsx`

- [ ] **Step 1: 添加 GLB 加载错误处理**

修改 `CustomModel.tsx`:

```typescript
import { Suspense } from 'react'
import { useGLTF } from '@react-three/drei'
import { ErrorBoundary } from 'react-error-boundary'

function FallbackBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#9E9E9E" />
    </mesh>
  )
}

function GLBModelInner({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} />
}

export default function CustomModel({ url }: { url: string }) {
  return (
    <ErrorBoundary
      fallback={<FallbackBox />}
      onError={(error) => {
        console.error('模型加载失败:', error)
      }}
    >
      <Suspense fallback={<FallbackBox />}>
        <GLBModelInner url={url} />
      </Suspense>
    </ErrorBoundary>
  )
}
```

- [ ] **Step 2: 预加载 GLB 模型**

在 `SceneCanvas.tsx` 的**模块顶层**（组件外部）添加:

```typescript
import { useGLTF } from '@react-three/drei'

// 在文件顶部，所有组件外部
useGLTF.preload('/everything-models/sofa_glb.glb')
useGLTF.preload('/everything-models/bathroom_sink_cabinet.glb')

export default function SceneCanvas() {
  // 组件实现...
}
```

- [ ] **Step 3: 添加 Container3D 的 memo 优化**

修改 `Container3D.tsx` 的导出和 props:

```typescript
import React from 'react'
import { isEqual } from 'lodash-es'

// 修改 props 接口，添加 draftTransform
interface Container3DProps {
  container: Container
  onClick: (id: string) => void
  draftTransform?: Position3D  // 新增
}

// 改为命名函数
function Container3DComponent({ container, onClick, draftTransform }: Container3DProps) {
  // 使用 draftTransform 或 container.position
  const position = draftTransform ?? container.position
  const { x, y, z, rotationY, scale } = position

  // 其余实现保持不变...
}

// 导出 memoized 版本
export default React.memo(Container3DComponent, (prev, next) => {
  return (
    prev.container.id === next.container.id &&
    prev.container.modelRef === next.container.modelRef &&
    isEqual(prev.container.position, next.container.position) &&
    isEqual(prev.draftTransform, next.draftTransform)
  )
})
```

在 `SceneCanvas.tsx` 中传递 draftTransform:

```typescript
const draftTransformsById = useSceneStore((s) => s.draftTransformsById)

{containers?.map((container) => (
  <Container3D
    key={container.id}
    container={container}
    onClick={openContainerModal}
    draftTransform={draftTransformsById[container.id]}
  />
))}
```

- [ ] **Step 4: 验证性能**

Run: `cd web && npm run dev`
测试: 打开 React DevTools Profiler，确认拖拽时只有必要的组件重渲染


---

### Task 12: 端到端测试

**Files:**
- Manual testing

- [ ] **Step 1: 测试房间渲染**

✓ 墙壁、地板、天花板正确显示
✓ 光照均匀，无明显暗角

- [ ] **Step 2: 测试相机碰撞**

✓ 无法穿墙
✓ Y 轴限制在 0.5-2.8m
✓ 初始位置在房间中心

- [ ] **Step 3: 测试添加容器**

✓ 点击"添加容器"弹出选择菜单
✓ 选择沙发后出现在房间中心
✓ 选择柜子后出现在房间中心

- [ ] **Step 4: 测试拖拽移动**

✓ 拖拽容器平滑跟随鼠标
✓ 边界限制生效（不能拖出房间）
✓ 松开鼠标后停止拖拽

- [ ] **Step 5: 测试旋转控件**

✓ 选中容器后显示旋转按钮
✓ 按住逆时针按钮持续旋转
✓ 按住顺时针按钮持续旋转
✓ 松开按钮停止旋转

- [ ] **Step 6: 测试缩放控件**

✓ 选中容器后显示缩放滑块
✓ 拖动滑块实时更新尺寸
✓ 显示当前缩放值

- [ ] **Step 7: 测试保存功能**

✓ 修改后点击保存成功
✓ 刷新页面后修改保持
✓ 保存失败时显示错误提示

- [ ] **Step 8: 测试移动端**

✓ 触摸拖拽容器正常
✓ 触摸旋转按钮响应
✓ 触摸滑块可以调整

- [ ] **Step 9: 测试错误处理**

✓ 模型加载失败显示灰色占位方块
✓ 控件在视野外时不显示

- [ ] **Step 10: 测试性能**

✓ 60fps 流畅渲染
✓ 拖拽无卡顿
✓ 大模型加载时有 loading 状态

- [ ] **Step 11: 完成测试**

所有功能测试通过，准备交付

---

## 完成标准

所有任务的所有步骤都完成后：

- [ ] 所有功能正常工作
- [ ] 所有测试通过
- [ ] 用户可以在空房间中添加、拖拽、旋转、缩放容器
- [ ] 非编辑模式下点击容器仍可查看物品

---

## 注意事项

1. **按顺序执行任务** - 后面的任务依赖前面的任务
2. **测试驱动** - 先写测试，再写实现（Task 3）
3. **保持简洁** - YAGNI 原则，不添加未要求的功能
4. **边界情况** - 注意处理容器在视野外、加载失败等情况
5. **Git 管理** - 由用户管理 git，代码完成后用户会自行提交

