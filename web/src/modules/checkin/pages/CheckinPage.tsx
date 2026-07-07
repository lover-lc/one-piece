import { Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input } from '@/components/ui/input'
import { useFamilyMembers } from '@/shared/hooks/use-family-members'
import { cn } from '@/lib/utils'
import { getShanghaiDateString, isRecordEditable } from '../lib/checkin-dates'
import { checkinRecordDetailPath, checkinRecordNewPath } from '../lib/checkin-record-routes'
import { buildHalfHourLanes } from '../lib/timeline-slots'
import { useCheckinProfiles } from '../hooks/use-checkin-profiles'
import { useCheckinRecords, useDeleteCheckinRecord } from '../hooks/use-checkin-records'
import type {
  CheckinRecord,
  CheckinRecordType,
  DietPayload,
} from '../types/checkin-types'
import DualLaneTimeline from '../components/timeline/DualLaneTimeline'
import CheckinPressable from '../components/motion/CheckinPressable'

const TYPE_LABELS: Record<CheckinRecordType, string> = {
  diet: '饮食',
  exercise: '运动',
  water: '喝水',
}

type CheckinPageProps = {
  type?: CheckinRecordType
}

function computeDietOverLimitIds(records: CheckinRecord[], targetKcal: number | null | undefined) {
  const overLimitIds = new Map<string, boolean>()
  if (!targetKcal || targetKcal <= 0) return overLimitIds

  const sorted = [...records].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))
  let running = 0
  for (const record of sorted) {
    running += (record.payload as DietPayload).calories
    if (running > targetKcal) {
      overLimitIds.set(record.id, true)
    }
  }
  return overLimitIds
}

function memberDietTotal(records: CheckinRecord[]): number {
  return records.reduce((sum, record) => sum + (record.payload as DietPayload).calories, 0)
}

export default function CheckinPage({ type = 'diet' }: CheckinPageProps) {
  const label = TYPE_LABELS[type]
  const navigate = useNavigate()
  const { data: membersRaw = [] } = useFamilyMembers()
  const { data: profiles = [] } = useCheckinProfiles()

  const members = useMemo(
    () => [...membersRaw].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 2),
    [membersRaw],
  )
  const memberA = members[0]
  const memberB = members[1]

  const [slotDate, setSlotDate] = useState(() => getShanghaiDateString())

  const editable = isRecordEditable(slotDate)
  const { data: records = [], isLoading } = useCheckinRecords({ slotDate, recordType: type })
  const deleteRecord = useDeleteCheckinRecord()

  const recordsA = useMemo(
    () => (memberA ? records.filter((r) => r.memberId === memberA.id) : []),
    [records, memberA],
  )
  const recordsB = useMemo(
    () => (memberB ? records.filter((r) => r.memberId === memberB.id) : []),
    [records, memberB],
  )

  const lanes = useMemo(() => {
    if (!memberA || !memberB) return { slots: [] }
    return buildHalfHourLanes(recordsA, recordsB, slotDate, members)
  }, [recordsA, recordsB, slotDate, members, memberA, memberB])

  const dietOverLimitByRecordId = useMemo(() => {
    if (type !== 'diet' || !memberA || !memberB) return new Map<string, boolean>()

    const profileA = profiles.find((p) => p.memberId === memberA.id)
    const profileB = profiles.find((p) => p.memberId === memberB.id)
    const map = new Map<string, boolean>()
    for (const [id, over] of computeDietOverLimitIds(recordsA, profileA?.targetKcal)) {
      map.set(id, over)
    }
    for (const [id, over] of computeDietOverLimitIds(recordsB, profileB?.targetKcal)) {
      map.set(id, over)
    }
    return map
  }, [type, recordsA, recordsB, profiles, memberA, memberB])

  const overLimitBanners = useMemo(() => {
    if (type !== 'diet' || !memberA || !memberB) return []

    const banners: string[] = []
    const profileA = profiles.find((p) => p.memberId === memberA.id)
    const profileB = profiles.find((p) => p.memberId === memberB.id)

    if (profileA?.targetKcal && memberDietTotal(recordsA) > profileA.targetKcal) {
      banners.push(`${memberA.name} 今日饮食已超标`)
    }
    if (profileB?.targetKcal && memberDietTotal(recordsB) > profileB.targetKcal) {
      banners.push(`${memberB.name} 今日饮食已超标`)
    }
    return banners
  }, [type, recordsA, recordsB, profiles, memberA, memberB])

  function handleViewRecord(record: CheckinRecord) {
    navigate(checkinRecordDetailPath(record.id))
  }

  async function handleDeleteRecord(record: CheckinRecord) {
    if (!window.confirm('确定删除这条记录？')) return
    await deleteRecord.mutateAsync({ id: record.id })
  }

  return (
    <div className="relative flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-heading)] text-2xl font-semibold tracking-tight">
            打卡记录
          </h1>
          <p className="text-sm text-muted-foreground">{label} · 按日期查看</p>
        </div>
        <div className="w-[160px]">
          <Input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
        </div>
      </div>

      {overLimitBanners.length > 0 ? (
        <div className="space-y-1">
          {overLimitBanners.map((banner) => (
            <p
              key={banner}
              className={cn(
                'rounded-md border border-[var(--checkin-over-limit)]/40 bg-[var(--checkin-over-limit)]/10',
                'px-3 py-2 text-sm font-medium text-[var(--checkin-over-limit)]',
              )}
            >
              {banner}
            </p>
          ))}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
          加载中…
        </div>
      ) : !memberA || !memberB ? (
        <div className="flex flex-1 items-center justify-center rounded-card border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
          需要两名家庭成员
        </div>
      ) : records.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-card border border-dashed border-border bg-card/50 p-8 text-center text-muted-foreground">
          {editable ? '今天暂无记录，点击右下角添加' : '该日期暂无记录'}
        </div>
      ) : (
        <DualLaneTimeline
          slots={lanes.slots}
          recordType={type}
          memberA={memberA}
          memberB={memberB}
          dietOverLimitByRecordId={type === 'diet' ? dietOverLimitByRecordId : undefined}
          onViewRecord={handleViewRecord}
          onDeleteRecord={editable ? handleDeleteRecord : undefined}
        />
      )}

      {editable ? (
        <CheckinPressable
          type="button"
          onClick={() => navigate(checkinRecordNewPath(type, slotDate))}
          className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 flex size-12 items-center justify-center rounded-full bg-primary p-0 text-primary-foreground shadow-lg"
          aria-label={`新增${label}记录`}
        >
          <Plus className="size-5" aria-hidden />
        </CheckinPressable>
      ) : null}
    </div>
  )
}
