import { Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  createCustomReminderPreset,
  getOrderedReminderPresets,
  mergeReminderPresets,
  REMINDER_OFFSET_OPTIONS,
  type ReminderPreset,
  type ReminderPresetKind,
} from '../lib/reminder-presets'
import { useTodoUiStore } from '../store/todo-ui-store'
import PresetManageList from './PresetManageList'

function PresetFormDialog({
  title,
  initial,
  onCancel,
  onConfirm,
}: {
  title: string
  initial?: ReminderPreset
  onCancel: () => void
  onConfirm: (preset: ReminderPreset) => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [kind, setKind] = useState<ReminderPresetKind>(initial?.kind ?? 'offset')
  const [offsetMinutes, setOffsetMinutes] = useState(
    initial?.offsetMinutes ?? REMINDER_OFFSET_OPTIONS[2].minutes,
  )
  const [fixedTime, setFixedTime] = useState(initial?.fixedTime ?? '09:00')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    if (initial) {
      onConfirm({
        ...initial,
        name: trimmed,
        kind,
        offsetMinutes: kind === 'offset' ? offsetMinutes : undefined,
        fixedTime: kind === 'fixed' ? fixedTime : undefined,
      })
      return
    }
    onConfirm(
      createCustomReminderPreset({
        name: trimmed,
        kind,
        offsetMinutes: kind === 'offset' ? offsetMinutes : undefined,
        fixedTime: kind === 'fixed' ? fixedTime : undefined,
      }),
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
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
              placeholder="如：截止前 30 分钟"
              className="w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">类型</label>
            <div className="flex rounded-button bg-bg-hover p-1">
              {(
                [
                  { id: 'offset' as const, label: '时间间隔' },
                  { id: 'fixed' as const, label: '固定时间' },
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
          {kind === 'offset' ? (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">提前量</label>
              <select
                value={offsetMinutes}
                onChange={(e) => setOffsetMinutes(Number(e.target.value))}
                className="w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
              >
                {REMINDER_OFFSET_OPTIONS.map((opt) => (
                  <option key={opt.minutes} value={opt.minutes}>
                    截止前 {opt.label}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="mb-1 block text-xs text-text-secondary">截止日当天</label>
              <input
                type="time"
                value={fixedTime}
                onChange={(e) => setFixedTime(e.target.value)}
                className="w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
              />
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
            disabled={!name.trim()}
            className="rounded-button bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            保存
          </button>
        </div>
      </form>
    </div>
  )
}

export default function ReminderManagePanel() {
  const customPresets = useTodoUiStore((s) => s.reminderPresets)
  const order = useTodoUiStore((s) => s.reminderPresetOrder)
  const disabled = useTodoUiStore((s) => s.reminderPresetDisabled)
  const addPreset = useTodoUiStore((s) => s.addReminderPreset)
  const updatePreset = useTodoUiStore((s) => s.updateReminderPreset)
  const removePreset = useTodoUiStore((s) => s.removeReminderPreset)
  const movePreset = useTodoUiStore((s) => s.moveReminderPreset)
  const toggleDisabled = useTodoUiStore((s) => s.toggleReminderPresetDisabled)
  const setOrder = useTodoUiStore((s) => s.setReminderPresetOrder)

  const [dialog, setDialog] = useState<'add' | { edit: ReminderPreset } | null>(null)

  const ordered = useMemo(
    () => getOrderedReminderPresets(customPresets, order, disabled),
    [customPresets, order, disabled],
  )

  useEffect(() => {
    if (order.length === 0 && ordered.length > 0) {
      setOrder(ordered.map((p) => p.id))
    }
  }, [order.length, ordered, setOrder])

  const disabledSet = useMemo(() => new Set(disabled), [disabled])

  function presetDetail(preset: ReminderPreset): string {
    if (preset.kind === 'fixed' && preset.fixedTime) {
      return `截止当天 ${preset.fixedTime}`
    }
    const opt = REMINDER_OFFSET_OPTIONS.find((o) => o.minutes === preset.offsetMinutes)
    return opt ? `截止前 ${opt.label}` : '时间间隔'
  }

  const items = ordered.map((preset) => ({
    id: preset.id,
    title: preset.name,
    subtitle: presetDetail(preset),
    builtin: preset.builtin,
    disabled: disabledSet.has(preset.id),
  }))

  function findPreset(id: string) {
    return mergeReminderPresets(customPresets).find((p) => p.id === id)
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">提醒预设</h2>
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
        可排序、停用预设。停用后不会出现在新建待办的提醒选项中。
      </p>

      <div className="mt-3">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-text-secondary">暂无预设</p>
        ) : (
          <PresetManageList
            items={items}
            onMove={movePreset}
            onToggleDisabled={toggleDisabled}
            onEdit={(id) => {
              const preset = findPreset(id)
              if (preset && !preset.builtin) setDialog({ edit: preset })
            }}
            onDelete={(id) => removePreset(id)}
          />
        )}
      </div>

      {dialog === 'add' ? (
        <PresetFormDialog
          title="新建提醒预设"
          onCancel={() => setDialog(null)}
          onConfirm={(preset) => {
            addPreset(preset)
            setDialog(null)
          }}
        />
      ) : null}

      {dialog && dialog !== 'add' ? (
        <PresetFormDialog
          title="编辑提醒预设"
          initial={dialog.edit}
          onCancel={() => setDialog(null)}
          onConfirm={(preset) => {
            updatePreset(preset.id, {
              name: preset.name,
              kind: preset.kind,
              offsetMinutes: preset.offsetMinutes,
              fixedTime: preset.fixedTime,
            })
            setDialog(null)
          }}
        />
      ) : null}
    </section>
  )
}
