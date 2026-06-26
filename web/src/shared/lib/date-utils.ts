export function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

export function toISODate(date: Date): string {
  const d = startOfDay(date)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseISODate(str: string): Date {
  const [year, month, day] = str.split('-').map(Number)
  return startOfDay(new Date(year, month - 1, day))
}

export function formatDisplayDate(iso: string): string {
  const { year, month, day } = (() => {
    const date = parseISODate(iso)
    return {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
    }
  })()
  return `${year}年${month}月${day}日`
}

/** Calendar day difference from start to end (not inclusive). */
export function daysBetween(start: Date, end: Date): number {
  const startDay = startOfDay(start)
  const endDay = startOfDay(end)
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((endDay.getTime() - startDay.getTime()) / msPerDay)
}
