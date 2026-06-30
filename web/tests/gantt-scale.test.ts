import { describe, expect, it } from 'vitest'
import {
  buildColumns,
  buildDisplayRange,
  computeBarLayout,
  computeTodayColumnOffset,
  defaultRange,
  filterTodosByRangeFilter,
  GANTT_DAY_COLUMN_WIDTH,
  GANTT_MONTH_COLUMN_WIDTH,
  GANTT_WEEK_COLUMN_WIDTH,
  getColumnWidth,
  spansIntersectRange,
  todoIntersectsRange,
} from '../src/modules/todos/lib/gantt-scale'
import type { TodoItem } from '../src/modules/todos/types/todo-types'

function makeTodo(overrides: Partial<TodoItem> = {}): TodoItem {
  return {
    id: '1',
    title: '任务',
    description: null,
    listId: 'list-1',
    creatorId: 'u1',
    assigneeId: 'u2',
    priority: null,
    startDate: '2026-06-19',
    dueDate: '2026-06-28',
    requireFeedback: false,
    status: 'accepted',
    recurrenceRule: null,
    parentRecurrenceId: null,
    completedAt: null,
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides,
  }
}

describe('gantt-scale', () => {
  it('buildColumns day count equals days in range', () => {
    const range = { start: '2026-06-22', end: '2026-06-28' }
    const columns = buildColumns('day', range)
    expect(columns).toHaveLength(7)
    expect(columns[0]!.key).toBe('2026-06-22')
    expect(columns[6]!.key).toBe('2026-06-28')
  })

  it('buildColumns week truncates first and last week to range', () => {
    const range = { start: '2026-06-25', end: '2026-07-08' }
    const columns = buildColumns('week', range)
    expect(columns.length).toBeGreaterThan(0)
    expect(columns[0]!.start).toBe('2026-06-25')
    expect(columns[0]!.end).toBe('2026-06-28')
  })

  it('computeBarLayout 10-day task width by granularity', () => {
    const todo = makeTodo({
      startDate: '2026-06-19',
      dueDate: '2026-06-28',
    })
    const range = { start: '2026-06-15', end: '2026-07-05' }

    const dayCols = buildColumns('day', range)
    const dayBar = computeBarLayout(todo, dayCols, range)
    expect(dayBar.widthPx).toBe(10 * GANTT_DAY_COLUMN_WIDTH)

    const weekCols = buildColumns('week', range)
    expect(weekCols[0]!.widthPx).toBe(GANTT_WEEK_COLUMN_WIDTH)
    const weekBar = computeBarLayout(todo, weekCols, range)
    expect(weekBar.widthPx).toBeCloseTo((10 / 7) * GANTT_WEEK_COLUMN_WIDTH, 0)

    const monthCols = buildColumns('month', range)
    expect(monthCols[0]!.widthPx).toBe(GANTT_MONTH_COLUMN_WIDTH)
    const monthBar = computeBarLayout(todo, monthCols, range)
    expect(monthBar.widthPx).toBeLessThan(GANTT_MONTH_COLUMN_WIDTH)
  })

  it('getColumnWidth returns wider columns for week and month', () => {
    expect(getColumnWidth('day')).toBe(40)
    expect(getColumnWidth('week')).toBeGreaterThan(getColumnWidth('day'))
    expect(getColumnWidth('month')).toBeGreaterThan(getColumnWidth('week'))
  })

  it('filters todos intersecting range', () => {
    const range = { start: '2026-06-25', end: '2026-06-30' }
    const inside = makeTodo({ id: 'in', dueDate: '2026-06-28' })
    const outside = makeTodo({
      id: 'out',
      startDate: '2026-06-01',
      dueDate: '2026-06-10',
    })
    const overlap = makeTodo({
      id: 'overlap',
      startDate: '2026-06-20',
      dueDate: '2026-06-27',
    })

    expect(todoIntersectsRange(overlap, range)).toBe(true)
    expect(todoIntersectsRange(outside, range)).toBe(false)
    expect(filterTodosByRangeFilter([inside, outside, overlap], {
      start: range.start,
      end: range.end,
    }).map((t) => t.id)).toEqual(['in', 'overlap'])
  })

  it('filterTodosByRangeFilter supports open start', () => {
    const early = makeTodo({ id: 'early', dueDate: '2026-03-01' })
    const late = makeTodo({
      id: 'late',
      startDate: '2026-08-01',
      dueDate: '2026-09-01',
    })
    const filtered = filterTodosByRangeFilter([early, late], { end: '2026-06-30' })
    expect(filtered.map((t) => t.id)).toEqual(['early'])
  })

  it('spansIntersectRange detects single-day overlap', () => {
    expect(
      spansIntersectRange('2026-06-20', '2026-06-24', {
        start: '2026-06-25',
        end: '2026-06-30',
      }),
    ).toBe(false)
    expect(
      spansIntersectRange('2026-06-24', '2026-06-26', {
        start: '2026-06-25',
        end: '2026-06-30',
      }),
    ).toBe(true)
  })

  it('computeTodayColumnOffset returns center of today column', () => {
    const range = { start: '2026-06-22', end: '2026-06-28' }
    const columns = buildColumns('day', range)
    const offset = computeTodayColumnOffset(columns, '2026-06-25', range, 'day')
    expect(offset).toBe(3 * GANTT_DAY_COLUMN_WIDTH + GANTT_DAY_COLUMN_WIDTH / 2)
  })

  it('computeTodayColumnOffset month view centers on month column', () => {
    const range = { start: '2026-01-01', end: '2026-12-31' }
    const columns = buildColumns('month', range)
    const offset = computeTodayColumnOffset(columns, '2026-06-30', range, 'month')
    const juneIndex = columns.findIndex((col) => col.key === '2026-06')
    expect(juneIndex).toBeGreaterThanOrEqual(0)
    let expected = 0
    for (let i = 0; i < juneIndex; i++) expected += columns[i]!.widthPx
    expected += columns[juneIndex]!.widthPx / 2
    expect(offset).toBe(expected)
  })

  it('defaultRange week centers on today', () => {
    const today = '2026-06-29'
    const range = defaultRange('week', today)
    expect(range.start <= today).toBe(true)
    expect(range.end >= today).toBe(true)
    expect(range.start).toBe('2026-06-15')
    expect(range.end).toBe('2026-07-19')
  })

  it('buildColumns returns empty for invalid range', () => {
    expect(buildColumns('day', { start: '', end: '2026-07-01' })).toEqual([])
    expect(buildColumns('day', { start: '2026-07-10', end: '2026-07-01' })).toEqual([])
  })

  it('buildDisplayRange uses default window span when start is open', () => {
    const display = buildDisplayRange({ end: '2026-09-01' }, 'day', '2026-06-29')
    expect(display.end).toBe('2026-09-01')
    expect(display.start).toBe('2026-08-18')
  })
})
