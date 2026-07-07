import type { GanttGranularity } from '../lib/gantt-scale'
import AppSegmentedControl from '../../../shared/components/motion/AppSegmentedControl'
import { cn } from '@/lib/utils'

type TimelineGranularityToggleProps = {
  value: GanttGranularity
  onChange: (value: GanttGranularity) => void
  className?: string
}

const options: { value: GanttGranularity; label: string }[] = [
  { value: 'day', label: '日' },
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
]

export default function TimelineGranularityToggle({
  value,
  onChange,
  className,
}: TimelineGranularityToggleProps) {
  return (
    <AppSegmentedControl
      aria-label="时间粒度"
      className={cn(
        'mb-3 inline-flex h-8 rounded-lg border border-border bg-muted/40',
        className,
      )}
      size="xs"
      layoutIdPrefix="timeline-granularity"
      options={options}
      value={value}
      onChange={onChange}
    />
  )
}
