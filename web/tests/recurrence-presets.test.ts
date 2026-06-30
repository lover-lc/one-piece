import { describe, expect, it } from 'vitest'
import {
  getOrderedRecurrencePresets,
  matchRecurrencePresetId,
  presetToRecurrenceRule,
  recurrenceRuleSignature,
} from '../src/modules/todos/lib/recurrence-presets'

describe('recurrence-presets', () => {
  it('orders and filters disabled presets', () => {
    const custom = [
      {
        id: 'custom:a',
        name: '每 3 天',
        rule: { frequency: 'custom' as const, interval: 3 },
      },
    ]
    const ordered = getOrderedRecurrencePresets(custom, ['custom:a', 'builtin:daily'], ['builtin:weekly'], {
      enabledOnly: true,
    })
    expect(ordered.map((p) => p.id).slice(0, 2)).toEqual(['custom:a', 'builtin:daily'])
    expect(ordered.some((p) => p.id === 'builtin:weekly')).toBe(false)
  })

  it('matches rule signature to preset id', () => {
    const id = matchRecurrencePresetId(
      { frequency: 'custom', interval: 1, weekdays: [1, 2, 3, 4, 5], endType: 'never' },
      [],
    )
    expect(id).toBe('builtin:weekdays')
  })

  it('preserves generatedCount when converting preset', () => {
    const rule = presetToRecurrenceRule(
      { id: 'builtin:daily', name: '每天', rule: { frequency: 'daily', interval: 1 } },
      { frequency: 'daily', interval: 1, endType: 'never', generatedCount: 4 },
    )
    expect(rule?.generatedCount).toBe(4)
  })

  it('builds stable signatures', () => {
    const a = recurrenceRuleSignature({
      frequency: 'custom',
      interval: 1,
      weekdays: [3, 1, 5],
    })
    const b = recurrenceRuleSignature({
      frequency: 'custom',
      interval: 1,
      weekdays: [1, 3, 5],
    })
    expect(a).toBe(b)
  })
})
