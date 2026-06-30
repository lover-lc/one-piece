import {
  addDays,
  daysBetween,
  formatDueLabel,
  getTodayIso,
  normalizedSpan,
} from './timeline-utils'
import { isoToLocalDate, composeAllDayIso } from '../../../shared/lib/datetime-utils'
import {
  ganttRangeToBounds,
  spansIntersectTimestampFilter,
} from '../../../shared/lib/gantt-range-utils'
import type { TodoItem } from '../types/todo-types'
import { getTodoDueDate } from '../../../shared/lib/todo-schedule'

export type GanttGranularity = 'day' | 'week' | 'month'

export type GanttRange = {
  start: string
  end: string
}

export type GanttColumn = {
  key: string
  start: string
  end: string
  widthPx: number
}

export const GANTT_DAY_COLUMN_WIDTH = 40
export const GANTT_WEEK_COLUMN_WIDTH = 96
export const GANTT_MONTH_COLUMN_WIDTH = 112

/** @deprecated use GANTT_DAY_COLUMN_WIDTH */
export const GANTT_COLUMN_WIDTH = GANTT_DAY_COLUMN_WIDTH

export function getColumnWidth(granularity: GanttGranularity): number {
  switch (granularity) {
    case 'week':
      return GANTT_WEEK_COLUMN_WIDTH
    case 'month':
      return GANTT_MONTH_COLUMN_WIDTH
    default:
      return GANTT_DAY_COLUMN_WIDTH
  }
}

export function sumTimelineWidth(columns: GanttColumn[]): number {
  return columns.reduce((sum, col) => sum + col.widthPx, 0)
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function isValidGanttRange(range: GanttRange): boolean {
  return isIsoDate(range.start) && isIsoDate(range.end) && range.start <= range.end
}

/** Filter prefs may leave start or end open (empty string). */
export function isValidGanttRangeFilter(start: string, end: string): boolean {
  const startDate = start ? (isoToLocalDate(start) ?? (isIsoDate(start) ? start : null)) : null
  const endDate = end ? (isoToLocalDate(end) ?? (isIsoDate(end) ? end : null)) : null
  const hasStart = Boolean(startDate && isIsoDate(startDate))
  const hasEnd = Boolean(endDate && isIsoDate(endDate))
  if (!hasStart && !hasEnd) return true
  if (hasStart && hasEnd && startDate! > endDate!) return false
  return true
}

export type GanttRangeBounds = {
  start?: string
  end?: string
}

export function parseRangeFilter(range: GanttRange): GanttRangeBounds {
  return ganttRangeToBounds(range)
}

function todoSpanIsoBounds(todo: TodoItem): { start: string; end: string } {
  const { start, end } = normalizedSpan(todo)
  const startIso = todo.startAt ?? composeAllDayIso(start)
  const endIso = todo.dueAt ?? composeAllDayIso(end)
  return { start: startIso, end: endIso }
}

export function filterTodosByRangeFilter(
  todos: TodoItem[],
  filter: GanttRangeBounds,
): TodoItem[] {
  return todos.filter((todo) => {
    if (!getTodoDueDate(todo)) return false
    const span = todoSpanIsoBounds(todo)
    return spansIntersectTimestampFilter(span.start, span.end, filter)
  })
}

/** Max day columns to keep rendering responsive */
export const MAX_GANTT_DAY_COLUMNS = 200

function clampRangeDays(range: GanttRange, maxDays: number): GanttRange {
  const count = daysBetween(range.start, range.end) + 1
  if (count <= maxDays) return range
  return {
    start: addDays(range.end, -(maxDays - 1)),
    end: range.end,
  }
}

function defaultSpanDays(granularity: GanttGranularity, today = getTodayIso()): number {
  const fallback = defaultRange(granularity, today)
  return daysBetween(fallback.start, fallback.end) + 1
}

/**
 * Build a closed axis range for column rendering from an open-ended filter.
 * Does not infer bounds from todo data.
 */
export function buildDisplayRange(
  filter: GanttRangeBounds,
  granularity: GanttGranularity,
  today = getTodayIso(),
): GanttRange {
  const fallback = defaultRange(granularity, today)
  const spanDays = defaultSpanDays(granularity, today)
  const filterStart = filter.start ? (isoToLocalDate(filter.start) ?? filter.start) : undefined
  const filterEnd = filter.end ? (isoToLocalDate(filter.end) ?? filter.end) : undefined

  if (filterStart && filterEnd) {
    let range = { start: filterStart, end: filterEnd }
    if (granularity === 'day') range = clampRangeDays(range, MAX_GANTT_DAY_COLUMNS)
    return range
  }

  if (filterEnd && !filterStart) {
    let range = {
      start: addDays(filterEnd, -(spanDays - 1)),
      end: filterEnd,
    }
    if (granularity === 'day') range = clampRangeDays(range, MAX_GANTT_DAY_COLUMNS)
    return range
  }

  if (filterStart && !filterEnd) {
    let range = {
      start: filterStart,
      end: addDays(filterStart, spanDays - 1),
    }
    if (granularity === 'day') range = clampRangeDays(range, MAX_GANTT_DAY_COLUMNS)
    return range
  }

  return fallback
}

export function spansIntersectFilter(
  spanStart: string,
  spanEnd: string,
  filter: GanttRangeBounds,
): boolean {
  if (filter.start && spanEnd < filter.start) return false
  if (filter.end && spanStart > filter.end) return false
  return true
}

export function isTodayInDisplayRange(
  displayRange: GanttRange,
  today = getTodayIso(),
): boolean {
  return isValidGanttRange(displayRange) && today >= displayRange.start && today <= displayRange.end
}

export function formatRangeFilterLabel(range: GanttRange): string {
  const hasStart = isIsoDate(range.start)
  const hasEnd = isIsoDate(range.end)
  if (hasStart && hasEnd) {
    return `${formatDueLabel(range.start)} — ${formatDueLabel(range.end)}`
  }
  if (hasStart) return `${formatDueLabel(range.start)} 起`
  if (hasEnd) return `至 ${formatDueLabel(range.end)}`
  return '未限定'
}

export type GanttBarLayout = {
  leftPx: number
  widthPx: number
  clipStart: boolean
  clipEnd: boolean
  isDot: boolean
}

export function getWeekMonday(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const weekday = date.getUTCDay()
  const diff = weekday === 0 ? -6 : 1 - weekday
  date.setUTCDate(date.getUTCDate() + diff)
  return date.toISOString().slice(0, 10)
}

export function getIsoWeekKey(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNum = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  )
  return `${date.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function monthStartIso(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}-01`
}

function monthEndIso(year: number, month: number): string {
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
}

function parseYearMonth(dateStr: string): { year: number; month: number } {
  const [year, month] = dateStr.split('-').map(Number)
  return { year, month }
}

export function defaultRange(
  granularity: GanttGranularity,
  today = getTodayIso(),
): GanttRange {
  if (granularity === 'day') {
    return { start: addDays(today, -7), end: addDays(today, 7) }
  }

  if (granularity === 'week') {
    const thisMonday = getWeekMonday(today)
    const thisSunday = addDays(thisMonday, 6)
    return {
      start: addDays(thisMonday, -14),
      end: addDays(thisSunday, 14),
    }
  }

  const { year, month } = parseYearMonth(today)
  const prevMonth = month === 1 ? 12 : month - 1
  const prevYear = month === 1 ? year - 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year

  return {
    start: monthStartIso(prevYear, prevMonth),
    end: monthEndIso(nextYear, nextMonth),
  }
}

export function buildColumns(
  granularity: GanttGranularity,
  range: GanttRange,
): GanttColumn[] {
  if (!isValidGanttRange(range)) return []

  const widthPx = getColumnWidth(granularity)

  if (granularity === 'day') {
    const columns: GanttColumn[] = []
    let current = range.start
    const maxDays = daysBetween(range.start, range.end) + 1
    if (maxDays > MAX_GANTT_DAY_COLUMNS) return []

    let guard = 0
    while (current <= range.end && guard < MAX_GANTT_DAY_COLUMNS) {
      columns.push({
        key: current,
        start: current,
        end: current,
        widthPx,
      })
      current = addDays(current, 1)
      guard++
    }
    return columns
  }

  if (granularity === 'week') {
    const columns: GanttColumn[] = []
    let weekMonday = getWeekMonday(range.start)
    while (weekMonday <= range.end) {
      const weekSunday = addDays(weekMonday, 6)
      const colStart = weekMonday < range.start ? range.start : weekMonday
      const colEnd = weekSunday > range.end ? range.end : weekSunday
      if (colStart <= colEnd) {
        columns.push({
          key: getIsoWeekKey(weekMonday),
          start: colStart,
          end: colEnd,
          widthPx,
        })
      }
      weekMonday = addDays(weekMonday, 7)
    }
    return columns
  }

  const columns: GanttColumn[] = []
  let { year, month } = parseYearMonth(range.start)
  const { year: endYear, month: endMonth } = parseYearMonth(range.end)

  while (year < endYear || (year === endYear && month <= endMonth)) {
    const mStart = monthStartIso(year, month)
    const mEnd = monthEndIso(year, month)
    const colStart = mStart < range.start ? range.start : mStart
    const colEnd = mEnd > range.end ? range.end : mEnd
    if (colStart <= colEnd) {
      columns.push({
        key: `${year}-${String(month).padStart(2, '0')}`,
        start: colStart,
        end: colEnd,
        widthPx,
      })
    }
    if (month === 12) {
      year++
      month = 1
    } else {
      month++
    }
  }
  return columns
}

export function spansIntersectRange(
  spanStart: string,
  spanEnd: string,
  range: GanttRange,
): boolean {
  if (!isValidGanttRange(range)) return false
  return spanStart <= range.end && spanEnd >= range.start
}

export function todoIntersectsRange(todo: TodoItem, range: GanttRange): boolean {
  if (!todo.dueDate) return false
  const { start, end } = normalizedSpan(todo)
  return spansIntersectRange(start, end, range)
}

export function filterTodosInRange(todos: TodoItem[], range: GanttRange): TodoItem[] {
  return todos.filter((todo) => todoIntersectsRange(todo, range))
}

function columnDayCount(column: GanttColumn): number {
  return daysBetween(column.start, column.end) + 1
}

export function computeBarLayout(
  todo: TodoItem,
  columns: GanttColumn[],
  displayRange: GanttRange,
  filter: GanttRangeBounds = {},
): GanttBarLayout {
  const { start, end } = normalizedSpan(todo)
  const clipStart =
    (filter.start != null && start < filter.start) || start < displayRange.start
  const clipEnd = (filter.end != null && end > filter.end) || end > displayRange.end
  const visibleStart = start < displayRange.start ? displayRange.start : start
  const visibleEnd = end > displayRange.end ? displayRange.end : end

  if (!todo.startDate) {
    const due = todo.dueDate ?? end
    let accumulated = 0
    for (const col of columns) {
      if (due >= col.start && due <= col.end) {
        const colDays = columnDayCount(col)
        const dayOffset = daysBetween(col.start, due)
        const leftPx =
          accumulated + (dayOffset / colDays) * col.widthPx + (col.widthPx - 8) / 2
        return { leftPx, widthPx: 8, clipStart, clipEnd, isDot: true }
      }
      accumulated += col.widthPx
    }
    return { leftPx: 0, widthPx: 8, clipStart, clipEnd, isDot: true }
  }

  let leftPx = 0
  let widthPx = 0
  let started = false

  for (const col of columns) {
    if (visibleEnd < col.start || visibleStart > col.end) {
      if (!started) leftPx += col.widthPx
      continue
    }

    const overlapStart = visibleStart > col.start ? visibleStart : col.start
    const overlapEnd = visibleEnd < col.end ? visibleEnd : col.end
    const colDays = columnDayCount(col)
    const overlapDays = daysBetween(overlapStart, overlapEnd) + 1
    const segmentWidth = (overlapDays / colDays) * col.widthPx

    if (!started) {
      const dayOffset = daysBetween(col.start, overlapStart)
      leftPx += (dayOffset / colDays) * col.widthPx
      started = true
    }

    widthPx += segmentWidth
  }

  return {
    leftPx,
    widthPx: Math.max(widthPx, 6),
    clipStart,
    clipEnd,
    isDot: false,
  }
}

export function computeTodayColumnOffset(
  columns: GanttColumn[],
  today: string,
  range: GanttRange,
  granularity: GanttGranularity = 'day',
): number | null {
  if (today < range.start || today > range.end) return null

  let offset = 0
  for (const col of columns) {
    if (today >= col.start && today <= col.end) {
      if (granularity === 'month') {
        return offset + col.widthPx / 2
      }
      const colDays = columnDayCount(col)
      const dayOffset = daysBetween(col.start, today)
      return offset + (dayOffset / colDays) * col.widthPx + col.widthPx / 2
    }
    offset += col.widthPx
  }
  return null
}

export function formatColumnHeader(
  column: GanttColumn,
  granularity: GanttGranularity,
  today: string,
): { label: string; sublabel?: string; isToday: boolean } {
  if (granularity === 'day') {
    const isToday = column.start === today
    return {
      label: formatDueLabel(column.start),
      sublabel: isToday ? '今天' : undefined,
      isToday,
    }
  }

  if (granularity === 'week') {
    const weekNum = Number(column.key.split('-W')[1])
    const month = Number(column.start.split('-')[1])
    const isToday = today >= column.start && today <= column.end
    return {
      label: `${month}月`,
      sublabel: `第${weekNum}周`,
      isToday,
    }
  }

  const [year, month] = column.key.split('-').map(Number)
  const isToday = today.startsWith(column.key)
  return {
    label: `${year}年`,
    sublabel: `${month}月`,
    isToday,
  }
}

export function formatWeekLabel(weekKey: string): string {
  const weekNum = Number(weekKey.split('-W')[1])
  return `第 ${weekNum} 周`
}

export function formatMonthGroupLabel(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  return `${year}年${month}月`
}

export function getOverviewGroupKey(
  dueDate: string,
  granularity: GanttGranularity,
): string {
  if (granularity === 'day') return dueDate
  if (granularity === 'week') return getIsoWeekKey(dueDate)
  return dueDate.slice(0, 7)
}
