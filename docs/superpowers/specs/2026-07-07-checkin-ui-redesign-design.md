# 打卡模块 UI 改版设计

**日期**: 2026-07-07  
**状态**: 待用户审阅  
**前置**: [2026-07-06-checkin-module-design.md](./2026-07-06-checkin-module-design.md)（业务逻辑不变，本 spec 仅覆盖 UI/UX 改版）

---

## 用户确认摘要

| # | 决策 | 选择 |
|---|------|------|
| 1 | 总览布局 | 月历 7×N 平铺网格，按月展示，左右翻页 |
| 2 | 维度切换 | Tab：饮食 / 运动 / 喝水（单维度查看） |
| 3 | 模式切换 | Switch：达成度 ↔ 胜负 |
| 4 | 达成度格子 | **A**：左右各半，分别显示成员 A/B 进度条 |
| 5 | 胜负格子 | **W1**：有胜者 → 成员色铺满 + 居中日期；平局/无胜负 → 中性灰 |
| 6 | 饮食超标 | 达成度模式下超标半格用红色（`--checkin-over-limit`） |
| 7 | 总览姓名 | 顶部不显示成员姓名（成员色通过格子表达） |
| 8 | 档案页 | 紧凑 redesign；当前成员可编辑保存；他人档案只读 |
| 9 | 档案成员 | 跟随顶部 `MemberSwitcher`，去掉页内 A/B 切换按钮 |
| 10 | 底部 Tab | 不合并，保持 6 个 Tab |
| 11 | 主页排序 | 打卡 → 物品 → 待办 → 3D |
| 12 | 风格方案 | S1–S6 六套完整主题，打卡模块内统一 |
| 13 | 风格切换位置 | **P1**：`/settings` 设置页「打卡外观」 |
| 14 | 风格存储 | **T1**：`localStorage`，每台设备各自记住 |
| 15 | 无数据日 | 浅灰底 + 灰色日期数字 |
| 16 | 今日 | `ring-2 ring-primary` 外圈高亮 |
| 17 | 未来日期 | 显示但 muted，不可交互 |

---

## 1. 总览页 — MonthlyCalendar

### 1.1 替换 ContinuousCalendar

废弃纵向连续列表（`ContinuousCalendar`），新建 `MonthlyCalendar` 组件。

### 1.2 布局结构

```
┌─────────────────────────────────────┐
│  ‹    2026年7月    ›                  │  月份导航（chevron 按钮）
├─────────────────────────────────────┤
│ [饮食] [运动] [喝水]                  │  维度 Tab（segmented control）
├─────────────────────────────────────┤
│ 达成度  ○────●  胜负                  │  模式 Switch
├─────────────────────────────────────┤
│  日   一   二   三   四   五   六      │  星期头
│       1    2    3    4    5    6      │
│  7    8    9   10   11   12   13      │  7×N 月网格
│  ...                                 │
└─────────────────────────────────────┘
```

- 格子最小尺寸：**40×40px**（S4 例外 32px，由风格 token 控制 `--checkin-cell-size`）
- 格间距：由 `--checkin-cell-gap` 控制（默认 4px）

### 1.3 达成度模式

每个格子分为左右两半：

| 半格 | 内容 |
|------|------|
| 左 | 成员 A（sortOrder 小）进度条，填色 = `memberA.color` |
| 右 | 成员 B 进度条，填色 = `memberB.color` |

- 进度 = 当前 Tab 维度的 `rate`（0–100%，超出部分条满格 + 红色）
- 饮食维度且 `dietOverLimit`：该半格填色改为 `--checkin-over-limit`
- 格内顶部或底部显示日期数字（`1`–`31`），与进度条共存
- 缺档案成员：该半格按 0% 显示

### 1.4 胜负模式

| 状态 | 格子样式 |
|------|----------|
| 有胜者 | 整格背景 = 胜者 `member.color`；居中白色/深色日期数字（自动对比色） |
| 平局 | 背景 = `--checkin-tie`（中性灰，各风格适配明暗） |
| 无数据 / 双方缺档案 | 同平局灰色 |
| 今日 | 额外 `ring-2 ring-primary` |

胜负数据复用现有 `resolveDimensionWinner` / `DailyDuel` / 当日 live 计算逻辑。

### 1.5 月份导航

- 默认显示当前月（Asia/Shanghai）
- `‹` / `›` 切换上/下月
- 可查看历史月份；未来月份显示但所有格子 muted
- 切换月份时 fetch 对应 `from`/`to` 范围的 snapshots + duels

### 1.6 移除项

- 表头成员姓名（原 `ContinuousCalendar` 三行 × 两列姓名）
- 纵向无限滚动 + 上滑加载更多

---

## 2. 档案页 — CheckinProfilePage

### 2.1 信息架构（紧凑单页）

合并为 **一个 Card** 或 **无 Card 的紧凑 section**：

```
基础信息（2 列 grid）
  身高 | 体重
  性别 | 出生日期
  活动水平（整行）

代谢（只读行）
  BMR          1,420 kcal
  建议每日热量  1,770 kcal

目标（可编辑 grid）
  热量 | 蛋白质 | 脂肪 | 碳水
  运动分钟 | 饮水 ml

[保存]（仅当前成员可见）
```

- 行间距 `gap-2`，Label 用 `text-xs text-muted-foreground`
- BMR / 建议热量始终只读计算

### 2.2 权限

| 查看对象 | 行为 |
|----------|------|
| `MemberSwitcher` 当前成员 | 输入框可编辑 + 底部「保存」按钮 |
| 其他成员 | 所有字段 `disabled` / 只读展示，无保存按钮 |

判断：`activeMember.id === currentMemberId`

### 2.3 保存

- 复用 `useUpsertCheckinProfile`
- 保存成功/失败需有反馈（loading → toast 或行内提示）
- 去掉页内成员 A/B 切换按钮

---

## 3. 主页排序 — PortalPage

AppCard 顺序调整为：

1. 打卡模块 → `/checkin`
2. 物品管理 → `/items`
3. 待办管理 → `/todos`
4. 空间管理 → `/everything`

---

## 4. 六套风格主题

### 4.1 实现机制

```html
<div data-theme="checkin" data-checkin-style="s1">
  <!-- 打卡模块全部页面 -->
</div>
```

- `CheckinTabLayout` 根节点设置 `data-checkin-style`
- CSS：`[data-theme="checkin"][data-checkin-style="sN"] { ... }`
- 维度语义色六套共用：`--checkin-diet/exercise/water/over-limit/tie`
- 成员胜负色始终用 `member.color`，不随风格变

### 4.2 风格定义

#### S1 · Apple Fitness

| Token | 值 |
|-------|-----|
| `--background` | `#F2F2F7` |
| `--foreground` | `#1D1D1F` |
| `--card` | `#FFFFFF` |
| `--primary` | `#007AFF` |
| `--muted` | `#E5E5EA` |
| `--border` | `rgba(0,0,0,0.06)` |
| `--radius` | `16px` |
| `--font-sans` | `-apple-system, system-ui, sans-serif` |
| `--font-heading` | `-apple-system, system-ui, sans-serif` |
| `--checkin-tie` | `#E5E5EA` |
| `--checkin-cell-size` | `40px` |
| `--checkin-cell-gap` | `4px` |
| `--shadow-card` | none |

特征：毛玻璃 header（`backdrop-blur-md bg-card/80`），进度条 `rounded-full` h-1.5。

#### S2 · Strava

| Token | 值 |
|-------|-----|
| `--background` | `#FFFFFF` |
| `--foreground` | `#2D2D2D` |
| `--card` | `#FFFFFF` |
| `--primary` | `#FC4C02` |
| `--muted` | `#F7F7F8` |
| `--border` | `#EBEBEB` |
| `--radius` | `12px` |
| `--font-sans` | `"Barlow", system-ui, sans-serif` |
| `--font-heading` | `"Barlow Condensed", "Barlow", sans-serif` |
| `--checkin-tie` | `#EBEBEB` |
| `--checkin-cell-size` | `40px` |
| `--checkin-cell-gap` | `4px` |
| `--shadow-card` | `0 4px 12px rgba(0,0,0,0.08)` |

特征：Bold 标题，Tab 选中 = 底部 3px 橙色 indicator。

#### S3 · 薄荷健康

| Token | 值 |
|-------|-----|
| `--background` | `#F7F8FA` |
| `--foreground` | `#333333` |
| `--card` | `#FFFFFF` |
| `--primary` | `#1AAD19` |
| `--muted` | `#EEF0F3` |
| `--border` | `#E5E8EB` |
| `--radius` | `8px` |
| `--font-sans` | `"Noto Sans SC", system-ui, sans-serif` |
| `--font-heading` | `"Noto Sans SC", system-ui, sans-serif` |
| `--checkin-tie` | `#E5E8EB` |
| `--checkin-cell-size` | `36px` |
| `--checkin-cell-gap` | `2px` |
| `--shadow-card` | none |

特征：扁平 header，档案页 label-value 表格风，进度条 h-1。

#### S4 · GitHub Heatmap

| Token | 值 |
|-------|-----|
| `--background` | `#FFFFFF` |
| `--foreground` | `#24292F` |
| `--card` | `#FFFFFF` |
| `--primary` | `#24292F` |
| `--muted` | `#F6F8FA` |
| `--border` | `#D0D7DE` |
| `--radius` | `4px` |
| `--font-sans` | `"Inter", system-ui, sans-serif` |
| `--font-heading` | `"Inter", system-ui, sans-serif` |
| `--checkin-tie` | `#EBEDF0` |
| `--checkin-cell-size` | `32px` |
| `--checkin-cell-gap` | `3px` |
| `--shadow-card` | none |

特征：日期数字 `font-mono text-[10px]`，Tab 下划线选中，极简无装饰。

#### S5 · Keep

| Token | 值 |
|-------|-----|
| `--background` | `#F5F5F5` |
| `--foreground` | `#1A1A1A` |
| `--card` | `#FFFFFF` |
| `--primary` | `#FF571A` |
| `--secondary` | `#24C789` |
| `--muted` | `#EEEEEE` |
| `--border` | `#E0E0E0` |
| `--radius` | `20px` |
| `--font-sans` | `system-ui, "PingFang SC", sans-serif` |
| `--font-heading` | `system-ui, "PingFang SC", sans-serif` |
| `--checkin-tie` | `#E0E0E0` |
| `--checkin-cell-size` | `40px` |
| `--checkin-cell-gap` | `4px` |
| `--shadow-card` | `0 2px 8px rgba(255,87,26,0.12)` |

特征：大圆角，FAB / 按钮可用橙色渐变，Tab 选中 icon 填色。

#### S6 · 当前优化版（默认）

现有 `[data-theme="checkin"]` token 微调：

| Token | 值 |
|-------|-----|
| `--background` | `#F0F9FF` |
| `--primary` | `#2563EB` |
| `--secondary` | `#059669` |
| `--radius` | `14px` |
| `--font-sans` | `"Barlow", sans-serif` |
| `--font-heading` | `"Barlow Condensed", "Barlow", sans-serif` |
| `--checkin-tie` | `#E2E8F0` |
| `--checkin-cell-size` | `40px` |
| `--checkin-cell-gap` | `4px` |

**默认风格 = S6**（未设置 localStorage 时）。

### 4.3 影响范围

以下组件/页面必须消费 CSS 变量，禁止硬编码颜色：

- `CheckinTabLayout`（header + Tab 栏）
- `CheckinPage` + `DualLaneTimeline` + FAB
- `CheckinOverviewPage` + `MonthlyCalendar`
- `CheckinProfilePage`
- `DietRecordForm` / `ExerciseRecordForm` / `WaterRecordForm`
- `CheckinPresetsPage`

### 4.4 风格切换 UI — SettingsPage

在 `/settings` 新增 section **「打卡外观」**：

```
┌─ 打卡外观 ─────────────────────────┐
│  ┌──────┐ ┌──────┐ ┌──────┐        │
│  │ S1   │ │ S2   │ │ S3   │  ...   │  3×2 网格预览卡片
│  │Apple │ │Strava│ │薄荷  │        │
│  └──────┘ └──────┘ └──────┘        │
│  当前：Apple Fitness               │
└────────────────────────────────────┘
```

- 每张预览卡：迷你月历 mock（3×3 格）+ 风格名 + 主色条
- 选中态：`ring-2 ring-primary`
- 点击即时切换并写入 localStorage
- 若用户不在打卡模块，切换后下次进入 `/checkin` 生效；若在打卡模块内，需 React context/store 同步刷新

### 4.5 Hook — useCheckinStyle

```typescript
const STORAGE_KEY = 'checkin-ui-style'
type CheckinStyle = 's1' | 's2' | 's3' | 's4' | 's5' | 's6'

function readStoredStyle(): CheckinStyle // default 's6'
function useCheckinStyle(): [CheckinStyle, (s: CheckinStyle) => void]
```

- 模式参考现有 `useTimelineMode`（localStorage + useState）
- `CheckinTabLayout` 读取并设置 `data-checkin-style`
- `SettingsPage` 读取同一 hook 展示/切换

---

## 5. 组件清单

| 组件 | 动作 |
|------|------|
| `MonthlyCalendar` | **新建** — 月历网格 + Tab + Switch |
| `CalendarDayCell` | **新建** — 达成度/胜负两种渲染 |
| `CheckinStylePicker` | **新建** — Settings 预览选择器 |
| `useCheckinStyle` | **新建** — localStorage hook |
| `ContinuousCalendar` | **删除或弃用** |
| `GoalBlockCell` | **改造或弃用** — 逻辑并入 CalendarDayCell |
| `CheckinOverviewPage` | **改** — 使用 MonthlyCalendar |
| `CheckinProfilePage` | **改** — 紧凑 + 权限 |
| `CheckinTabLayout` | **改** — 绑定 data-checkin-style |
| `SettingsPage` | **改** — 新增打卡外观 section |
| `PortalPage` | **改** — 卡片排序 |
| `index.css` | **改** — 六套 checkin style token 块 |

---

## 6. 数据流（不变）

- 月历数据仍来自 `useDailySnapshots` + `useDailyDuels` + 当日 `useCheckinRecordsForDate`
- 计分仍用 `day-rates.ts` + `scoring.ts`
- 无新表、无新 API（风格偏好走 localStorage）

---

## 7. 无障碍

- 日历格 `aria-label`：`7月15日 饮食 成员A 85% 成员B 60%` 或 `7月15日 饮食 成员A胜`
- 胜负模式不仅靠颜色：平局格与胜者格对比度均 ≥ 4.5:1（日期数字）
- Switch / Tab 键盘可操作
- `prefers-reduced-motion`：月份翻页无动画

---

## 8. 非目标

- 不做 dark mode 独立六套（各风格仅 light；后续可扩展）
- 不做 Supabase 家庭级风格同步（T1 范围）
- 不改底部 Tab 数量与路由结构
- 不改计分/结算业务逻辑

---

## 9. 验收标准

- [ ] 总览为月历网格，Tab 切维度，Switch 切达成度/胜负
- [ ] 胜负：胜者填色，平局灰，日期居中
- [ ] 达成度：左右半格进度，超标红色
- [ ] 总览无成员姓名
- [ ] 档案紧凑，当前成员可保存，他人只读
- [ ] 主页卡片顺序：打卡 / 物品 / 待办 / 3D
- [ ] Settings 可切换 S1–S6，localStorage 持久化
- [ ] 六套风格在记录/总览/档案/表单/Tabs 视觉一致
- [ ] 今日 ring 高亮，未来日期 muted

---

## 10. 与原 spec 的差异

| 原 spec §5 连续日历 | 本 spec |
|---------------------|---------|
| 纵向连续滚动 | 按月分页网格 |
| 每日三行色块同时展示 | Tab 单维度 |
| 无达成/胜负 Switch | 双模式 Switch |
| 表头成员名 | 移除 |

业务计分规则（§7）、日结算（§8）不变。
