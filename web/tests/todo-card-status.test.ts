import { describe, expect, it } from 'vitest'
import { getAssignedTodoCardStatusLabel } from '../src/modules/todos/lib/todo-card-status'
import type { TodoItem } from '../src/modules/todos/types/todo-types'

const assignedTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 't1',
  title: '测试待办',
  description: null,
  listId: 'l1',
  creatorId: 'a',
  assigneeId: 'b',
  priority: null,
  startDate: null,
  dueDate: null,
  requireFeedback: true,
  status: 'pending_accept',
  awaitingMemberId: 'b',
  negotiationSnapshot: null,
  creatorAgreedAt: null,
  assigneeAgreedAt: null,
  recurrenceRule: null,
  parentRecurrenceId: null,
  completedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('getAssignedTodoCardStatusLabel', () => {
  it('returns labels for assigned negotiation states', () => {
    expect(
      getAssignedTodoCardStatusLabel(assignedTodo({ status: 'pending_accept' })),
    ).toBe('待确认')
    expect(
      getAssignedTodoCardStatusLabel(assignedTodo({ status: 'pending_review' })),
    ).toBe('待验收')
    expect(
      getAssignedTodoCardStatusLabel(assignedTodo({ status: 'rejected' })),
    ).toBe('已驳回')
    expect(
      getAssignedTodoCardStatusLabel(assignedTodo({ status: 'returned' })),
    ).toBe('待重新提交')
  })

  it('returns null for self-assigned or normal execution states', () => {
    expect(
      getAssignedTodoCardStatusLabel(
        assignedTodo({ creatorId: 'a', assigneeId: 'a' }),
      ),
    ).toBeNull()
    expect(
      getAssignedTodoCardStatusLabel(assignedTodo({ status: 'in_progress' })),
    ).toBeNull()
    expect(
      getAssignedTodoCardStatusLabel(
        assignedTodo({ requireFeedback: false }),
      ),
    ).toBeNull()
  })
})
