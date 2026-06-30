import { describe, expect, it } from 'vitest'
import { formatColumnHeader } from '../src/modules/todos/lib/gantt-scale'
import { compareTodoSchedule } from '../src/shared/lib/todo-schedule'
import type { TodoItem } from '../src/modules/todos/types/todo-types'

const baseTodo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 't1',
  title: '测试',
  description: null,
  listId: 'l1',
  creatorId: 'a',
  assigneeId: 'b',
  priority: null,
  isAllDay: true,
  startAt: null,
  dueAt: '2026-07-01T00:00:00.000Z',
  startDate: null,
  dueDate: '2026-07-01',
  requireFeedback: false,
  status: 'in_progress',
  awaitingMemberId: null,
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

describe('formatColumnHeader', () => {
  it('formats week headers as month + week number', () => {
    const header = formatColumnHeader(
      {
        key: '2026-W27',
        start: '2026-06-30',
        end: '2026-07-06',
        widthPx: 96,
      },
      'week',
      '2026-07-01',
    )
    expect(header.label).toBe('6月')
    expect(header.sublabel).toBe('第27周')
  })

  it('formats month headers as year + month', () => {
    const header = formatColumnHeader(
      {
        key: '2026-07',
        start: '2026-07-01',
        end: '2026-07-31',
        widthPx: 112,
      },
      'month',
      '2026-07-01',
    )
    expect(header.label).toBe('2026年')
    expect(header.sublabel).toBe('7月')
  })
})

describe('compareTodoSchedule', () => {
  it('ranks non-timed before timed on the same day', () => {
    const untimed = baseTodo({
      isAllDay: false,
      dueAt: '2026-07-01T00:00:00.000Z',
      dueDate: '2026-07-01',
    })
    const timed = baseTodo({
      id: 't2',
      isAllDay: false,
      dueAt: '2026-07-01T15:00:00.000Z',
      dueDate: '2026-07-01',
    })
    expect(compareTodoSchedule(untimed, timed)).toBeLessThan(0)
  })
})
