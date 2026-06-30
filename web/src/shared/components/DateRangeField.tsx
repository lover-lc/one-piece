import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import { DatePickerCalendar } from './DatePickerCalendar'
import BottomSheet from './ui/BottomSheet'
import { parseISODate, toISODate } from '../lib/date-utils'
import { isoToLocalDate } from '../lib/datetime-utils'
import { isIsoDate, isValidGanttRangeFilter, type GanttRange } from '../../modules/todos/lib/gantt-scale'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type DateRangeFieldProps = {
  range: GanttRange
  onApply: (range: GanttRange) => void
  className?: string
}

const EMPTY_RANGE: GanttRange = { start: '', end: '' }

function normalizeRangeDate(value: string): string {
  if (!value) return ''
  if (isIsoDate(value)) return value
  return isoToLocalDate(value) ?? value.slice(0, 10)
}

function normalizeRange(range: GanttRange): GanttRange {
  return {
    start: normalizeRangeDate(range.start),
    end: normalizeRangeDate(range.end),
  }
}

function rangeToSelection(range: GanttRange): DateRange | undefined {
  const start = normalizeRangeDate(range.start)
  const end = normalizeRangeDate(range.end)
  const from = isIsoDate(start) ? parseISODate(start) : undefined
  const to = isIsoDate(end) ? parseISODate(end) : undefined
  if (!from && !to) return undefined
  return { from, to: to ?? from }
}

function formatChip(iso: string, placeholder: string): string {
  const date = normalizeRangeDate(iso)
  if (!isIsoDate(date)) return placeholder
  return date.replace(/-/g, '/')
}

function hasRangeValue(range: GanttRange): boolean {
  return Boolean(normalizeRangeDate(range.start) || normalizeRangeDate(range.end))
}

export default function DateRangeField({ range, onApply, className }: DateRangeFieldProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => normalizeRange(range))
  const [selection, setSelection] = useState<DateRange | undefined>(() => rangeToSelection(range))

  useEffect(() => {
    const next = normalizeRange(range)
    setDraft(next)
    setSelection(rangeToSelection(next))
  }, [range.start, range.end])

  const normalizedApplied = normalizeRange(range)
  const canApply = isValidGanttRangeFilter(draft.start, draft.end || draft.start)
  const isDirty =
    draft.start !== normalizedApplied.start || draft.end !== normalizedApplied.end
  const canClear = hasRangeValue(draft) || hasRangeValue(normalizedApplied)

  const startLabel = formatChip(draft.start, '开始日期')
  const endLabel = formatChip(draft.end, '结束日期')

  function handleSelect(next: DateRange | undefined) {
    setSelection(next)
    if (!next?.from) {
      setDraft(EMPTY_RANGE)
      return
    }
    const from = toISODate(next.from)
    const to = next.to ? toISODate(next.to) : ''
    setDraft({ start: from, end: to })
  }

  function applyDraft(closeSheet: boolean) {
    const next: GanttRange = {
      start: draft.start,
      end: draft.end || draft.start,
    }
    if (!isValidGanttRangeFilter(next.start, next.end)) return
    onApply(next)
    if (closeSheet) setOpen(false)
  }

  function handleClear() {
    setDraft(EMPTY_RANGE)
    setSelection(undefined)
    onApply(EMPTY_RANGE)
  }

  return (
    <div className={cn('mb-2 flex min-w-0 items-center gap-1.5', className)}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-9 min-w-0 flex-1 items-stretch overflow-hidden rounded-md border border-input bg-background text-sm"
      >
        <span
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center px-2 py-2 text-xs tabular-nums',
            draft.start ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {startLabel}
        </span>
        <span className="flex shrink-0 items-center self-center px-0.5 text-xs text-muted-foreground">
          —
        </span>
        <span
          className={cn(
            'flex min-w-0 flex-1 items-center justify-center px-2 py-2 text-xs tabular-nums',
            draft.end ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          {endLabel}
        </span>
      </button>
      {canClear ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-9 shrink-0"
          aria-label="清空日期范围"
          onClick={handleClear}
        >
          <X className="size-4" />
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="h-9 shrink-0 px-4"
        disabled={!canApply || !isDirty}
        onClick={() => applyDraft(false)}
      >
        查询
      </Button>

      <BottomSheet open={open} onClose={() => setOpen(false)} title="选择日期范围">
        <DatePickerCalendar mode="range" selected={selection} onSelect={handleSelect} />
        <div className="flex gap-2 border-t border-border px-4 py-3">
          <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
            取消
          </Button>
          <Button
            type="button"
            className="flex-1"
            disabled={!canApply}
            onClick={() => applyDraft(true)}
          >
            确定
          </Button>
        </div>
      </BottomSheet>
    </div>
  )
}
