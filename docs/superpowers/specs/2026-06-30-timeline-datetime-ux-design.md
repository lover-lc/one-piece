# 时间轴与日期时间 UX 增强设计

**日期**: 2026-06-30  
**状态**: 已确认

## 背景

时间轴视图、待办/物品日期选择需要统一体验：周一为首日、支持全天与具体时间、时间范围筛选重构、甘特全屏与表头布局优化。

## 已确认决策

| 项 | 决策 |
|----|------|
| 日期选择器 | React DayPicker（`weekStartsOn={1}` + `zh-CN`），时间参考 [DayPicker Timepicker](https://daypicker.dev/guides/timepicker) |
| 适用范围 | 物品管理 + 待办管理共用组件 |
| 全天 | 开始日期上方「全天」复选框 |
| 勾选全天 | 截止日期必填（仅日期）；开始日期可选 |
| 未勾选全天 | 开始、截止均可不填；填了则支持日期+时间 |
| 无日期待办 | 归入「无日期」分组（与时间轴现有逻辑一致） |
| 排序 | 同一天内：非全天且未设具体时间 → 排在有具体时间之前 |
| 时间范围 | 总览 + 跨度共用；总览也按范围过滤 |
| 范围控件 | 携程式一行：开始 — 结束 — 查询；去掉标题与底部「当前…」 |
| 控件顺序 | 范围筛选在上，日/周/月在下 |
| 铺满 | 数据少时图表区域仍撑满 |
| 全屏 | 仅跨度视图；右上角按钮；横屏拖动；点击任意处退出 |
| 周表头 | 两行：`7月` / `第2周`；去掉日期 sublabel |
| 月表头 | 两行：`2026年` / `7月` |

## 1. 数据模型（待办）

新增 migration，扩展 `todo_items`：

```sql
is_all_day   boolean NOT NULL DEFAULT true
start_at     timestamptz   -- 可空
due_at       timestamptz   -- 全天时必填；未全天时可空
```

迁移策略：

- 现有 `start_date` → `start_at`（当天 00:00 本地）
- 现有 `due_date` → `due_at`（当天 00:00 本地），`is_all_day = true`
- 保留 `start_date`/`due_date` 列一段时间作兼容，或由视图/触发器同步；**推荐迁移后读写新字段，旧列 deprecated**

`negotiation_snapshot` JSON 扩展：

```ts
isAllDay: boolean
startAt: string | null   // ISO
dueAt: string | null
```

提醒逻辑：`due_at` + `is_all_day` 计算 `remind_at`。

## 2. 共享 UI 组件

```
shared/components/
  DateTimeField.tsx      — 单日：全天开关 + DayPicker + time input
  DateRangeField.tsx     — 范围：DayPicker mode=range + 查询按钮
```

- `weekStartsOn={1}`，`locale={zhCN}`
- 移动端：底部 Sheet 承载 DayPicker
- 物品项目：替换 `DateInputRow` 中的原生 `type="date"`
- 待办表单：替换开始/截止日期行；全天 checkbox 在开始日期上方

## 3. 时间轴工具栏重构

**TodosPage 时间轴区域布局**（自上而下）：

1. `TodoFilterBar`
2. `TimelineViewModeToggle`（总览 | 跨度）
3. `TimelineRangeField`（开始 — 结束 — 查询）← 替代 `GanttToolbar`
4. `TimelineGranularityToggle`（日 | 周 | 月）
5. 图表区（`flex-1 min-h-0`）

`TimelineOverview` 增加 `range` prop，过滤逻辑与 `GanttChart` 共用 `filterTodosByRangeFilter`。

去掉：

- 「时间范围」标题
- 底部「当前 xxx」文案

## 4. 全屏（仅跨度）

- `GanttChart` 右上角 `Maximize` 按钮
- 全屏层：`position: fixed; inset: 0; z-50`
- 进入时尝试 `screen.orientation.lock('landscape')`（不支持则忽略）
- 保留横向滚动拖动
- 点击遮罩/空白退出，解锁 orientation

## 5. 表头与总览标签

### 甘特 `formatColumnHeader`

| 粒度 | 第一行 | 第二行 |
|------|--------|--------|
| day | 保持现有 | — |
| week | `7月`（锚定周所在月） | `第2周` |
| month | `2026年` | `7月` |

- 周列宽 `GANTT_WEEK_COLUMN_WIDTH` 增至 ~96px 防换行
- 去掉周视图 `sublabel` 日期区间

### 总览 `formatWeekSpineMeta` / `formatMonthSpineMeta`

与甘特表头文案对齐（双行 spine）。

## 6. 排序规则

`compareTodos` / 甘特行排序扩展：

1. 完成状态
2. 日期（`due_at` 日期部分或 `due_at` ISO）
3. **同日**：`!isAllDay && !hasSpecificTime` 优先于有具体时间
4. 有具体时间按 `due_at` 时刻升序
5. 标题

`hasSpecificTime`：`!isAllDay && due_at` 的时间部分非 00:00（或显式 `due_time_set` 标记，实现时择一）。

## 7. 实现顺序

1. 安装 `@daypicker/react`、`date-fns`；共享 `DateTimeField` / `DateRangeField`
2. DB migration + 类型/服务层/协商 snapshot
3. 待办表单全天与时间
4. 物品日期字段替换
5. 时间轴工具栏 + 总览范围过滤
6. 铺满布局 + 全屏
7. 周/月表头 + 总览 spine
8. 排序规则 + 测试

## 8. 测试

- `todo-card-status` / `gantt-scale` 现有测试保持通过
- 新增：`todo-datetime-sort.test.ts`（排序）
- 新增：`formatColumnHeader` 周/月双行标签
- migration 数据迁移单测（可选脚本验证）

## 依赖

- Realtime migration `20260630100000`：`todo_items` 需在 Supabase Dashboard 补跑（见上轮说明）
