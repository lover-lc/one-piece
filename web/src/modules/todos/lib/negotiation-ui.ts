import type { TodoItem, TodoStatus } from '../types/todo-types'
import { isAwaitingMember, isNegotiationStatus } from './negotiation'
import { isTodoAssignee } from './todo-assignee'
import {
  diffSnapshotFields,
  formStateToSnapshot,
  snapshotsEqual,
  todoToCommittedSnapshot,
  type NegotiationFieldKey,
  type NegotiationFormState,
  type NegotiationSnapshot,
} from './negotiation-snapshot'

export type DetailHeaderMode =
  | 'save'
  | 'agree_reject'
  | 'submit_reject'
  | 'agree_delete'
  | 'submit_delete'
  | 'resend_delete'
  | 'submit_review'
  | 'verify_return'
  | 'delete'
  | 'none'

export function isFieldsLocked(
  status: TodoStatus,
  requireFeedback = true,
): boolean {
  if (status === 'in_progress' && !requireFeedback) return false
  return (
    status === 'in_progress' ||
    status === 'pending_review' ||
    status === 'returned' ||
    status === 'completed'
  )
}

export function canCreatorDeleteTodo(
  todo: Pick<TodoItem, 'status' | 'creatorId'>,
  memberId: string | null,
): boolean {
  if (!memberId || todo.creatorId !== memberId) return false
  if (todo.status === 'pending_accept' || todo.status === 'rejected') return true
  if (isFieldsLocked(todo.status)) return false
  return true
}

export function isAssignedTodo(
  todo: Pick<TodoItem, 'requireFeedback' | 'creatorId' | 'assigneeId'>,
): boolean {
  return todo.requireFeedback && todo.assigneeId !== todo.creatorId
}

export function canDeleteTodo(
  todo: Pick<TodoItem, 'status' | 'creatorId' | 'assigneeId' | 'requireFeedback'>,
  memberId: string | null,
): boolean {
  if (!memberId) return false

  const isCreator = todo.creatorId === memberId
  const isAssignee = isTodoAssignee(todo, memberId)

  if (todo.status === 'completed' && isAssignedTodo(todo)) {
    return isCreator || isAssignee
  }

  if (isCreator) return canCreatorDeleteTodo(todo, memberId)
  return false
}

export function canAssigneeReject(
  todo: Pick<TodoItem, 'status' | 'assigneeId' | 'awaitingMemberId'>,
  memberId: string | null,
): boolean {
  if (!memberId || todo.status !== 'pending_accept') return false
  return todo.assigneeId === memberId && isAwaitingMember(todo, memberId)
}

export function getDetailHeaderMode(
  todo: Pick<
    TodoItem,
    'status' | 'creatorId' | 'assigneeId' | 'awaitingMemberId' | 'requireFeedback'
  >,
  memberId: string | null,
  formState: NegotiationFormState,
  snapshot: NegotiationSnapshot | null,
): DetailHeaderMode {
  if (!memberId) return 'none'

  const isCreator = todo.creatorId === memberId
  const isAssignee = isTodoAssignee(todo, memberId)
  const current = formStateToSnapshot(formState)
  const hasChanges = snapshot ? !snapshotsEqual(snapshot, current) : false

  if (todo.status === 'rejected') {
    if (!isCreator) return 'none'
    return hasChanges ? 'submit_delete' : 'resend_delete'
  }

  if (todo.status === 'pending_accept') {
    if (!isAwaitingMember(todo, memberId)) return 'none'
    if (isAssignee) {
      return hasChanges ? 'submit_reject' : 'agree_reject'
    }
    if (isCreator) {
      return hasChanges ? 'submit_delete' : 'agree_delete'
    }
    return 'none'
  }

  if (
    todo.status === 'in_progress' &&
    todo.requireFeedback &&
    todo.assigneeId !== todo.creatorId
  ) {
    if (isAssignee) return 'submit_review'
    return 'none'
  }

  if (todo.status === 'in_progress') {
    return 'save'
  }

  if (todo.status === 'pending_review' && isCreator) {
    return 'verify_return'
  }

  if (todo.status === 'returned' && isAssignee) {
    return 'submit_review'
  }

  if (
    todo.status === 'completed' &&
    isAssignedTodo(todo) &&
    (isCreator || isAssignee)
  ) {
    return 'delete'
  }

  if (!isFieldsLocked(todo.status, todo.requireFeedback) && (isCreator || isAssignee)) {
    return 'save'
  }

  return 'none'
}

export function getChangedFields(
  snapshot: NegotiationSnapshot | null,
  formState: NegotiationFormState,
) {
  return diffSnapshotFields(snapshot, formStateToSnapshot(formState))
}

/** 仅指派类协商流程中展示字段变更高亮 */
export function shouldShowNegotiationHighlights(
  todo: Pick<
    TodoItem,
    'status' | 'creatorId' | 'assigneeId' | 'requireFeedback' | 'awaitingMemberId'
  >,
  memberId: string | null,
): boolean {
  if (!memberId || !todo.requireFeedback) return false
  if (todo.assigneeId === todo.creatorId) return false

  if (todo.status === 'rejected' && todo.creatorId === memberId) return true

  if (
    (todo.status === 'pending_accept' || todo.status === 'returned') &&
    isAwaitingMember(todo, memberId)
  ) {
    return true
  }

  return false
}

/** 高亮对比基准：驳回→快照；待确认方→DB 已确认内容 */
export function getHighlightBaseline(
  todo: TodoItem,
  memberId: string | null,
): NegotiationSnapshot | null {
  if (!shouldShowNegotiationHighlights(todo, memberId)) return null

  if (todo.status === 'rejected' && todo.creatorId === memberId) {
    return todo.negotiationSnapshot
  }

  return todoToCommittedSnapshot(todo)
}

/** 待确认方打开详情时，表单展示提案（snapshot）而非 DB 主字段 */
export function shouldLoadProposalInForm(
  todo: Pick<TodoItem, 'status' | 'creatorId' | 'awaitingMemberId' | 'negotiationSnapshot'>,
  memberId: string | null,
): boolean {
  if (!memberId || !todo.negotiationSnapshot) return false

  if (
    (todo.status === 'pending_accept' || todo.status === 'returned') &&
    isAwaitingMember(todo, memberId)
  ) {
    return true
  }

  return false
}

export function getNegotiationChangedFields(
  todo: TodoItem,
  memberId: string | null,
  formState: NegotiationFormState,
): Set<NegotiationFieldKey> {
  const baseline = getHighlightBaseline(todo, memberId)
  if (!baseline) return new Set()
  return getChangedFields(baseline, formState)
}

export function bothPartiesAgreed(
  todo: Pick<TodoItem, 'creatorAgreedAt' | 'assigneeAgreedAt' | 'creatorId' | 'assigneeId'>,
): boolean {
  if (todo.creatorId === todo.assigneeId) return true
  return Boolean(todo.creatorAgreedAt && todo.assigneeAgreedAt)
}

export { isNegotiationStatus }
