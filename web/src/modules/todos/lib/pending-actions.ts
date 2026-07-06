import type { TodoItem, TodoNotification, TodoStatus } from '../types/todo-types'
import { isAwaitingMember, isNegotiationStatus } from './negotiation'

export type PendingActionKind =
  | 'pending_accept'
  | 'pending_review'
  | 'returned'
  | 'rejected'

export type PendingActionItem = {
  key: string
  todoId: string
  todo: TodoItem
  kind: PendingActionKind
  notificationIds: string[]
  title: string
  subtitle: string
}

const ACTION_LABELS: Record<PendingActionKind, string> = {
  pending_accept: '待你确认',
  pending_review: '待你验收',
  returned: '创建人已驳回，请修改后重新提交',
  rejected: '对方已拒绝，请修改后重新派发',
}

export function getPendingActionKind(
  todo: Pick<
    TodoItem,
    'creatorId' | 'assigneeId' | 'status' | 'awaitingMemberId'
  >,
  memberId: string | null,
): PendingActionKind | null {
  if (!memberId) return null

  if (todo.status === 'pending_accept' || todo.status === 'returned') {
    if (!isAwaitingMember(todo, memberId)) return null
    return todo.status === 'returned' ? 'returned' : 'pending_accept'
  }

  if (todo.status === 'rejected' && todo.creatorId === memberId) {
    return 'rejected'
  }

  if (todo.creatorId === memberId && todo.status === 'pending_review') {
    return 'pending_review'
  }

  return null
}

function isActionLockedNotificationType(type: TodoNotification['type']): boolean {
  return (
    type === 'assigned' ||
    type === 'returned' ||
    type === 'rejected' ||
    type === 'reminder' ||
    type === 'proposal_updated'
  )
}

export function buildPendingActionItems(
  todos: TodoItem[],
  notifications: TodoNotification[],
  memberId: string | null,
): PendingActionItem[] {
  if (!memberId) return []

  const byTodoId = new Map<string, PendingActionItem>()

  for (const todo of todos) {
    const kind = getPendingActionKind(todo, memberId)
    if (!kind) continue

    byTodoId.set(todo.id, {
      key: `${todo.id}-${kind}`,
      todoId: todo.id,
      todo,
      kind,
      notificationIds: [],
      title: todo.title,
      subtitle: ACTION_LABELS[kind],
    })
  }

  for (const notification of notifications) {
    if (!notification.todoItemId) continue
    if (!isActionLockedNotificationType(notification.type)) continue

    const todo = todos.find((item) => item.id === notification.todoItemId)
    if (!todo || getPendingActionKind(todo, memberId) === null) continue

    const existing = byTodoId.get(todo.id)
    if (existing) {
      if (!existing.notificationIds.includes(notification.id)) {
        existing.notificationIds.push(notification.id)
      }
      continue
    }

    if (notification.type !== 'reminder' || notification.isRead) continue

    const kind = getPendingActionKind(todo, memberId)
    if (!kind) continue

    byTodoId.set(todo.id, {
      key: `${todo.id}-${kind}`,
      todoId: todo.id,
      todo,
      kind,
      notificationIds: [notification.id],
      title: todo.title,
      subtitle: notification.message || ACTION_LABELS[kind],
    })
  }

  const priority: Record<PendingActionKind, number> = {
    pending_accept: 0,
    rejected: 1,
    returned: 2,
    pending_review: 3,
  }

  return Array.from(byTodoId.values()).sort(
    (a, b) => priority[a.kind] - priority[b.kind],
  )
}

export function isNotificationDeletable(
  notification: TodoNotification,
  todos: TodoItem[],
  memberId: string | null,
): boolean {
  if (!notification.todoItemId || !memberId) return true

  const todo = todos.find((item) => item.id === notification.todoItemId)
  if (!todo) return true

  return getPendingActionKind(todo, memberId) === null
}

export function todoStatusRequiresAction(
  status: TodoStatus,
  role: 'creator' | 'assignee',
): boolean {
  if (role === 'assignee') {
    return status === 'pending_accept' || status === 'returned'
  }
  return status === 'pending_review'
}

export { isNegotiationStatus }
