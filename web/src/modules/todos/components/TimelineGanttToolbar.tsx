import { Maximize2 } from 'lucide-react'
import type { GanttGranularity } from '../lib/gantt-scale'
import TimelineGranularityToggle from './TimelineGranularityToggle'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type TimelineGanttToolbarProps = {
  granularity: GanttGranularity
  onGranularityChange: (value: GanttGranularity) => void
  onToday: () => void
  onFullscreen: () => void
  todayEnabled?: boolean
  className?: string
}

export default function TimelineGanttToolbar({
  granularity,
  onGranularityChange,
  onToday,
  onFullscreen,
  todayEnabled = true,
  className,
}: TimelineGanttToolbarProps) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-2', className)}>
      <div className="flex min-w-0 items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 shrink-0 px-3 text-xs"
          disabled={!todayEnabled}
          onClick={onToday}
        >
          今天
        </Button>
        <TimelineGranularityToggle
          value={granularity}
          onChange={onGranularityChange}
          className="mb-0"
        />
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant="outline"
        className="size-8 shrink-0"
        aria-label="全屏查看"
        onClick={onFullscreen}
      >
        <Maximize2 className="size-4" />
      </Button>
    </div>
  )
}
