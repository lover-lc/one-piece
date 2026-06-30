import { describe, expect, it } from 'vitest'
import { computeNextRecurrenceDue } from '../src/modules/todos/lib/recurrence-next-date'

describe('computeNextRecurrenceDue', () => {
  it('advances by interval days for custom frequency', () => {
    expect(
      computeNextRecurrenceDue({ frequency: 'custom', interval: 3 }, '2026-06-30'),
    ).toBe('2026-07-03')
  })

  it('finds next weekday in weekdays list', () => {
    expect(
      computeNextRecurrenceDue(
        { frequency: 'custom', interval: 1, weekdays: [1, 3, 5] },
        '2026-06-30',
      ),
    ).toBe('2026-07-01')
  })

  it('wraps to next week for weekend selection from friday', () => {
    expect(
      computeNextRecurrenceDue(
        { frequency: 'custom', interval: 1, weekdays: [6, 7] },
        '2026-06-30',
      ),
    ).toBe('2026-07-04')
  })
})
