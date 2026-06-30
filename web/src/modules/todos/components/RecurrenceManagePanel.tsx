import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createCustomRecurrencePreset,
  formatRecurrenceRuleSummary,
  getOrderedRecurrencePresets,
  mergeRecurrencePresets,
  WEEKDAY_LABELS,
  type RecurrenceCustomKind,
  type RecurrencePreset,
} from '../lib/recurrence-presets'
import { useTodoUiStore } from '../store/todo-ui-store'
import PresetManageList from './PresetManageList'

function RecurrencePresetFormDialog({
  title,
  initial,
  onCancel,
  onConfirm,
}: {
  title: string
  initial?: RecurrencePreset
  onCancel: () => void
  onConfirm: (preset: RecurrencePreset) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<RecurrenceCustomKind>(() => {
    if (initial?.rule?.weekdays?.length) return 'weekdays'
    return 'interval_days'
  })
  const [intervalDays, setIntervalDays] = useState(initial?.rule?.interval ?? 2)
  const [weekdays, setWeekdays] = useState<number[]>(initial?.rule?.weekdays ?? [1, 3, 5])

  function toggleWeekday(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    )
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (kind === 'weekdays' && weekdays.length === 0) return

    if (initial) {
      onConfirm({
        ...initial,
        name: trimmed,
        rule:
          kind === 'interval_days'
            ? { frequency: 'custom', interval: Math.max(1, intervalDays) }
            : { frequency: 'custom', interval: 1, weekdays },
      })
      return
    }

    onConfirm(
      createCustomRecurrencePreset({
        name: trimmed,
        kind,
        intervalDays,
        weekdays,
      }),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={handleSubmit}
        className="max-h-[90svh] w-full max-w-sm overflow-y-auto rounded-card bg-bg-card p-6 shadow-lg"
      >
        <h2 className="text-lg font-medium text-text">{title}</h2>
        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              placeholder="如：每 3 天"
              className="w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">类型</label>
            <div className="flex rounded-button bg-bg-hover p-1">
              {(
                [
                  { id: 'interval_days' as const, label: '每 N 天' },
                  { id: 'weekdays' as const, label: '指定星期' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setKind(opt.id)}
                  className={[
                    'flex-1 rounded-button py-2 text-sm font-medium transition-colors',
                    kind === opt.id
                      ? 'bg-bg-card text-text shadow-sm'
                      : 'text-text-secondary hover:text-text',
                  ].join(' ')}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          {kind === 'interval_days' ? (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">间隔天数</label>
              <input
                type="number"
                min={1}
                max={365}
                value={intervalDays}
                onChange={(e) => setIntervalDays(Number(e.target.value) || 1)}
                className="w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
              />
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">星期</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(WEEKDAY_LABELS).map(([value, label]) => {
                  const day = Number(value)
                  const active = weekdays.includes(day)
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleWeekday(day)}
                      className={[
                        'rounded-full px-3 py-1 text-xs font-medium',
                        active
                          ? 'bg-primary text-white'
                          : 'bg-bg-hover text-text-secondary hover:text-text',
                      ].join(' ')}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={!name.trim() || (kind === 'weekdays' && weekdays.length === 0)}
            className="rounded-button bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  )
}

export default function RecurrenceManagePanel() {
  const customPresets = useTodoUiStore((s) => s.recurrencePresets)
  const order = useTodoUiStore((s) => s.recurrencePresetOrder)
  const disabled = useTodoUiStore((s) => s.recurrencePresetDisabled)
  const addPreset = useTodoUiStore((s) => s.addRecurrencePreset)
  const updatePreset = useTodoUiStore((s) => s.updateRecurrencePreset)
  const removePreset = useTodoUiStore((s) => s.removeRecurrencePreset)
  const movePreset = useTodoUiStore((s) => s.moveRecurrencePreset)
  const toggleDisabled = useTodoUiStore((s) => s.toggleRecurrencePresetDisabled)
  const setOrder = useTodoUiStore((s) => s.setRecurrencePresetOrder)

  const [dialog, setDialog] = useState<'add' | { edit: RecurrencePreset } | null>(null)

  const ordered = useMemo(
    () => getOrderedRecurrencePresets(customPresets, order, disabled),
    [customPresets, order, disabled],
  )

  useEffect(() => {
    if (order.length === 0 && ordered.length > 0) {
      setOrder(ordered.map((p) => p.id))
    }
  }, [order.length, ordered, setOrder])

  const disabledSet = useMemo(() => new Set(disabled), [disabled])

  const items = ordered.map((preset) => ({
    id: preset.id,
    title: preset.name,
    subtitle: preset.rule ? formatRecurrenceRuleSummary({ ...preset.rule, endType: 'never' }) : '不重复',
    builtin: preset.builtin,
    disabled: disabledSet.has(preset.id),
  }))

  function findPreset(id: string) {
    return mergeRecurrencePresets(customPresets).find((p) => p.id === id)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">重复预设</h2>
        <button
          type="button"
          onClick={() => setDialog('add')}
          className="flex items-center gap-1 rounded-button px-2 py-1.5 text-sm text-primary hover:bg-bg-hover"
        >
          <Plus className="size-4" strokeWidth={2} />
          新建
        </button>
      </div>
      <p className="mt-1 text-xs text-text-tertiary">
        可排序、停用预设。停用后不会出现在新建待办的重复选项中。
      </p>

      <div className="mt-3">
        <PresetManageList
          items={items}
          onMove={movePreset}
          onToggleDisabled={toggleDisabled}
          onEdit={(id) => {
            const preset = findPreset(id)
            if (preset && !preset.builtin) setDialog({ edit: preset })
            else if (preset?.builtin) {
              // built-in: only allow disable, not edit
            }
          }}
          onDelete={(id) => removePreset(id)}
        />
      </div>

      {dialog === 'add' ? (
        <RecurrencePresetFormDialog
          title="新建重复预设"
          onCancel={() => setDialog(null)}
          onConfirm={(preset) => {
            addPreset(preset)
            setDialog(null)
          }}
        />
      ) : null}

      {dialog && dialog !== 'add' ? (
        <RecurrencePresetFormDialog
          title="编辑重复预设"
          initial={dialog.edit}
          onCancel={() => setDialog(null)}
          onConfirm={(preset) => {
            updatePreset(preset.id, { name: preset.name, rule: preset.rule })
            setDialog(null)
          }}
        />
      ) : null}
    </section>
  )
}
