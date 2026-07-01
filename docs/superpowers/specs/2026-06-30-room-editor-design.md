# 3D 房间编辑器设计文档

**日期：** 2026-06-30
**版本：** 1.0
**状态：** 待审查

## 概述

将现有的 Everything 3D 场景从 demo 场景改造为封闭房间编辑器。用户可以在空房间中添加容器（沙发、柜子），通过直观的拖拽和 2D 控件进行编辑，点击容器查看内部物品。

## 目标

1. **空房间起点：** 初始场景为空的封闭房间，无预置容器
2. **直观交互：** 拖拽即移动，2D UI 控件旋转和缩放
3. **模型管理：** 统一的添加容器入口，支持本地 GLB 模型（沙发、浴室柜）
4. **移动端友好：** 触摸操作优化，替代复杂的 3D TransformControls
5. **保持现有功能：** 非编辑模式点击容器查看物品列表

## 用户场景

### 场景 1：添加和布置容器
1. 用户进入空房间，相机位于房间中心
2. 点击"编辑"进入编辑模式
3. 点击"添加容器"按钮，弹出模型选择菜单
4. 选择"沙发"，沙发出现在房间中心
5. 拖拽沙发到合适位置
6. 点击沙发，下方显示旋转按钮，右侧显示缩放滑块
7. 按住顺时针按钮调整朝向
8. 拖动缩放滑块调整大小
9. 点击"保存"，退出编辑模式

### 场景 2：查看容器物品
1. 非编辑模式下，用户在房间中移动
2. 点击沙发，弹出物品列表模态框
3. 查看沙发内的物品（靠垫、遥控器等）
4. 点击"管理物品"跳转到物品页面

### 场景 3：移动端编辑
1. 手机用户进入编辑模式
2. 手指拖拽容器移动
3. 点击容器，手指按住旋转按钮持续旋转
4. 拖动缩放滑块调整尺寸
5. 操作流畅，无需精确点击 3D 控制器

## 架构设计

### 组件结构

```
SceneViewPage
├── SceneCanvas (3D 渲染)
│   ├── FirstPersonCamera (修改：房间中心视角 + 碰撞检测)
│   ├── Room (新增：封闭房间组件)
│   └── Container3D[] (修改：支持拖拽移动，移除 TransformControls)
├── EditorToolbar (修改：统一添加容器按钮)
├── ContainerControlsOverlay (新增：2D 旋转/缩放控件)
├── ModelSelectionModal (新增：模型选择弹窗)
└── ContainerItemsModal (保持不变：物品列表)
```

### 状态管理变化

在 `scene-store.ts` 中：

**新增状态：**
- `isDraggingObject: boolean` - 标记是否正在拖拽容器
- `hoveredObjectId: string | null` - 鼠标悬停的容器 ID
- `showModelSelectionModal: boolean` - 显示模型选择弹窗

**移除状态：**
- `transformMode: 'rotate' | 'scale'` - 不再需要模式切换

**保留状态：**
- `isEditMode: boolean` - 编辑模式开关
- `selectedObjectId: string | null` - 选中的容器 ID
- `draftTransformsById: Record<string, Position3D>` - 草稿变换（Position3D 包含 x, y, z, rotationY, scale）
- 其他现有状态保持不变

## 详细设计

### 1. 房间系统

#### 房间尺寸
- **固定尺寸：** 5m × 5m × 3m（长 × 宽 × 高）
- **房间中心：** 世界坐标 (0, 0, 0)
- **坐标范围：** x ∈ [-2.5, 2.5], y ∈ [0, 3], z ∈ [-2.5, 2.5]

#### 房间组成

**Room 组件结构：**
```typescript
// Room.tsx
import { BackSide } from 'three'

<group>
  {/* 地板 */}
  <mesh position={[0, 0, 0]} rotation={[-Math.PI/2, 0, 0]} receiveShadow>
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
  <mesh position={[0, 3, 0]} rotation={[Math.PI/2, 0, 0]}>
    <planeGeometry args={[5, 5]} />
    <meshStandardMaterial color="#FFFFFF" roughness={0.7} side={BackSide} />
  </mesh>
</group>
```

#### 相机设置

**初始位置：** (0, 1.6, 0) - 房间中心，人眼高度
**控制方式：** 第一人称控制（WASD + 鼠标环顾）
**碰撞检测：** 限制相机在房间内部

```typescript
// 在 FirstPersonCamera 中添加边界检测
const clampedX = Math.max(-2.3, Math.min(2.3, newX))
const clampedZ = Math.max(-2.3, Math.min(2.3, newZ))
const clampedY = Math.max(0.5, Math.min(2.8, newY))
```

留 0.2m 边距防止穿墙。

**注：** `pointerDragDistance` 的拖拽检测逻辑已在 `SceneCanvas.tsx` 和 `Container3D.tsx` 中实现，使用 `DRAG_THRESHOLD_PX = 5` 常量判断是否为拖拽手势（移动超过 5px 视为拖拽）。

#### 光照配置

```typescript
// 环境光
<ambientLight intensity={0.6} />

// 顶部主光源（模拟吸顶灯）
<directionalLight
  position={[0, 2.8, 0]}
  intensity={0.8}
  castShadow
  shadow-mapSize={[2048, 2048]}
/>

// 补光（减少阴影过暗）
<hemisphereLight
  skyColor="#FFFFFF"
  groundColor="#888888"
  intensity={0.4}
/>
```

### 2. 拖拽移动交互

#### 实现思路

**射线检测：** 计算鼠标/触摸点在地板平面的交点

```typescript
// useDragContainer hook
// 接收 camera 和 mouse 位置作为参数（从 useThree 获取）
import { useThree } from '@react-three/fiber'
import { Raycaster, Plane, Vector3, Vector2 } from 'three'
import { useContainers } from '../../hooks/use-containers'

function useDragContainer(containerId: string) {
  const { camera, size } = useThree()
  const { data: containers = [] } = useContainers()
  const raycaster = new Raycaster()
  const floorPlane = new Plane(new Vector3(0, 1, 0), 0) // y=0 平面
  const mouse = new Vector2()

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()
    useSceneStore.getState().setSelectedObjectId(containerId)
    useSceneStore.getState().setIsDraggingObject(true)
  }

  // 在组件挂载时添加全局事件监听
  useEffect(() => {
    if (!useSceneStore.getState().isDraggingObject) return

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [useSceneStore.getState().isDraggingObject])

  function handlePointerMove(e: PointerEvent) {
    if (!useSceneStore.getState().isDraggingObject) return

    // 计算标准化设备坐标
    mouse.x = (e.clientX / size.width) * 2 - 1
    mouse.y = -(e.clientY / size.height) * 2 + 1

    // 射线与地板平面求交
    raycaster.setFromCamera(mouse, camera)
    const intersection = new Vector3()
    raycaster.ray.intersectPlane(floorPlane, intersection)

    // 边界限制
    const clampedX = Math.max(-2.3, Math.min(2.3, intersection.x))
    const clampedZ = Math.max(-2.3, Math.min(2.3, intersection.z))

    // 获取当前 draft 或原始位置
    const draft = useSceneStore.getState().draftTransformsById[containerId]
    const container = containers.find((c) => c.id === containerId)
    if (!container) return

    const current = draft ?? container.position

    // 更新位置到 draft
    useSceneStore.getState().setDraftTransform(containerId, {
      x: clampedX,
      y: current.y,
      z: clampedZ,
      rotationY: current.rotationY,
      scale: current.scale
    })
  }

  function handlePointerUp() {
    useSceneStore.getState().setIsDraggingObject(false)
  }

  return { handlePointerDown }
}
```

#### Container3D 修改

```typescript
// 移除 TransformControls
// 添加拖拽事件
<group
  ref={groupRef}
  position={[x, y, z]}
  rotation={[0, rotationY, 0]}
  scale={scale}
  onPointerDown={isEditMode ? handleDragStart : handleClick}
  onPointerOver={() => setHovered(true)}
  onPointerOut={() => setHovered(false)}
>
  {/* 模型内容 */}
</group>
```

#### 拖拽状态管理

**防止误触发点击：**
- 记录 pointerDown 时的位置
- 如果移动距离 > 5px，视为拖拽，不触发点击事件
- 使用现有的 `pointerDragDistance` 逻辑

### 3. 2D 控件系统

#### ContainerControlsOverlay 组件

**显示条件：**
```typescript
const shouldShow =
  isEditMode &&
  selectedObjectId &&
  !isDraggingObject &&
  !isCameraDragging
```

**3D → 2D 投影：**
```typescript
// 在 ContainerControlsOverlay 组件中
import { useThree } from '@react-three/fiber'
import { Vector3, type Object3D, type Camera } from 'three'

function getScreenPosition(
  object3D: Object3D,
  camera: Camera
): { x: number; y: number; visible: boolean } {
  const vector = new Vector3()
  object3D.getWorldPosition(vector)
  vector.project(camera)

  // 检查是否在相机前方和视锥内
  const visible =
    vector.z < 1 && // 在相机前方
    vector.x >= -1 && vector.x <= 1 && // 水平视野内
    vector.y >= -1 && vector.y <= 1    // 垂直视野内

  const x = (vector.x * 0.5 + 0.5) * window.innerWidth
  const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight

  return { x, y, visible }
}

// 在组件中使用
function ContainerControlsOverlay() {
  const { camera } = useThree()
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const containerGroupRef = /* 从 Container3D 通过 context 或 store 获取 */

  if (!containerGroupRef?.current) return null

  const position = getScreenPosition(containerGroupRef.current, camera)
  if (!position.visible) return null // 不渲染控件

  // 渲染旋转和缩放控件...
}
```

#### 旋转控件

**UI 结构：**
```tsx
<div className="absolute" style={{ left: x, top: y + 40 }}>
  <div className="flex gap-2 rounded-lg bg-black/80 p-2">
    <button
      onPointerDown={startRotateLeft}
      onPointerUp={stopRotate}
      onPointerLeave={stopRotate}
      className="flex h-10 w-10 items-center justify-center rounded bg-white/20"
    >
      ↺
    </button>
    <button
      onPointerDown={startRotateRight}
      onPointerUp={stopRotate}
      onPointerLeave={stopRotate}
      className="flex h-10 w-10 items-center justify-center rounded bg-white/20"
    >
      ↻
    </button>
  </div>
</div>
```

**持续旋转逻辑：**
```typescript
let animationFrameId: number | null = null

function startRotateLeft() {
  const rotate = () => {
    const { selectedObjectId, draftTransformsById, setDraftTransform } =
      useSceneStore.getState()
    if (!selectedObjectId) return

    const current = draftTransformsById[selectedObjectId]
    setDraftTransform(selectedObjectId, {
      ...current,
      rotationY: current.rotationY - 0.05 // 每帧 ~2.86 度
    })

    animationFrameId = requestAnimationFrame(rotate)
  }
  rotate()
}

function stopRotate() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
}
```

#### 缩放滑块

**UI 结构：**
```tsx
<div className="absolute" style={{ left: x + 60, top: y - 60 }}>
  <div className="flex h-32 flex-col items-center rounded-lg bg-black/80 p-2">
    <input
      type="range"
      min="0.5"
      max="2.0"
      step="0.1"
      value={scale}
      onChange={(e) => updateScale(parseFloat(e.target.value))}
      className="h-full"
      style={{ writingMode: 'vertical-lr' }}
    />
    <span className="mt-1 text-xs text-white">{scale.toFixed(1)}x</span>
  </div>
</div>
```

**缩放更新：**
```typescript
function updateScale(newScale: number) {
  const { selectedObjectId, draftTransformsById, setDraftTransform } =
    useSceneStore.getState()
  if (!selectedObjectId) return

  const current = draftTransformsById[selectedObjectId]
  setDraftTransform(selectedObjectId, {
    ...current,
    scale: newScale
  })
}
```

### 4. 模型选择系统

#### 模型配置

```typescript
// lib/available-models.ts
export interface AvailableModel {
  id: string
  name: string
  modelRef: string // 相对于 public/ 目录的路径，运行时解析为绝对 URL
  modelType: 'builtin' | 'custom'
  icon: string
  description?: string
}

export const AVAILABLE_MODELS: AvailableModel[] = [
  {
    id: 'sofa',
    name: '沙发',
    modelRef: 'everything-models/sofa_glb.glb', // /public/everything-models/sofa_glb.glb
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
```

#### ModelSelectionModal 组件

```tsx
export default function ModelSelectionModal() {
  const showModal = useSceneStore((s) => s.showModelSelectionModal)
  const setShowModal = useSceneStore((s) => s.setShowModelSelectionModal)
  // useCreateContainer 已存在于 hooks/use-containers.ts
  // 接口: mutateAsync(data: ContainerInsert) => Promise<Container>
  const createContainer = useCreateContainer()

  async function handleSelectModel(model: AvailableModel) {
    setShowModal(false)

    const newContainer = await createContainer.mutateAsync({
      name: model.name,
      position: { x: 0, y: 0, z: 0, rotationY: 0, scale: 1 },
      modelRef: model.modelRef,
      modelType: model.modelType
    })

    // 自动选中新容器
    useSceneStore.getState().setSelectedObjectId(newContainer.id)
  }

  if (!showModal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">选择容器类型</h2>

        <div className="grid grid-cols-2 gap-4">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelectModel(model)}
              className="flex flex-col items-center rounded-lg border-2 border-bg-hover p-4 hover:border-primary"
            >
              <span className="text-5xl">{model.icon}</span>
              <span className="mt-2 font-medium">{model.name}</span>
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
          className="mt-4 w-full rounded-button py-2 hover:bg-bg-hover"
        >
          取消
        </button>
      </div>
    </div>
  )
}
```

#### EditorToolbar 修改

```tsx
// 移除独立的"添加柜子"按钮
// 改为单个统一按钮

<button
  type="button"
  onClick={() => setShowModelSelectionModal(true)}
  disabled={!isEditMode}
  className={/* ... */}
>
  <Plus className="size-4" />
  添加容器
</button>
```

### 5. 数据流

#### 添加容器流程

```
用户点击"添加容器"
  ↓
显示 ModelSelectionModal
  ↓
用户选择模型（沙发/柜子）
  ↓
createContainer({
  name: '沙发',
  position: { x: 0, y: 0, z: 0, rotationY: 0, scale: 1 },
  modelRef: 'everything-models/sofa_glb.glb',
  modelType: 'custom'
})
  ↓
Supabase INSERT → React Query 缓存更新
  ↓
Container3D 组件渲染新容器
  ↓
自动选中新容器（setSelectedObjectId）
  ↓
用户可立即拖拽移动
```

#### 编辑容器流程

```
编辑模式下拖拽/旋转/缩放容器
  ↓
更新 draftTransformsById[containerId]（仅内存）
  ↓
Container3D 使用 draft 数据渲染
  ↓
用户点击"保存"
  ↓
updateContainersBatch(Object.entries(draftTransformsById))
  ↓
Supabase UPDATE → React Query 缓存更新
  ↓
clearDraftTransforms()
  ↓
退出编辑模式
```

#### 查看物品流程（保持不变）

```
非编辑模式下点击容器
  ↓
openContainerModal(containerId)
  ↓
查询 useContainerItems(containerId)
  ↓
显示 ContainerItemsModal
  ↓
用户可点击"管理物品"跳转到 /items 页面
```

### 6. 错误处理

#### GLB 模型加载失败

```tsx
// 在 CustomModel 组件中使用 ErrorBoundary 捕获加载错误
import { ErrorBoundary } from 'react-error-boundary'

function CustomModel({ url }: { url: string }) {
  return (
    <ErrorBoundary
      fallback={<FallbackBox />}
      onError={(error) => {
        console.error('模型加载失败:', error)
        // toast.error(`模型加载失败: ${error.message}`)
      }}
    >
      <Suspense fallback={<FallbackBox />}>
        <GLBModelInner url={url} />
      </Suspense>
    </ErrorBoundary>
  )
}

function GLBModelInner({ url }: { url: string }) {
  const { scene } = useGLTF(url) // useGLTF 加载失败会抛出错误被 ErrorBoundary 捕获
  return <primitive object={scene.clone()} />
}

function FallbackBox() {
  return (
    <mesh>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="#9E9E9E" />
    </mesh>
  )
}
```

#### 拖拽超出边界

```typescript
// 在 useDragContainer 中自动限制
const clampedX = Math.max(-2.3, Math.min(2.3, intersection.x))
const clampedZ = Math.max(-2.3, Math.min(2.3, intersection.z))

// 可选：边界视觉反馈
if (intersection.x < -2.3 || intersection.x > 2.3 ||
    intersection.z < -2.3 || intersection.z > 2.3) {
  // 显示红色边界提示
}
```

#### 数据库写入失败

```typescript
// 在 EditorToolbar 中
async function handleSave() {
  try {
    await updateContainersBatch.mutateAsync(updates)
    toast.success('保存成功')
    clearDraftTransforms()
    setEditMode(false)
  } catch (error) {
    console.error('保存失败:', error)
    toast.error('保存失败，请重试')
    // 保留 draftTransformsById，用户可以再次保存
    // 不退出编辑模式
  }
}
```

#### 相机碰撞检测

```typescript
// 在 FirstPersonCamera 中
function updateCameraPosition(delta: number) {
  // 计算新位置
  const newX = camera.position.x + velocity.x * delta
  const newZ = camera.position.z + velocity.z * delta

  // 边界检测（留 0.2m 边距）
  const clampedX = Math.max(-2.3, Math.min(2.3, newX))
  const clampedZ = Math.max(-2.3, Math.min(2.3, newZ))
  const clampedY = Math.max(0.5, Math.min(2.8, camera.position.y))

  camera.position.set(clampedX, clampedY, clampedZ)
}
```

### 7. 性能优化

#### 减少重渲染

```typescript
// 使用 React.memo 优化 Container3D
import { isEqual } from 'lodash-es' // 或使用 fast-deep-equal

export default React.memo(Container3D, (prev, next) => {
  return (
    prev.container.id === next.container.id &&
    prev.container.modelRef === next.container.modelRef &&
    isEqual(prev.container.position, next.container.position)
  )
})
```

#### GLB 模型缓存

```typescript
// 使用 drei 的 useGLTF 自动缓存
function CustomModel({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} />
}

// 预加载模型
useGLTF.preload('everything-models/sofa_glb.glb')
useGLTF.preload('everything-models/bathroom_sink_cabinet.glb')
```

#### 射线检测优化

```typescript
// 只在拖拽时启用射线检测
useEffect(() => {
  if (!isDraggingObject) return

  window.addEventListener('pointermove', handlePointerMove)
  return () => window.removeEventListener('pointermove', handlePointerMove)
}, [isDraggingObject])
```

## 技术栈

- **3D 渲染：** React Three Fiber + @react-three/drei
- **状态管理：** Zustand (scene-store)
- **数据获取：** React Query + Supabase
- **UI 组件：** 现有 Tailwind CSS 组件
- **类型安全：** TypeScript

## 测试要点

1. **房间渲染：** 墙壁、地板、天花板正确显示
2. **相机碰撞：** 无法穿墙，Y 轴限制在 0.5-2.8m
3. **拖拽移动：** 平滑跟随鼠标/触摸，边界限制生效
4. **旋转控件：** 按住持续旋转，松开停止
5. **缩放控件：** 滑块拖动实时更新尺寸
6. **模型选择：** 弹窗显示，选择后容器出现在中心
7. **保存功能：** 批量更新数据库，清空草稿状态
8. **移动端：** 触摸拖拽、按钮响应正常
9. **错误处理：** 模型加载失败显示占位方块
10. **性能：** 60fps 流畅渲染，拖拽无卡顿
11. **控件可见性：** 容器在相机背后或视野外时不显示 2D 控件
12. **控件位置：** 旋转和缩放控件不遮挡容器本体，在不同屏幕尺寸下位置合理

## 实现顺序

1. **房间组件** - Room.tsx + 光照配置
2. **相机碰撞检测** - 修改 FirstPersonCamera.tsx
3. **拖拽系统** - useDragContainer hook + Container3D 修改
4. **2D 控件** - ContainerControlsOverlay.tsx
5. **模型选择** - ModelSelectionModal.tsx + 工具栏修改
6. **状态管理** - scene-store 调整
7. **错误处理** - 边界提示、加载失败处理
8. **性能优化** - memo、预加载
9. **测试和调试** - 端到端测试

## 风险和注意事项

1. **射线检测精度：** 拖拽时需要确保射线与地板平面准确求交
2. **3D→2D 投影：** 控件位置跟随容器，需要处理相机角度变化和容器在视野外的情况
3. **触摸事件冲突：** 区分拖拽容器、相机控制、UI 按钮点击
4. **大模型性能：** 沙发 30MB，需要优化加载体验（loading 状态）
5. **边界判断：** 当前使用容器中心点限制在 -2.3 到 2.3 范围内（简化方案）。容器旋转后的包围盒可能超出房间边界，这是已知的设计权衡。未来可改进为精确的包围盒碰撞检测。
6. **移动端滑块：** HTML range 在移动端体验可能不佳，考虑自定义实现
7. **控件重叠：** 旋转和缩放控件使用硬编码偏移（+40px, +60px），在极端容器尺寸或屏幕分辨率下可能重叠或遮挡。需要在测试中验证主流场景。

## 未来扩展

1. **多房间支持：** 选择不同房间模板（卧室、客厅、厨房）
2. **自定义房间尺寸：** 用户输入长宽高
3. **墙壁编辑：** 添加门窗、改变墙壁颜色
4. **容器吸附：** 靠墙、对齐其他容器
5. **撤销/重做：** 编辑历史管理
6. **导出分享：** 保存房间配置为 JSON，分享给其他用户
7. **AR 预览：** 使用 WebXR 在真实空间中预览布局

## 总结

本设计将现有 3D 场景改造为封闭房间编辑器，通过直观的拖拽和 2D 控件提供流畅的编辑体验。保留现有数据流和物品管理功能，专注于改进交互层。实现方式在现有架构上增量开发，风险可控，移动端友好。
