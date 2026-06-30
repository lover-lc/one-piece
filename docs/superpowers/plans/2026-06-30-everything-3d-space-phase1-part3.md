# Everything 3D空间管理 - 阶段1实现计划（第三部分）

> 接续 `2026-06-30-everything-3d-space-phase1-part2.md`

---

### Task 15: SceneCanvas主容器

**Files:**
- Create: `web/src/modules/everything/components/scene/SceneCanvas.tsx`

- [ ] **Step 1: 创建R3F Canvas容器**

```typescript
// web/src/modules/everything/components/scene/SceneCanvas.tsx
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import FirstPersonCamera from './FirstPersonCamera'
import Environment from './Environment'
import Container3D from './Container3D'
import { useContainers } from '../../hooks/use-containers'
import { openContainerModal, useSceneStore } from '../../store/scene-store'
import LoadingScreen from '../ui/LoadingScreen'

/**
 * 3D场景Canvas容器
 */
export default function SceneCanvas() {
  const { data: containers, isLoading } = useContainers()
  const setSceneLoading = useSceneStore((s) => s.setSceneLoading)

  // 场景加载完成
  const onCreated = () => {
    setSceneLoading(false)
  }

  if (isLoading) {
    return <LoadingScreen message="加载场景中..." />
  }

  return (
    <div className="h-screen w-screen">
      <Canvas
        shadows
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <FirstPersonCamera />
          <Environment />

          {/* 渲染所有容器 */}
          {containers?.map((container) => (
            <Container3D
              key={container.id}
              container={container}
              onClick={openContainerModal}
            />
          ))}
        </Suspense>
      </Canvas>
    </div>
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 16: UI组件 - 加载动画

**Files:**
- Create: `web/src/modules/everything/components/ui/LoadingScreen.tsx`

- [ ] **Step 1: 创建加载屏幕**

```typescript
// web/src/modules/everything/components/ui/LoadingScreen.tsx
interface LoadingScreenProps {
  message?: string
}

/**
 * 场景加载动画
 */
export default function LoadingScreen({ message = '加载中...' }: LoadingScreenProps) {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-bg">
      <div className="text-center">
        <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-text-secondary">{message}</p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 17: UI组件 - 操作提示

**Files:**
- Create: `web/src/modules/everything/components/ui/ControlsHint.tsx`

- [ ] **Step 1: 创建操作提示组件**

```typescript
// web/src/modules/everything/components/ui/ControlsHint.tsx
import { useSceneStore } from '../../store/scene-store'

/**
 * 操作提示（WASD移动、ESC退出等）
 */
export default function ControlsHint() {
  const isPointerLocked = useSceneStore((s) => s.isPointerLocked)

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      {/* 未锁定时显示提示 */}
      {!isPointerLocked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="rounded-lg bg-black/80 px-6 py-4 text-white backdrop-blur">
            <p className="mb-2 text-lg font-semibold">点击屏幕开始探索</p>
            <div className="space-y-1 text-sm text-gray-300">
              <p>WASD - 移动</p>
              <p>鼠标 - 视角</p>
              <p>ESC - 退出</p>
              <p>点击容器 - 查看物品</p>
            </div>
          </div>
        </div>
      )}

      {/* 锁定时显示十字准星 */}
      {isPointerLocked && (
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-4 w-4">
            <div className="absolute left-1/2 top-0 h-2 w-0.5 -translate-x-1/2 bg-white" />
            <div className="absolute bottom-0 left-1/2 h-2 w-0.5 -translate-x-1/2 bg-white" />
            <div className="absolute left-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white" />
            <div className="absolute right-0 top-1/2 h-0.5 w-2 -translate-y-1/2 bg-white" />
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 18: UI组件 - 物品列表模态框

**Files:**
- Create: `web/src/modules/everything/components/ui/ContainerItemsModal.tsx`

- [ ] **Step 1: 创建模态框组件**

```typescript
// web/src/modules/everything/components/ui/ContainerItemsModal.tsx
import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { closeContainerModal, useSceneStore } from '../../store/scene-store'
import { useContainer } from '../../hooks/use-containers'
import { useContainerItems } from '../../hooks/use-container-items'

/**
 * 容器物品列表模态框
 */
export default function ContainerItemsModal() {
  const navigate = useNavigate()
  const selectedContainerId = useSceneStore((s) => s.selectedContainerId)
  const showModal = useSceneStore((s) => s.showItemsModal)

  const { data: container } = useContainer(selectedContainerId ?? undefined)
  const { items, isEmpty, isLoading } = useContainerItems(selectedContainerId)

  if (!showModal || !container) return null

  const handleManageItems = () => {
    navigate(`/items?container=${container.id}`)
  }

  const handleClose = () => {
    closeContainerModal()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 标题栏 */}
        <div className="flex items-center justify-between border-b border-bg-hover px-4 py-3">
          <h2 className="text-lg font-semibold text-text">📦 {container.name}</h2>
          <button
            onClick={handleClose}
            className="rounded p-1 hover:bg-bg-hover"
            aria-label="关闭"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="max-h-96 overflow-y-auto p-4">
          {isLoading && (
            <p className="text-center text-text-secondary">加载中...</p>
          )}

          {!isLoading && isEmpty && (
            <div className="text-center">
              <p className="mb-4 text-text-secondary">此容器暂无物品</p>
              <button
                onClick={handleManageItems}
                className="rounded-button bg-primary px-4 py-2 text-white hover:bg-primary/90"
              >
                添加物品
              </button>
            </div>
          )}

          {!isLoading && !isEmpty && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-bg-hover px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-text">{item.name}</p>
                    {item.quantity && (
                      <p className="text-sm text-text-secondary">
                        数量: {item.quantity} {item.unit?.name}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 操作栏 */}
        {!isEmpty && (
          <div className="border-t border-bg-hover px-4 py-3">
            <button
              onClick={handleManageItems}
              className="w-full rounded-button bg-primary px-4 py-2 text-white hover:bg-primary/90"
            >
              管理物品
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证组件**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 19: SceneViewPage主页面

**Files:**
- Create: `web/src/modules/everything/pages/SceneViewPage.tsx`

- [ ] **Step 1: 创建主视图页面**

```typescript
// web/src/modules/everything/pages/SceneViewPage.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import SceneCanvas from '../components/scene/SceneCanvas'
import ControlsHint from '../components/ui/ControlsHint'
import ContainerItemsModal from '../components/ui/ContainerItemsModal'
import { useHasScene } from '../hooks/use-scene-config'
import { useSceneStore } from '../store/scene-store'

/**
 * 3D场景主视图页面
 */
export default function SceneViewPage() {
  const navigate = useNavigate()
  const { hasScene, loading } = useHasScene()
  const saveCameraState = useSceneStore((s) => s.saveCameraState)

  // 未初始化则跳转到引导页
  useEffect(() => {
    if (!loading && !hasScene) {
      navigate('/everything/setup')
    }
  }, [hasScene, loading, navigate])

  // 组件卸载时保存相机状态
  useEffect(() => {
    return () => {
      // TODO: 从相机获取实际位置和旋转
      const position: [number, number, number] = [0, 1.6, 5]
      const rotation: [number, number, number] = [0, 0, 0]
      saveCameraState(position, rotation)
    }
  }, [saveCameraState])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-text-secondary">加载中...</p>
      </div>
    )
  }

  return (
    <>
      <SceneCanvas />
      <ControlsHint />
      <ContainerItemsModal />
    </>
  )
}
```

- [ ] **Step 2: 验证页面**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

### Task 20: SetupPage引导页

**Files:**
- Create: `web/src/modules/everything/pages/SetupPage.tsx`

- [ ] **Step 1: 创建初始化引导页**

```typescript
// web/src/modules/everything/pages/SetupPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Cube } from 'lucide-react'
import { useSaveSceneConfig } from '../hooks/use-scene-config'
import { useCreateContainersBatch } from '../hooks/use-containers'
import { useAreas } from '../../items/hooks/use-areas'
import { DEFAULT_SCENE_CONFIG, getDemoContainers } from '../lib/demo-scene'

/**
 * 初始化引导页
 */
export default function SetupPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { save: saveScene } = useSaveSceneConfig()
  const { mutateAsync: createContainers } = useCreateContainersBatch()
  const { data: areas } = useAreas()

  const handleLoadDemo = async () => {
    setLoading(true)
    setError(null)

    try {
      // 获取客厅区域ID（如果不存在则使用第一个区域）
      const clientRoomArea = areas?.find((a) => a.name.includes('客厅'))
      const areaId = clientRoomArea?.id || areas?.[0]?.id

      if (!areaId) {
        throw new Error('未找到区域，请先在物品管理中创建区域')
      }

      // 保存场景配置到IndexedDB
      await saveScene(DEFAULT_SCENE_CONFIG)

      // 创建demo容器到Supabase
      await createContainers(getDemoContainers(areaId))

      // 跳转到主视图
      navigate('/everything')
    } catch (err) {
      setError(err instanceof Error ? err.message : '初始化失败')
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="mx-4 w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
          <Cube className="h-10 w-10 text-primary" />
        </div>

        <h1 className="mb-2 text-2xl font-bold text-text">欢迎使用空间管理</h1>
        <p className="mb-8 text-text-secondary">
          通过3D视角直观地管理家中物品的位置
        </p>

        {error && (
          <div className="mb-4 rounded-lg bg-red-500/10 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        <button
          onClick={handleLoadDemo}
          disabled={loading}
          className="w-full rounded-button bg-primary px-6 py-3 font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? '初始化中...' : '加载演示场景'}
        </button>

        <p className="mt-4 text-xs text-text-tertiary">
          将创建包含8个容器的演示场景
        </p>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 验证页面**

```bash
npx tsc --noEmit
```

预期：无类型错误

---

## Week 3: 集成与优化

### Task 21: App路由集成

**Files:**
- Modify: `web/src/App.tsx`

- [ ] **Step 1: 添加everything路由**

在 `web/src/App.tsx` 的 `<Routes>` 中添加：

```tsx
import SceneViewPage from './modules/everything/pages/SceneViewPage'
import SetupPage from './modules/everything/pages/SetupPage'

// 在 <Route element={<SeedLayout />}> 内部添加：
<Route path="/everything">
  <Route index element={<SceneViewPage />} />
  <Route path="setup" element={<SetupPage />} />
</Route>
```

- [ ] **Step 2: 验证路由**

运行 `npm run dev`，访问 `http://localhost:5173/everything/setup`

预期：显示初始化引导页

- [ ] **Step 3: 测试路由跳转**

点击"加载演示场景"按钮，预期：跳转到 `/everything` 并显示3D场景

---

### Task 22: Portal页面入口

**Files:**
- Modify: `web/src/modules/portal/pages/PortalPage.tsx`

- [ ] **Step 1: 添加空间管理卡片**

在 `PortalPage.tsx` 的 `<PortalAppGrid>` 中添加：

```tsx
import { Cube } from 'lucide-react'

<AppCard
  title="空间管理"
  description="3D虚拟家居导览"
  to="/everything"
  accentColor="#10B981"
  icon={<Cube className="size-6" />}
  stats={[
    { label: '容器总数', value: '—' },
    { label: '物品分布', value: '—' },
  ]}
/>
```

- [ ] **Step 2: 验证卡片显示**

运行 `npm run dev`，访问 `/portal`

预期：显示三张卡片（物品管理、待办管理、空间管理）

- [ ] **Step 3: 测试跳转**

点击"空间管理"卡片，预期：跳转到 `/everything/setup`

---

### Task 23: Items页面容器筛选

**Files:**
- Modify: `web/src/modules/items/pages/ItemsPage.tsx`

- [ ] **Step 1: 读取container参数**

在 `ItemsPage.tsx` 中添加：

```tsx
import { useSearchParams } from 'react-router-dom'
import { useContainer } from '../../everything/hooks/use-containers'

// 在组件内部：
const [searchParams] = useSearchParams()
const containerId = searchParams.get('container')
const { data: container } = useContainer(containerId ?? undefined)
```

- [ ] **Step 2: 添加返回3D视图按钮**

在页面顶部添加：

```tsx
{containerId && container && (
  <div className="flex items-center gap-3 border-b border-bg-hover px-4 py-2 bg-primary/5">
    <button
      onClick={() => navigate('/everything')}
      className="text-sm text-primary hover:underline"
    >
      ← 返回3D视图
    </button>
    <span className="text-sm text-text-secondary">
      正在查看：{container.name}
    </span>
  </div>
)}
```

- [ ] **Step 3: 应用容器筛选**

修改items筛选逻辑：

```tsx
const filteredItems = useMemo(() => {
  let result = items || []

  // 容器筛选
  if (containerId) {
    result = result.filter((item) => item.containerId === containerId)
  }

  // 其他现有筛选逻辑...
  return result
}, [items, containerId, /* 其他依赖 */])
```

- [ ] **Step 4: 测试筛选**

访问 `/items?container={某个容器ID}`

预期：只显示该容器的物品，并有返回3D视图按钮

---

### Task 24: Items表单容器字段

**Files:**
- Modify: `web/src/modules/items/pages/ItemFormPage.tsx`

- [ ] **Step 1: 添加容器下拉字段**

在表单中添加：

```tsx
import { useContainers } from '../../everything/hooks/use-containers'

// 在组件内部：
const { data: containers } = useContainers()

// 在表单中添加字段：
<FormRow label="所在容器">
  <select
    value={form.containerId || ''}
    onChange={(e) => setForm({ ...form, containerId: e.target.value || null })}
    className={fieldInputClass}
  >
    <option value="">未指定</option>
    {containers?.map((c) => (
      <option key={c.id} value={c.id}>
        {c.name}
      </option>
    ))}
  </select>
</FormRow>
```

- [ ] **Step 2: 更新表单类型**

确保 `ItemInsert` 类型包含 `containerId?: string | null`

- [ ] **Step 3: 测试表单**

新建物品，选择容器，保存

预期：物品保存成功，在3D场景点击该容器能看到该物品

---

### Task 25: 性能优化

**Files:**
- Modify: `web/src/modules/everything/components/scene/SceneCanvas.tsx`

- [ ] **Step 1: 添加性能监控（开发模式）**

```tsx
import { Perf } from 'r3f-perf'

// 在Canvas内部添加：
{import.meta.env.DEV && <Perf position="top-left" />}
```

安装依赖：
```bash
npm install -D r3f-perf
```

- [ ] **Step 2: 优化几何体复用**

在 `BuiltinModel.tsx` 中使用 `useMemo`：

```tsx
import { useMemo } from 'react'

const geometry = useMemo(() => new BoxGeometry(...config.size), [config.size])
const material = useMemo(
  () => new MeshStandardMaterial({ color: config.color, roughness: 0.7 }),
  [config.color]
)

return (
  <mesh geometry={geometry} material={material} onClick={onClick} />
)
```

- [ ] **Step 3: 添加视锥剔除验证**

运行 `npm run dev`，打开浏览器控制台，观察性能面板

预期：FPS稳定在55-60，内存占用<200MB

---

### Task 26: 错误边界

**Files:**
- Create: `web/src/modules/everything/components/ErrorBoundary.tsx`

- [ ] **Step 1: 创建错误边界组件**

```typescript
// web/src/modules/everything/components/ErrorBoundary.tsx
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

/**
 * 3D场景错误边界
 */
export class SceneErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex h-screen items-center justify-center bg-bg">
            <div className="max-w-md text-center">
              <h2 className="mb-2 text-xl font-semibold text-text">
                3D场景加载失败
              </h2>
              <p className="mb-4 text-text-secondary">
                {this.state.error?.message || '未知错误'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="rounded-button bg-primary px-4 py-2 text-white"
              >
                重新加载
              </button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
```

- [ ] **Step 2: 在SceneViewPage中使用**

```tsx
import { SceneErrorBoundary } from '../components/ErrorBoundary'

export default function SceneViewPage() {
  return (
    <SceneErrorBoundary>
      <SceneCanvas />
      {/* ... */}
    </SceneErrorBoundary>
  )
}
```

---

### Task 27: WebGL兼容性检测

**Files:**
- Create: `web/src/modules/everything/lib/webgl-check.ts`

- [ ] **Step 1: 创建WebGL检测工具**

```typescript
// web/src/modules/everything/lib/webgl-check.ts

/**
 * 检测浏览器是否支持WebGL
 */
export function isWebGLSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch (e) {
    return false
  }
}

/**
 * WebGL不支持时的降级页面
 */
export function WebGLUnsupportedPage() {
  return (
    <div className="flex h-screen items-center justify-center bg-bg">
      <div className="max-w-md text-center">
        <h2 className="mb-2 text-xl font-semibold text-text">
          您的浏览器不支持3D渲染
        </h2>
        <p className="mb-4 text-text-secondary">
          请使用Chrome、Edge或Safari最新版本浏览器
        </p>
        <a
          href="/items"
          className="inline-block rounded-button bg-primary px-4 py-2 text-white hover:bg-primary/90"
        >
          返回物品管理
        </a>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 在SceneViewPage中检测**

```tsx
import { isWebGLSupported, WebGLUnsupportedPage } from '../lib/webgl-check'

export default function SceneViewPage() {
  if (!isWebGLSupported()) {
    return <WebGLUnsupportedPage />
  }

  // 正常渲染...
}
```

---

### Task 28: 最终测试

**Files:**
- N/A

- [ ] **Step 1: 端到端测试**

**测试流程：**
1. 访问 `/portal`，点击"空间管理"
2. 在引导页点击"加载演示场景"
3. 进入3D场景，点击屏幕锁定鼠标
4. 使用WASD移动，观察场景
5. 鼠标对准一个容器，看到高亮和名称
6. 点击容器，弹出物品列表模态框
7. 点击"管理物品"，跳转到items页面
8. 验证筛选正确
9. 点击"返回3D视图"，验证相机位置恢复
10. 按ESC退出PointerLock

预期：所有步骤流畅无报错

- [ ] **Step 2: 性能测试**

打开Chrome DevTools → Performance面板，录制30秒

预期：
- FPS: 55-60
- 内存占用: <200MB
- 无明显掉帧

- [ ] **Step 3: 浏览器兼容性测试**

测试浏览器：
- Chrome (最新版)
- Edge (最新版)
- Safari (最新版)

预期：所有浏览器正常运行

- [ ] **Step 4: 错误场景测试**

测试场景：
1. 容器内无物品 → 显示"暂无物品"提示
2. 断网后操作 → 显示错误提示
3. WebGL禁用 → 显示降级页面

预期：所有错误场景正确处理

---

## 验收标准

完成以上所有任务后，验证以下标准：

- [ ] ✅ 能在demo场景中自由移动（WASD+鼠标）
- [ ] ✅ 点击8个预设容器都能弹出正确的物品列表
- [ ] ✅ 从3D视图跳转到items管理，筛选正确
- [ ] ✅ 从items返回3D视图，相机位置恢复
- [ ] ✅ 桌面端Chrome/Edge/Safari运行流畅（>45fps）

---

## 执行选项

计划已完成并保存。选择执行方式：

**1. Subagent-Driven（推荐）**
- 每个任务派发独立子agent
- 任务间双阶段审查
- 快速并行迭代

**2. Inline Execution**
- 在当前会话顺序执行
- 批量执行带检查点
- 适合线性流程

请选择执行方式。
