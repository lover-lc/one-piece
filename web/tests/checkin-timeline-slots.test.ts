import { describe, expect, it } from 'vitest'
import { buildHalfHourLanes } from '../src/modules/checkin/lib/timeline-slots'

type TimelineRecord = {
  id: string
  recordedAt: string
  slotDate: string
  payload: Record<string, unknown>
}

const members = [
  { id: 'member-a', sortOrder: 0 },
  { id: 'member-b', sortOrder: 1 },
]

function makeRecord(
  id: string,
  memberId: string,
  time: string,
  date = '2026-07-06',
): TimelineRecord & { memberId: string } {
  return {
    id,
    memberId,
    recordedAt: `${date}T${time}:00+08:00`,
    slotDate: date,
    payload: { label: id },
  }
}

describe('buildHalfHourLanes', () => {
  it('places records into 30-minute lanes for the selected date', () => {
    const recordsA = [makeRecord('breakfast', 'member-a', '09:05')]
    const recordsB = [makeRecord('water', 'member-b', '10:10')]

    const { slots } = buildHalfHourLanes(recordsA, recordsB, '2026-07-06', members)

    const nine = slots.find((slot) => slot.time === '09:00')
    const ten = slots.find((slot) => slot.time === '10:00')

    expect(nine?.left).toHaveLength(1)
    expect(nine?.right).toHaveLength(0)
    expect(ten?.left).toHaveLength(0)
    expect(ten?.right).toHaveLength(1)
  })

  it('collapses long empty runs to a single gap slot between content', () => {
    const recordsA = [makeRecord('breakfast', 'member-a', '09:05')]
    const recordsB = [makeRecord('water', 'member-b', '14:05')]

    const { slots } = buildHalfHourLanes(recordsA, recordsB, '2026-07-06', members)
    const times = slots.map((slot) => slot.time)

    expect(times).toEqual(['09:00', '09:30', '14:00'])
    expect(slots[1]?.left).toHaveLength(0)
    expect(slots[1]?.right).toHaveLength(0)
  })

  it('keeps adjacent content slots without inserting a gap', () => {
    const recordsA = [
      makeRecord('breakfast', 'member-a', '09:05'),
      makeRecord('snack', 'member-a', '09:40'),
    ]

    const { slots } = buildHalfHourLanes(recordsA, [], '2026-07-06', members)

    expect(slots.map((slot) => slot.time)).toEqual(['09:00', '09:30'])
  })

  it('ignores records from other dates', () => {
    const recordsA = [makeRecord('breakfast', 'member-a', '09:05', '2026-07-05')]

    const { slots } = buildHalfHourLanes(recordsA, [], '2026-07-06', members)

    expect(slots).toHaveLength(0)
  })
})
