const SHANGHAI_TIMEZONE = 'Asia/Shanghai'
const DAY_START_MINUTES = 6 * 60
const DAY_END_MINUTES = 23 * 60 + 30
const SLOT_MINUTES = 30

type TimelineMember = {
  id: string
  sortOrder: number
}

export type TimelineLaneRecord = {
  id: string
  recordedAt: string
  slotDate: string
  payload: Record<string, unknown>
}

type TimelineSlot = {
  time: string
  left: TimelineLaneRecord[]
  right: TimelineLaneRecord[]
}

function formatSlotTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function getShanghaiTimeParts(iso: string): { date: string; minutes: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const parts = formatter.formatToParts(new Date(iso))
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  const date = `${values.year}-${values.month}-${values.day}`
  const minutes = Number(values.hour) * 60 + Number(values.minute)

  return { date, minutes }
}

function slotStartMinutes(minutes: number): number {
  const offset = minutes - DAY_START_MINUTES
  if (offset < 0) {
    return DAY_START_MINUTES
  }
  const slotIndex = Math.floor(offset / SLOT_MINUTES)
  return DAY_START_MINUTES + slotIndex * SLOT_MINUTES
}

function buildAllSlots(): TimelineSlot[] {
  const slots: TimelineSlot[] = []
  for (let minutes = DAY_START_MINUTES; minutes <= DAY_END_MINUTES; minutes += SLOT_MINUTES) {
    slots.push({
      time: formatSlotTime(minutes),
      left: [],
      right: [],
    })
  }
  return slots
}

function collapseEmptySlots(slots: TimelineSlot[]): TimelineSlot[] {
  const hasContent = (slot: TimelineSlot) => slot.left.length > 0 || slot.right.length > 0
  const contentIndexes = slots
    .map((slot, index) => (hasContent(slot) ? index : -1))
    .filter((index) => index >= 0)

  if (contentIndexes.length === 0) {
    return []
  }

  const collapsed: TimelineSlot[] = []
  let previousContentIndex: number | null = null

  for (const contentIndex of contentIndexes) {
    if (previousContentIndex == null) {
      collapsed.push(slots[contentIndex])
      previousContentIndex = contentIndex
      continue
    }

    const gapStart = previousContentIndex + 1
    const gapEnd = contentIndex - 1

    if (gapStart <= gapEnd) {
      collapsed.push(slots[gapStart])
    }

    collapsed.push(slots[contentIndex])
    previousContentIndex = contentIndex
  }

  return collapsed
}

export function buildHalfHourLanes<T extends TimelineLaneRecord>(
  recordsA: T[],
  recordsB: T[],
  date: string,
  _members: TimelineMember[],
): { slots: Array<{ time: string; left: T[]; right: T[] }> } {
  const slots = buildAllSlots()
  const slotByTime = new Map(slots.map((slot) => [slot.time, slot]))

  const assignRecord = (record: T, lane: 'left' | 'right') => {
    const { date: recordDate, minutes } = getShanghaiTimeParts(record.recordedAt)
    if (recordDate !== date) {
      return
    }

    const slotTime = formatSlotTime(slotStartMinutes(minutes))
    const slot = slotByTime.get(slotTime)
    if (!slot) {
      return
    }

    slot[lane].push(record)
  }

  for (const record of recordsA) {
    assignRecord(record, 'left')
  }
  for (const record of recordsB) {
    assignRecord(record, 'right')
  }

  return { slots: collapseEmptySlots(slots) as Array<{ time: string; left: T[]; right: T[] }> }
}
