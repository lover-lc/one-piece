import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcBmrMifflinStJeor, calcDailyKcalTarget } from '../src/modules/checkin/lib/bmr'

describe('calcBmrMifflinStJeor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-06T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calculates male BMR with Mifflin-St Jeor', () => {
    const bmr = calcBmrMifflinStJeor({
      weightKg: 80,
      heightCm: 180,
      gender: 'male',
      birthDate: '1996-07-06',
    })
    expect(bmr).toBe(1780)
  })

  it('calculates female BMR with Mifflin-St Jeor', () => {
    const bmr = calcBmrMifflinStJeor({
      weightKg: 80,
      heightCm: 180,
      gender: 'female',
      birthDate: '1996-07-06',
    })
    expect(bmr).toBe(1614)
  })
})

describe('calcDailyKcalTarget', () => {
  it('applies sedentary activity multiplier', () => {
    expect(calcDailyKcalTarget(1780, 'sedentary')).toBe(2136)
  })

  it('applies light activity multiplier', () => {
    expect(calcDailyKcalTarget(1780, 'light')).toBe(2448)
  })

  it('applies moderate activity multiplier', () => {
    expect(calcDailyKcalTarget(1780, 'moderate')).toBe(2759)
  })

  it('applies heavy activity multiplier', () => {
    expect(calcDailyKcalTarget(1780, 'heavy')).toBe(3071)
  })
})
