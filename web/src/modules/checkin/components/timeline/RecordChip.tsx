import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CheckinRecord, CheckinRecordType, DietPayload, ExercisePayload, WaterPayload } from '../../types/checkin-types'
import SwipeRow from '../../../../shared/components/ui/SwipeRow'
import { useCheckinMotion } from '../../hooks/use-checkin-motion'

type RecordChipProps = {
  record: CheckinRecord
  recordType: CheckinRecordType
  memberColor: string
  isOverLimit?: boolean
  onView?: (record: CheckinRecord) => void
  onDelete?: (record: CheckinRecord) => void
}

function chipLabel(record: CheckinRecord, recordType: CheckinRecordType): string {
  if (recordType === 'diet') {
    const payload = record.payload as DietPayload
    return `${payload.name} · ${payload.calories} kcal`
  }
  if (recordType === 'exercise') {
    const payload = record.payload as ExercisePayload
    return `${payload.name} · ${payload.value} min`
  }
  const payload = record.payload as WaterPayload
  return `${payload.name} · ${payload.ml} ml`
}

export default function RecordChip({
  record,
  recordType,
  memberColor,
  isOverLimit = false,
  onView,
  onDelete,
}: RecordChipProps) {
  const { spring, chipEnterY, reducedMotion } = useCheckinMotion()

  const chip = (
    <motion.div
      layout
      initial={
        reducedMotion || chipEnterY === 0
          ? false
          : { opacity: 0, y: -chipEnterY, scale: 0.96 }
      }
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={spring}
      className={cn(
        'max-w-full rounded-md border bg-card/90 px-2 py-1 text-xs leading-tight shadow-sm',
        isOverLimit ? 'border-[var(--checkin-over-limit)]' : 'border-border/60',
        onView && 'cursor-pointer',
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: isOverLimit ? 'var(--checkin-over-limit)' : memberColor }}
      title={onView ? `${chipLabel(record, recordType)} · 点击查看` : chipLabel(record, recordType)}
    >
      <p className="truncate font-medium text-foreground">{chipLabel(record, recordType)}</p>
    </motion.div>
  )

  if (!onView) return chip

  if (onDelete) {
    return (
      <div className="max-w-full">
        <SwipeRow
          onContentClick={() => onView(record)}
          onDelete={() => onDelete(record)}
        >
          {chip}
        </SwipeRow>
      </div>
    )
  }

  return (
    <div className="max-w-full">
      <button
        type="button"
        className="block w-full text-left"
        onClick={() => onView(record)}
      >
        {chip}
      </button>
    </div>
  )
}
