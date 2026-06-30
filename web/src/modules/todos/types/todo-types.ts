export type TodoPriority = 'high' | 'medium' | 'low'

export type TodoStatus =
  | 'draft'
  | 'pending_accept'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'pending_review'
  | 'completed'
  | 'returned'

export type TodoNotificationType =
  | 'assigned'
  | 'agreed'
  | 'rejected'
  | 'completed'
  | 'verified'
  | 'returned'
  | 'reminder'
  | 'proposal_updated'

export type TodoListVisibility = 'private' | 'shared'

export type RecurrenceRule = {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  interval: number
  /** 1=周一 … 7=周日 */
  weekdays?: number[]
  endType: 'never' | 'date' | 'count'
  endDate?: string
  endCount?: number
  generatedCount?: number
}

export type NegotiationSnapshot = {
  title: string
  description: string | null
  priority: TodoPriority | null
  isAllDay: boolean
  startAt: string | null
  dueAt: string | null
  startDate: string | null
  dueDate: string | null
  tagIds: string[]
  recurrenceRule: RecurrenceRule | null
}

export type TodoList = {
  id: string
  name: string
  ownerId: string
  color: string | null
  sortOrder: number
  visibility: TodoListVisibility
  createdAt: string
}

export type TodoTag = {
  id: string
  name: string
  color: string
  createdAt: string
}

export type TodoItem = {
  id: string
  title: string
  description: string | null
  listId: string
  creatorId: string
  assigneeId: string
  priority: TodoPriority | null
  isAllDay: boolean
  startAt: string | null
  dueAt: string | null
  startDate: string | null
  dueDate: string | null
  requireFeedback: boolean
  status: TodoStatus
  awaitingMemberId: string | null
  negotiationSnapshot: NegotiationSnapshot | null
  creatorAgreedAt: string | null
  assigneeAgreedAt: string | null
  recurrenceRule: RecurrenceRule | null
  parentRecurrenceId: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
  tags?: TodoTag[]
  privateListId?: string | null
  sharedListId?: string | null
}

export type TodoNotification = {
  id: string
  recipientId: string
  type: TodoNotificationType
  todoItemId: string | null
  message: string
  isRead: boolean
  createdAt: string
}

export type TodoStatusLog = {
  id: string
  todoItemId: string
  fromStatus: TodoStatus | null
  toStatus: TodoStatus
  operatorId: string
  reason: string | null
  createdAt: string
}

export type TodoFormInput = {
  title: string
  description?: string
  privateListId: string
  sharedListId?: string | null
  assigneeId: string
  priority?: TodoPriority | null
  isAllDay?: boolean
  startAt?: string | null
  dueAt?: string | null
  startDate?: string
  dueDate?: string | null
  requireFeedback: boolean
  recurrenceRule?: RecurrenceRule | null
  tagIds?: string[]
  reminderOffset?: '1h' | '1d' | '1w' | 'custom' | null
  customRemindAt?: string
}

export const TODO_STATUS_LABELS: Record<TodoStatus, string> = {
  draft: '草稿',
  pending_accept: '待确认',
  accepted: '已同意',
  rejected: '已拒绝',
  in_progress: '进行中',
  pending_review: '待验收',
  completed: '已完成',
  returned: '已驳回',
}

export const TODO_PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: '高',
  medium: '中',
  low: '低',
}
