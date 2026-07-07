import { AnimatePresence } from 'framer-motion'
import { OVERVIEW_SPINE_WIDTH } from '@/modules/todos/lib/timeline-utils'
import type { FamilyMember } from '@/shared/hooks/use-family-members'
import { cn } from '@/lib/utils'
import type { CheckinRecord, CheckinRecordType } from '../../types/checkin-types'
import RecordChip from './RecordChip'

type TimelineSlot = {
  time: string
  left: CheckinRecord[]
  right: CheckinRecord[]
}

type DualLaneTimelineProps = {
  slots: TimelineSlot[]
  recordType: CheckinRecordType
  memberA: FamilyMember
  memberB: FamilyMember
  dietOverLimitByRecordId?: Map<string, boolean>
}

function SpineLine() {
  return (
    <div
      className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-border/70"
      aria-hidden
    />
  )
}

function LaneColumn({
  records,
  recordType,
  memberColor,
  align,
  dietOverLimitByRecordId,
}: {
  records: CheckinRecord[]
  recordType: CheckinRecordType
  memberColor: string
  align: 'left' | 'right'
  dietOverLimitByRecordId?: Map<string, boolean>
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col gap-1 py-1',
        align === 'left' ? 'items-end pr-2' : 'items-start pl-2',
      )}
    >
      <AnimatePresence initial={false}>
        {records.map((record) => (
          <RecordChip
            key={record.id}
            record={record}
            recordType={recordType}
            memberColor={memberColor}
            isOverLimit={dietOverLimitByRecordId?.get(record.id) ?? false}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function TimelineSlotRow({
  slot,
  recordType,
  memberA,
  memberB,
  dietOverLimitByRecordId,
}: {
  slot: TimelineSlot
  recordType: CheckinRecordType
  memberA: FamilyMember
  memberB: FamilyMember
  dietOverLimitByRecordId?: Map<string, boolean>
}) {
  return (
    <div className="relative flex min-h-10">
      <LaneColumn
        records={slot.left}
        recordType={recordType}
        memberColor={memberA.color}
        align="left"
        dietOverLimitByRecordId={dietOverLimitByRecordId}
      />

      <div className="relative shrink-0" style={{ width: OVERVIEW_SPINE_WIDTH }}>
        <SpineLine />
        <div className="relative z-10 px-1 py-2 text-center">
          <p className="text-xs font-semibold tabular-nums leading-none text-muted-foreground">
            {slot.time}
          </p>
          <span className="mx-auto mt-1.5 block size-1.5 rounded-full bg-muted-foreground/50" aria-hidden />
        </div>
      </div>

      <LaneColumn
        records={slot.right}
        recordType={recordType}
        memberColor={memberB.color}
        align="right"
        dietOverLimitByRecordId={dietOverLimitByRecordId}
      />
    </div>
  )
}

export default function DualLaneTimeline({
  slots,
  recordType,
  memberA,
  memberB,
  dietOverLimitByRecordId,
}: DualLaneTimelineProps) {
  if (slots.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">该日暂无记录</p>
    )
  }

  return (
    <div className="overflow-hidden rounded-card border border-border/60 bg-card">
      <div className="flex border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
        <div className="flex min-w-0 flex-1 justify-end pr-2 font-medium" style={{ color: memberA.color }}>
          {memberA.name}
        </div>
        <div style={{ width: OVERVIEW_SPINE_WIDTH }} />
        <div className="flex min-w-0 flex-1 justify-start pl-2 font-medium" style={{ color: memberB.color }}>
          {memberB.name}
        </div>
      </div>

      <div className="max-h-[calc(100vh-280px)] overflow-y-auto">
        {slots.map((slot) => (
          <TimelineSlotRow
            key={slot.time}
            slot={slot}
            recordType={recordType}
            memberA={memberA}
            memberB={memberB}
            dietOverLimitByRecordId={dietOverLimitByRecordId}
          />
        ))}
      </div>
    </div>
  )
}
