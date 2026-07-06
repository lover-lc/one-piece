import type { TodoItem } from '../types/todo-types'
import { bothPartiesAgreed, isAssignedTodo } from './negotiation-ui'

export function isTodoVisibleInListForMember(
  todo: TodoItem,
  memberId: string | null,
): boolean {
  if (!memberId) return false
  if (!isAssignedTodo(todo)) return true

  const isCreator = todo.creatorId === memberId
  if (!isCreator) return true

  if (
    todo.status === 'rejected' ||
    todo.status === 'returned' ||
    todo.status === 'pending_review' ||
    todo.status === 'in_progress' ||
    todo.status === 'completed'
  ) {
    return true
  }

  if (
    (todo.status === 'pending_accept' || todo.status === 'accepted') &&
    !bothPartiesAgreed(todo)
  ) {
    return false
  }

  return true
}
