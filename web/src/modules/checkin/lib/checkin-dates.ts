const SHANGHAI_TIMEZONE = 'Asia/Shanghai'

export function getShanghaiDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function isRecordEditable(
  slotDate: string,
  today: string = getShanghaiDateString(),
): boolean {
  return slotDate >= today
}
