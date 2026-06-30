import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, X } from 'lucide-react'
import BottomSheet from './ui/BottomSheet'
import { DatePickerCalendar } from './DatePickerCalendar'
import { parseISODate, toISODate } from '../lib/date-utils'
import {
  composeAllDayIso,
  composeLocalIso,
  formatDateTimeDisplay,
  formatTimeFromIso,
  isoToLocalDate,
} from '../lib/datetime-utils'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type DateFieldValue = {
  iso: string | null
  hasTime: boolean
}

type DateFieldProps = {
  label?: string
  value: DateFieldValue
  onChange: (value: DateFieldValue) => void
  showTime?: boolean
  placeholder?: string
  allowClear?: boolean
  className?: string
}

export function dateFieldFromIso(
  iso: string | null | undefined,
  isAllDay: boolean,
): DateFieldValue {
  if (!iso) return { iso: null, hasTime: false }
  if (isAllDay) return { iso, hasTime: false }
  return { iso, hasTime: true }
}

export function isoFromDateField(value: DateFieldValue, isAllDay: boolean): string | null {
  if (!value.iso) return null
  const date = isoToLocalDate(value.iso)
  if (!date) return null
  if (isAllDay || !value.hasTime) return composeAllDayIso(date)
  return value.iso
}

export function buildOpenDraft(value: DateFieldValue, showTime: boolean): DateFieldValue {
  if (value.iso) return value
  const today = toISODate(new Date())
  if (showTime) {
    return { iso: composeLocalIso(today, '09:00'), hasTime: true }
  }
  return { iso: composeAllDayIso(today), hasTime: false }
}

export default function DateField({
  label,
  value,
  onChange,
  showTime = false,
  placeholder = '选择日期',
  allowClear = true,
  className,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateFieldValue>(value)

  useEffect(() => {
    if (!open) setDraft(value)
  }, [value, open])

  const selectedDate = useMemo(() => {
    const date = draft.iso ? isoToLocalDate(draft.iso) : null
    return date ? parseISODate(date) : undefined
  }, [draft.iso])

  const timeValue = draft.iso ? formatTimeFromIso(draft.iso) : '09:00'

  function applyDraftDate(date: Date | undefined) {
    if (!date) {
      setDraft({ iso: null, hasTime: false })
      return
    }
    const dateStr = toISODate(date)
    if (showTime) {
      const time = draft.hasTime && draft.iso ? formatTimeFromIso(draft.iso) : '09:00'
      setDraft({ iso: composeLocalIso(dateStr, time), hasTime: true })
      return
    }
    setDraft({ iso: composeAllDayIso(dateStr), hasTime: false })
  }

  function applyDraftTime(time: string) {
    const date = draft.iso ? isoToLocalDate(draft.iso) : null
    if (!date) return
    setDraft({ iso: composeLocalIso(date, time), hasTime: true })
  }

  function handleOpen() {
    setDraft(buildOpenDraft(value, showTime))
    setOpen(true)
  }

  function handleClose() {
    setDraft(value)
    setOpen(false)
  }

  function handleConfirm() {
    onChange(draft)
    setOpen(false)
  }

  const display = value.iso
    ? showTime
      ? formatDateTimeDisplay(value.iso, !value.hasTime)
      : isoToLocalDate(value.iso)?.replace(/-/g, '/') ?? placeholder
    : placeholder

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label ? <span className="shrink-0 text-sm text-muted-foreground">{label}</span> : null}
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          'inline-flex min-h-9 min-w-0 flex-1 items-center gap-2 rounded-md border border-input bg-background px-2 text-sm',
          !value.iso && 'text-muted-foreground',
        )}
      >
        <CalendarDays className="size-4 shrink-0 opacity-60" />
        <span className="min-w-0 flex-1 overflow-x-auto whitespace-nowrap text-xs tabular-nums">
          {display}
        </span>
      </button>
      {allowClear && value.iso ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="清除日期"
          onClick={() => onChange({ iso: null, hasTime: false })}
        >
          <X className="size-4" />
        </Button>
      ) : null}

      <BottomSheet open={open} onClose={handleClose} title={label ?? '选择日期'}>
        <DatePickerCalendar selected={selectedDate} onSelect={applyDraftDate} />
        {showTime ? (
          <div className="border-t border-border px-4 py-3">
            <label className="mb-2 block text-xs text-muted-foreground">时间</label>
            <input
              type="time"
              value={timeValue}
              disabled={!draft.iso}
              onChange={(e) => applyDraftTime(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        ) : null}
        <div className="border-t border-border px-4 py-3">
          <Button type="button" className="w-full" onClick={handleConfirm}>
            确定
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
