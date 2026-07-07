# 打卡模块（饮食 / 运动 / 喝水）设计文档

**日期**: 2026-07-06  
**平台**: Web PWA（Phase 2 增加 Capacitor iOS + HealthKit）  
**技术栈**: React + TypeScript + Vite + Supabase + TanStack Query  
**状态**: Phase 1 已实现（2026-07-06）；Phase 1.5/2 待实施

---

## 用户确认摘要

| # | 决策 | 选择 |
|---|------|------|
| 1 | 胜负粒度 | **三维度独立对决**；日历格内分三块色条，各自显示占领者 |
| 2 | 运动/喝水比法 | **各自目标完成率**（非绝对量） |
| 3 | 成员范围 | **恰好两名**家庭成员参与打卡 |
| 4 | 正反馈 | **视觉占领 + 赌注契约**（不要奖牌/成就） |
| 5 | 饮食数据 | **内置精简中餐食物库** + 常吃清单 |
| 6 | 苹果健康 | **Capacitor 包装现有 PWA**，运动/喝水只读同步 |
| 7 | 结算时区 | **Asia/Shanghai 0:00**，前一天锁定不可改 |
| 8 | 赌注 | 双方自定义；日/周/月周期；到期自动生成待办履约流 |

---

## 项目概述

在家庭应用（one-piece）中新增 **打卡模块**，支持两名家庭成员在饮食、运动、喝水三个维度各自记录、对比、结算。强调 **领地式视觉正反馈** 与 **赌注契约联动待办**，而非传统成就/奖牌体系。

### 非目标（V1）

- 不接薄荷健康 B2B API
- 不做 Android Health Connect（Phase 3 候选）
- 不支持 3 人以上打卡对战
- 不做复杂社交 feed（仅饮食记录级评论）

---

## 核心需求

### 1. 成员与档案

- 复用 `todo_family_members`，**系统校验恰好 2 名成员**方可进入打卡模块
- 每名成员独立健康档案：`身高`、`体重`、`性别`、`出生日期`
- 自动计算 **BMR**（Mifflin-St Jeor）及每日目标：
  - 总热量（kcal）
  - 脂肪 / 蛋白质 / 碳水（g，可按比例或手动覆盖）
  - 运动时长或消耗目标
  - 饮水量目标（ml）
- 活动系数可配置（久坐 / 轻度 / 中度 / 重度）

### 2. 记录类型

| 类型 | 录入方式 | 说明 |
|------|----------|------|
| 饮食 | 手动 | 从食物库/常吃清单选，填份量、餐次、时间 |
| 运动 | Phase 1 手动；Phase 2 HealthKit 只读 | 记录项目、时长或消耗；Phase 2 同步 Apple 健身 |
| 喝水 | Phase 1 手动；Phase 2 HealthKit 只读 | 饮品预设 + ml；Phase 2 同步「喝水时间」写入 Health 的数据 |

### 3. 预设库

- **食物库**：Phase 1 种子 **~50 条**常见中餐；后续扩充至 300+（名称、每 100g 热量与三大营养素）
- **常吃清单**：每成员收藏，快速录入
- **运动项目**：名称、单位（分钟/kcal/次）
- **饮品**：名称、默认杯量（ml）、图标 key

### 4. 主界面 — 三 Tab 时间轴

参考待办 `TimelineOverview` 的 spine 结构，改为 **双列泳道**：

```
        成员A（左）    |  spine  |    成员B（右）
09:00   [早餐燕麦]    | 09:00  |    [空]
09:30                 |        |
10:00                 | 10:00  |    [喝水 250ml]
```

- Tab：**饮食 | 运动 | 喝水**
- 顶部 **日期筛选**（默认今天）
- 时间轴粒度：**30 分钟**；连续无数据的半小时槽 **折叠省略**
- 饮食超标条目 / 超标日：**红色标识**
- 可对对方饮食记录 **留言评论**（如「别吃炸鸡了」）— **Phase 1.5**

### 5. 总览 — 连续日历

- **不分页**，所有日期纵向连成一条可滚动时间带
- 每日一格，内含 **三个水平色块**（饮食 / 运动 / 喝水）
- 色块语义（**不显示数字**）：
  - **外框** = 目标 100%
  - **内填色** = 实际达标率（成员色）
  - **超过 100%** → 填色改为红色
  - **维度胜者** → 该色块边缘高亮占领感（成员色描边加粗/光晕）
- 连续胜场：色块饱和度 / 纹理随连胜加深（领地蔓延）

### 6. 胜负专页（/checkin/duel）— Phase 1.5

- 当日三维度实时对决条（F1 竞速感）
- 领先方边框脉冲；被反超警示
- 当前赌注状态、周期倒计时
- 0:00 结算后全屏揭晓动画（胜方扩散、败方灰化）

> Phase 1 在日历总览与记录页内嵌简化对决条即可；独立路由 Phase 1.5 交付。

### 7. 计分规则

#### 饮食（当日维度内 A vs B）

1. 双方都 **未超标**（≤100% 目标热量）→ **达标率更高者胜**（越多越好）
2. 一方超标、一方未超标 → **未超标者胜**
3. 双方都超标 → **超标幅度更小者胜**（离 100% 更近）

> 饮食达标率 = 当日已记录摄入热量 / 目标热量 × 100%

#### 运动 / 喝水

- 比较 **各自目标完成率**：`实际值 / 个人目标 × 100%`，高者胜
- 平局：色块各半或中性条纹

#### 日历格

- **三个维度各自独立胜负**，不合并为「当日综合胜者」
- 格内三块分别展示占领者与达标填色

### 8. 日结算与锁定

- 每天 **Asia/Shanghai 00:00** 由 Edge Function / pg_cron 触发
- **Phase 1**：仅生成快照 + 锁定昨日记录（不含赌注逻辑）
- **Phase 1.5**：同一 Job 追加赌注结算与待办生成
- 生成 `checkin_daily_snapshots`（每成员一行）+ `checkin_daily_duels`（每日一行，存三维度胜者）
- 昨日及更早记录 **禁止 UPDATE/DELETE**（RLS + trigger）
- 当日记录可编辑直至次日 0:00

**SQL 辅助函数：**

```sql
CREATE OR REPLACE FUNCTION public.checkin_shanghai_today()
RETURNS date LANGUAGE sql STABLE AS $$
  SELECT (now() AT TIME ZONE 'Asia/Shanghai')::date;
$$;
```

**计分边界情况：**

| 情况 | 饮食 | 运动/喝水 |
|------|------|-----------|
| 双方同率且均≤100% | 平局（色块各半） | 平局 |
| 双方同率且均>100% | 平局 | — |
| 无记录 / 目标为 0 | 达标率按 0% 计 | 达标率按 0% 计 |
| 一方有数据一方无 | 有数据且>0% 者胜；双方均 0% 则平局 | 同左 |
| 缺档案/缺目标 | 该成员维度不参与胜负（双方均缺则平局；单方缺则另一方胜） | 同左 |

**记录归属：** 使用全局 `useCurrentMember()`；双列时间轴左/右固定为 `sort_order` 0/1 的两名成员，录入时当前选中成员写入对应 `member_id`。

### 9. 赌注契约（Phase 1.5）

- 双方自定义赌注文案（如「输家洗碗」）
- 周期：**日 / 周 / 月**；同一家庭同时仅 **一条活跃赌注**
- 统计窗口内 **三维度独立胜负场次** 累计：
  - 每维度每日产生 1 场（`checkin_daily_duels`）
  - 周期内某成员赢场数多者为 **周期胜者**；赢场相同则 **无履约**（不生成待办）
- 维度是否计入：默认 **三维度全计**（各 1 票/天，最多 3 票/天/人）
- 自动生成 `todo_items`：
  - `require_feedback: true`
  - `status: 'pending_accept'`
  - `creator_id` = 周期胜者，`assignee_id` = 周期败者
  - `list_id` = 家庭共享清单（`todo_lists` 中 `sort_order` 最小且 `owner_id` 属于该家庭的清单；无则创建「打卡赌注」清单）
  - 标题：`[打卡赌注] {文案}（{周期}）`
  - `due_date` = 结算日 + 3 天
  - 重复提醒：`reminder_offset` 按周期 — 日赌注每 12h、周赌注每 2 天、月赌注每 7 天
  - `checkin_stake_settlements.todo_id` 回写关联
- 履约流程复用现有待办协商流（完成 → 赢家复核）

### 10. 苹果健康（Phase 2）

- Capacitor 包装现有 PWA，**同一图标同一 UI**
- 读取：`HKWorkout`（运动）、`dietaryWater`（喝水）
- 后台同步至 `checkin_records`（`source: healthkit`），UI **只读**
- 饮食仍手动录入

---

## 技术方案

### 架构

模块化单体，与 items/todos 并列：

```
web/src/modules/checkin/
├── pages/
│   ├── CheckinPage.tsx          # 主界面 Tab + 双列时间轴
│   ├── CheckinOverviewPage.tsx  # 连续日历总览
│   ├── CheckinDuelPage.tsx      # 胜负专页
│   ├── CheckinProfilePage.tsx   # 健康档案
│   ├── CheckinPresetsPage.tsx   # 预设库管理
│   └── CheckinStakesPage.tsx    # 赌注设置
├── components/
│   ├── layout/CheckinTabLayout.tsx
│   ├── timeline/DualLaneTimeline.tsx
│   ├── calendar/GoalBlockCell.tsx
│   ├── duel/DimensionDuelBar.tsx
│   └── records/...
├── hooks/
├── lib/
│   ├── scoring.ts               # 纯函数计分
│   ├── bmr.ts
│   ├── timeline-slots.ts        # 半小时槽位
│   └── settlement.ts
├── services/
└── types/
```

### 路由

```
/checkin              → CheckinPage（饮食 Tab 默认）
/checkin/exercise     → 运动 Tab
/checkin/water        → 喝水 Tab
/checkin/overview     → 日历总览
/checkin/duel         → 胜负专页
/checkin/profile      → 健康档案
/checkin/presets      → 预设管理
/checkin/stakes       → 赌注契约
```

### 主题

新增 `data-theme="checkin"`（Vibrant & Block-based）：

| Token | 值 |
|-------|-----|
| Primary | `#2563EB` |
| Secondary | `#059669` |
| Accent | `#D97706` |
| 饮食色 | `#D97706` |
| 运动色 | `#059669` |
| 喝水色 | `#2563EB` |
| 超标红 | `#DC2626` |
| 字体 | Barlow / Barlow Condensed（`@fontsource`） |

挂载点：`ThemeShell` 增加 `/checkin` 路径 → `checkin` 主题。

### 数据库（`checkin_` 前缀）

```sql
-- 枚举
checkin_record_type: diet | exercise | water
checkin_stake_period: daily | weekly | monthly
checkin_record_source: manual | healthkit

-- 表
checkin_member_profiles     -- 成员健康档案与目标
checkin_food_library        -- 内置食物库（user_id NULL = 系统）
checkin_food_presets        -- 成员常吃
checkin_exercise_presets
checkin_drink_presets
checkin_records             -- 统一记录
checkin_record_comments     -- 饮食评论
checkin_daily_snapshots     -- 日结算快照（每成员一行，immutable）
checkin_daily_duels         -- 每日三维度胜者（一行/天）
checkin_stakes              -- 赌注契约（Phase 1.5）
checkin_stake_settlements   -- 结算记录 + todo_id（Phase 1.5）
checkin_settlement_logs     -- 结算 Job 错误日志
checkin_health_sync_log     -- HealthKit 同步元数据（Phase 2）
```

**关键约束：**

- `checkin_member_profiles.member_id` UNIQUE
- `checkin_daily_snapshots (snapshot_date, member_id)` UNIQUE
- `checkin_daily_duels.snapshot_date` UNIQUE
- `checkin_food_library`：`user_id IS NULL` 为系统库，全员可读不可写

**RLS（与 todo 迁移同风格）：**

```sql
-- 示例：checkin_records
CREATE POLICY checkin_records_select ON checkin_records FOR SELECT
  USING (user_id = auth.uid());
CREATE POLICY checkin_records_insert ON checkin_records FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM todo_family_members m
      WHERE m.id = member_id AND m.user_id = auth.uid()
    )
  );
-- snapshots / duels：仅 SELECT；INSERT 由 service role（Edge Function）
-- food_library 系统行：SELECT where user_id IS NULL OR user_id = auth.uid()
```

所有表 `GRANT ALL` 给 `authenticated`，与 `20260626300000_todos.sql` 一致。

### 结算 Job

`supabase/functions/checkin-daily-settlement/index.ts`：

1. 取上海时区「昨日」日期
2. 加载两成员档案、记录、目标
3. 调用 `scoring.ts` 同等逻辑计算三维度胜负
4. INSERT `checkin_daily_snapshots` + `checkin_daily_duels`
5. **(Phase 1.5)** 检查赌注周期 → `todo_items` + `checkin_stake_settlements`
6. 失败写入 `checkin_settlement_logs`

Cron: `0 16 * * *` UTC (= 上海 00:00 CST)

---

## 错误处理

| 场景 | 处理 |
|------|------|
| 成员数 ≠ 2 | 打卡入口显示引导页，提示在待办管理中调整成员 |
| 无健康档案 | 强制引导完成 Profile |
| HealthKit 未授权 | 运动/喝水 Tab 显示同步状态 + 手动录入降级 |
| 结算 Job 失败 | 写 `checkin_settlement_logs`；次日补算（幂等 UPSERT） |

---

## 测试策略

- **单元测试**：`scoring.ts`、`bmr.ts`、`timeline-slots.ts`（Vitest）
- **集成**：迁移 SQL 本地 `supabase db reset` 验证
- **E2E Phase 1**：双人录入 → 日历色块 → 模拟结算
- **E2E Phase 1.5**：赌注周期结束 → 待办自动生成

---

## 分阶段交付

| 阶段 | 范围 |
|------|------|
| **Phase 1** | DB、档案、食物库、饮食手动记录、双列时间轴、日历总览、计分结算、checkin 主题、门户入口 |
| **Phase 1.5** | 赌注契约、待办自动生成、结算揭晓动效、饮食评论 |
| **Phase 2** | Capacitor + HealthKit 运动/喝水同步 |
| **Phase 3** | 动效打磨、连胜领地动画、Android Health Connect 评估 |

---

## 参考

- 待办时间轴：`web/src/modules/todos/components/TimelineOverview.tsx`
- 成员体系：`todo_family_members` + `useCurrentMember`
- 待办指派流：`useCreateTodo` + `require_feedback`
- UI 主题：`web/src/index.css` + `ThemeShell.tsx`
- 喝水时间：通过 Apple Health `dietaryWater` 间接同步
