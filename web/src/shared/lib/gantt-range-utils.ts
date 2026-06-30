import { parseISO, setHours, setMinutes, setSeconds } from 'date-fns'
import { composeAllDayIso, formatDateTimeDisplay, isoToLocalDate } from './datetime-utils'
import { isIsoDate, type GanttRange } from '../../modules/todos/lib/gantt-scale'

export type GanttRangeBounds = {
  start?: string
  end?: string
}

export function rangeValueHasTime(value: string): boolean {
  return value.includes('T')
}

export function formatGanttRangeEndpoint(
  value: string,
  placeholder: string,
): string {
  if (!value) return placeholder
  const date = isoToLocalDate(value) ?? value
  if (!isIsoDate(date)) return placeholder
  if (rangeValueHasTime(value)) {
    return formatDateTimeDisplay(value, false)
  }
  return date.replace(/-/g, '/')
}

export function ganttRangeToBounds(range: GanttRange): GanttRangeBounds {
  const bounds: GanttRangeBounds = {}

  if (range.start) {
    const date = isoToLocalDate(range.start) ?? range.start
    if (isIsoDate(date)) {
      bounds.start = rangeValueHasTime(range.start)
        ? range.start
        : composeAllDayIso(date)
    }
  }

  if (range.end) {
    const date = isoToLocalDate(range.end) ?? range.end
    if (isIsoDate(date)) {
      if (rangeValueHasTime(range.end)) {
        bounds.end = range.end
      } else {
        const end = parseISO(`${date}T00:00:00`)
        bounds.end = setSeconds(setMinutes(setHours(end, 23), 59), 59).toISOString()
      }
    }
  }

  return bounds
}

export function spansIntersectTimestampFilter(
  spanStartIso: string,
  spanEndIso: string,
  filter: GanttRangeBounds,
): boolean {
  if (filter.start && spanEndIso < filter.start) return false
  if (filter.end && spanStartIso > filter.end) return false
  return true
}
