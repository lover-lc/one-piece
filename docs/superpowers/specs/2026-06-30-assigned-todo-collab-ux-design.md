# 指派待办协作 UX 增强

**日期**: 2026-06-30  
**状态**: 已确认

## 背景

指派类待办在协商确认、卡片信息展示、修改高亮与通知实时性方面需要增强。

## 已确认决策

| 项 | 决策 |
|----|------|
| 双方确认进入执行 | 双方各收通知「双方已确认，开始执行：{标题}」；卡片仅协商/异常态显示标签 |
| 卡片状态 | `pending_accept`→待确认；`pending_review`→待验收；`rejected`→已驳回；`returned`→**待重新提交** |
| 指派徽章 | 固定 `→` + 被指派人头像（无名字），仅指派类 |
| 修改高亮 | 琥珀黄底 + 细边框 |
| 通知实时 | Realtime publication + 10s 轮询 + 新消息 Toast |

## 实现要点

- `sendExecutionStartedNotifications`：`agree` 双方一致时插入通知
- `TodoAssignStatusLabel` + `getAssignedTodoCardStatusLabel`
- `TodoRelationBadge` 改为固定显示 assignee
- migration 将 `todo_notifications`、`todo_items` 加入 `supabase_realtime`
- `SeedLayout` 全局挂载 `useRealtimeTodos` + `NotificationToast`
