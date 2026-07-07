import { describe, expect, it } from 'vitest'
import {
  compareDietRates,
  compareGoalRates,
  resolveDimensionWinner,
} from '../src/modules/checkin/lib/scoring'

describe('compareDietRates', () => {
  it('picks higher rate when both are within target', () => {
    expect(compareDietRates(80, 60, false, false)).toBe('a')
    expect(compareDietRates(60, 80, false, false)).toBe('b')
  })

  it('picks the member who did not exceed target when only one is over', () => {
    expect(compareDietRates(110, 90, true, false)).toBe('b')
    expect(compareDietRates(90, 110, false, true)).toBe('a')
  })

  it('picks the member closer to 100% when both exceeded target', () => {
    expect(compareDietRates(120, 150, true, true)).toBe('a')
    expect(compareDietRates(150, 120, true, true)).toBe('b')
  })

  it('returns tie when rates are equal under the same over state', () => {
    expect(compareDietRates(80, 80, false, false)).toBe('tie')
    expect(compareDietRates(120, 120, true, true)).toBe('tie')
  })

  it('treats missing rates as 0% and returns null when both are missing', () => {
    expect(compareDietRates(null, null, false, false)).toBe(null)
    expect(compareDietRates(undefined, undefined, false, false)).toBe(null)
  })

  it('treats a single missing rate as 0%', () => {
    expect(compareDietRates(null, 50, false, false)).toBe('b')
    expect(compareDietRates(50, null, false, false)).toBe('a')
    expect(compareDietRates(null, 0, false, false)).toBe('tie')
  })
})

describe('compareGoalRates', () => {
  it('picks the higher completion rate', () => {
    expect(compareGoalRates(80, 60)).toBe('a')
    expect(compareGoalRates(60, 80)).toBe('b')
  })

  it('returns tie when completion rates are equal', () => {
    expect(compareGoalRates(50, 50)).toBe('tie')
  })

  it('treats missing rates as 0%', () => {
    expect(compareGoalRates(null, 40)).toBe('b')
    expect(compareGoalRates(40, null)).toBe('a')
    expect(compareGoalRates(null, null)).toBe('tie')
  })
})

describe('resolveDimensionWinner', () => {
  const memberA = 'member-a'
  const memberB = 'member-b'

  it('maps goal-rate winners to member ids', () => {
    expect(resolveDimensionWinner(memberA, memberB, 80, 60)).toEqual({
      winnerId: memberA,
      result: 'a',
    })
    expect(resolveDimensionWinner(memberA, memberB, 60, 80)).toEqual({
      winnerId: memberB,
      result: 'b',
    })
    expect(resolveDimensionWinner(memberA, memberB, 50, 50)).toEqual({
      winnerId: null,
      result: 'tie',
    })
  })

  it('uses diet over-limit rules when dimension is diet', () => {
    expect(
      resolveDimensionWinner(memberA, memberB, 110, 90, {
        dimension: 'diet',
        overA: true,
        overB: false,
      }),
    ).toEqual({
      winnerId: memberB,
      result: 'b',
    })
  })

  it('returns tie when both members are missing targets', () => {
    expect(
      resolveDimensionWinner(memberA, memberB, null, null, {
        missingA: true,
        missingB: true,
      }),
    ).toEqual({
      winnerId: null,
      result: 'tie',
    })
  })

  it('gives the win to the member with a target when only one is missing', () => {
    expect(
      resolveDimensionWinner(memberA, memberB, null, null, {
        missingA: true,
        missingB: false,
      }),
    ).toEqual({
      winnerId: memberB,
      result: 'b',
    })
  })
})
