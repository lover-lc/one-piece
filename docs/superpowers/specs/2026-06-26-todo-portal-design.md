# 待办管理与门户选择功能设计文档

**日期**: 2026-06-26
**平台**: Web
**技术栈**: React + TypeScript + Vite + Supabase
**远程仓库**: https://github.com/lover-lc/item-manage

## 项目概述

在现有物品管理应用的基础上，扩展两个核心功能：
1. **门户选择功能**：登录后可以选择进入「物品管理」或「待办管理」应用
2. **待办管理功能**：家庭成员协作的待办事项管理系统，支持任务指派、反馈流程、时间轴视图

## 核心需求

### 用户体系与认证机制

**认证模型：**
- 采用**家庭共享模式**，延续现有 HOUSEHOLD_EMAIL 设计
- 整个家庭共享一个 Supabase 认证账号（`auth.users` 中的一条记录）
- 新增"家庭成员"表（`todo_family_members`），每个成员有名字/头像/主题色
- 家庭成员与认证账号的关系：多个成员关联到同一个 `user_id`

**成员切换机制：**
- 登录后，用户可以在前端选择"当前操作身份"（选择家庭成员）
- 当前成员 ID 存储在：
  1. **Zustand Store**（运行时状态）
  2. **LocalStorage**（持久化，页面刷新后保持）
- 所有 API 请求需要在请求头或参数中传递 `current_member_id`
- 后端通过 `auth.uid()` 验证用户已登录，通过 `current_member_id` 识别操作者身份

**权限控制逻辑：**
```
1. 用户登录 → 获得 Supabase session (auth.uid())
2. 前端选择当前成员 → 存储 current_member_id
3. API 调用 → 携带 current_member_id
4. RLS 策略验证：
   - auth.uid() = 该数据所属家庭的 user_id（验证家庭权限）
   - current_member_id = creator_id 或 assignee_id（验证成员权限）
```

### 门户选择
- 登录后进入应用选择页面
- 显示「物品管理」和「待办管理」两个入口
- 各应用内有独立的导航结构
- 可通过导航返回门户页

### 待办管理核心需求
1. **待办清单管理**：每个成员可创建多个清单（如"工作"、"购物清单"等）
2. **任务指派与协作**：
   - 创建待办时可指定负责人
   - 可选择"是否需要反馈"
   - 需要反馈时的流程：负责人确认（同意/拒绝） → 执行 → 创建人验收（通过/驳回）
   - 不需要反馈时：直接执行 → 完成
3. **状态通知**：创建人收到「已同意/已拒绝/已完成/已驳回」的提醒
4. **时间轴视图**：竖向展示按截止日期分组的待办（逾期、今天、明天、本周等）
5. **丰富字段**：标题、描述、负责人、开始/截止日期、优先级、标签、重复周期、提醒时间
6. **重复待办**：完成后自动生成下一个周期的实例
7. **浏览器推送通知**：使用 Web Push API 实现即时提醒

## 技术方案

### 架构选择：模块化单体应用

**选择理由：**
- 代码隔离度高，通过 `modules/` 目录结构实现模块化
- 充分复用现有技术栈（React、Supabase、TanStack Query、Zustand）
- Supabase 原生支持实时订阅、Push 通知、Row Level Security
- 开发效率高，无需额外配置
- 便于后期维护和运维

**替代方案（未采用）：**
- Monorepo 多应用：过度设计，部署复杂
- 微前端：复杂度极高，不适合当前场景

### 目录结构

```
web/src/
├── modules/
│   ├── portal/              # 门户模块
│   │   ├── pages/
│   │   │   ├── PortalPage.tsx
│   │   │   └── SettingsPage.tsx
│   │   └── components/
│   │       ├── AppCard.tsx
│   │       └── MemberSwitcher.tsx
│   │
│   ├── items/               # 物品管理模块（现有代码迁移）
│   │   ├── pages/
│   │   ├── components/
│   │   └── hooks/
│   │
│   └── todos/               # 待办管理模块（新增）
│       ├── pages/
│       │   ├── TodosPage.tsx
│       │   ├── TodoDetailPage.tsx
│       │   ├── TodoFormPage.tsx
│       │   └── ListManagePage.tsx
│       ├── components/
│       │   ├── TodoCard.tsx
│       │   ├── TimelineView.tsx
│       │   ├── StatusBadge.tsx
│       │   └── NotificationCenter.tsx
│       ├── hooks/
│       │   ├── use-todos.ts
│       │   ├── use-notifications.ts
│       │   └── use-push-subscription.ts
│       ├── services/
│       │   ├── todo-service.ts
│       │   └── notification-service.ts
│       └── types/
│           └── todo-types.ts
│
├── shared/                  # 共享代码
│   ├── components/
│   ├── hooks/
│   │   ├── use-auth.tsx
│   │   ├── use-current-member.ts
│   │   └── use-realtime.ts
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── push-notification.ts
│   │   └── date-utils.ts
│   └── types/
│
├── App.tsx
├── main.tsx
└── service-worker.ts
```

## 路由设计

```
/login              → 登录页
/portal             → 门户选择页（登录后默认）
/settings           → 设置（家庭成员管理）

/items/*            → 物品管理应用
  /items            → 物品列表
  /items/search     → 搜索
  /items/manage     → 区域管理
  /items/:id        → 详情

/todos/*            → 待办管理应用
  /todos            → 我的待办列表
  /todos/timeline   → 时间轴视图
  /todos/assigned   → 分配给我的
  /todos/created    → 我创建的
  /todos/:id        → 待办详情
```

## 数据模型设计

### 表命名规范

**命名约定：**
- **物品管理模块**（保持不变）：`areas`, `categories`, `units`, `items`
  - 现有表不重命名，避免破坏性变更
- **待办管理模块**（`todo_` 前缀）：`todo_family_members`, `todo_lists`, `todo_items`, `todo_tags`, `todo_item_tags`, `todo_notifications`, `todo_status_logs`, `todo_reminders`, `todo_push_subscriptions`
  - 新功能使用前缀，清晰隔离

**设计决策：**
- 接受两套命名规范共存（物品无前缀、待办有前缀）
- 优势：向后兼容，现有功能无需迁移
- 未来如需统一，可在数据库迁移时重命名物品表

### 核心表结构

#### todo_family_members（家庭成员）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| user_id | uuid | 关联 auth.users.id（Supabase 认证用户） |
| name | string | 成员名称 |
| avatar_url | string? | 头像URL |
| color | string | 主题色（用于 UI 区分） |
| sort_order | int | 排序 |
| created_at | timestamp | 创建时间 |

**说明：**
- `user_id` 字段关联到 Supabase 认证系统，同一个 `user_id` 可以有多个成员
- 所有家庭成员共享同一个 `user_id`（家庭账号）
- 前端通过 `current_member_id` 区分操作者身份

#### todo_lists（待办清单）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| name | string | 清单名称 |
| owner_id | uuid | 所属成员ID |
| color | string? | 清单颜色 |
| sort_order | int | 排序 |
| created_at | timestamp | 创建时间 |

#### todo_items（待办事项）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| title | string | 标题 |
| description | text? | 描述 |
| list_id | uuid | 所属清单ID |
| creator_id | uuid | 创建人ID |
| assignee_id | uuid | 负责人ID |
| priority | enum | 优先级：high/medium/low |
| start_date | date? | 开始日期 |
| due_date | date? | 截止日期 |
| require_feedback | boolean | 是否需要反馈 |
| status | enum | 状态（见状态枚举） |
| recurrence_rule | jsonb? | 重复规则 |
| parent_recurrence_id | uuid? | 父重复待办ID |
| completed_at | timestamp? | 完成时间 |
| created_at | timestamp | 创建时间 |
| updated_at | timestamp | 更新时间 |

#### todo_tags（标签）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| name | string | 标签名 |
| color | string | 颜色 |
| created_at | timestamp | 创建时间 |

#### todo_item_tags（待办-标签关联）
| 字段 | 类型 | 说明 |
|-----|------|------|
| todo_item_id | uuid | 待办ID |
| tag_id | uuid | 标签ID |

#### todo_notifications（通知）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| recipient_id | uuid | 接收人ID |
| type | enum | 通知类型 |
| todo_item_id | uuid | 相关待办ID |
| message | string | 通知内容 |
| is_read | boolean | 是否已读 |
| created_at | timestamp | 创建时间 |

#### todo_status_logs（状态变更日志）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| todo_item_id | uuid | 待办ID |
| from_status | enum | 原状态 |
| to_status | enum | 新状态 |
| operator_id | uuid | 操作人ID |
| reason | text? | 原因 |
| created_at | timestamp | 创建时间 |

#### todo_reminders（提醒记录）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| todo_item_id | uuid | 待办ID |
| member_id | uuid | 成员ID |
| remind_at | timestamp | 提醒时间 |
| is_sent | boolean | 是否已发送 |
| created_at | timestamp | 创建时间 |

#### todo_push_subscriptions（推送订阅）
| 字段 | 类型 | 说明 |
|-----|------|------|
| id | uuid | 主键 |
| member_id | uuid | 成员ID |
| endpoint | text | 推送端点 |
| keys | jsonb | 加密密钥 |
| created_at | timestamp | 创建时间 |

### 状态枚举与流转

```typescript
enum TodoStatus {
  DRAFT = 'draft',                    // 草稿
  PENDING_ACCEPT = 'pending_accept',  // 待确认（需反馈）
  ACCEPTED = 'accepted',              // 已同意
  REJECTED = 'rejected',              // 已拒绝
  IN_PROGRESS = 'in_progress',        // 进行中
  PENDING_REVIEW = 'pending_review',  // 待验收（需反馈）
  COMPLETED = 'completed',            // 已完成
  RETURNED = 'returned',              // 已驳回
}
```

**状态流转：**

需要反馈：
```
DRAFT → PENDING_ACCEPT → ACCEPTED → IN_PROGRESS → PENDING_REVIEW → COMPLETED
                       ↘ REJECTED                                  ↘ RETURNED → IN_PROGRESS
```

不需反馈：
```
DRAFT → IN_PROGRESS → COMPLETED
```

### 重复规则数据结构

```typescript
interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval: number              // 间隔（如每2天）
  endType: 'never' | 'date' | 'count'
  endDate?: string             // 结束日期
  endCount?: number            // 重复次数上限
  generatedCount?: number      // 已生成次数（用于跟踪）
}
```

**重复待办生命周期：**
1. **创建母待办**：`recurrence_rule` 存储规则，`parent_recurrence_id` 为 null
2. **自动生成子待办**：完成当前实例时触发
   - 检查是否达到 `endCount` 或超过 `endDate`
   - 如果未达到限制，创建下一个实例
   - 更新母待办的 `generatedCount`
3. **编辑母待办**：
   - 提供选项："仅此项"或"此项及后续所有"
   - "此项及后续所有"：更新母待办的 `recurrence_rule`，未来实例按新规则生成
   - "仅此项"：只修改当前实例，不影响规则
4. **删除母待办**：
   - 提供选项："仅此项"或"删除所有重复实例"
   - "删除所有重复实例"：级联删除所有 `parent_recurrence_id` 指向母待办的子实例

## 功能模块设计

### 1. 门户模块（Portal）

#### PortalPage（门户选择页）
**UI元素：**
- 顶部导航栏：
  - 当前成员切换下拉菜单
  - 通知中心图标（红点提示未读数）
  - 设置按钮
- 应用入口卡片：
  - 物品管理卡片：显示物品总数、即将过期数
  - 待办管理卡片：显示待办中数量、今日到期数

#### SettingsPage（设置页）
**功能：**
- 家庭成员管理（增删改查）
- 通知设置（启用/禁用浏览器推送）
- 退出登录

### 2. 待办管理模块（Todos）

#### TodosPage（待办列表页）

**Tab切换：**
- 我的清单
- 分配给我
- 我创建的

**视图切换：**
- 列表视图
- 时间轴视图

**列表视图：**
- 按清单分组展示待办
- 清单可折叠/展开
- 待办卡片显示：
  - 复选框（快速完成）
  - 标题
  - 优先级标识、标签、负责人头像
  - 截止日期（逾期红色显示）
  - 状态徽章
- 左滑操作：编辑/删除
- 底部 FAB 按钮：添加待办

**时间轴视图：**
- 竖向时间轴，按时间段分组：
  - 逾期（红色）
  - 今天
  - 明天
  - 本周
  - 下周
  - 更晚
  - 无截止日期
- 支持拖拽调整截止日期

#### TodoDetailPage（待办详情页）

**信息展示：**
- 标题、状态徽章
- 描述（可展开/折叠）
- 基本信息：创建人、负责人、优先级、清单、标签
- 时间信息：开始日期、截止日期、创建/完成时间、重复规则
- 是否需要反馈

**操作按钮（根据状态和角色）：**
| 角色/状态 | 可用操作 |
|----------|---------|
| 负责人 + PENDING_ACCEPT | 同意 / 拒绝（需填写理由） |
| 负责人 + ACCEPTED/IN_PROGRESS | 标记完成 |
| 负责人 + RETURNED | 标记完成（重新提交） |
| 创建人 + PENDING_REVIEW | 验收通过 / 驳回（需填写理由） |
| 创建人 + 任何状态 | 编辑 / 删除 |

**状态变更历史：**
- 时间线展示所有状态变更
- 显示：时间、操作人、状态变更、理由

#### TodoFormPage（待办表单页）

**表单字段：**

**基本信息区：**
- 标题（必填）
- 描述（可选）
- 所属清单（下拉选择，可快速新建）

**分配信息区：**
- 负责人（必选）
- 是否需要反馈（开关）

**时间规划区：**
- 开始日期（可选）
- 截止日期（必填）
- 重复规则：不重复/每天/每周/每月/自定义
  - 自定义：间隔 + 单位 + 结束条件
- 提醒时间：截止前1小时/1天/1周，或自定义

**其他信息区：**
- 优先级（高/中/低）
- 标签（多选，可快速新建）

**表单验证：**
- 标题不能为空
- 截止日期不能早于开始日期
- 需要反馈时必须指定负责人

#### ListManagePage（清单管理页）
- 列表展示所有清单
- 显示清单名称、颜色、待办数量
- 支持拖拽排序
- 新建/编辑/删除清单
- 删除清单时：删除所有待办/移到其他清单

#### NotificationCenter（通知中心）

**显示位置：**
- 顶部导航栏右侧通知图标
- 点击展开通知列表（侧边抽屉或弹窗）

**通知类型：**
- ASSIGNED: xxx 分配了待办给你
- AGREED: xxx 同意了待办
- REJECTED: xxx 拒绝了待办：理由
- COMPLETED: xxx 完成了待办
- VERIFIED: xxx 验收通过了待办
- RETURNED: xxx 驳回了待办：理由
- REMINDER: 待办即将到期

**功能：**
- 未读通知高亮显示
- 点击跳转到对应待办
- 标记已读/全部已读
- 删除通知

## 技术实现方案

### 1. 重复待办实现

**方案：Database Trigger + Edge Function**

**实现逻辑：**
1. 创建重复待办时，`recurrence_rule` 存储规则，`parent_recurrence_id` 为 null（母待办）
2. 完成当前实例时触发 Database Trigger
3. Trigger 调用 Edge Function 处理重复逻辑：
   - 读取母待办的 `recurrence_rule`
   - 检查生成条件：
     - 如果 `endType = 'count'`，检查 `generatedCount < endCount`
     - 如果 `endType = 'date'`，检查 `nextDate <= endDate`
     - 如果 `endType = 'never'`，总是生成
   - 计算下一个周期的日期（根据 `frequency` 和 `interval`）
   - 创建新实例：
     - 复制母待办的所有字段（标题、描述、负责人等）
     - 设置新的开始日期和截止日期
     - `parent_recurrence_id` 指向母待办
     - `status` 重置为 `DRAFT` 或 `IN_PROGRESS`（根据是否需要反馈）
   - 更新母待办的 `generatedCount += 1`
4. 如果达到生成上限，停止生成

**编辑和删除逻辑：**
- **编辑待办**：弹窗选择"仅此项"或"此项及后续所有"
  - "仅此项"：只修改当前实例
  - "此项及后续所有"：更新母待办的 `recurrence_rule`，未来实例按新规则生成
- **删除待办**：弹窗选择"仅此项"或"删除所有重复实例"
  - "仅此项"：只删除当前实例
  - "删除所有重复实例"：删除母待办和所有子实例（通过 `parent_recurrence_id` 关联）

**数据库触发器示例：**
```sql
CREATE TRIGGER on_todo_completed
AFTER UPDATE ON todo_items
FOR EACH ROW
WHEN (NEW.status = 'completed' AND OLD.status != 'completed' AND NEW.recurrence_rule IS NOT NULL)
EXECUTE FUNCTION handle_todo_recurrence();
```

### 2. 浏览器推送通知

**技术栈：**
- Web Push API
- Supabase Edge Functions
- Service Worker

**实现流程：**
1. 用户端请求通知权限并订阅推送
2. 保存订阅信息到 `todo_push_subscriptions` 表
3. 创建通知时触发 Database Trigger
4. Database Trigger 调用 Edge Function
5. Edge Function 使用 `web-push` 库发送推送
6. Service Worker 接收推送并显示通知
7. 点击通知跳转到对应待办

**参考代码：**
```typescript
// 用户端订阅
const permission = await Notification.requestPermission()
if (permission === 'granted') {
  const registration = await navigator.serviceWorker.register('/sw.js')
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: VAPID_PUBLIC_KEY
  })
  await savePushSubscription(memberId, subscription)
}

// Service Worker
self.addEventListener('push', (event) => {
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      data: data.data
    })
  )
})
```

### 3. 实时更新

**方案：**
- 使用 Supabase Realtime 订阅数据库变更
- 当待办状态变化时自动更新 UI

**参考代码：**
```typescript
const subscription = supabase
  .channel('todos')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'todo_items',
    filter: `assignee_id=eq.${currentMemberId}`
  }, (payload) => {
    queryClient.invalidateQueries(['todos'])
  })
  .subscribe()
```

### 4. 提醒定时任务

**方案：**
- 创建待办时生成提醒记录到 `todo_reminders` 表
- 使用 Supabase Cron Job（每5分钟执行）
- 查询到期未发送的提醒
- 创建通知并发送推送
- 标记提醒已发送

### 5. 权限控制

**方案：Row Level Security (RLS)**

**核心原则：**
1. 验证用户属于该家庭（通过 `auth.uid()` 匹配 `user_id`）
2. 验证操作者是相关成员（通过 `current_member_id` 传递）

**实现方式：**

**方式一：应用层控制（推荐）**
- RLS 只验证家庭级别权限（`user_id = auth.uid()`）
- 成员级别权限在应用层代码中验证
- 前端传递 `current_member_id`，后端查询时过滤数据

```typescript
// 查询待办时过滤
const { data } = await supabase
  .from('todo_items')
  .select('*')
  .or(`creator_id.eq.${currentMemberId},assignee_id.eq.${currentMemberId}`)

// RLS 策略
CREATE POLICY "Family members can view their todos"
ON todo_items FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM todo_family_members
    WHERE todo_family_members.id = todo_items.creator_id
    AND todo_family_members.user_id = auth.uid()
  )
);
```

**方式二：使用 Postgres 函数（更严格）**
- 创建函数获取当前成员上下文
- 使用会话变量存储 `current_member_id`
- RLS 策略调用函数验证

```sql
-- 创建函数
CREATE OR REPLACE FUNCTION get_current_member_id()
RETURNS uuid AS $$
  SELECT current_setting('app.current_member_id', true)::uuid;
$$ LANGUAGE sql STABLE;

-- RLS 策略
CREATE POLICY "Members can view assigned or created todos"
ON todo_items FOR SELECT
USING (
  (creator_id = get_current_member_id() OR assignee_id = get_current_member_id())
  AND EXISTS (
    SELECT 1 FROM todo_family_members
    WHERE id = get_current_member_id()
    AND user_id = auth.uid()
  )
);
```

**推荐使用方式一**，原因：
- 实现简单，易于调试
- 应用层有完整的上下文控制
- Supabase JS SDK 对会话变量支持有限

**其他 RLS 策略：**
```sql
-- 创建人可以更新待办
CREATE POLICY "Creators can update todos"
ON todo_items FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM todo_family_members
    WHERE id = todo_items.creator_id
    AND user_id = auth.uid()
  )
);

-- 家庭成员可以创建待办
CREATE POLICY "Family members can create todos"
ON todo_items FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM todo_family_members
    WHERE id = todo_items.creator_id
    AND user_id = auth.uid()
  )
);
```

## 开发优先级

### Phase 1: 基础架构（MVP）
1. 代码重构：将现有代码迁移到 `modules/items/`
2. 门户页面：PortalPage + 应用卡片
3. 家庭成员管理：SettingsPage + CRUD
4. 数据模型：创建所有表结构

### Phase 2: 待办核心功能
1. 待办 CRUD：TodoFormPage + TodoDetailPage
2. 清单管理：ListManagePage
3. 列表视图：TodosPage（列表模式）
4. 状态流转：同意/拒绝/完成/验收逻辑

### Phase 3: 增强功能
1. 时间轴视图：TimelineView
2. 通知中心：NotificationCenter + 应用内通知
3. 标签功能：标签管理 + 筛选
4. 搜索功能：待办搜索

### Phase 4: 高级功能
1. 重复待办：RecurrenceRule + 自动生成
2. 浏览器推送：Web Push + Service Worker
3. 提醒功能：Cron Job + 定时提醒
4. 实时更新：Supabase Realtime

### Phase 5: 优化完善
1. UI 优化：动画、过渡效果
2. 性能优化：分页、虚拟滚动
3. 错误处理：异常捕获、用户提示
4. 测试覆盖：单元测试、集成测试

## 技术依赖

### 现有依赖（复用）
- React 19.2.7
- TypeScript 6.0.2
- Vite 8.1.0
- Supabase JS 2.108.2
- TanStack React Query 5.101.1
- Zustand 5.0.14
- React Router DOM 7.18.0
- Lucide React 1.21.0
- Tailwind CSS 4.3.1

### 新增依赖
- `web-push`: 用于服务端推送通知
- `date-fns`: 日期处理（如果需要更强大的日期操作）

## 风险与限制

### 技术限制
- Web Push API 需要 HTTPS 和用户授权
- Service Worker 需要浏览器支持
- 重复待办依赖 Supabase 触发器

### 数据安全
- 使用 Supabase RLS 控制权限
- 通知内容不包含敏感信息
- 推送订阅信息加密存储

### 性能考虑
- 大量待办时需要分页加载
- 时间轴视图使用虚拟滚动
- 推送通知需要控制频率

## 总结

本设计采用**模块化单体应用**架构，在现有物品管理应用基础上扩展门户选择和待办管理功能。核心特性：

✅ 模块化代码结构，便于维护和运维
✅ 家庭成员协作的待办管理
✅ 完整的任务指派与反馈流程
✅ 时间轴视图，直观展示任务分布
✅ 重复待办自动生成
✅ 浏览器推送通知
✅ 实时状态同步
✅ 充分复用现有技术栈
