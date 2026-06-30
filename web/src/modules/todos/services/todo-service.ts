import { supabase } from '../../../shared/lib/supabase'
import { isoToLocalDate } from '../../../shared/lib/datetime-utils'
import type {
  RecurrenceRule,
  TodoItem,
  TodoList,
  TodoNotification,
  TodoPriority,
  TodoStatus,
  TodoStatusLog,
  TodoTag,
} from '../types/todo-types'
import { parseNegotiationSnapshot } from '../lib/negotiation-snapshot'

type DbList = {
  id: string
  name: string
  owner_id: string
  color: string | null
  sort_order: number
  visibility: 'private' | 'shared'
  created_at: string
}

type DbItem = {
  id: string
  title: string
  description: string | null
  list_id: string
  creator_id: string
  assignee_id: string
  priority: TodoPriority | null
  is_all_day?: boolean
  start_at: string | null
  due_at: string | null
  start_date: string | null
  due_date: string | null
  require_feedback: boolean
  status: TodoStatus
  awaiting_member_id: string | null
  negotiation_snapshot: unknown | null
  creator_agreed_at: string | null
  assignee_agreed_at: string | null
  recurrence_rule: RecurrenceRule | null
  parent_recurrence_id: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

type DbTag = {
  id: string
  name: string
  color: string
  created_at: string
}

export function toTodoList(row: DbList): TodoList {
  return {
    id: row.id,
    name: row.name,
    ownerId: row.owner_id,
    color: row.color,
    sortOrder: row.sort_order,
    visibility: row.visibility ?? 'private',
    createdAt: row.created_at,
  }
}

export function toTodoItem(row: DbItem, tags: TodoTag[] = []): TodoItem {
  const startAt = row.start_at ?? null
  const dueAt = row.due_at ?? null
  const isAllDay = row.is_all_day ?? true

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    listId: row.list_id,
    creatorId: row.creator_id,
    assigneeId: row.assignee_id,
    priority: row.priority,
    isAllDay,
    startAt,
    dueAt,
    startDate: startAt ? isoToLocalDate(startAt) : row.start_date,
    dueDate: dueAt ? isoToLocalDate(dueAt) : row.due_date,
    requireFeedback: row.require_feedback,
    status: row.status,
    awaitingMemberId: row.awaiting_member_id ?? null,
    negotiationSnapshot: parseNegotiationSnapshot(row.negotiation_snapshot),
    creatorAgreedAt: row.creator_agreed_at ?? null,
    assigneeAgreedAt: row.assignee_agreed_at ?? null,
    recurrenceRule: row.recurrence_rule,
    parentRecurrenceId: row.parent_recurrence_id,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tags,
  }
}

export function toTodoTag(row: DbTag): TodoTag {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    createdAt: row.created_at,
  }
}

export function getInitialStatus(requireFeedback: boolean): TodoStatus {
  return requireFeedback ? 'pending_accept' : 'in_progress'
}

export function isTodoCheckboxChecked(status: TodoStatus): boolean {
  return status === 'completed'
}

export type TodoCheckboxAction =
  | 'complete'
  | 'uncomplete'
  | 'remind'
  | 'verify'
  | 'accept'
  | 'none'

export function getTodoCheckboxAction(
  todo: Pick<
    TodoItem,
    'status' | 'creatorId' | 'assigneeId' | 'requireFeedback' | 'awaitingMemberId'
  >,
  memberId: string | null,
): TodoCheckboxAction {
  if (!memberId) return 'none'

  const isCreator = todo.creatorId === memberId
  const isAssignee = todo.assigneeId === memberId

  if (todo.status === 'pending_review') {
    if (isAssignee) return 'remind'
    if (isCreator) return 'verify'
    return 'none'
  }

  if (todo.status === 'completed') {
    if (isAssignee && !todo.requireFeedback) return 'uncomplete'
    return 'none'
  }

  if (todo.status === 'pending_accept') {
    if (todo.awaitingMemberId === memberId) return 'accept'
    return 'none'
  }

  if (
    isAssignee &&
    (todo.status === 'accepted' ||
      todo.status === 'in_progress' ||
      todo.status === 'returned')
  ) {
    if (todo.status === 'returned' && todo.awaitingMemberId !== memberId) {
      return 'none'
    }
    return 'complete'
  }

  return 'none'
}

export function canTransition(
  status: TodoStatus,
  action: string,
  role: 'creator' | 'assignee',
): boolean {
  const rules: Record<string, { status: TodoStatus; role: 'creator' | 'assignee' }[]> = {
    accept: [{ status: 'pending_accept', role: 'assignee' }],
    reject: [{ status: 'pending_accept', role: 'assignee' }],
    complete: [
      { status: 'accepted', role: 'assignee' },
      { status: 'in_progress', role: 'assignee' },
      { status: 'returned', role: 'assignee' },
    ],
    verify: [{ status: 'pending_review', role: 'creator' }],
    return: [{ status: 'pending_review', role: 'creator' }],
  }

  return (rules[action] ?? []).some(
    (r) => r.status === status && r.role === role,
  )
}

export async function logStatusChange(
  todoItemId: string,
  fromStatus: TodoStatus | null,
  toStatus: TodoStatus,
  operatorId: string,
  reason?: string,
) {
  if (!supabase) return
  await supabase.from('todo_status_logs').insert({
    todo_item_id: todoItemId,
    from_status: fromStatus,
    to_status: toStatus,
    operator_id: operatorId,
    reason: reason ?? null,
  })
}

export async function fetchTodoItems(memberId: string) {
  if (!supabase) return []

  const { data, error } = await supabase
    .from('todo_items')
    .select('*')
    .or(`creator_id.eq.${memberId},assignee_id.eq.${memberId}`)
    .order('due_date', { ascending: true, nullsFirst: false })

  if (error) throw error
  return (data as DbItem[]).map((row) => toTodoItem(row))
}

export async function fetchItemTags(itemIds: string[]): Promise<Map<string, TodoTag[]>> {
  const map = new Map<string, TodoTag[]>()
  if (!supabase || itemIds.length === 0) return map

  const { data, error } = await supabase
    .from('todo_item_tags')
    .select('todo_item_id, todo_tags(id, name, color, created_at)')
    .in('todo_item_id', itemIds)

  if (error) throw error

  for (const row of data ?? []) {
    const itemId = (row as { todo_item_id: string }).todo_item_id
    const tagData = (row as { todo_tags: DbTag | DbTag[] | null }).todo_tags
    const tagRow = Array.isArray(tagData) ? tagData[0] : tagData
    if (!tagRow) continue
    const list = map.get(itemId) ?? []
    list.push(toTodoTag(tagRow))
    map.set(itemId, list)
  }

  return map
}

export async function fetchTodoListPlacements(todoIds: string[]): Promise<{
  memberLists: Map<string, string>
  sharedLists: Map<string, string[]>
}> {
  const memberLists = new Map<string, string>()
  const sharedLists = new Map<string, string[]>()
  if (!supabase || todoIds.length === 0) {
    return { memberLists, sharedLists }
  }

  const [memberRes, sharedRes] = await Promise.all([
    supabase
      .from('todo_item_member_lists')
      .select('todo_item_id, member_id, list_id')
      .in('todo_item_id', todoIds),
    supabase
      .from('todo_item_shared_lists')
      .select('todo_item_id, list_id')
      .in('todo_item_id', todoIds),
  ])

  if (memberRes.error) throw memberRes.error
  if (sharedRes.error) throw sharedRes.error

  for (const row of memberRes.data ?? []) {
    const item = row as { todo_item_id: string; member_id: string; list_id: string }
    memberLists.set(`${item.todo_item_id}:${item.member_id}`, item.list_id)
  }

  for (const row of sharedRes.data ?? []) {
    const item = row as { todo_item_id: string; list_id: string }
    const list = sharedLists.get(item.todo_item_id) ?? []
    list.push(item.list_id)
    sharedLists.set(item.todo_item_id, list)
  }

  return { memberLists, sharedLists }
}

export async function ensureMemberPrivateList(
  todoItemId: string,
  memberId: string,
): Promise<string | null> {
  if (!supabase) return null

  const { data: existing, error: existingError } = await supabase
    .from('todo_item_member_lists')
    .select('list_id')
    .eq('todo_item_id', todoItemId)
    .eq('member_id', memberId)
    .maybeSingle()

  if (existingError) throw existingError
  if (existing) return (existing as { list_id: string }).list_id

  const { data: lists, error: listsError } = await supabase
    .from('todo_lists')
    .select('id')
    .eq('owner_id', memberId)
    .eq('visibility', 'private')
    .order('sort_order', { ascending: true })
    .limit(1)

  if (listsError) throw listsError
  if (!lists?.length) return null

  const listId = (lists[0] as { id: string }).id
  const { error: upsertError } = await supabase.from('todo_item_member_lists').upsert(
    {
      todo_item_id: todoItemId,
      member_id: memberId,
      list_id: listId,
    },
    { onConflict: 'todo_item_id,member_id' },
  )
  if (upsertError) throw upsertError

  return listId
}

export async function syncMemberPrivateList(
  todoItemId: string,
  memberId: string,
  privateListId: string,
) {
  if (!supabase) return

  await supabase.from('todo_item_member_lists').upsert(
    {
      todo_item_id: todoItemId,
      member_id: memberId,
      list_id: privateListId,
    },
    { onConflict: 'todo_item_id,member_id' },
  )
}

export async function syncSharedListPlacement(
  todoItemId: string,
  sharedListId: string | null | undefined,
) {
  if (!supabase) return

  await supabase.from('todo_item_shared_lists').delete().eq('todo_item_id', todoItemId)

  if (sharedListId) {
    await supabase.from('todo_item_shared_lists').insert({
      todo_item_id: todoItemId,
      list_id: sharedListId,
    })
  }
}

export async function syncListSelection(
  todoItemId: string,
  memberId: string,
  listId: string,
  visibility: 'private' | 'shared',
) {
  if (!supabase || !listId) return

  if (visibility === 'shared') {
    await syncSharedListPlacement(todoItemId, listId)
    await supabase
      .from('todo_item_member_lists')
      .delete()
      .eq('todo_item_id', todoItemId)
      .eq('member_id', memberId)
  } else {
    await syncMemberPrivateList(todoItemId, memberId, listId)
    await syncSharedListPlacement(todoItemId, null)
  }
}

export async function syncTodoListPlacements(
  todoItemId: string,
  memberId: string,
  privateListId: string,
  sharedListId: string | null | undefined,
  listVisibility?: 'private' | 'shared',
) {
  if (sharedListId) {
    await syncListSelection(todoItemId, memberId, sharedListId, 'shared')
  } else if (privateListId) {
    await syncListSelection(todoItemId, memberId, privateListId, listVisibility ?? 'private')
  }
}

export async function markTodoNotificationsRead(todoItemId: string, memberId: string) {
  if (!supabase) return
  await supabase
    .from('todo_notifications')
    .update({ is_read: true })
    .eq('todo_item_id', todoItemId)
    .eq('recipient_id', memberId)
    .eq('is_read', false)
}

export async function sendProposalNotification(
  todoItemId: string,
  recipientId: string,
  editorName: string,
  title: string,
) {
  if (!supabase) return
  await supabase.from('todo_notifications').insert({
    recipient_id: recipientId,
    type: 'proposal_updated',
    todo_item_id: todoItemId,
    message: `${editorName} 修改了待办，请确认：${title}`,
  })
}

export async function sendExecutionStartedNotifications(
  todoItemId: string,
  creatorId: string,
  assigneeId: string,
  title: string,
) {
  if (!supabase) return

  const message = `双方已确认，开始执行：${title}`
  const rows =
    creatorId === assigneeId
      ? [{ recipient_id: creatorId, type: 'agreed' as const, todo_item_id: todoItemId, message }]
      : [
          { recipient_id: creatorId, type: 'agreed' as const, todo_item_id: todoItemId, message },
          { recipient_id: assigneeId, type: 'agreed' as const, todo_item_id: todoItemId, message },
        ]

  await supabase.from('todo_notifications').insert(rows)
}

export async function createReminderAt(
  todoItemId: string,
  memberId: string,
  remindAt: string,
) {
  if (!supabase) return
  if (new Date(remindAt) > new Date()) {
    await supabase.from('todo_reminders').insert({
      todo_item_id: todoItemId,
      member_id: memberId,
      remind_at: remindAt,
    })
  }
}

export async function createReminder(
  todoItemId: string,
  memberId: string,
  dueDate: string,
  offset: '1h' | '1d' | '1w',
) {
  if (!supabase) return

  const due = new Date(`${dueDate}T23:59:59`)
  const offsets = { '1h': 60 * 60 * 1000, '1d': 24 * 60 * 60 * 1000, '1w': 7 * 24 * 60 * 60 * 1000 }
  const remindAt = new Date(due.getTime() - offsets[offset])

  if (remindAt > new Date()) {
    await createReminderAt(todoItemId, memberId, remindAt.toISOString())
  }
}

export type DbNotification = {
  id: string
  recipient_id: string
  type: TodoNotification['type']
  todo_item_id: string | null
  message: string
  is_read: boolean
  created_at: string
}

export function toNotification(row: DbNotification): TodoNotification {
  return {
    id: row.id,
    recipientId: row.recipient_id,
    type: row.type,
    todoItemId: row.todo_item_id,
    message: row.message,
    isRead: row.is_read,
    createdAt: row.created_at,
  }
}

export type DbStatusLog = {
  id: string
  todo_item_id: string
  from_status: TodoStatus | null
  to_status: TodoStatus
  operator_id: string
  reason: string | null
  created_at: string
}

export function toStatusLog(row: DbStatusLog): TodoStatusLog {
  return {
    id: row.id,
    todoItemId: row.todo_item_id,
    fromStatus: row.from_status,
    toStatus: row.to_status,
    operatorId: row.operator_id,
    reason: row.reason,
    createdAt: row.created_at,
  }
}
