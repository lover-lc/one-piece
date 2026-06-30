# Everything 3D空间管理 - 阶段1实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现3D虚拟家居导览的只读查看功能，用户可在第一人称视角中漫游场景并点击容器查看物品列表

**Architecture:** 使用React Three Fiber渲染3D场景，Dexie.js存储场景配置，Supabase存储容器元数据。采用简化几何体构建内置模板，通过PointerLockControls实现第一人称控制。

**Tech Stack:** React Three Fiber, @react-three/drei, Dexie.js, Supabase, Zustand, TypeScript

---

## 文件结构规划

### 新增文件清单

**数据库迁移：**
- `web/supabase/migrations/20260630170000_containers.sql` - containers表和items扩展

**模块核心：**
- `web/src/modules/everything/types/scene-types.ts` - TypeScript类型定义
- `web/src/modules/everything/lib/scene-db.ts` - Dexie场景数据库
- `web/src/modules/everything/lib/builtin-models.ts` - 内置模型配置
- `web/src/modules/everything/lib/demo-scene.ts` - demo场景数据
- `web/src/modules/everything/store/scene-store.ts` - Zustand状态管理
- `web/src/modules/everything/hooks/use-scene-config.ts` - 场景配置hook
- `web/src/modules/everything/hooks/use-containers.ts` - 容器CRUD hook
- `web/src/modules/everything/hooks/use-container-items.ts` - 容器物品查询hook

**3D组件：**
- `web/src/modules/everything/components/scene/SceneCanvas.tsx` - R3F Canvas容器
- `web/src/modules/everything/components/scene/FirstPersonCamera.tsx` - 第一人称控制
- `web/src/modules/everything/components/scene/Environment.tsx` - 地板墙体光照
- `web/src/modules/everything/components/scene/Container3D.tsx` - 可点击容器
- `web/src/modules/everything/components/scene/BuiltinModel.tsx` - 内置模型渲染

**UI组件：**
- `web/src/modules/everything/components/ui/ContainerItemsModal.tsx` - 物品列表弹窗
- `web/src/modules/everything/components/ui/ControlsHint.tsx` - 操作提示
- `web/src/modules/everything/components/ui/LoadingScreen.tsx` - 加载动画

**页面：**
- `web/src/modules/everything/pages/SceneViewPage.tsx` - 主视图页面
- `web/src/modules/everything/pages/SetupPage.tsx` - 初始化引导页

**测试：**
- `web/tests/scene-db.test.ts` - 场景数据库测试
- `web/tests/use-containers.test.ts` - 容器hook测试

### 修改文件清单

- `web/package.json` - 添加three、@react-three/fiber、@react-three/drei依赖
- `web/src/App.tsx` - 添加/everything路由
- `web/src/modules/portal/pages/PortalPage.tsx` - 添加空间管理卡片
- `web/src/modules/items/pages/ItemsPage.tsx` - 适配container参数筛选
- `web/src/modules/items/pages/ItemFormPage.tsx` - 添加所在容器字段

---

## Week 1: 基础搭建

### Task 1: 数据库迁移

**Files:**
- Create: `web/supabase/migrations/20260630170000_containers.sql`

- [ ] **Step 1: 创建迁移文件**

创建文件 `web/supabase/migrations/20260630170000_containers.sql`

```sql
-- Everything模块 - containers表和items扩展
-- 创建日期: 2026-06-30

-- 创建containers表
CREATE TABLE IF NOT EXISTS public.containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid,
  name text NOT NULL,
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  position_3d jsonb NOT NULL,
  model_ref text NOT NULL,
  model_type text DEFAULT 'builtin',
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 创建索引
CREATE INDEX containers_scene_id_idx ON public.containers(scene_id);
CREATE INDEX containers_area_id_idx ON public.containers(area_id);

-- 更新触发器
CREATE TRIGGER containers_set_updated_at
  BEFORE UPDATE ON public.containers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- items表扩展
ALTER TABLE public.items
ADD COLUMN IF NOT EXISTS container_id uuid REFERENCES public.containers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS items_container_id_idx ON public.items(container_id);

-- RLS策略
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'containers' AND policyname = 'containers_anon_all'
  ) THEN
    CREATE POLICY containers_anon_all ON public.containers
      FOR ALL TO anon, authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 授权
GRANT SELECT, INSERT, UPDATE, DELETE ON public.containers TO anon, authenticated;
```

- [ ] **Step 2: 执行迁移**

运行命令：
```bash
npm run db:migrate
```

预期输出：包含 "Migration 20260630170000_containers.sql applied"

- [ ] **Step 3: 验证表结构**

在Supabase Dashboard SQL Editor中运行：
```sql
\d public.containers
\d public.items
```

预期：containers表存在，items表有container_id列

- [ ] **Step 4: 测试RLS策略**

在Supabase Dashboard SQL Editor中运行：
```sql
INSERT INTO public.containers (name, position_3d, model_ref)
VALUES ('测试容器', '{"x":0,"y":0,"z":0,"rotationY":0,"scale":1}'::jsonb, 'cabinet_tv');

SELECT * FROM public.containers;
```

预期：插入成功并能查询到数据

---

### Task 2: 安装依赖

**Files:**
- Modify: `web/package.json`

- [ ] **Step 1: 安装Three.js生态依赖**

运行命令：
```bash
cd web
npm install three@^0.170.0 @react-three/fiber@^9.0.0 @react-three/drei@^9.117.0
npm install -D @types/three@^0.170.0
```

预期输出：依赖安装成功，package.json更新

- [ ] **Step 2: 验证安装**

运行命令：
```bash
npm list three @react-three/fiber @react-three/drei
```

预期：显示已安装的版本号

- [ ] **Step 3: 测试导入**

创建临时测试文件验证：
```tsx
// web/src/test-r3f.tsx
import { Canvas } from '@react-three/fiber'
import { Box } from '@react-three/drei'

export default function Test() {
  return (
    <Canvas>
      <Box />
    </Canvas>
  )
}
```

运行 `npm run dev`，预期：无TypeScript错误

- [ ] **Step 4: 删除测试文件**

```bash
rm web/src/test-r3f.tsx
```

---

### Task 3: TypeScript类型定义

**Files:**
- Create: `web/src/modules/everything/types/scene-types.ts`

- [ ] **Step 1: 创建类型文件**

```typescript
// web/src/modules/everything/types/scene-types.ts

/**
 * 3D位置信息
 */
export interface Position3D {
  x: number
  y: number
  z: number
  rotationY: number  // Y轴旋转（弧度）
  scale: number
}

/**
 * 容器数据库记录
 */
export interface DbContainer {
  id: string
  scene_id: string | null
  name: string
  area_id: string | null
  position_3d: Position3D
  model_ref: string
  model_type: 'builtin' | 'custom'
  metadata: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

/**
 * 容器前端类型
 */
export interface Container {
  id: string
  sceneId: string | null
  name: string
  areaId: string | null
  position: Position3D
  modelRef: string
  modelType: 'builtin' | 'custom'
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

/**
 * 容器创建输入
 */
export interface ContainerInsert {
  name: string
  areaId?: string | null
  position: Position3D
  modelRef: string
  modelType?: 'builtin' | 'custom'
  metadata?: Record<string, unknown> | null
}

/**
 * 场景配置（存储在IndexedDB）
 */
export interface SceneConfig {
  id: string  // 'default-scene'
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

/**
 * 内置模型类型
 */
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

/**
 * 内置模型配置
 */
export interface BuiltinModelConfig {
  id: BuiltinModelType
  name: string
  size: [number, number, number]  // [width, height, depth]
  color: string
  category: '容器'
}

/**
 * 数据库转前端类型
 */
export function toContainer(db: DbContainer): Container {
  return {
    id: db.id,
    sceneId: db.scene_id,
    name: db.name,
    areaId: db.area_id,
    position: db.position_3d,
    modelRef: db.model_ref,
    modelType: db.model_type,
    metadata: db.metadata,
    createdAt: db.created_at,
    updatedAt: db.updated_at,
  }
}

/**
 * 前端转数据库类型
 */
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
```

- [ ] **Step 2: 验证类型定义**

运行命令：
```bash
cd web
npx tsc --noEmit
```

预期：无TypeScript错误

---

### Task 4: Dexie场景数据库

**Files:**
- Create: `web/src/modules/everything/lib/scene-db.ts`
- Create: `web/tests/scene-db.test.ts`

- [ ] **Step 1: 编写failing测试**

```typescript
// web/tests/scene-db.test.ts
import { describe, test, expect, beforeEach } from 'vitest'
import { saveSceneConfig, loadSceneConfig, clearSceneConfig } from '../src/modules/everything/lib/scene-db'
import type { SceneConfig } from '../src/modules/everything/types/scene-types'

const mockConfig: SceneConfig = {
  id: 'test-scene',
  version: 1,
  camera: {
    position: [0, 1.6, 5],
    rotation: [0, 0, 0],
  },
  lighting: {
    ambient: 0.5,
    directional: {
      intensity: 1,
      position: [10, 10, 10],
    },
  },
  environment: {
    floor: {
      material: 'wood',
      size: [20, 20],
    },
    walls: [],
  },
  lastModified: Date.now(),
}

describe('scene-db', () => {
  beforeEach(async () => {
    await clearSceneConfig()
  })

  test('保存和加载场景配置', async () => {
    await saveSceneConfig(mockConfig)
    const loaded = await loadSceneConfig()

    expect(loaded).toBeDefined()
    expect(loaded?.id).toBe('test-scene')
    expect(loaded?.camera.position).toEqual([0, 1.6, 5])
  })

  test('加载不存在的配置返回null', async () => {
    const loaded = await loadSceneConfig()
    expect(loaded).toBeNull()
  })

  test('更新现有配置', async () => {
    await saveSceneConfig(mockConfig)

    const updated = { ...mockConfig, version: 2 }
    await saveSceneConfig(updated)

    const loaded = await loadSceneConfig()
    expect(loaded?.version).toBe(2)
  })
})
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm run test scene-db.test.ts
```

预期：FAIL - "saveSceneConfig is not defined"

- [ ] **Step 3: 实现scene-db**

```typescript
// web/src/modules/everything/lib/scene-db.ts
import Dexie, { type EntityTable } from 'dexie'
import type { SceneConfig } from '../types/scene-types'

/**
 * Everything模块场景配置数据库
 */
class SceneDatabase extends Dexie {
  scenes!: EntityTable<SceneConfig, 'id'>

  constructor() {
    super('EverythingSceneDB')

    this.version(1).stores({
      scenes: 'id, version, lastModified',
    })
  }
}

const db = new SceneDatabase()

/**
 * 保存场景配置
 */
export async function saveSceneConfig(config: SceneConfig): Promise<void> {
  await db.scenes.put(config)
}

/**
 * 加载场景配置（固定ID: default-scene）
 */
export async function loadSceneConfig(): Promise<SceneConfig | null> {
  const config = await db.scenes.get('default-scene')
  return config ?? null
}

/**
 * 清除场景配置
 */
export async function clearSceneConfig(): Promise<void> {
  await db.scenes.clear()
}

/**
 * 检查是否已初始化
 */
export async function hasSceneConfig(): Promise<boolean> {
  const count = await db.scenes.count()
  return count > 0
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm run test scene-db.test.ts
```

预期：PASS - 所有3个测试通过

---

### Task 5: 内置模型配置

**Files:**
- Create: `web/src/modules/everything/lib/builtin-models.ts`

- [ ] **Step 1: 创建内置模型配置**

```typescript
// web/src/modules/everything/lib/builtin-models.ts
import type { BuiltinModelType, BuiltinModelConfig } from '../types/scene-types'

/**
 * 内置容器模型库
 */
export const BUILTIN_MODELS: Record<BuiltinModelType, BuiltinModelConfig> = {
  cabinet_tv: {
    id: 'cabinet_tv',
    name: '电视柜',
    size: [1.5, 0.6, 0.5],
    color: '#8B7355',
    category: '容器',
  },
  wardrobe_large: {
    id: 'wardrobe_large',
    name: '大衣柜',
    size: [2.0, 2.0, 0.6],
    color: '#A0826D',
    category: '容器',
  },
  wardrobe_small: {
    id: 'wardrobe_small',
    name: '小衣柜',
    size: [1.0, 1.8, 0.5],
    color: '#A0826D',
    category: '容器',
  },
  shoe_cabinet: {
    id: 'shoe_cabinet',
    name: '鞋柜',
    size: [1.2, 1.0, 0.4],
    color: '#6B5D4F',
    category: '容器',
  },
  bookshelf: {
    id: 'bookshelf',
    name: '书架',
    size: [0.8, 1.8, 0.3],
    color: '#8B7355',
    category: '容器',
  },
  nightstand: {
    id: 'nightstand',
    name: '床头柜',
    size: [0.5, 0.5, 0.4],
    color: '#A0826D',
    category: '容器',
  },
  sideboard: {
    id: 'sideboard',
    name: '餐边柜',
    size: [1.5, 0.9, 0.5],
    color: '#8B7355',
    category: '容器',
  },
  drawer_chest: {
    id: 'drawer_chest',
    name: '抽屉柜',
    size: [0.6, 1.0, 0.5],
    color: '#6B5D4F',
    category: '容器',
  },
  storage_box: {
    id: 'storage_box',
    name: '储物箱',
    size: [0.5, 0.5, 0.5],
    color: '#9E9E9E',
    category: '容器',
  },
  kitchen_cabinet: {
    id: 'kitchen_cabinet',
    name: '橱柜',
    size: [1.0, 0.8, 0.6],
    color: '#A0826D',
    category: '容器',
  },
}

/**
 * 获取模型配置
 */
export function getBuiltinModel(id: BuiltinModelType): BuiltinModelConfig {
  return BUILTIN_MODELS[id]
}

/**
 * 获取所有模型列表
 */
export function getAllBuiltinModels(): BuiltinModelConfig[] {
  return Object.values(BUILTIN_MODELS)
}
```

- [ ] **Step 2: 验证导出**

创建临时测试：
```typescript
import { getBuiltinModel, getAllBuiltinModels } from './builtin-models'

const tv = getBuiltinModel('cabinet_tv')
console.log(tv.name) // '电视柜'

const all = getAllBuiltinModels()
console.log(all.length) // 10
```

运行 `npm run dev`，在浏览器console验证输出

- [ ] **Step 3: 删除临时测试代码**

---

## （续：由于内容较长，将分段写入第二部分）
