import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import type { FamilyMember } from '@/shared/hooks/use-family-members'
import { getShanghaiDateString } from '../../lib/checkin-dates'
import {
  addMonths,
  formatMonthTitle,
  getMonthGrid,
  isFutureDate,
  monthDateRange,
  monthKeyFromDate,
} from '../../lib/calendar-month'
import {
  computeMemberDayRates,
  memberDayRatesFromSnapshot,
  type MemberDayRates,
} from '../../lib/day-rates'
import {
  GOAL_DIMENSION_LABELS,
  GOAL_DIMENSIONS,
  type GoalDimension,
} from '../../lib/goal-dimensions'
import { monthSwipeVariants } from '../../lib/checkin-motion'
import { resolveDimensionWinner } from '../../lib/scoring'
import { useCheckinMotion } from '../../hooks/use-checkin-motion'
import CheckinSegmentedControl from '../motion/CheckinSegmentedControl'
import { useCheckinProfiles } from '../../hooks/use-checkin-profiles'
import { useCheckinRecordsForDate } from '../../hooks/use-checkin-records'
import { useDailyDuels, useDailySnapshots } from '../../hooks/use-checkin-snapshots'
import type { DailyDuel, DailySnapshot } from '../../types/checkin-types'
import CalendarDayCell, { type CalendarViewMode } from './CalendarDayCell'

type MonthlyCalendarProps = {
  memberA: FamilyMember
  memberB: FamilyMember
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'] as const

function rateForDimension(rates: MemberDayRates, dimension: GoalDimension): number {
  if (dimension === 'diet') return rates.dietRate
  if (dimension === 'exercise') return rates.exerciseRate
  return rates.waterRate
}

function isOverForDimension(rates: MemberDayRates, dimension: GoalDimension): boolean {
  if (dimension === 'diet') return rates.dietOverLimit
  return rateForDimension(rates, dimension) > 100
}

function emptyRates(): MemberDayRates {
  return {
    dietActualKcal: 0,
    dietTargetKcal: 0,
    dietRate: 0,
    dietOverLimit: false,
    exerciseActual: 0,
    exerciseTarget: 0,
    exerciseRate: 0,
    waterActualMl: 0,
    waterTargetMl: 0,
    waterRate: 0,
  }
}

function winnerForDimension(
  dimension: GoalDimension,
  memberAId: string,
  memberBId: string,
  ratesA: MemberDayRates,
  ratesB: MemberDayRates,
  profileAMissing: boolean,
  profileBMissing: boolean,
): string | null {
  if (dimension === 'diet') {
    return resolveDimensionWinner(memberAId, memberBId, ratesA.dietRate, ratesB.dietRate, {
      dimension: 'diet',
      overA: ratesA.dietOverLimit,
      overB: ratesB.dietOverLimit,
      missingA: profileAMissing,
      missingB: profileBMissing,
    }).winnerId
  }

  const rateA = dimension === 'exercise' ? ratesA.exerciseRate : ratesA.waterRate
  const rateB = dimension === 'exercise' ? ratesB.exerciseRate : ratesB.waterRate
  return resolveDimensionWinner(memberAId, memberBId, rateA, rateB, {
    missingA: profileAMissing,
    missingB: profileBMissing,
  }).winnerId
}

function winnerFromDuel(duel: DailyDuel | undefined, dimension: GoalDimension): string | null {
  if (!duel) return null
  if (dimension === 'diet') return duel.dietWinnerMemberId
  if (dimension === 'exercise') return duel.exerciseWinnerMemberId
  return duel.waterWinnerMemberId
}

export default function MonthlyCalendar({ memberA, memberB }: MonthlyCalendarProps) {
  const today = getShanghaiDateString()
  const { spring, reducedMotion } = useCheckinMotion()
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate(today))
  const [slideDir, setSlideDir] = useState(0)
  const [dimension, setDimension] = useState<GoalDimension>('diet')
  const [viewMode, setViewMode] = useState<CalendarViewMode>('achievement')

  function goMonth(delta: number) {
    setSlideDir(delta)
    setMonthKey((m) => addMonths(m, delta))
  }

  const { from, to } = monthDateRange(monthKey)
  const grid = useMemo(() => getMonthGrid(monthKey), [monthKey])

  const { data: snapshots = [], isLoading: snapshotsLoading } = useDailySnapshots({ from, to })
  const { data: duels = [], isLoading: duelsLoading } = useDailyDuels({ from, to })
  const { data: todayRecords = [], isLoading: todayLoading } = useCheckinRecordsForDate(today)
  const { data: profiles = [] } = useCheckinProfiles()

  const profileA = profiles.find((p) => p.memberId === memberA.id)
  const profileB = profiles.find((p) => p.memberId === memberB.id)
  const profileAMissing = !profileA
  const profileBMissing = !profileB

  const dayDataByDate = useMemo(() => {
    const snapshotByMemberDate = new Map<string, DailySnapshot>()
    for (const snapshot of snapshots) {
      snapshotByMemberDate.set(`${snapshot.snapshotDate}:${snapshot.memberId}`, snapshot)
    }
    const duelByDate = new Map(duels.map((duel) => [duel.snapshotDate, duel]))

    const map = new Map<
      string,
      { ratesA: MemberDayRates; ratesB: MemberDayRates; winnerId: string | null }
    >()

    for (const date of grid) {
      if (!date) continue

      let ratesA: MemberDayRates
      let ratesB: MemberDayRates
      let winnerId: string | null

      if (date === today) {
        ratesA = computeMemberDayRates(todayRecords, memberA.id, profileA)
        ratesB = computeMemberDayRates(todayRecords, memberB.id, profileB)
        winnerId = winnerForDimension(
          dimension,
          memberA.id,
          memberB.id,
          ratesA,
          ratesB,
          profileAMissing,
          profileBMissing,
        )
      } else if (date > today) {
        ratesA = emptyRates()
        ratesB = emptyRates()
        winnerId = null
      } else {
        const snapA = snapshotByMemberDate.get(`${date}:${memberA.id}`)
        const snapB = snapshotByMemberDate.get(`${date}:${memberB.id}`)
        ratesA = snapA ? memberDayRatesFromSnapshot(snapA) : emptyRates()
        ratesB = snapB ? memberDayRatesFromSnapshot(snapB) : emptyRates()
        winnerId = winnerFromDuel(duelByDate.get(date), dimension)
      }

      map.set(date, { ratesA, ratesB, winnerId })
    }

    return map
  }, [
    grid,
    snapshots,
    duels,
    today,
    todayRecords,
    memberA.id,
    memberB.id,
    profileA,
    profileB,
    profileAMissing,
    profileBMissing,
    dimension,
  ])

  const isLoading = snapshotsLoading || duelsLoading || todayLoading
  const rowCount = Math.max(1, Math.ceil(grid.length / 7))

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-hidden">
      <div className="flex shrink-0 items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          onClick={() => goMonth(-1)}
          aria-label="上一月"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <h2 className="font-[family-name:var(--font-heading)] text-base font-semibold tabular-nums">
          {formatMonthTitle(monthKey)}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-8"
          onClick={() => goMonth(1)}
          aria-label="下一月"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <CheckinSegmentedControl
          className="min-w-0 flex-1 rounded-md bg-muted/60"
          layoutIdPrefix="overview-dimension"
          options={GOAL_DIMENSIONS.map((dim) => ({
            value: dim,
            label: GOAL_DIMENSION_LABELS[dim],
          }))}
          value={dimension}
          onChange={setDimension}
        />
        <CheckinSegmentedControl
          className="shrink-0 rounded-md bg-muted/60"
          layoutIdPrefix="overview-mode"
          options={[
            { value: 'achievement' as const, label: '达成' },
            { value: 'duel' as const, label: '胜负' },
          ]}
          value={viewMode}
          onChange={setViewMode}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border/60 bg-card p-1 shadow-card">
        <div className="mb-0.5 grid shrink-0 grid-cols-7 gap-[var(--checkin-cell-gap)]">
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="flex h-4 items-center justify-center text-[9px] font-medium text-muted-foreground"
            >
              {label}
            </div>
          ))}
        </div>

        {isLoading && dayDataByDate.size === 0 ? (
          <p className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            加载中…
          </p>
        ) : (
          <motion.div
            className="relative min-h-0 flex-1 touch-pan-y"
            drag={reducedMotion ? false : 'x'}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              if (info.offset.x > 72) goMonth(-1)
              else if (info.offset.x < -72) goMonth(1)
            }}
          >
            <AnimatePresence mode="wait" custom={slideDir} initial={false}>
              <motion.div
                key={`${monthKey}-${viewMode}`}
                custom={slideDir}
                variants={monthSwipeVariants(reducedMotion)}
                initial="enter"
                animate="center"
                exit="exit"
                transition={spring}
                className="grid h-full min-h-0 grid-cols-7 gap-[var(--checkin-cell-gap)]"
                style={{ gridTemplateRows: `repeat(${rowCount}, minmax(0, 1fr))` }}
              >
            {grid.map((date, index) => {
              if (!date) {
                return (
                  <CalendarDayCell
                    key={`empty-${index}`}
                    date={null}
                    mode={viewMode}
                    memberA={{ rate: 0, memberColor: memberA.color }}
                    memberB={{ rate: 0, memberColor: memberB.color }}
                    winnerId={null}
                    winnerColor={null}
                    isToday={false}
                    isFuture={false}
                    dimensionLabel={GOAL_DIMENSION_LABELS[dimension]}
                  />
                )
              }

              const data = dayDataByDate.get(date)
              const ratesA = data?.ratesA ?? emptyRates()
              const ratesB = data?.ratesB ?? emptyRates()
              const winnerId = data?.winnerId ?? null
              const winnerColor =
                winnerId === memberA.id
                  ? memberA.color
                  : winnerId === memberB.id
                    ? memberB.color
                    : null

              return (
                <CalendarDayCell
                  key={date}
                  date={date}
                  mode={viewMode}
                  memberA={{
                    rate: rateForDimension(ratesA, dimension),
                    memberColor: memberA.color,
                    isOverLimit: isOverForDimension(ratesA, dimension),
                  }}
                  memberB={{
                    rate: rateForDimension(ratesB, dimension),
                    memberColor: memberB.color,
                    isOverLimit: isOverForDimension(ratesB, dimension),
                  }}
                  winnerId={winnerId}
                  winnerColor={winnerColor}
                  isToday={date === today}
                  isFuture={isFutureDate(date, today)}
                  dimensionLabel={GOAL_DIMENSION_LABELS[dimension]}
                />
              )
            })}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  )
}
