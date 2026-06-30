import type { TodoItem, TodoStatus } from '../types/todo-types'
import { isAssignedTodo } from './negotiation-ui'

const ASSIGNED_CARD_STATUS_LABELS: Partial<Record<TodoStatus, string>> = {
  pending_accept: '待确认',
  pending_review: '待验收',
  rejected: '已驳回',
  returned: '待重新提交',
}

export function getAssignedTodoCardStatusLabel(
  todo: Pick<TodoItem, 'status' | 'creatorId' | 'assigneeId' | 'requireFeedback'>,
): string | null {
  if (!isAssignedTodo(todo)) return null
  return ASSIGNED_CARD_STATUS_LABELS[todo.status] ?? null
}

export const ASSIGNED_CARD_STATUS_TONE: Partial<
  Record<TodoStatus, string>
> = {
  pending_accept: 'text-amber-700 dark:text-amber-400',
  pending_review: 'text-purple-600 dark:text-purple-400',
  rejected: 'text-red-600 dark:text-red-400',
  returned: 'text-orange-600 dark:text-orange-400',
}
