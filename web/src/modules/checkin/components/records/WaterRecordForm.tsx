import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DateField, {
  isoFromDateField,
  type DateFieldValue,
} from '../../../../shared/components/DateField'
import AppMotionBottomSheet from '../../../../shared/components/motion/AppMotionBottomSheet'
import AppSegmentedControl from '../../../../shared/components/motion/AppSegmentedControl'
import { toISODate } from '../../../../shared/lib/date-utils'
import { composeLocalIso } from '../../../../shared/lib/datetime-utils'
import { cn } from '@/lib/utils'
import CheckinMotionBottomSheet from '../motion/CheckinMotionBottomSheet'

type WaterRecordFormValue = {
  name: string
  ml: number
  recordedAt: string
}

type WaterRecordFormProps = {
  open: boolean
  onClose: () => void
  defaultRecordedAt?: Date
  onSubmit: (value: WaterRecordFormValue) => Promise<void> | void
}

const DRINK_PRESETS: { id: string; name: string; ml: number }[] = [
  { id: 'cup', name: '一杯', ml: 250 },
  { id: 'bottle', name: '一瓶', ml: 500 },
  { id: 'large', name: '大杯', ml: 750 },
]

function dateFieldFromDate(d: Date): DateFieldValue {
  const dateStr = toISODate(d)
  const time = format(d, 'HH:mm')
  return { iso: composeLocalIso(dateStr, time), hasTime: true }
}

export default function WaterRecordForm({
  open,
  onClose,
  defaultRecordedAt,
  onSubmit,
}: WaterRecordFormProps) {
  const [mode, setMode] = useState<'preset' | 'custom'>('preset')
  const [presetId, setPresetId] = useState<string>('cup')
  const [presetSheetOpen, setPresetSheetOpen] = useState(false)
  const [customName, setCustomName] = useState<string>('水')
  const [customMl, setCustomMl] = useState<string>('300')
  const [recordedAtField, setRecordedAtField] = useState<DateFieldValue>({
    iso: null,
    hasTime: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    const d = defaultRecordedAt ?? new Date()
    setRecordedAtField(dateFieldFromDate(d))
    setMode('preset')
    setPresetId('cup')
    setPresetSheetOpen(false)
    setCustomName('水')
    setCustomMl('300')
    setError(null)
    setSubmitting(false)
  }, [open, defaultRecordedAt])

  const preset = useMemo(
    () => DRINK_PRESETS.find((p) => p.id === presetId) ?? DRINK_PRESETS[0],
    [presetId],
  )

  const mlValue = useMemo(() => {
    const raw = mode === 'preset' ? preset?.ml : Number(customMl)
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }, [mode, preset?.ml, customMl])

  const nameValue = useMemo(() => {
    if (mode === 'preset') return preset?.name ?? '饮水'
    return customName.trim() || '饮水'
  }, [mode, preset?.name, customName])

  const presetLabel = preset ? `${preset.name}（${preset.ml}ml）` : '请选择'

  async function handleSubmit() {
    setError(null)
    const recordedAt = isoFromDateField(recordedAtField, false)
    if (!recordedAt) {
      setError('请选择记录时间')
      return
    }
    if (!mlValue) {
      setError('请输入饮水量（ml）')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name: nameValue,
        ml: mlValue,
        recordedAt,
      })
      onClose()
    } catch (err) {
      setError(String((err as Error).message || '提交失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <CheckinMotionBottomSheet open={open} onClose={onClose} title="喝水">
        <div className="space-y-3 p-4">
          <AppSegmentedControl
            aria-label="饮水来源"
            className="rounded-md bg-muted/60"
            size="xs"
            layoutIdPrefix="water-source"
            options={[
              { value: 'preset' as const, label: '常用' },
              { value: 'custom' as const, label: '自定义' },
            ]}
            value={mode}
            onChange={setMode}
          />

          {mode === 'preset' ? (
            <div>
              <Label>选择预设</Label>
              <button
                type="button"
                onClick={() => setPresetSheetOpen(true)}
                className="mt-1 flex w-full min-w-0 items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-left text-sm"
              >
                <span className="text-foreground">{presetLabel}</span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="customName">名称</Label>
                <Input
                  id="customName"
                  className="mt-1"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="气泡水"
                />
              </div>
              <div>
                <Label htmlFor="customMl">饮水量（ml）</Label>
                <Input
                  id="customMl"
                  className="mt-1"
                  inputMode="numeric"
                  value={customMl}
                  onChange={(e) => setCustomMl(e.target.value)}
                  placeholder="300"
                />
              </div>
            </div>
          )}

          <div>
            <Label className="mb-1 block">记录时间</Label>
            <DateField
              value={recordedAtField}
              onChange={setRecordedAtField}
              showTime
              allowClear={false}
              placeholder="选择时间"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="button" className="w-full" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? '提交中…' : '保存记录'}
          </Button>
        </div>
      </CheckinMotionBottomSheet>

      <AppMotionBottomSheet
        open={presetSheetOpen}
        onClose={() => setPresetSheetOpen(false)}
        title="选择预设"
      >
        <ul className="max-h-[50svh] overflow-y-auto">
          {DRINK_PRESETS.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => {
                  setPresetId(p.id)
                  setPresetSheetOpen(false)
                }}
                className={cn(
                  'flex w-full px-4 py-3 text-left text-sm hover:bg-muted',
                  presetId === p.id ? 'font-medium text-primary' : 'text-foreground',
                )}
              >
                {p.name}（{p.ml}ml）
              </button>
            </li>
          ))}
        </ul>
      </AppMotionBottomSheet>
    </>
  )
}
