import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { contrastTextColor, dayOfMonth } from '../../lib/calendar-month'
import { useCheckinMotion } from '../../hooks/use-checkin-motion'

export type CalendarViewMode = 'achievement' | 'duel'

type HalfProgress = {
  rate: number
  memberColor: string
  isOverLimit?: boolean
}

type CalendarDayCellProps = {
  date: string | null
  mode: CalendarViewMode
  memberA: HalfProgress
  memberB: HalfProgress
  winnerId: string | null
  winnerColor: string | null
  isToday: boolean
  isFuture: boolean
  dimensionLabel: string
}

function SquareCellFrame({
  children,
  className,
  isToday,
}: {
  children: ReactNode
  className?: string
  isToday?: boolean
}) {
  const { gentle, enableTodayPulse, reducedMotion } = useCheckinMotion()

  return (
    <div className="flex h-full min-h-0 w-full items-center justify-center">
      <motion.div
        className={cn(
          'aspect-square max-h-full w-full max-w-full overflow-hidden rounded-[3px]',
          isToday && 'ring-1 ring-primary',
          className,
        )}
        animate={
          isToday && enableTodayPulse && !reducedMotion
            ? { scale: [1, 1.04, 1], boxShadow: ['0 0 0 0 transparent', '0 0 0 2px var(--primary)', '0 0 0 0 transparent'] }
            : { scale: 1 }
        }
        transition={
          isToday && enableTodayPulse
            ? { duration: 1.2, repeat: 1, ease: 'easeOut' }
            : gentle
        }
      >
        {children}
      </motion.div>
    </div>
  )
}

function ProgressHalf({ half, side }: { half: HalfProgress; side: 'left' | 'right' }) {
  const { gentle } = useCheckinMotion()
  const fillWidth = Math.min(Math.max(half.rate, 0), 100)
  const fillColor = half.isOverLimit ? 'var(--checkin-over-limit)' : half.memberColor

  return (
    <div
      className={cn(
        'relative h-full flex-1 overflow-hidden bg-muted/40',
        side === 'left' ? 'rounded-l-[2px]' : 'rounded-r-[2px]',
      )}
    >
      <motion.div
        className="absolute inset-y-0 left-0"
        initial={false}
        animate={{
          width: `${fillWidth}%`,
          backgroundColor: fillColor,
          opacity: half.isOverLimit ? 1 : 0.9,
        }}
        transition={gentle}
      />
    </div>
  )
}

export default function CalendarDayCell({
  date,
  mode,
  memberA,
  memberB,
  winnerId,
  winnerColor,
  isToday,
  isFuture,
  dimensionLabel,
}: CalendarDayCellProps) {
  const { gentle, enableWinnerPop, reducedMotion } = useCheckinMotion()

  if (!date) {
    return <div className="h-full min-h-0 w-full" aria-hidden />
  }

  const dayNum = dayOfMonth(date)
  const ariaAchievement = `${date} ${dimensionLabel} 左 ${Math.round(memberA.rate)}% 右 ${Math.round(memberB.rate)}%`
  const ariaDuel =
    winnerId && winnerColor
      ? `${date} ${dimensionLabel} 有胜者`
      : `${date} ${dimensionLabel} 平局或无数据`

  if (mode === 'duel') {
    const bg = winnerId && winnerColor ? winnerColor : 'var(--checkin-tie)'
    const textColor =
      winnerId && winnerColor ? contrastTextColor(winnerColor) : 'var(--muted-foreground)'
    const hasWinner = Boolean(winnerId && winnerColor)

    return (
      <SquareCellFrame isToday={isToday}>
        <motion.div
          className={cn(
            'flex h-full w-full items-center justify-center text-[clamp(9px,2.8vw,13px)] font-semibold tabular-nums',
            isFuture && 'opacity-40',
          )}
          style={{ color: textColor }}
          aria-label={ariaDuel}
          initial={
            hasWinner && enableWinnerPop && !reducedMotion ? { scale: 1.08, backgroundColor: bg } : false
          }
          animate={{ scale: 1, backgroundColor: bg }}
          transition={gentle}
        >
          {dayNum}
        </motion.div>
      </SquareCellFrame>
    )
  }

  return (
    <SquareCellFrame
      isToday={isToday}
      className={cn('border border-border/40 bg-card', isFuture && 'opacity-40')}
    >
      <motion.div
        className="flex h-full flex-col overflow-hidden"
        aria-label={ariaAchievement}
        initial={false}
        animate={{ opacity: 1 }}
        transition={gentle}
      >
        <span className="shrink-0 pt-[8%] text-center text-[clamp(7px,2vw,11px)] font-medium leading-none tabular-nums text-muted-foreground">
          {dayNum}
        </span>
        <div className="flex min-h-0 flex-1 items-end px-[6%] pb-[8%]">
          <div className="flex h-[clamp(3px,18%,6px)] w-full overflow-hidden rounded-[2px]">
            <ProgressHalf half={memberA} side="left" />
            <div className="w-px shrink-0 bg-border/50" aria-hidden />
            <ProgressHalf half={memberB} side="right" />
          </div>
        </div>
      </motion.div>
    </SquareCellFrame>
  )
}
