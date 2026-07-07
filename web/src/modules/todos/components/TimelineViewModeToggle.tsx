import type { TimelineMode } from '../lib/timeline-utils'
import AppSegmentedControl from '../../../shared/components/motion/AppSegmentedControl'

type TimelineViewModeToggleProps = {
  value: TimelineMode
  onChange: (mode: TimelineMode) => void
}

const options: { value: TimelineMode; label: string }[] = [
  { value: 'due', label: '总览' },
  { value: 'span', label: '跨度' },
]

export default function TimelineViewModeToggle({
  value,
  onChange,
}: TimelineViewModeToggleProps) {
  return (
    <AppSegmentedControl
      aria-label="时间轴视图模式"
      className="mb-3 inline-flex h-8 rounded-lg border border-border bg-muted/40"
      size="xs"
      layoutIdPrefix="timeline-mode"
      options={options}
      value={value}
      onChange={onChange}
    />
  )
}
