import { describe, expect, it } from 'vitest'
import {
  getEnabledReminderOptions,
  getOrderedReminderPresets,
  REMINDER_NONE_ID,
} from '../src/modules/todos/lib/reminder-presets'

describe('reminder-presets ordering', () => {
  it('prepends none and respects disabled filter', () => {
    const options = getEnabledReminderOptions([], ['builtin:1h', 'builtin:15m'], ['builtin:15m'])
    expect(options[0]).toEqual({ id: REMINDER_NONE_ID, name: '不提醒' })
    expect(options.some((o) => o.id === 'builtin:15m')).toBe(false)
    expect(options.some((o) => o.id === 'builtin:1h')).toBe(true)
  })

  it('orders custom presets after explicit order', () => {
    const custom = [
      {
        id: 'custom:x',
        name: '自定义',
        kind: 'offset' as const,
        offsetMinutes: 30,
      },
    ]
    const ordered = getOrderedReminderPresets(custom, ['custom:x', 'builtin:1d'], [])
    expect(ordered.map((p) => p.id).slice(0, 2)).toEqual(['custom:x', 'builtin:1d'])
  })
})
