import type { TodoItem } from '../types/todo-types'

export function getTodoAssigneeIds(
  todo: Pick<TodoItem, 'assigneeId' | 'assigneeIds'>,
): string[] {
  if (todo.assigneeIds?.length) return todo.assigneeIds
  return todo.assigneeId ? [todo.assigneeId] : []
}

export function isTodoAssignee(
  todo: Pick<TodoItem, 'assigneeId' | 'assigneeIds'>,
  memberId: string | null,
): boolean {
  if (!memberId) return false
  return getTodoAssigneeIds(todo).includes(memberId)
}
