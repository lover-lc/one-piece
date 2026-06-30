import TimelineGanttChart from './TimelineGanttChart'
import TimelineOverview from './TimelineOverview'
import type { GanttGranularity, GanttRange } from '../lib/gantt-scale'
import type { TimelineMode } from '../lib/timeline-utils'
import type { TodoItem } from '../types/todo-types'

type TimelineViewProps = {
  todos: TodoItem[]
  mode: TimelineMode
  granularity: GanttGranularity
  range: GanttRange
  onGranularityChange: (value: GanttGranularity) => void
}

export default function TimelineView({
  todos,
  mode,
  granularity,
  range,
  onGranularityChange,
}: TimelineViewProps) {
  if (mode === 'span') {
    return (
      <TimelineGanttChart
        todos={todos}
        granularity={granularity}
        range={range}
        onGranularityChange={onGranularityChange}
      />
    )
  }

  return <TimelineOverview key={granularity} todos={todos} granularity={granularity} range={range} />
}
