import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildDueViewRows,
  buildGapBetween,
  buildOverviewSegments,
  buildSpanViewRows,
  buildWindowDates,
  computeBarLayout,
  computeBarPixels,
  computeSpanWindow,
  computeTodayOffset,
  daysBetween,
  effectiveStart,
  formatSpineMeta,
  normalizedSpan,
  partitionTodos,
} from '../src/modules/todos/lib/timeline-utils'
import type { TodoItem } from '../src/modules/todos/types/todo-types'

function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: '1',
    title: '任务A',
    description: null,
    listId: 'list-1',
    creatorId: 'u1',
    assigneeId: 'u2',
    priority: null,
    startDate: null,
    dueDate: '2026-06-28',
    requireFeedback: false,
    status: 'accepted',
    recurrenceRule: null,
    parentRecurrenceId: null,
    completedAt: null,
    createdAt: '2026-06-20T00:00:00Z',
    updatedAt: '2026-06-20T00:00:00Z',
    ...overrides,
  }
}

describe('timeline-utils', () => {
  it('partitions dated and no-date todos', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-06-30' }),
      makeTodo({ id: '2', dueDate: null }),
      makeTodo({ id: '3', dueDate: '2026-06-28' }),
    ]
    const { dated, noDate } = partitionTodos(todos)
    expect(dated.map((t) => t.id)).toEqual(['3', '1'])
    expect(noDate.map((t) => t.id)).toEqual(['2'])
  })

  it('builds due view rows with one spine per date group', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-06-28', title: 'B' }),
      makeTodo({ id: '2', dueDate: '2026-06-28', title: 'A' }),
      makeTodo({ id: '3', dueDate: '2026-06-30', title: 'C' }),
    ]
    const rows = buildDueViewRows(todos, '2026-06-28')
    expect(rows).toHaveLength(3)
    expect(rows.filter((r) => r.showSpine)).toHaveLength(2)
    expect(rows[0]?.spine?.sublabel).toBe('今天')
  })

  it('swaps invalid span ranges', () => {
    const todo = makeTodo({
      startDate: '2026-06-30',
      dueDate: '2026-06-25',
    })
    expect(normalizedSpan(todo)).toEqual({ start: '2026-06-25', end: '2026-06-30' })
  })

  it('computes span window with minimum 14 days and includes today', () => {
    const todos = [makeTodo({ dueDate: '2026-06-28' })]
    const window = computeSpanWindow(todos, '2026-06-28')
    expect(daysBetween(window.start, window.end) + 1).toBeGreaterThanOrEqual(14)
    expect(window.start <= '2026-06-28').toBe(true)
    expect(window.end >= '2026-06-28').toBe(true)
  })

  it('computes bar layout percentages', () => {
    const todo = makeTodo({
      startDate: '2026-06-26',
      dueDate: '2026-06-28',
    })
    const window = { start: '2026-06-20', end: '2026-07-03' }
    const bar = computeBarLayout(todo, window)
    expect(bar.left).toBeGreaterThan(0)
    expect(bar.width).toBeGreaterThanOrEqual(2)
    expect(bar.dueLabel).toBe('6/28')
  })

  it('builds span view rows sorted by effective start', () => {
    const todos = [
      makeTodo({ id: '2', startDate: '2026-06-27', dueDate: '2026-06-30', title: 'B' }),
      makeTodo({ id: '1', startDate: '2026-06-25', dueDate: '2026-06-28', title: 'A' }),
    ]
    const { dated } = buildSpanViewRows(todos, '2026-06-28')
    expect(dated.map((row) => row.todo.id)).toEqual(['1', '2'])
  })

  it('formats overdue spine label', () => {
    const meta = formatSpineMeta('2026-06-20', '2026-06-28')
    expect(meta.sublabel).toBe('逾期')
    expect(meta.isOverdue).toBe(true)
  })

  it('addDays handles month boundaries', () => {
    expect(addDays('2026-06-28', 3)).toBe('2026-07-01')
  })

  it('effectiveStart falls back to createdAt', () => {
    const todo = makeTodo({ startDate: null, dueDate: null })
    expect(effectiveStart(todo)).toBe('2026-06-20')
  })

  it('builds window date list', () => {
    const dates = buildWindowDates({ start: '2026-06-28', end: '2026-06-30' })
    expect(dates).toEqual(['2026-06-28', '2026-06-29', '2026-06-30'])
  })

  it('computes pixel bar for span gantt', () => {
    const todo = makeTodo({
      startDate: '2026-06-26',
      dueDate: '2026-06-28',
    })
    const window = { start: '2026-06-20', end: '2026-07-03' }
    const bar = computeBarPixels(todo, window)
    expect(bar.left).toBeGreaterThan(0)
    expect(bar.width).toBeGreaterThan(8)
  })

  it('computes today offset inside window', () => {
    const offset = computeTodayOffset({ start: '2026-06-20', end: '2026-07-03' }, '2026-06-28')
    expect(offset).toBeGreaterThan(0)
  })

  it('builds medium gap between date groups', () => {
    const gaps = buildGapBetween('2026-06-28', '2026-07-05')
    expect(gaps).toHaveLength(1)
    expect(gaps[0]?.kind).toBe('medium')
    expect(gaps[0]?.label).toContain('无待办')
  })

  it('builds large gap with month anchor', () => {
    const gaps = buildGapBetween('2026-06-28', '2026-08-10')
    expect(gaps).toHaveLength(1)
    expect(gaps[0]?.kind).toBe('large')
    expect(gaps[0]?.monthAnchor).toBe('7 月')
    expect(gaps[0]?.label).toContain('周无安排')
  })

  it('builds overview segments with date groups and gaps', () => {
    const todos = [
      makeTodo({ id: '1', dueDate: '2026-06-28', title: 'A' }),
      makeTodo({ id: '2', dueDate: '2026-06-28', title: 'B' }),
      makeTodo({ id: '3', dueDate: '2026-07-05', title: 'C' }),
    ]
    const { segments } = buildOverviewSegments(todos, 'day', '2026-06-28')
    expect(segments.filter((s) => s.type === 'date-group')).toHaveLength(2)
    expect(segments.some((s) => s.type === 'gap')).toBe(true)
    const firstGroup = segments.find((s) => s.type === 'date-group')
    expect(firstGroup && firstGroup.type === 'date-group' && firstGroup.todos).toHaveLength(2)
  })

  it('marks at most one today line per granularity', () => {
    const todos = [makeTodo({ id: '1', dueDate: '2026-06-30', title: '今天练车' })]
    const today = '2026-06-30'

    for (const granularity of ['day', 'week', 'month'] as const) {
      const { segments } = buildOverviewSegments(todos, granularity, today)
      const groups = segments.filter((s) => s.type === 'date-group')
      expect(groups).toHaveLength(1)
      expect(groups[0]?.type === 'date-group' && groups[0].todos).toHaveLength(1)

      const todayIndicators =
        segments.filter((s) => s.type === 'today-marker').length +
        segments.filter((s) => s.type === 'date-group' && s.showsTodayLine).length
      expect(todayIndicators).toBe(1)
    }
  })
})
