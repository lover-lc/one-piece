import type { TodoItem, TodoStatus } from '../types/todo-types'
import { isAssignedTodo } from './negotiation-ui'

const ASSIGNED_CARD_STATUS_LABELS: Partial<Record<TodoStatus, string>> = {
  pending_accept: '待确认',
  pending_review: '待验收',
  rejected: '已驳回',
  returned: '已驳回',
  in_progress: '进行中',
}

export function getAssignedTodoCardStatusLabel(
  todo: Pick<TodoItem, 'status' | 'creatorId' | 'assigneeId' | 'requireFeedback'>,
): string | null {
  if (!isAssignedTodo(todo)) return null
  return ASSIGNED_CARD_STATUS_LABELS[todo.status] ?? null
}

export const ASSIGNED_CARD_STATUS_TONE: Partial<Record<TodoStatus, string>> = {
  pending_accept: 'text-amber-700 dark:text-amber-400',
  pending_review: 'text-purple-600 dark:text-purple-400',
  rejected: 'text-red-600 dark:text-red-400',
  returned: 'text-red-600 dark:text-red-400',
  in_progress: 'text-emerald-700 dark:text-emerald-400',
}

export function getAssignedCardRowClassName(status: TodoStatus): string | null {
  switch (status) {
    case 'pending_accept':
      return 'bg-amber-50/80 dark:bg-amber-950/20'
    case 'pending_review':
      return 'bg-purple-50 dark:bg-purple-950/25'
    case 'rejected':
    case 'returned':
      return 'bg-red-50/70 dark:bg-red-950/20'
    case 'in_progress':
      return 'bg-emerald-50/70 dark:bg-emerald-950/20'
    default:
      return null
  }
}
