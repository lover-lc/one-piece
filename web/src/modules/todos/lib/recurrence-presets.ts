import type { RecurrenceRule } from '../types/todo-types'
import { filterDisabledPresets, orderByPresetIds } from './preset-order'

export type RecurrencePresetRule = Omit<
  RecurrenceRule,
  'endType' | 'endDate' | 'endCount' | 'generatedCount'
> | null

export type RecurrencePreset = {
  id: string
  name: string
  builtin?: boolean
  rule: RecurrencePresetRule
}

export const BUILTIN_RECURRENCE_PRESETS: RecurrencePreset[] = [
  { id: 'builtin:none', name: '不重复', rule: null, builtin: true },
  {
    id: 'builtin:daily',
    name: '每天',
    rule: { frequency: 'daily', interval: 1 },
    builtin: true,
  },
  {
    id: 'builtin:weekly',
    name: '每周',
    rule: { frequency: 'weekly', interval: 1 },
    builtin: true,
  },
  {
    id: 'builtin:monthly',
    name: '每月',
    rule: { frequency: 'monthly', interval: 1 },
    builtin: true,
  },
  {
    id: 'builtin:weekdays',
    name: '工作日',
    rule: { frequency: 'custom', interval: 1, weekdays: [1, 2, 3, 4, 5] },
    builtin: true,
  },
]

export const DEFAULT_RECURRENCE_PRESET_ORDER = BUILTIN_RECURRENCE_PRESETS.map((p) => p.id)

export const WEEKDAY_LABELS: Record<number, string> = {
  1: '周一',
  2: '周二',
  3: '周三',
  4: '周四',
  5: '周五',
  6: '周六',
  7: '周日',
}

export function recurrenceRuleSignature(
  rule: Pick<RecurrenceRule, 'frequency' | 'interval' | 'weekdays'> | null,
): string {
  if (!rule) return 'none'
  const wd = [...(rule.weekdays ?? [])].sort((a, b) => a - b).join(',')
  return `${rule.frequency}|${rule.interval}|${wd}`
}

export function presetRuleSignature(preset: RecurrencePreset): string {
  return recurrenceRuleSignature(preset.rule)
}

export function mergeRecurrencePresets(custom: RecurrencePreset[]): RecurrencePreset[] {
  const customIds = new Set(custom.map((p) => p.id))
  const builtins = BUILTIN_RECURRENCE_PRESETS.filter((p) => !customIds.has(p.id))
  return [...builtins, ...custom.filter((p) => !p.builtin)]
}

export function getOrderedRecurrencePresets(
  custom: RecurrencePreset[],
  order: string[],
  disabled: string[],
  { enabledOnly = false }: { enabledOnly?: boolean } = {},
): RecurrencePreset[] {
  const merged = mergeRecurrencePresets(custom)
  const ordered = orderByPresetIds(merged, order, DEFAULT_RECURRENCE_PRESET_ORDER)
  if (!enabledOnly) return ordered
  return filterDisabledPresets(ordered, disabled)
}

export function findRecurrencePreset(
  presetId: string,
  custom: RecurrencePreset[],
): RecurrencePreset | undefined {
  return mergeRecurrencePresets(custom).find((p) => p.id === presetId)
}

export function matchRecurrencePresetId(
  rule: RecurrenceRule | null,
  custom: RecurrencePreset[],
): string | null {
  if (!rule) return 'builtin:none'
  const sig = recurrenceRuleSignature(rule)
  const match = mergeRecurrencePresets(custom).find(
    (p) => p.rule && recurrenceRuleSignature(p.rule) === sig,
  )
  return match?.id ?? null
}

export function formatRecurrenceRuleSummary(rule: RecurrenceRule): string {
  if (rule.weekdays && rule.weekdays.length > 0) {
    const sorted = [...rule.weekdays].sort((a, b) => a - b)
    if (sorted.length === 5 && sorted.every((d) => d >= 1 && d <= 5)) {
      return '工作日'
    }
    return sorted.map((d) => WEEKDAY_LABELS[d]).join('、')
  }
  if (rule.frequency === 'daily' && rule.interval === 1) return '每天'
  if (rule.frequency === 'weekly' && rule.interval === 1) return '每周'
  if (rule.frequency === 'monthly' && rule.interval === 1) return '每月'
  if (rule.frequency === 'custom' || rule.interval > 1) {
    return `每 ${rule.interval} 天`
  }
  return rule.frequency
}

export function presetToRecurrenceRule(
  preset: RecurrencePreset,
  existing?: RecurrenceRule | null,
): RecurrenceRule | null {
  if (!preset.rule) return null
  return {
    ...preset.rule,
    endType: existing?.endType ?? 'never',
    endDate: existing?.endDate,
    endCount: existing?.endCount,
    generatedCount: existing?.generatedCount ?? 0,
  }
}

export type RecurrenceCustomKind = 'interval_days' | 'weekdays'

export function createCustomRecurrencePreset(input: {
  name: string
  kind: RecurrenceCustomKind
  intervalDays?: number
  weekdays?: number[]
}): RecurrencePreset {
  const rule: NonNullable<RecurrencePresetRule> =
    input.kind === 'interval_days'
      ? { frequency: 'custom', interval: Math.max(1, input.intervalDays ?? 2) }
      : {
          frequency: 'custom',
          interval: 1,
          weekdays: [...(input.weekdays ?? [])].sort((a, b) => a - b),
        }

  return {
    id: `custom:${crypto.randomUUID()}`,
    name: input.name.trim(),
    rule,
  }
}
