# 待办表单预设与布局 UX 设计

**日期**: 2026-06-30  
**状态**: 已确认

## 背景

待办详情/新建表单需在日期时间、重复与提醒预设、字段布局、清单颜色等方面统一体验：支持更丰富且可管理的重复模式，禁止表单内临时自定义，表单更紧凑，清单选择更清晰。

## 已确认决策

| 项 | 决策 |
|----|------|
| 开始日期 label | 「开始」→「开始日期」 |
| 时间选择 | 非全天时 BottomSheet 内日历 + 时间（[DayPicker Timepicker](https://daypicker.dev/guides/timepicker)）；去掉行外 `type="time"` |
| 全天逻辑 | 不变：勾选全天仅选日期，截止必填；未勾选全天开始/截止均可不填，填了支持日期+时间 |
| 重复模式范围 | 内置 + 自定义：每 N 天、工作日（周一至周五）、指定星期几（多选）；**不做「每周末」独立预设**（用指定星期几勾选周六+日） |
| 预设管理 | 重复、提醒均在 `/todos/manage` 管理；可排序、可停用（仅管理页操作） |
| 停用展示 | 管理列表中停用项**红色字体**；不出现在表单选择 Sheet |
| 表单选择 | 按自定义 `sortOrder` 加载**已启用**预设；**禁止**表单内临时自定义（移除提醒「自定义时间…」与 `CustomReminderSheet`） |
| 负责人/优先级 | 同一行各 50%，负责人在左、优先级在右 |
| 标签位置 | 表单最底部：… → 重复 → 提醒 → **标签** |
| 紧凑程度 | 轻度：`py-2.5→py-2`、描述 `rows` 3→2、负责人/优先级合并一行 |
| 清单颜色 | 预设色板（8–12 色）+ 管理页自定义 hex；`todo_lists.color` 持久化 |
| 清单选择 Sheet | 左侧：色点 + 清单名；共享清单右侧显示「共享」徽章（去掉 `name · 共享` 后缀） |

## 1. 日期时间组件（`DateField`）

### 行为

- `showTime={true}` 时，BottomSheet 内 `DatePickerCalendar` 下方增加时间选择区（`input type="time"` 或 DayPicker 推荐写法），与日期同屏确认。
- 去掉字段行右侧独立 `type="time"` input。
- 选日期时若 `showTime`：单次 `onChange` 写入 `hasTime: true` 且 `iso = composeLocalIso(date, '09:00')`（无行外 time input）。
- 展示文案沿用 `formatDateTimeDisplay`。

### 影响范围

- `web/src/shared/components/DateField.tsx`
- 待办表单 `TodoFormPage`（label 改为「开始日期」）
- 物品等共用 `DateField` 的调用方自动受益

## 2. 重复规则数据模型

### TypeScript（`RecurrenceRule` 扩展）

```ts
export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval: number
  /** 1=周一 … 7=周日；有值时按最近匹配日推进 */
  weekdays?: number[]
  endType: 'never' | 'date' | 'count'
  endDate?: string
  endCount?: number
  generatedCount?: number
}
```

### 语义

| 预设类型 | `frequency` | `interval` | `weekdays` |
|----------|-------------|------------|------------|
| 每天 | `daily` | 1 | — |
| 每周 | `weekly` | 1 | —（锚定当前 due 的星期） |
| 每月 | `monthly` | 1 | — |
| 每 N 天 | `custom` | N | — |
| 工作日 | `custom` | 1 | `[1,2,3,4,5]` |
| 指定星期几 | `custom` | 1 | 用户多选，如 `[6,7]` |

### DB trigger（`handle_todo_recurrence`）

新增 migration 更新 `public.handle_todo_recurrence()`：

1. 若 `weekdays` 非空：从 `next_due` 次日开始找最近匹配星期（1=周一 … 7=周日，ISO 周）。
2. 否则沿用现有 `daily` / `weekly` / `monthly` / `custom`（按天 interval）分支。
3. 生成下一实例时同步 datetime 字段（算法见下）。
4. `endType` / `endDate` / `endCount` 逻辑不变。

### 下一实例日期时间算法

```
base_due := COALESCE(NEW.due_at::date, NEW.due_date, CURRENT_DATE)
next_due_date := 按 frequency/weekdays 计算（见上）

若 NEW.is_all_day = true：
  next_start_date := next_due_date - (due_date - start_date) 当两端皆有
  INSERT start_date, due_date；start_at/due_at 为对应日 00:00 本地

若 NEW.is_all_day = false：
  保留 due 的时分秒（来自 due_at 或 due_date+time）
  next_due_at := next_due_date + 原有时分秒
  next_start_at := next_due_at - (原 due_at - start_at) 当 start_at 存在
  INSERT is_all_day=false, start_at, due_at；同步 start_date/due_date 为日期部分
```

纯函数 `computeNextRecurrenceDue(rule, fromDate)` 与 trigger 共用，供单测。

## 3. 重复预设（本地持久化）

### 新文件 `recurrence-presets.ts`

```ts
export type RecurrencePreset = {
  id: string
  name: string
  builtin?: boolean
  rule: Omit<RecurrenceRule, 'endType' | 'endDate' | 'endCount' | 'generatedCount'> | null
  // rule === null 表示「不重复」
}
```

排序与停用**仅**由 store 数组维护（与提醒对称），`RecurrencePreset` 本身不含 `sortOrder` / `disabled`。

### 内置预设（初始顺序）

| id | name | rule |
|----|------|------|
| `builtin:none` | 不重复 | `null` |
| `builtin:daily` | 每天 | `{ frequency: 'daily', interval: 1 }` |
| `builtin:weekly` | 每周 | `{ frequency: 'weekly', interval: 1 }` |
| `builtin:monthly` | 每月 | `{ frequency: 'monthly', interval: 1 }` |
| `builtin:weekdays` | 工作日 | `{ frequency: 'custom', interval: 1, weekdays: [1,2,3,4,5] }` |

自定义预设由用户在管理页创建（每 N 天 / 指定星期几多选）。

### Store（`todo-ui-store`）

扩展 zustand persist：

```ts
recurrencePresets: RecurrencePreset[]  // 仅自定义项；内置由代码合并
recurrencePresetOrder: string[]        // 全部 preset id 的排序（含 builtin）
recurrencePresetDisabled: string[]     // 停用的 preset id

// 提醒侧对称扩展：
reminderPresetOrder: string[]
reminderPresetDisabled: string[]
```

合并函数 `mergeRecurrencePresets()` / `getEnabledRecurrenceOptions()`：

1. 合并内置 + `recurrencePresets`（自定义）
2. 按 `recurrencePresetOrder` 排序（未出现在 order 中的 id 追加在末尾，保持内置默认相对顺序）
3. 过滤 `recurrencePresetDisabled` 中的 id

提醒预设沿用现有 `reminderPresets` 数组存自定义项，新增 `reminderPresetOrder` / `reminderPresetDisabled` 与相同合并逻辑。

### 表单绑定

- 表单 state：`selectedRecurrencePresetId: string`（默认 `builtin:none`）。
- 提交时：`preset.rule` → `RecurrenceRule`（补 `endType: 'never'`）；`null` → `recurrenceRule: null`。
- **编辑提交**：若已有 `recurrenceRule`，保留其 `generatedCount`（及 `endType`/`endDate`/`endCount` 若将来启用），仅更新 frequency/interval/weekdays。
- **编辑回填**：`matchRecurrencePreset(rule)` — 对 `{ frequency, interval, weekdays }` 做**精确匹配**（忽略 `endType`/`generatedCount`）；匹配成功则设 `selectedRecurrencePresetId`。
- **无匹配**：`selectedRecurrencePresetId` 保持 `builtin:none`，重复行 `PickerButton` 显示只读摘要（如「每 3 天」「周一、三、五」），点击 Sheet 仍只列已启用预设；保存时**不覆盖**原 `recurrenceRule`（除非用户显式选了新预设）。

### 预设匹配（纯函数）

```ts
function recurrenceRuleSignature(rule: RecurrenceRule): string {
  const wd = [...(rule.weekdays ?? [])].sort((a, b) => a - b).join(',')
  return `${rule.frequency}|${rule.interval}|${wd}`
}
```

## 4. 管理页 UI

### Tab 结构

`/todos/manage` segments 扩展为：

| Tab | 内容 |
|-----|------|
| 清单 | 现有 + **颜色编辑**（色板 + 自定义 hex） |
| 成员 | 不变 |
| 重复 | **新增** `RecurrenceManagePanel` |
| 提醒 | 现有 `ReminderManagePanel` 增强 |

### `RecurrenceManagePanel`

- 列表：全部预设（内置 + 自定义），按 `recurrencePresetOrder` 显示。
- 停用项：`text-status-expired` 或等效红色样式 + 「已停用」标识。
- 操作：拖拽或上移/下移排序；左滑或按钮**停用/启用**（内置不可删除，可停用）；自定义可删除。
- 新建/编辑对话框：名称、类型（每 N 天 / 指定星期几）、参数。
- 底部说明：停用后不会出现在新建待办的选择列表。

### `ReminderManagePanel` 增强

- 与重复对称：合并内置 + 自定义列表，支持排序、停用（红色标识）。
- 内置预设不可删除，可停用。
- 移除「仅自定义」分区标题的误导文案，改为统一列表。

### 表单 OptionSheet

- 重复 Sheet：`manageHref="/todos/manage?tab=recurrence"`；**无** `onAddNew`。
- 提醒 Sheet：`manageHref="/todos/manage?tab=reminders"`；**移除** `addLabel` / `onAddNew` / `CustomReminderSheet`。
- 删除 `ReminderSelection.type === 'datetime'` 路径；已有 `datetime` 类型待办编辑时 fallback 为「不提醒」（`{ type: 'none' }`），不弹 toast。

### 协商 snapshot（`negotiation-snapshot.ts`）

- `NegotiationFormState.recurrence` 改为 `selectedRecurrencePresetId: string`（替代 `'none'|'daily'|...` 枚举）。
- `NegotiationSnapshot.recurrenceRule` 继续存完整 `RecurrenceRule | null`（已支持 `custom` / `weekdays`）。
- `formStateToSnapshot` / `snapshotToFormState`：通过 preset id ↔ rule 互转；`getNegotiationChangedFields` 比较 `recurrenceRule` JSON。
- 无匹配预设的只读摘要场景：snapshot 仍带完整 rule，表单展示摘要但不改 id，协商 diff 正常高亮 `recurrenceRule`。

## 5. 表单布局（`TodoFormPage`）

### 字段顺序

1. 标题 *
2. 描述（`rows={2}`）
3. 清单 *
4. **负责人 * | 优先级**（`grid grid-cols-2 gap-2` 单行）
5. 全天 → 开始日期 → 截止（日期）
6. 重复
7. 提醒
8. 标签（勾选 + 新建标签）

### 样式

- `FormRow` 默认 `py-2.5` → `py-2`（或本页覆盖）。
- 负责人/优先级各用紧凑 `PickerButton`，label 保留在各自半宽列内。

### 清单选择 Sheet

在 `TodoFormPage` 内扩展本地 `OptionSheet`（清单专用 props：`color`、`badge`）；暂不抽共享组件，除非第二处复用出现。

```ts
{
  id: string
  name: string
  color?: string | null
  badge?: string  // 共享清单传 '共享'
}
```

行布局：`[色点] [名称 flex-1]` … `[badge]`。

`listOptionLabel()` 仅返回 `list.name`；共享标识由 Sheet 渲染 `badge`。

## 6. 清单颜色

### 色板

常量 `TODO_LIST_COLOR_PALETTE`（固定 10 色，与标签色系协调）。

### 新建/编辑清单

- `TodoListManage` 新建/重命名对话框增加色板选择；「自定义」打开 hex 输入（校验 `#RRGGBB`）。
- 默认色：色板第一项或现有 `#6366f1`。
- `useUpdateTodoList` / `useCreateTodoList` 传 `color`。

### 展示

- 管理列表、表单选择 Sheet、时间轴分组标题（若有）使用 `list.color`。

## 7. 实现顺序

1. `RecurrenceRule` 类型 + `recurrence-presets.ts` + store 扩展
2. `RecurrenceManagePanel` + `TodoManagePage` 新 Tab
3. `ReminderManagePanel` 排序/停用改造 + store
4. 表单：重复/提醒 Sheet 改造，移除临时自定义
5. `DateField` 集成时间选择 + label 修改
6. 表单布局重组（负责人/优先级、标签置底、紧凑样式）
7. 清单颜色 UI + OptionSheet 共享徽章
8. DB migration + `handle_todo_recurrence` weekdays 逻辑
9. 协商 snapshot / 编辑回填 / 重复系列更新联调
10. 测试

## 8. 测试

| 文件 | 覆盖 |
|------|------|
| `recurrence-presets.test.ts` | 合并、排序、停用过滤、rule 解析 |
| `reminder-presets.test.ts` | 排序、停用、移除 datetime selection |
| `recurrence-next-date.test.ts` | weekdays 下一日计算（纯函数，与 trigger 共用） |
| 现有 `negotiation-ui` / `todo-list-placement` | 保持通过 |

## 9. 非目标（YAGNI）

- 重复结束日期/次数 UI（`endType` 暂固定 `never`，与现网一致）
- 「每周末」独立预设
- 提醒/重复预设云端同步（继续 zustand localStorage，成员本机）
- 表单内新建重复/提醒预设
- 重度折叠分组

## 依赖

- 与 `2026-06-30-timeline-datetime-ux-design.md` 共用 `DateField` / `start_at` / `due_at` 模型
- `todo_lists.color` 列已存在，无需新表
