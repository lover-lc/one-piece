import { addDays } from './day-rates'

export function monthKeyFromDate(dateStr: string): string {
  return dateStr.slice(0, 7)
}

export function firstDayOfMonth(monthKey: string): string {
  return `${monthKey}-01`
}

export function lastDayOfMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number)
  const last = new Date(year, month, 0).getDate()
  return `${monthKey}-${String(last).padStart(2, '0')}`
}

export function addMonths(monthKey: string, delta: number): string {
  const [year, month] = monthKey.split('-').map(Number)
  const date = new Date(year, month - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function formatMonthTitle(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  return `${year}年${Number(month)}月`
}

export function dayOfMonth(dateStr: string): number {
  return Number(dateStr.split('-')[2])
}

/** Sunday-start month grid; null = empty padding cell. */
export function getMonthGrid(monthKey: string): (string | null)[] {
  const first = firstDayOfMonth(monthKey)
  const startWeekday = new Date(`${first}T12:00:00`).getDay()
  const [year, month] = monthKey.split('-').map(Number)
  const daysInMonth = new Date(year, month, 0).getDate()

  const cells: (string | null)[] = []
  for (let i = 0; i < startWeekday; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${monthKey}-${String(d).padStart(2, '0')}`)
  }
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

export function monthDateRange(monthKey: string): { from: string; to: string } {
  return { from: firstDayOfMonth(monthKey), to: lastDayOfMonth(monthKey) }
}

export function isFutureDate(dateStr: string, today: string): boolean {
  return dateStr > today
}

export function contrastTextColor(bgHex: string): string {
  const hex = bgHex.replace('#', '')
  if (hex.length !== 6) return '#ffffff'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.55 ? '#0f172a' : '#ffffff'
}

export { addDays }
