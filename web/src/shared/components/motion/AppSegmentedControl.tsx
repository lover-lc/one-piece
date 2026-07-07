import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppMotion } from '../../motion/use-app-motion'

type SegmentOption<T extends string> = {
  value: T
  label: string
}

type AppSegmentedControlProps<T extends string> = {
  options: SegmentOption<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  segmentClassName?: string
  size?: 'xs' | 'sm' | 'md'
  layoutIdPrefix?: string
  'aria-label'?: string
}

const sizeClasses = {
  xs: 'px-2 py-1 text-[11px]',
  sm: 'px-2 py-1 text-xs',
  md: 'px-3 py-2 text-sm font-medium',
} as const

export default function AppSegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className,
  segmentClassName,
  size = 'sm',
  layoutIdPrefix = 'app-segment',
  'aria-label': ariaLabel,
}: AppSegmentedControlProps<T>) {
  const { spring } = useAppMotion()
  const pad = sizeClasses[size]
  const activeIndex = Math.max(0, options.findIndex((o) => o.value === value))
  const count = options.length

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn('relative flex gap-0.5 p-0.5', className)}
    >
      <motion.div
        layoutId={`${layoutIdPrefix}-indicator`}
        className="absolute inset-y-0.5 rounded-[inherit] bg-card shadow-sm"
        style={{
          width: `calc((100% - 4px) / ${count})`,
          left: `calc(2px + ${activeIndex} * (100% - 4px) / ${count})`,
        }}
        transition={spring}
      />
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={cn(
              'relative z-10 flex-1 rounded-[inherit] font-medium transition-colors',
              pad,
              active ? 'text-foreground' : 'text-muted-foreground',
              segmentClassName,
            )}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
