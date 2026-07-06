import { describe, expect, it } from 'vitest'
import { getAssignedTodoCardStatusLabel } from '../src/modules/todos/lib/todo-card-status'
import { isTodoVisibleInListForMember } from '../src/modules/todos/lib/todo-list-visibility'
import type { TodoItem } from '../src/modules/todos/types/todo-types'

const assignedTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 't1',
  title: '测试待办',
  description: null,
  listId: 'l1',
  creatorId: 'a',
  assigneeId: 'b',
  priority: null,
  isAllDay: true,
  startAt: null,
  dueAt: null,
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
    ).toBe('已驳回')
    expect(
      getAssignedTodoCardStatusLabel(assignedTodo({ status: 'in_progress' })),
    ).toBe('进行中')
  })

  it('returns null for self-assigned or normal execution states', () => {
    expect(
      getAssignedTodoCardStatusLabel(
        assignedTodo({ creatorId: 'a', assigneeId: 'a' }),
      ),
    ).toBeNull()
    expect(
      getAssignedTodoCardStatusLabel(
        assignedTodo({ requireFeedback: false }),
      ),
    ).toBeNull()
  })
})

describe('isTodoVisibleInListForMember', () => {
  it('hides negotiating assigned todos from creator until both agree', () => {
    expect(
      isTodoVisibleInListForMember(
        assignedTodo({
          status: 'pending_accept',
          creatorAgreedAt: '2026-01-01',
          assigneeAgreedAt: null,
        }),
        'a',
      ),
    ).toBe(false)
  })

  it('shows rejected assigned todos to creator', () => {
    expect(
      isTodoVisibleInListForMember(assignedTodo({ status: 'rejected' }), 'a'),
    ).toBe(true)
  })

  it('shows in-progress assigned todos to creator after agreement', () => {
    expect(
      isTodoVisibleInListForMember(
        assignedTodo({
          status: 'in_progress',
          creatorAgreedAt: '2026-01-01',
          assigneeAgreedAt: '2026-01-02',
        }),
        'a',
      ),
    ).toBe(true)
  })

  it('always shows assigned todos to assignee during negotiation', () => {
    expect(
      isTodoVisibleInListForMember(
        assignedTodo({
          status: 'pending_accept',
          creatorAgreedAt: '2026-01-01',
          assigneeAgreedAt: null,
        }),
        'b',
      ),
    ).toBe(true)
  })
})
