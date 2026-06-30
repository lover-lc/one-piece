import { format, parseISO, setHours, setMinutes } from 'date-fns'
import { toISODate } from './date-utils'

export function isoToLocalDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  try {
    return toISODate(parseISO(iso))
  } catch {
    return iso.slice(0, 10)
  }
}

export function formatTimeFromIso(iso: string | null | undefined): string {
  if (!iso) return '09:00'
  try {
    return format(parseISO(iso), 'HH:mm')
  } catch {
    return '09:00'
  }
}

export function composeLocalIso(date: string, time: string): string {
  const [hours, minutes] = time.split(':').map((part) => parseInt(part, 10))
  const base = parseISO(`${date}T00:00:00`)
  return setHours(setMinutes(base, minutes || 0), hours || 0).toISOString()
}

export function composeAllDayIso(date: string): string {
  return parseISO(`${date}T00:00:00`).toISOString()
}

export function hasSpecificTime(iso: string | null | undefined, isAllDay: boolean): boolean {
  if (!iso || isAllDay) return false
  const time = formatTimeFromIso(iso)
  return time !== '00:00'
}

export function formatDateTimeDisplay(
  iso: string | null | undefined,
  isAllDay: boolean,
): string {
  if (!iso) return '未设置'
  const date = isoToLocalDate(iso)
  if (!date) return '未设置'
  if (isAllDay || !hasSpecificTime(iso, isAllDay)) {
    return `${date.replace(/-/g, '/')}`
  }
  return `${date.replace(/-/g, '/')} ${formatTimeFromIso(iso)}`
}
