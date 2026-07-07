import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { CheckinRecord, CheckinRecordType, DietPayload, ExercisePayload, WaterPayload } from '../../types/checkin-types'
import { useCheckinMotion } from '../../hooks/use-checkin-motion'

type RecordChipProps = {
  record: CheckinRecord
  recordType: CheckinRecordType
  memberColor: string
  isOverLimit?: boolean
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
}: RecordChipProps) {
  const { spring, chipEnterY, reducedMotion } = useCheckinMotion()

  return (
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
        'rounded-md border bg-card/90 px-2 py-1 text-xs leading-tight shadow-sm',
        isOverLimit ? 'border-[var(--checkin-over-limit)]' : 'border-border/60',
      )}
      style={{ borderLeftWidth: 3, borderLeftColor: isOverLimit ? 'var(--checkin-over-limit)' : memberColor }}
      title={chipLabel(record, recordType)}
    >
      <p className="truncate font-medium text-foreground">{chipLabel(record, recordType)}</p>
    </motion.div>
  )
}
