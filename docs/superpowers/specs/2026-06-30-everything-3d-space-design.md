# Everything 3D空间管理模块 - 设计方案

## 概述

**模块名称**：Everything（空间管理）
**核心价值**：通过3D虚拟家居导览，提供更直观的物品位置管理体验
**技术栈**：React Three Fiber + Dexie.js + Supabase
**实施策略**：渐进式开发（阶段1：只读导览 / 阶段2：编辑能力）

---

## 一、整体架构

### 1.1 模块定位

- **定位**：独立顶级模块，与items/todos平级
- **入口**：Portal首页新增"空间管理"卡片
- **路由结构**：
  ```
  /everything
    /                  → 3D场景主视图
    /setup             → 初始化引导页
  ```

### 1.2 核心用户流程

```
用户在3D场景中点击容器
  ↓
弹出模态框显示物品列表（只读）
  ↓
点击"管理物品"按钮
  ↓
跳转到 /items?container={containerId}
  ↓
items页面自动筛选该容器的物品
  ↓
用户可编辑、添加、删除物品
  ↓
点击"返回3D视图"
  ↓
恢复之前的相机位置
```

### 1.3 技术栈

| 分类 | 技术 | 用途 |
|------|------|------|
| 3D渲染 | React Three Fiber + @react-three/drei | 3D场景、第一人称控制 |
| 状态管理 | Zustand | 场景状态、UI状态 |
| 云端存储 | Supabase | containers表（容器元数据） |
| 本地存储 | Dexie.js | 场景配置（布局、光照、相机） |
| 模型加载 | GLTFLoader | 自定义模型导入 |

---

## 二、数据模型设计

### 2.1 数据库Schema

**新增containers表：**
```sql
CREATE TABLE IF NOT EXISTS public.containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid,  -- 预留字段，第一版固定为单场景（可为NULL）
  name text NOT NULL,  -- 容器名称，如"客厅电视柜左抽屉"
  area_id uuid REFERENCES public.areas(id) ON DELETE SET NULL,
  position_3d jsonb NOT NULL,  -- {x: 0, y: 0, z: 0, rotationY: 0, scale: 1}
  model_ref text NOT NULL,  -- 模型引用，如'cabinet_tv_01' 或自定义URL
  model_type text DEFAULT 'builtin',  -- 'builtin' | 'custom'
  metadata jsonb,  -- 扩展信息：{color, capacity, notes}
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX containers_scene_id_idx ON public.containers(scene_id);
CREATE INDEX containers_area_id_idx ON public.containers(area_id);

CREATE TRIGGER containers_set_updated_at
  BEFORE UPDATE ON public.containers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
```

**items表扩展：**
```sql
ALTER TABLE public.items
ADD COLUMN container_id uuid REFERENCES public.containers(id) ON DELETE SET NULL;

CREATE INDEX items_container_id_idx ON public.items(container_id);
```

**RLS策略：**
```sql
ALTER TABLE public.containers ENABLE ROW LEVEL SECURITY;

CREATE POLICY containers_anon_all ON public.containers
  FOR ALL TO anon, authenticated
  USING (true) WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.containers TO anon, authenticated;
```

### 2.2 本地存储结构（IndexedDB）

```typescript
interface SceneConfig {
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
    floor: { material: string, size: [number, number] }
    walls: Array<{id: string, points: [[number,number], [number,number]]}>
    skybox: string
  }
  lastModified: number
}
```

### 2.3 数据关联

- `containers` ← 1:N → `items`（一个容器包含多个物品）
- `containers` ← N:1 → `areas`（容器归属某个区域）
- `SceneConfig`（本地） + `containers`（云端） = 完整场景

### 2.4 现有数据迁移

- 现有items记录，`container_id`初始为NULL
- 用户可在items表单新增的"所在容器"下拉字段中关联容器
- 或在3D编辑模式中分配物品到容器（阶段2）

---

## 三、核心组件设计

### 3.1 模块文件结构

```
web/src/modules/everything/
├── components/
│   ├── scene/
│   │   ├── SceneCanvas.tsx           # R3F Canvas容器
│   │   ├── FirstPersonCamera.tsx     # PointerLockControls封装
│   │   ├── Container3D.tsx           # 可点击的容器模型
│   │   ├── Environment.tsx           # 地板、墙体、光照
│   │   ├── ModelLibrary.tsx          # 内置模板模型组件
│   │   └── CustomModel.tsx           # 自定义glTF加载器
│   ├── editor/                       # 阶段2
│   │   ├── EditorToolbar.tsx
│   │   ├── ModelPicker.tsx
│   │   └── TransformControls.tsx
│   ├── ui/
│   │   ├── ContainerItemsModal.tsx   # 点击容器后的物品列表弹窗
│   │   ├── ControlsHint.tsx          # 操作提示（WASD移动）
│   │   └── LoadingScreen.tsx         # 场景加载动画
│   └── layout/
│       └── EverythingLayout.tsx      # 模块布局
├── pages/
│   ├── SceneViewPage.tsx             # 主视图页面
│   └── SetupPage.tsx                 # 初始化引导页
├── hooks/
│   ├── use-scene-config.ts           # IndexedDB场景配置读写
│   ├── use-containers.ts             # Supabase容器CRUD
│   ├── use-container-items.ts        # 查询容器内物品
│   └── use-demo-scene.ts             # 加载预设demo场景
├── lib/
│   ├── scene-db.ts                   # Dexie场景数据库
│   ├── model-loader.ts               # glTF模型加载器
│   ├── builtin-models.ts             # 内置模型清单
│   └── collision-detection.ts        # 射线检测（点击识别）
├── store/
│   └── scene-store.ts                # Zustand场景状态
└── types/
    └── scene-types.ts                # TypeScript类型定义
```

### 3.2 关键组件职责

**SceneCanvas（3D渲染容器）**
```tsx
<Canvas>
  <FirstPersonCamera />
  <Environment />
  {containers.map(c => (
    <Container3D
      key={c.id}
      data={c}
      onClick={() => openItemsModal(c.id)}
    />
  ))}
  <ControlsHint />
</Canvas>
```

**FirstPersonCamera（第一人称控制）**
- 使用`@react-three/drei`的`PointerLockControls`
- 点击场景锁定鼠标，按ESC退出
- WASD键移动，鼠标控制视角
- 碰撞检测（不穿墙、不穿家具）

**Container3D（容器模型）**
- 根据`model_ref`加载对应模型（内置模板或自定义glTF）
- 应用`position_3d`中的位置、旋转、缩放
- 鼠标悬停高亮效果（outline shader）
- 点击触发`onClick`回调

**ContainerItemsModal（物品列表弹窗）**
```
┌─────────────────────────────────┐
│ 📦 客厅电视柜左抽屉              │
├─────────────────────────────────┤
│ 物品列表：                       │
│ • HDMI线 × 2                    │
│ • 遥控器 × 3                    │
│ • 电池 (AAA) × 12               │
│                                 │
│ [管理物品] [关闭]                │
└─────────────────────────────────┘
```

---

## 四、用户交互流程

### 4.1 初次使用流程

```
用户点击Portal页"空间管理"卡片
  ↓
检测是否有场景配置（IndexedDB）
  ↓
无配置 → 跳转 /everything/setup
  ├─ 显示欢迎页："通过3D视角管理物品位置"
  ├─ 选项A："加载演示场景"（推荐）
  ├─ 选项B："创建空白场景"（阶段2）
  └─ 点击"加载演示场景"
      ↓
      将demo场景写入IndexedDB + Supabase
      ↓
      跳转 /everything 进入3D视图
  ↓
有配置 → 直接进入 /everything
```

### 4.2 阶段1：只读导览交互

**1. 进入场景**
- 显示加载动画（加载模型资源）
- 显示操作提示："点击屏幕锁定鼠标，WASD移动，ESC退出"

**2. 第一人称漫游**
- 鼠标控制视角（上下左右）
- WASD键移动（前后左右）
- 空格键（可选）：跳跃或快速上升视角
- 碰撞检测：不能穿过墙体和家具

**3. 点击容器交互**
- 鼠标对准容器，十字准星变为手型
- 点击鼠标左键
- 自动退出PointerLock模式
- 弹出ContainerItemsModal显示物品列表

**4. 跳转到items管理**
- 点击"管理物品"按钮
- `navigate('/items?container={id}')`
- items页面显示筛选后的列表
- 顶部显示："正在查看：客厅电视柜左抽屉"

**5. 从items返回3D视图**
- items页面顶部显示："[← 返回3D视图]"按钮
- 点击返回 /everything
- 恢复之前的相机位置（从localStorage读取）

### 4.3 错误处理

**3D资源加载失败：**
- 显示占位符几何体（灰色立方体 + 文字标签）
- Toast提示："模型加载失败，显示简化版"

**容器内无物品：**
- 弹窗显示："此容器暂无物品"
- 提供"添加物品"按钮直接跳转items新建页

**WebGL不支持：**
- 检测浏览器兼容性
- 不支持则显示降级页面："您的浏览器不支持3D渲染，请使用Chrome/Edge/Safari"

---

## 五、内置模板库规格

### 5.1 容器模板清单（10种）

| 类型 | 模型ID | 名称 | 典型用途 | 尺寸(m) |
|------|--------|------|----------|---------|
| 1 | `cabinet_tv` | 电视柜 | 客厅影音设备 | 1.5×0.5×0.6 |
| 2 | `wardrobe_large` | 大衣柜 | 卧室衣物 | 2.0×0.6×2.0 |
| 3 | `wardrobe_small` | 小衣柜 | 儿童房/次卧 | 1.0×0.5×1.8 |
| 4 | `shoe_cabinet` | 鞋柜 | 玄关鞋类 | 1.2×0.4×1.0 |
| 5 | `bookshelf` | 书架 | 书房/客厅书籍 | 0.8×0.3×1.8 |
| 6 | `nightstand` | 床头柜 | 卧室小物件 | 0.5×0.4×0.5 |
| 7 | `sideboard` | 餐边柜 | 餐厅餐具 | 1.5×0.5×0.9 |
| 8 | `drawer_chest` | 抽屉柜 | 通用小物件 | 0.6×0.5×1.0 |
| 9 | `storage_box` | 储物箱 | 杂物临时存储 | 0.5×0.5×0.5 |
| 10 | `kitchen_cabinet` | 橱柜 | 厨房用品 | 1.0×0.6×0.8 |

### 5.2 装饰家具（不可点击）

- 沙发（`sofa_3seat`）
- 双人床（`bed_double`）
- 餐桌（`table_dining`）
- 椅子（`chair_standard`）
- 茶几（`table_coffee`）

### 5.3 模型实现方式

**阶段1：简化几何体**
```typescript
// 用Three.js基础几何体构建
function CabinetTV() {
  return (
    <group>
      <Box args={[1.5, 0.6, 0.5]} material={woodMaterial} />
      <Box args={[0.4, 0.15, 0.48]} position={[-0.4, 0.225, 0]} />
      <Box args={[0.4, 0.15, 0.48]} position={[0.4, 0.225, 0]} />
    </group>
  )
}
```
- 优势：无需外部模型文件，加载快，性能好
- 劣势：视觉效果简陋

**阶段2（可选）：真实模型**
- 从 Sketchfab、Poly Haven 获取glTF模型
- Draco压缩、合并材质、烘焙光照

### 5.4 自定义模型导入规格

**支持格式：**
- `.glb`（推荐）、`.gltf`

**文件限制：**
- 单个模型 < 10MB
- 多边形数量 < 50k

**上传方式：**
- Supabase Storage存储模型文件
- containers表的`model_ref`存储Storage URL

**验证规则：**
- 检查文件格式
- 自动居中和缩放到合理尺寸

---

## 六、性能优化与测试

### 6.1 性能目标

- 桌面端：60fps（Chrome/Edge/Safari最新版）
- 场景加载时间：< 3秒
- 模型总多边形数：< 100k
- 内存占用：< 200MB

### 6.2 优化策略

**1. 渲染优化**
```tsx
<Canvas
  gl={{
    antialias: true,
    powerPreference: 'high-performance'
  }}
  dpr={[1, 2]}
  performance={{ min: 0.5 }}
>
```

**2. 几何体复用**
```typescript
const cabinetGeometry = useMemo(() => new BoxGeometry(1.5, 0.6, 0.5), [])
const woodMaterial = useMemo(() => new MeshStandardMaterial({color: '#8B7355'}), [])
```

**3. 视锥剔除**
- R3F自动处理，不在视野内的对象不渲染

**4. 懒加载**
```typescript
function Container3D({ data }) {
  const distance = useDistance(camera, data.position)

  return distance < 5 ? (
    <DetailedModel data={data} />
  ) : (
    <SimplifiedBox data={data} />
  )
}
```

**5. 内存管理**
```typescript
useEffect(() => {
  return () => {
    geometries.forEach(g => g.dispose())
    materials.forEach(m => m.dispose())
    textures.forEach(t => t.dispose())
  }
}, [])
```

### 6.3 测试策略

**单元测试（Vitest）**
```typescript
describe('use-containers', () => {
  test('创建容器', async () => {
    const { result } = renderHook(() => useCreateContainer())
    await act(() => result.current.mutate({...}))
    expect(result.current.data).toBeDefined()
  })
})
```

**手动测试清单**
- [ ] 第一人称控制流畅性（WASD移动，鼠标视角）
- [ ] 碰撞检测正确（不穿墙）
- [ ] 容器点击响应准确
- [ ] 模态框显示正确物品列表
- [ ] 跳转到items页面筛选正确
- [ ] 从items返回3D视图恢复相机位置
- [ ] 资源加载失败时显示占位符
- [ ] 浏览器兼容性（Chrome、Edge、Safari）
- [ ] 不同分辨率适配（1920x1080、2560x1440、4K）

---

## 七、开发时间线

### 7.1 阶段1开发计划（2-3周）

**Week 1：基础搭建**
- Day 1-2：数据库迁移
  - 创建containers表
  - items表新增container_id
  - 编写migration脚本
  - items管理页面添加"所在容器"字段

- Day 3-4：3D基础设施
  - 安装依赖：`npm install three @react-three/fiber @react-three/drei`
  - 创建模块文件结构
  - 实现SceneCanvas基础框架
  - 实现FirstPersonCamera

- Day 5：demo场景数据
  - 编写10个内置容器的几何体组件
  - 创建demo场景配置
  - 实现scene-db（Dexie）
  - 初始化引导页

**Week 2：核心功能**
- Day 6-7：容器交互
  - 实现Container3D组件
  - 射线检测识别点击目标
  - 鼠标悬停高亮效果
  - 碰撞检测（包围盒）

- Day 8-9：物品查看
  - 实现ContainerItemsModal
  - use-container-items hook
  - 跳转逻辑实现
  - items页面适配URL参数筛选

- Day 10：UI与体验
  - 操作提示
  - 加载动画
  - Portal页新增入口卡片
  - 错误边界和降级处理

**Week 3：优化与测试**
- Day 11-12：性能优化
  - 几何体和材质复用
  - 视锥剔除验证
  - 内存泄漏检查
  - 帧率监控

- Day 13-14：测试与修复
  - 单元测试覆盖数据层
  - 手动测试清单执行
  - Bug修复
  - 浏览器兼容性测试

- Day 15：发布准备
  - 代码审查
  - 文档编写
  - 部署到测试环境
  - 家人试用收集反馈

### 7.2 与现有模块的集成点

**Portal页面**
```tsx
<AppCard
  title="空间管理"
  description="3D虚拟家居导览"
  to="/everything"
  accentColor="#10B981"
  icon={<Cube className="size-6" />}
  stats={[
    { label: '容器总数', value: stats?.containerCount ?? '—' },
    { label: '物品分布', value: stats?.areasWithItems ?? '—' },
  ]}
/>
```

**Items页面**
```tsx
const searchParams = useSearchParams()
const containerId = searchParams.get('container')

{containerId && (
  <div className="flex items-center gap-2 px-4 py-2 bg-primary/10">
    <button onClick={() => navigate('/everything')}>
      ← 返回3D视图
    </button>
    <span>正在查看：{containerName}</span>
  </div>
)}

const filteredItems = containerId
  ? items.filter(item => item.containerId === containerId)
  : items
```

**Items表单页**
```tsx
<FormRow label="所在容器">
  <select value={containerId} onChange={...}>
    <option value="">未指定</option>
    {containers.map(c => (
      <option key={c.id} value={c.id}>{c.name}</option>
    ))}
  </select>
</FormRow>
```

**App路由**
```tsx
<Route path="/everything">
  <Route index element={<SceneViewPage />} />
  <Route path="setup" element={<SetupPage />} />
</Route>
```

### 7.3 部署注意事项

- Three.js bundle较大（~600KB），确保Vite代码分割
- Supabase migration需要在生产环境执行
- 首次部署后通知用户"加载演示场景"初始化数据
- GitHub Pages部署：确保SPA路由配置（404.html重定向）

---

## 八、阶段2预留设计（未来迭代）

**编辑模式功能：**
- 场景编辑器（房间布局、家具摆放）
- TransformControls（拖拽、旋转、缩放）
- 模型库面板（拖拽添加家具）
- 自定义模型上传UI
- 场景导出/导入功能

**扩展功能：**
- 移动端适配（虚拟摇杆）
- 多场景支持（一楼、二楼、车库）
- AR扫描房间自动建模
- 多人协作（实时看到其他家庭成员位置）

---

## 九、验收标准（阶段1）

- ✅ 能在demo场景中自由移动（WASD+鼠标）
- ✅ 点击10个预设容器都能弹出正确的物品列表
- ✅ 从3D视图跳转到items管理，筛选正确
- ✅ 从items返回3D视图，相机位置恢复
- ✅ 桌面端Chrome/Edge/Safari运行流畅（>45fps）

---

## 十、方案优势总结

1. **渐进式风险控制**：阶段1只需2-3周即可验证核心价值
2. **技术栈无缝集成**：R3F作为React组件，与现有架构完美融合
3. **数据架构清晰**：containers表扩展现有模型，不破坏原有逻辑
4. **用户体验平滑**：3D导览→物品列表→items管理，流程自然
5. **性能可控**：简化几何体保证60fps，避免过早优化
