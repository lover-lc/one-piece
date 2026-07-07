# 打卡模块 Phase 1 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付打卡模块核心：数据库、双人健康档案、内置食物库、饮食手动记录、三 Tab 双列时间轴、连续日历总览、上海时区日结算与三维度独立计分、checkin 主题与门户入口。

**Architecture:** 新建 `modules/checkin`，Supabase 表前缀 `checkin_`，复用 `todo_family_members`（校验恰好 2 人）。计分与半小时槽位为纯函数 + Vitest。日结算用 Edge Function + pg_cron。UI 复用待办 spine 模式改为双列泳道；日历格用三色 GoalBlock 组件。

**Tech Stack:** React 19, Vite 8, TanStack Query, Supabase, shadcn/ui, Vitest, Tailwind 4

**Spec:** `docs/superpowers/specs/2026-07-06-checkin-module-design.md`

**Out of scope (later phases):** 赌注契约、待办联动、HealthKit/Capacitor、饮食评论

---

## 文件结构

### 新增

```
web/supabase/migrations/20260706160000_checkin.sql
web/supabase/functions/checkin-daily-settlement/index.ts
web/src/modules/checkin/types/checkin-types.ts
web/src/modules/checkin/lib/bmr.ts
web/src/modules/checkin/lib/scoring.ts
web/src/modules/checkin/lib/timeline-slots.ts
web/src/modules/checkin/lib/checkin-dates.ts
web/src/modules/checkin/lib/food-library-seed.ts
web/src/modules/checkin/hooks/use-checkin-profiles.ts
web/src/modules/checkin/hooks/use-checkin-records.ts
web/src/modules/checkin/hooks/use-checkin-snapshots.ts
web/src/modules/checkin/hooks/use-food-library.ts
web/src/modules/checkin/components/layout/CheckinModuleLayout.tsx
web/src/modules/checkin/components/layout/CheckinTabLayout.tsx
web/src/modules/checkin/components/CheckinMemberGate.tsx
web/src/modules/checkin/components/timeline/DualLaneTimeline.tsx
web/src/modules/checkin/components/timeline/RecordChip.tsx
web/src/modules/checkin/components/calendar/GoalBlockCell.tsx
web/src/modules/checkin/components/calendar/ContinuousCalendar.tsx
web/src/modules/checkin/components/records/DietRecordForm.tsx
web/src/modules/checkin/pages/CheckinPage.tsx
web/src/modules/checkin/pages/CheckinOverviewPage.tsx
web/src/modules/checkin/pages/CheckinProfilePage.tsx
web/src/modules/checkin/pages/CheckinPresetsPage.tsx
web/tests/checkin-scoring.test.ts
web/tests/checkin-bmr.test.ts
web/tests/checkin-timeline-slots.test.ts
```

### 修改

```
web/src/App.tsx                          — /checkin 路由
web/src/shared/components/ThemeShell.tsx — checkin 主题
web/src/index.css                        — [data-theme="checkin"] tokens + Barlow fonts
web/src/modules/portal/pages/PortalPage.tsx — 打卡入口卡片
web/package.json                         — @fontsource/barlow @fontsource/barlow-condensed（若尚未安装）
```

---

## Task 1: 数据库迁移

**Files:**
- Create: `web/supabase/migrations/20260706160000_checkin.sql`

- [ ] **Step 1: 编写迁移 SQL**

包含枚举、`checkin_member_profiles`、`checkin_food_library`、`checkin_food_presets`、`checkin_exercise_presets`、`checkin_drink_presets`、`checkin_records`、`checkin_daily_snapshots`、RLS、索引、`updated_at` trigger。

`checkin_records` 核心字段：

```sql
id uuid PK,
user_id uuid NOT NULL REFERENCES auth.users,
member_id uuid NOT NULL REFERENCES todo_family_members,
record_type checkin_record_type NOT NULL,
recorded_at timestamptz NOT NULL,
slot_date date NOT NULL, -- Asia/Shanghai 日历日
payload jsonb NOT NULL,  -- 饮食:{foodId,name,calories,protein,fat,carbs,amount,g} 等
source checkin_record_source DEFAULT 'manual',
healthkit_uuid text,
created_at, updated_at
```

`checkin_daily_snapshots`：

```sql
snapshot_date date,
member_id uuid,
diet_actual_kcal numeric, diet_target_kcal numeric, diet_rate numeric, diet_over_limit boolean,
exercise_actual numeric, exercise_target numeric, exercise_rate numeric,
water_actual_ml numeric, water_target_ml numeric, water_rate numeric,
locked_at timestamptz
UNIQUE(snapshot_date, member_id)
```

`checkin_daily_duels`（每日一行）：

```sql
snapshot_date date PRIMARY KEY,
diet_winner_member_id uuid,
exercise_winner_member_id uuid,
water_winner_member_id uuid,
locked_at timestamptz
```

`checkin_settlement_logs` — job 错误日志

SQL 函数 `checkin_shanghai_today()` + 昨日记录锁定 trigger

- [ ] **Step 2: 本地验证**

```bash
cd web && npx supabase db reset
```

Expected: 迁移无 error

- [ ] **Step 3: Commit**

```bash
git add web/supabase/migrations/20260706160000_checkin.sql
git commit -m "feat(checkin): add database schema for check-in module"
```

---

## Task 2: 计分与工具纯函数 + 测试

**Files:**
- Create: `web/src/modules/checkin/lib/bmr.ts`
- Create: `web/src/modules/checkin/lib/scoring.ts`
- Create: `web/src/modules/checkin/lib/timeline-slots.ts`
- Create: `web/src/modules/checkin/lib/checkin-dates.ts`
- Create: `web/tests/checkin-scoring.test.ts`
- Create: `web/tests/checkin-bmr.test.ts`
- Create: `web/tests/checkin-timeline-slots.test.ts`

- [ ] **Step 1: 写失败测试**

`checkin-scoring.test.ts` 覆盖：
- 饮食：双方未超标 → 高率胜
- 饮食：一方超标
- 饮食：双方超标 → 超得少胜
- 运动/喝水：完成率高者胜
- 平局返回 null

`checkin-timeline-slots.test.ts`：给定记录列表 → 折叠空半小时槽

- [ ] **Step 2: 运行测试确认 FAIL**

```bash
cd web && npm test -- checkin-scoring checkin-bmr checkin-timeline-slots
```

- [ ] **Step 3: 实现纯函数**

`bmr.ts` — Mifflin-St Jeor + 活动系数 → 日热量目标

`scoring.ts` — 导出 `compareDietRates(a,b)`、`compareGoalRates(a,b)`、`resolveDimensionWinner(memberA, memberB, rates)`

`checkin-dates.ts` — `getShanghaiDateString(date?)`、`isRecordEditable(slotDate)`

`timeline-slots.ts` — `buildHalfHourLanes(recordsA, recordsB, date)` → `{slots: [{time, left[], right[]}]}`

- [ ] **Step 4: 测试 PASS**

- [ ] **Step 5: Commit**

---

## Task 3: TypeScript 类型与数据 hooks

**Files:**
- Create: `web/src/modules/checkin/types/checkin-types.ts`
- Create: `web/src/modules/checkin/hooks/use-checkin-profiles.ts`
- Create: `web/src/modules/checkin/hooks/use-checkin-records.ts`
- Create: `web/src/modules/checkin/hooks/use-checkin-snapshots.ts`
- Create: `web/src/modules/checkin/hooks/use-food-library.ts`

- [ ] **Step 1: 定义类型** — `CheckinMemberProfile`, `CheckinRecord`, `DietPayload`, `DailySnapshot`, `FoodLibraryItem`

- [ ] **Step 2: profiles hook** — CRUD `checkin_member_profiles`；无档案时返回 null

- [ ] **Step 3: records hook** — 按 `slot_date` + `record_type` 查询；create/update（校验 `isRecordEditable`）；delete

- [ ] **Step 4: snapshots hook** — 只读查询日历总览范围

- [ ] **Step 5: food library hook** — 系统库 + presets 查询

- [ ] **Step 6: Commit**

---

## Task 4: 食物库种子数据

**Files:**
- Create: `web/src/modules/checkin/lib/food-library-seed.ts`
- Modify: migration 或 seed script 插入系统食物

- [ ] **Step 1:** 准备 ~50 条常见中餐 JSON（名称、kcal/100g、蛋白/脂肪/碳水）

- [ ] **Step 2:** 迁移末尾 `INSERT INTO checkin_food_library ... WHERE user_id IS NULL`

- [ ] **Step 3: Commit**

---

## Task 5: checkin 主题与路由骨架

**Files:**
- Modify: `web/src/shared/components/ThemeShell.tsx`
- Modify: `web/src/index.css`
- Modify: `web/src/App.tsx`
- Create: `web/src/modules/checkin/components/layout/CheckinModuleLayout.tsx`
- Create: `web/src/modules/checkin/components/layout/CheckinTabLayout.tsx`
- Create: `web/src/modules/checkin/components/CheckinMemberGate.tsx`

- [ ] **Step 1:** `AppTheme` 增加 `'checkin'`；`themeFromPathname` 匹配 `/checkin`

- [ ] **Step 2:** `index.css` 添加 `[data-theme="checkin"]` tokens（见 spec）

- [ ] **Step 3:** 路由：

```tsx
<Route path="/checkin" element={<CheckinModuleLayout />}>
  <Route element={<CheckinTabLayout />}>
    <Route index element={<CheckinPage type="diet" />} />
    <Route path="exercise" element={<CheckinPage type="exercise" />} />
    <Route path="water" element={<CheckinPage type="water" />} />
    <Route path="overview" element={<CheckinOverviewPage />} />
    <Route path="profile" element={<CheckinProfilePage />} />
    <Route path="presets" element={<CheckinPresetsPage />} />
  </Route>
</Route>
```

- [ ] **Step 4:** `CheckinMemberGate` — `useFamilyMembers().length === 2` 否则展示说明

- [ ] **Step 5:** Tab 栏：记录 | 总览 | 档案 | 预设（底部 AppTabBar）

- [ ] **Step 6: Commit**

---

## Task 6: 健康档案页

**Files:**
- Create: `web/src/modules/checkin/pages/CheckinProfilePage.tsx`

- [ ] **Step 1:** 表单：身高(cm)、体重(kg)、性别、出生日期、活动系数

- [ ] **Step 2:** 展示自动 BMR + 可编辑目标热量/脂肪/蛋白/碳水/运动/喝水

- [ ] **Step 3:** 两名成员 Tab 切换编辑各自档案

- [ ] **Step 4: Commit**

---

## Task 7: 饮食录入表单

**Files:**
- Create: `web/src/modules/checkin/components/records/DietRecordForm.tsx`
- Create: `web/src/modules/checkin/pages/CheckinPage.tsx`（初始版本）

- [ ] **Step 1:** Sheet 表单：选食物（搜索库+常吃）、份量(g)、时间、餐次

- [ ] **Step 2:** 自动算 kcal/营养素写入 payload

- [ ] **Step 3:** FAB 打开表单；提交调用 `useCreateCheckinRecord`

- [ ] **Step 4:** 运动/喝水 Tab：**简单手动录入**（选预设 + 数值 + 时间）；HealthKit 同步提示留 Phase 2

- [ ] **Step 5: Commit**

---

## Task 8: 双列时间轴

**Files:**
- Create: `web/src/modules/checkin/components/timeline/DualLaneTimeline.tsx`
- Create: `web/src/modules/checkin/components/timeline/RecordChip.tsx`
- Modify: `web/src/modules/checkin/pages/CheckinPage.tsx`

- [ ] **Step 1:** 顶部 DateRangeField / 日期选择器筛选 `slot_date`

- [ ] **Step 2:** `DualLaneTimeline` 消费 `buildHalfHourLanes`；左/右用两成员颜色

- [ ] **Step 3:** 饮食超标单条记录红色左边框；日合计超标顶部 banner

- [ ] **Step 4: Commit**

---

## Task 9: 连续日历总览

**Files:**
- Create: `web/src/modules/checkin/components/calendar/GoalBlockCell.tsx`
- Create: `web/src/modules/checkin/components/calendar/ContinuousCalendar.tsx`
- Create: `web/src/modules/checkin/pages/CheckinOverviewPage.tsx`

- [ ] **Step 1:** `GoalBlockCell` — 外框 100%，内填色比例，超标红色，胜者描边

- [ ] **Step 2:** 每日一格三行色块（饮食/运动/喝水）

- [ ] **Step 3:** 从 snapshots（有）或实时计算（今日）获取数据

- [ ] **Step 4:** 纵向无限滚动，月份标签 sticky

- [ ] **Step 5: Commit**

---

## Task 10: 日结算 Edge Function

**Files:**
- Create: `web/supabase/functions/checkin-daily-settlement/index.ts`

- [ ] **Step 1:** 实现结算逻辑（与 `scoring.ts` 同算法，可 Deno 内联或共享）

- [ ] **Step 2:** 幂等 UPSERT snapshots；锁定昨日

- [ ] **Step 3:** 文档注释 cron 配置 `0 16 * * *` UTC

- [ ] **Step 4: Commit**

---

## Task 11: 门户入口与构建验证

**Files:**
- Modify: `web/src/modules/portal/pages/PortalPage.tsx`

- [ ] **Step 1:** 新增打卡 AppCard（accent 绿+蓝，链接 `/checkin`）

- [ ] **Step 2: 全量验证**

```bash
cd web && npm test && npm run build
```

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(checkin): phase 1 core UI, timeline, calendar, settlement"
```

---

## Phase 1.5 / 2 预告（本计划不实施）

- **1.5:** `checkin_stakes`、结算揭晓、`CheckinDuelPage`、饮食评论、`todo_items` 自动生成
- **2:** Capacitor iOS、`@capgo/capacitor-health`、运动/喝水只读同步
