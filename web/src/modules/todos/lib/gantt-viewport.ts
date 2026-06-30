import {
  addDays,
  getTodayIso,
} from './timeline-utils'
import {
  buildColumns,
  getWeekMonday,
  sumTimelineWidth,
  type GanttGranularity,
  type GanttRange,
} from './gantt-scale'

const VIEWPORT_SPAN = {
  day: { before: 30, after: 30, expand: 30 },
  week: { before: 84, after: 84, expand: 56 },
  month: { before: 180, after: 180, expand: 120 },
} as const

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

export function initialGanttViewport(
  granularity: GanttGranularity,
  anchor = getTodayIso(),
): GanttRange {
  const span = VIEWPORT_SPAN[granularity]

  if (granularity === 'month') {
    const { year, month } = parseYearMonth(anchor)
    let startYear = year
    let startMonth = month - 6
    while (startMonth < 1) {
      startMonth += 12
      startYear--
    }
    let endYear = year
    let endMonth = month + 6
    while (endMonth > 12) {
      endMonth -= 12
      endYear++
    }
    return {
      start: monthStartIso(startYear, startMonth),
      end: monthEndIso(endYear, endMonth),
    }
  }

  return {
    start: addDays(anchor, -span.before),
    end: addDays(anchor, span.after),
  }
}

export function ensureDateInViewport(
  viewport: GanttRange,
  date: string,
  granularity: GanttGranularity,
): GanttRange {
  if (date >= viewport.start && date <= viewport.end) return viewport
  return initialGanttViewport(granularity, date)
}

function segmentBefore(range: GanttRange, granularity: GanttGranularity, days: number) {
  const nextStart =
    granularity === 'week'
      ? addDays(getWeekMonday(addDays(range.start, -days)), 0)
      : addDays(range.start, -days)
  const segmentEnd = addDays(range.start, -1)
  if (nextStart > segmentEnd) {
    return { next: range, prependedWidth: 0 }
  }
  const cols = buildColumns(granularity, { start: nextStart, end: segmentEnd })
  return {
    next: { start: nextStart, end: range.end },
    prependedWidth: sumTimelineWidth(cols),
  }
}

function segmentAfter(range: GanttRange, granularity: GanttGranularity, days: number) {
  const nextEnd = addDays(range.end, days)
  const segmentStart = addDays(range.end, 1)
  if (segmentStart > nextEnd) {
    return { next: range, appendedWidth: 0 }
  }
  const cols = buildColumns(granularity, { start: segmentStart, end: nextEnd })
  return {
    next: { start: range.start, end: nextEnd },
    appendedWidth: sumTimelineWidth(cols),
  }
}

export function expandGanttViewportStart(
  viewport: GanttRange,
  granularity: GanttGranularity,
): { viewport: GanttRange; prependedWidth: number } {
  const days = VIEWPORT_SPAN[granularity].expand
  const { next, prependedWidth } = segmentBefore(viewport, granularity, days)
  return { viewport: next, prependedWidth }
}

export function expandGanttViewportEnd(
  viewport: GanttRange,
  granularity: GanttGranularity,
): { viewport: GanttRange; appendedWidth: number } {
  const days = VIEWPORT_SPAN[granularity].expand
  const { next } = segmentAfter(viewport, granularity, days)
  return { viewport: next, appendedWidth: 0 }
}
