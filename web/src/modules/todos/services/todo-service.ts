import { supabase } from '../../../shared/lib/supabase'
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

type DbList = {
  id: string
  name: string
  owner_id: string
  color: string | null
  sort_order: number
  created_at: string
}

type DbItem = {
  id: string
  title: string
  description: string | null
  list_id: string
  creator_id: string
  assignee_id: string
  priority: TodoPriority
  start_date: string | null
  due_date: string | null
  require_feedback: boolean
  status: TodoStatus
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
    createdAt: row.created_at,
  }
}

export function toTodoItem(row: DbItem, tags: TodoTag[] = []): TodoItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    listId: row.list_id,
    creatorId: row.creator_id,
    assigneeId: row.assignee_id,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date,
    requireFeedback: row.require_feedback,
    status: row.status,
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
    await supabase.from('todo_reminders').insert({
      todo_item_id: todoItemId,
      member_id: memberId,
      remind_at: remindAt.toISOString(),
    })
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
