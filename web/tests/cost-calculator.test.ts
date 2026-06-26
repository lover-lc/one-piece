import { describe, expect, it } from 'vitest'
import {
  dailyCost,
  formatDailyCost,
  formatUnitPrice,
  unitPrice,
  usedDays,
} from '../src/modules/items/lib/cost-calculator'
import { parseISODate } from '../src/shared/lib/date-utils'

describe('usedDays', () => {
  it('returns 1 for same-day use', () => {
    const date = new Date()
    expect(usedDays(date, date)).toBe(1)
  })

  it('counts inclusive days across a date range', () => {
    const start = parseISODate('2026-06-01')
    const end = parseISODate('2026-06-10')
    expect(usedDays(start, end)).toBe(10)
  })
})

describe('dailyCost', () => {
  it('returns 0 when price is 0', () => {
    expect(dailyCost(0, 5)).toBe(0)
  })

  it('divides price by used days', () => {
    expect(dailyCost(100, 4)).toBe(25)
  })

  it('returns full price for same-day purchase', () => {
    expect(dailyCost(50, 1)).toBe(50)
  })
})

describe('formatDailyCost', () => {
  it('formats cost as yen per day', () => {
    expect(formatDailyCost(12.5)).toBe('¥12.50/天')
  })
})

describe('unitPrice', () => {
  it('returns 0 when quantity is 0', () => {
    expect(unitPrice(100, 0)).toBe(0)
  })

  it('divides price by quantity', () => {
    expect(unitPrice(100, 4)).toBe(25)
  })
})

describe('formatUnitPrice', () => {
  it('formats unit price with unit name', () => {
    expect(formatUnitPrice(40, 2, '千克')).toBe('¥20.00/千克')
  })
})
