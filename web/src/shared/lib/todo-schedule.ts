import type { TodoItem } from '../../modules/todos/types/todo-types'
import { isoToLocalDate, hasSpecificTime } from './datetime-utils'

export function getTodoDueDate(
  todo: Pick<TodoItem, 'dueDate' | 'dueAt'>,
): string | null {
  if (todo.dueAt) return isoToLocalDate(todo.dueAt)
  return todo.dueDate
}

export function getTodoStartDate(
  todo: Pick<TodoItem, 'startDate' | 'startAt'>,
): string | null {
  if (todo.startAt) return isoToLocalDate(todo.startAt)
  return todo.startDate
}

export function todoHasSchedule(
  todo: Pick<TodoItem, 'dueDate' | 'dueAt' | 'isAllDay'>,
): boolean {
  return Boolean(getTodoDueDate(todo))
}

export function todoHasSpecificDueTime(
  todo: Pick<TodoItem, 'dueAt' | 'isAllDay'>,
): boolean {
  return hasSpecificTime(todo.dueAt, todo.isAllDay)
}

/** Sort key: dated items first; same day non-timed before timed; then by time. */
export function compareTodoSchedule(
  a: Pick<TodoItem, 'dueDate' | 'dueAt' | 'isAllDay' | 'title' | 'status'>,
  b: Pick<TodoItem, 'dueDate' | 'dueAt' | 'isAllDay' | 'title' | 'status'>,
): number {
  const aDone = a.status === 'completed' ? 1 : 0
  const bDone = b.status === 'completed' ? 1 : 0
  if (aDone !== bDone) return aDone - bDone

  const aDue = getTodoDueDate(a) ?? '9999-99-99'
  const bDue = getTodoDueDate(b) ?? '9999-99-99'
  const dateCmp = aDue.localeCompare(bDue)
  if (dateCmp !== 0) return dateCmp

  const aTimed = todoHasSpecificDueTime(a) ? 1 : 0
  const bTimed = todoHasSpecificDueTime(b) ? 1 : 0
  if (aTimed !== bTimed) return aTimed - bTimed

  if (aTimed && bTimed && a.dueAt && b.dueAt) {
    const timeCmp = a.dueAt.localeCompare(b.dueAt)
    if (timeCmp !== 0) return timeCmp
  }

  return a.title.localeCompare(b.title, 'zh-CN')
}
