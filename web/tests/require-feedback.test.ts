import { describe, expect, it } from 'vitest'
import {
  deriveRequireFeedback,
  normalizeAssigneeIds,
} from '../src/modules/todos/lib/require-feedback'

describe('deriveRequireFeedback', () => {
  it('returns true when assignees are all others', () => {
    expect(deriveRequireFeedback(['b'], 'a')).toBe(true)
    expect(deriveRequireFeedback(['b', 'c'], 'a')).toBe(true)
  })

  it('returns false when self is among assignees', () => {
    expect(deriveRequireFeedback(['a'], 'a')).toBe(false)
    expect(deriveRequireFeedback(['b', 'a'], 'a')).toBe(false)
  })

  it('returns false when empty or no current member', () => {
    expect(deriveRequireFeedback([], 'a')).toBe(false)
    expect(deriveRequireFeedback(['a'], null)).toBe(false)
  })
})

describe('normalizeAssigneeIds', () => {
  it('puts current member first when present', () => {
    expect(normalizeAssigneeIds(['b', 'a'], 'a')).toEqual(['a', 'b'])
  })

  it('defaults to current member when empty', () => {
    expect(normalizeAssigneeIds([], 'a')).toEqual(['a'])
  })

  it('preserves order when self is not included', () => {
    expect(normalizeAssigneeIds(['b', 'c'], 'a')).toEqual(['b', 'c'])
  })
})
