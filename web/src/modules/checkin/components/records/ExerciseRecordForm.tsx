import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import DateField, {
  isoFromDateField,
  type DateFieldValue,
} from '../../../../shared/components/DateField'
import { toISODate } from '../../../../shared/lib/date-utils'
import { composeLocalIso } from '../../../../shared/lib/datetime-utils'
import type { CheckinRecord } from '../../types/checkin-types'
import { exerciseRecordToFields } from '../../lib/record-form-init'

type ExerciseRecordFormValue = {
  name: string
  minutes: number
  recordedAt: string
}

type ExerciseRecordFormProps = {
  formId?: string
  defaultRecordedAt?: Date
  editingRecord?: CheckinRecord | null
  showSubmitButton?: boolean
  onSubmit: (value: ExerciseRecordFormValue) => Promise<void> | void
  onSuccess?: () => void
}

function dateFieldFromDate(d: Date): DateFieldValue {
  const dateStr = toISODate(d)
  const time = format(d, 'HH:mm')
  return { iso: composeLocalIso(dateStr, time), hasTime: true }
}

export default function ExerciseRecordForm({
  formId = 'exercise-record-form',
  defaultRecordedAt,
  editingRecord,
  showSubmitButton = true,
  onSubmit,
  onSuccess,
}: ExerciseRecordFormProps) {
  const [name, setName] = useState('')
  const [minutes, setMinutes] = useState<string>('30')
  const [recordedAtField, setRecordedAtField] = useState<DateFieldValue>({
    iso: null,
    hasTime: false,
  })
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setError(null)
    setSubmitting(false)

    if (editingRecord) {
      const fields = exerciseRecordToFields(editingRecord)
      setRecordedAtField(dateFieldFromDate(new Date(editingRecord.recordedAt)))
      setName(fields.name)
      setMinutes(fields.minutes)
      return
    }

    const d = defaultRecordedAt ?? new Date()
    setRecordedAtField(dateFieldFromDate(d))
    setName('')
    setMinutes('30')
  }, [defaultRecordedAt, editingRecord])

  const minutesValue = useMemo(() => {
    const n = Number(minutes)
    return Number.isFinite(n) && n > 0 ? Math.round(n) : null
  }, [minutes])

  async function handleSubmit() {
    setError(null)
    const recordedAt = isoFromDateField(recordedAtField, false)
    if (!name.trim()) {
      setError('请填写运动项目名称')
      return
    }
    if (!minutesValue) {
      setError('请输入运动时长（分钟）')
      return
    }
    if (!recordedAt) {
      setError('请选择记录时间')
      return
    }
    setSubmitting(true)
    try {
      await onSubmit({
        name: name.trim(),
        minutes: minutesValue,
        recordedAt,
      })
      onSuccess?.()
    } catch (err) {
      setError(String((err as Error).message || '提交失败'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      id={formId}
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit()
      }}
    >
      <div>
        <Label htmlFor="exerciseName">项目名称</Label>
        <Input
          id="exerciseName"
          className="mt-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="例如 跑步"
        />
      </div>

      <div>
        <Label htmlFor="minutes">时长（分钟）</Label>
        <Input
          id="minutes"
          className="mt-1"
          inputMode="numeric"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="30"
        />
      </div>

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

      {showSubmitButton ? (
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? '提交中…' : editingRecord ? '保存修改' : '保存记录'}
        </Button>
      ) : null}
    </form>
  )
}
