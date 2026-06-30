import { useRef } from 'react'
import type { GanttGranularity, GanttRange } from '../lib/gantt-scale'
import type { TodoItem } from '../types/todo-types'
import GanttChart, { type GanttChartHandle } from './gantt/GanttChart'
import GanttFullscreen, { type GanttFullscreenHandle } from './gantt/GanttFullscreen'
import TimelineGanttToolbar from './TimelineGanttToolbar'

type TimelineGanttChartProps = {
  todos: TodoItem[]
  granularity: GanttGranularity
  range: GanttRange
  onGranularityChange: (value: GanttGranularity) => void
}

export default function TimelineGanttChart({
  todos,
  granularity,
  range,
  onGranularityChange,
}: TimelineGanttChartProps) {
  const chartRef = useRef<GanttChartHandle>(null)
  const fullscreenRef = useRef<GanttFullscreenHandle>(null)

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <TimelineGanttToolbar
        granularity={granularity}
        onGranularityChange={onGranularityChange}
        onToday={() => chartRef.current?.scrollToToday()}
        onFullscreen={() => void fullscreenRef.current?.enter()}
      />
      <GanttFullscreen ref={fullscreenRef} className="min-h-0 flex-1">
        <GanttChart ref={chartRef} todos={todos} granularity={granularity} range={range} />
      </GanttFullscreen>
    </div>
  )
}
