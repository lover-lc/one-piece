import type { GanttGranularity } from '../lib/gantt-scale'
import { Button } from '@/components/ui/button'
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
    <div
      className={cn(
        'mb-3 inline-flex h-8 rounded-lg border border-border bg-muted/40 p-0.5',
        className,
      )}
      role="group"
      aria-label="时间粒度"
    >
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'default' : 'ghost'}
          className={cn(
            'h-7 min-w-12 rounded-md px-3 text-xs',
            value !== option.value && 'text-muted-foreground',
          )}
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}
