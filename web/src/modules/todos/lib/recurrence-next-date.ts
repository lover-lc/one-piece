import type { RecurrenceRule } from '../types/todo-types'

/** ISO weekday: 1=Monday … 7=Sunday */
export function dateToIsoWeekday(date: Date): number {
  const day = date.getDay()
  return day === 0 ? 7 : day
}

function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatYmd(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function nextMatchingWeekday(from: Date, weekdays: number[]): Date {
  const sorted = [...weekdays].sort((a, b) => a - b)
  for (let offset = 1; offset <= 7; offset++) {
    const candidate = addDays(from, offset)
    if (sorted.includes(dateToIsoWeekday(candidate))) return candidate
  }
  return addDays(from, 1)
}

/**
 * Compute the next due date after `fromYmd` for a recurrence rule.
 * `fromYmd` is the completed instance's due date (YYYY-MM-DD).
 */
export function computeNextRecurrenceDue(
  rule: Pick<RecurrenceRule, 'frequency' | 'interval' | 'weekdays'>,
  fromYmd: string,
): string {
  const from = parseYmd(fromYmd)
  const interval = Math.max(1, rule.interval || 1)

  if (rule.weekdays && rule.weekdays.length > 0) {
    return formatYmd(nextMatchingWeekday(from, rule.weekdays))
  }

  switch (rule.frequency) {
    case 'daily':
      return formatYmd(addDays(from, interval))
    case 'weekly':
      return formatYmd(addDays(from, interval * 7))
    case 'monthly':
      return formatYmd(addMonths(from, interval))
    case 'custom':
    default:
      return formatYmd(addDays(from, interval))
  }
}
