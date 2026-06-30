import { filterDisabledPresets, orderByPresetIds } from './preset-order'

export type ReminderPresetKind = 'offset' | 'fixed'

export type ReminderPreset = {
  id: string
  name: string
  kind: ReminderPresetKind
  /** Minutes before end of due date (offset presets). */
  offsetMinutes?: number
  /** Time on due date, HH:mm (fixed presets). */
  fixedTime?: string
  builtin?: boolean
}

export type ReminderSelection =
  | { type: 'none' }
  | { type: 'preset'; presetId: string }
  | { type: 'datetime'; at: string }

export const BUILTIN_REMINDER_PRESETS: ReminderPreset[] = [
  { id: 'builtin:15m', name: '截止前 15 分钟', kind: 'offset', offsetMinutes: 15, builtin: true },
  { id: 'builtin:1h', name: '截止前 1 小时', kind: 'offset', offsetMinutes: 60, builtin: true },
  { id: 'builtin:3h', name: '截止前 3 小时', kind: 'offset', offsetMinutes: 180, builtin: true },
  { id: 'builtin:1d', name: '截止前 1 天', kind: 'offset', offsetMinutes: 24 * 60, builtin: true },
  { id: 'builtin:2d', name: '截止前 2 天', kind: 'offset', offsetMinutes: 2 * 24 * 60, builtin: true },
  { id: 'builtin:1w', name: '截止前 1 周', kind: 'offset', offsetMinutes: 7 * 24 * 60, builtin: true },
  {
    id: 'builtin:due_9am',
    name: '截止当天 09:00',
    kind: 'fixed',
    fixedTime: '09:00',
    builtin: true,
  },
]

export const REMINDER_OFFSET_OPTIONS = [
  { label: '15 分钟', minutes: 15 },
  { label: '30 分钟', minutes: 30 },
  { label: '1 小时', minutes: 60 },
  { label: '2 小时', minutes: 120 },
  { label: '1 天', minutes: 24 * 60 },
  { label: '2 天', minutes: 2 * 24 * 60 },
  { label: '1 周', minutes: 7 * 24 * 60 },
] as const

export const DEFAULT_REMINDER_PRESET_ORDER = BUILTIN_REMINDER_PRESETS.map((p) => p.id)

export const REMINDER_NONE_ID = '__none__'

export function mergeReminderPresets(custom: ReminderPreset[]): ReminderPreset[] {
  return [...BUILTIN_REMINDER_PRESETS, ...custom.filter((p) => !p.builtin)]
}

export function getOrderedReminderPresets(
  custom: ReminderPreset[],
  order: string[],
  disabled: string[],
  { enabledOnly = false }: { enabledOnly?: boolean } = {},
): ReminderPreset[] {
  const merged = mergeReminderPresets(custom)
  const ordered = orderByPresetIds(merged, order, DEFAULT_REMINDER_PRESET_ORDER)
  if (!enabledOnly) return ordered
  return filterDisabledPresets(ordered, disabled)
}

export function getEnabledReminderOptions(
  custom: ReminderPreset[],
  order: string[],
  disabled: string[],
): { id: string; name: string }[] {
  return [
    { id: REMINDER_NONE_ID, name: '不提醒' },
    ...getOrderedReminderPresets(custom, order, disabled, { enabledOnly: true }).map((p) => ({
      id: p.id,
      name: p.name,
    })),
  ]
}

export function findReminderPreset(
  presetId: string,
  custom: ReminderPreset[],
): ReminderPreset | undefined {
  return mergeReminderPresets(custom).find((p) => p.id === presetId)
}

export function resolveReminderAt(
  selection: ReminderSelection,
  dueDate: string | null | undefined,
  customPresets: ReminderPreset[],
): string | null {
  if (selection.type === 'none') return null

  if (selection.type === 'datetime') {
    const at = new Date(selection.at)
    return Number.isNaN(at.getTime()) ? null : at.toISOString()
  }

  if (!dueDate) return null

  const preset = findReminderPreset(selection.presetId, customPresets)
  if (!preset) return null

  if (preset.kind === 'offset' && preset.offsetMinutes != null) {
    const due = new Date(`${dueDate}T23:59:59`)
    const remindAt = new Date(due.getTime() - preset.offsetMinutes * 60 * 1000)
    return remindAt.toISOString()
  }

  if (preset.kind === 'fixed' && preset.fixedTime) {
    const remindAt = new Date(`${dueDate}T${preset.fixedTime}:00`)
    return remindAt.toISOString()
  }

  return null
}

export function formatReminderSelectionLabel(
  selection: ReminderSelection,
  customPresets: ReminderPreset[],
): string | null {
  if (selection.type === 'none') return null
  if (selection.type === 'datetime') {
    const d = new Date(selection.at)
    if (Number.isNaN(d.getTime())) return '自定义时间'
    const date = selection.at.slice(0, 10)
    const time = selection.at.slice(11, 16)
    return `${date} ${time}`
  }
  return findReminderPreset(selection.presetId, customPresets)?.name ?? null
}

export function createCustomReminderPreset(input: {
  name: string
  kind: ReminderPresetKind
  offsetMinutes?: number
  fixedTime?: string
}): ReminderPreset {
  return {
    id: `custom:${crypto.randomUUID()}`,
    name: input.name.trim(),
    kind: input.kind,
    offsetMinutes: input.kind === 'offset' ? input.offsetMinutes : undefined,
    fixedTime: input.kind === 'fixed' ? input.fixedTime : undefined,
  }
}
