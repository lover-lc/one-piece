import { useMemo } from 'react'
import {
  buildOverviewSegments,
  formatSpineMeta,
  getTodayIso,
  OVERVIEW_SPINE_WIDTH,
  partitionTodos,
  type OverviewDateGroupSegment,
  type OverviewGapSegment,
} from '../lib/timeline-utils'
import type { TodoItem } from '../types/todo-types'
import { cn } from '@/lib/utils'
import TodoRelationBadge from './TodoRelationBadge'

import { filterTodosByRangeFilter, parseRangeFilter, type GanttGranularity, type GanttRange } from '../lib/gantt-scale'

type TimelineOverviewProps = {
  todos: TodoItem[]
  granularity: GanttGranularity
  range: GanttRange
}

function TodayDashedLine() {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/2 z-[5] border-t border-dashed border-primary"
      aria-hidden
    />
  )
}

function SpineLine() {
  return (
    <div
      className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2 bg-border/70"
      aria-hidden
    />
  )
}

function OverviewTodoRow({ todo }: { todo: TodoItem }) {
  const isCompleted = todo.status === 'completed'
  const today = getTodayIso()
  const dueMeta = todo.dueDate ? formatSpineMeta(todo.dueDate, today) : null

  return (
    <div
      className={cn(
        'flex h-8 items-center gap-2 border-b border-border/50 px-3 hover:bg-muted/20',
        isCompleted && 'opacity-45',
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <p
          className={cn(
            'min-w-0 truncate text-sm',
            isCompleted ? 'text-muted-foreground line-through' : 'text-foreground',
          )}
          title={todo.title}
        >
          {todo.title}
        </p>
        <TodoRelationBadge todo={todo} className="shrink-0" />
      </div>
      {dueMeta ? (
        <span
          className={cn(
            'shrink-0 text-xs tabular-nums',
            dueMeta.accentClass,
          )}
        >
          {dueMeta.label}
        </span>
      ) : null}
    </div>
  )
}

function OverviewDateGroup({ group }: { group: OverviewDateGroupSegment }) {
  const { spine } = group
  const dotClass = spine.isOverdue
    ? 'bg-status-expired'
    : spine.isToday
      ? 'bg-primary'
      : 'bg-muted-foreground/55'

  return (
    <div className="relative flex">
      {group.showsTodayLine ? <TodayDashedLine /> : null}
      <div
        className="relative shrink-0"
        style={{ width: OVERVIEW_SPINE_WIDTH }}
      >
        <SpineLine />
        <div className="relative z-10 px-1 pb-1 pt-2 text-center">
          <p
            className={cn(
              'text-xs font-semibold leading-none tabular-nums',
              spine.accentClass,
            )}
          >
            {spine.label}
          </p>
          {spine.sublabel ? (
            <p className={cn('mt-0.5 text-[10px] leading-none', spine.accentClass)}>
              {spine.sublabel}
            </p>
          ) : null}
          <span
            className={cn('mx-auto mt-1.5 block size-2 rounded-full', dotClass)}
            aria-hidden
          />
        </div>
      </div>

      <div className="min-w-0 flex-1">
        {group.todos.map((todo) => (
          <OverviewTodoRow key={todo.id} todo={todo} />
        ))}
      </div>
    </div>
  )
}

function OverviewTodayMarkerRow() {
  return (
    <div className="relative flex h-5">
      <TodayDashedLine />
      <div className="relative shrink-0" style={{ width: OVERVIEW_SPINE_WIDTH }}>
        <SpineLine />
      </div>
      <div className="min-w-0 flex-1" />
    </div>
  )
}

function OverviewGapRow({ gap }: { gap: OverviewGapSegment }) {
  if (gap.kind === 'small') {
    return (
      <div className="flex" style={{ height: 16 }}>
        <div className="relative shrink-0" style={{ width: OVERVIEW_SPINE_WIDTH }}>
          <SpineLine />
        </div>
        <div className="min-w-0 flex-1" />
      </div>
    )
  }

  return (
    <div className="flex min-h-6">
      <div
        className="relative shrink-0"
        style={{ width: OVERVIEW_SPINE_WIDTH }}
      >
        <SpineLine />
        {gap.monthAnchor ? (
          <p className="relative z-10 px-0.5 pt-1 text-center text-[10px] leading-none text-muted-foreground">
            {gap.monthAnchor}
          </p>
        ) : null}
      </div>
      <div className="flex min-w-0 flex-1 items-center px-3 py-1">
        <p className="text-[11px] text-muted-foreground">{gap.label}</p>
      </div>
    </div>
  )
}

function NoDateSection({ items }: { items: TodoItem[] }) {
  if (items.length === 0) return null

  return (
    <section>
      <div className="border-t border-dashed border-border/80 px-3 py-2">
        <p className="text-xs text-muted-foreground">无日期</p>
      </div>
      {items.map((todo) => (
        <OverviewTodoRow key={todo.id} todo={todo} />
      ))}
    </section>
  )
}

export default function TimelineOverview({ todos, granularity, range }: TimelineOverviewProps) {
  const { segments, noDate } = useMemo(() => {
    const rangeFilter = parseRangeFilter(range)
    const inRange = filterTodosByRangeFilter(todos, rangeFilter)
    const { noDate: allNoDate } = partitionTodos(todos)
    const built = buildOverviewSegments(inRange, granularity)
    return { segments: built.segments, noDate: [...built.noDate, ...allNoDate] }
  }, [todos, granularity, range])

  if (segments.length === 0 && noDate.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">暂无待办</p>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card">
      <div key={granularity} className="min-h-0 flex-1 overflow-y-auto">
        {segments.map((segment, index) => {
          if (segment.type === 'today-marker') {
            return <OverviewTodayMarkerRow key="today-marker" />
          }

          if (segment.type === 'date-group') {
            return (
              <OverviewDateGroup
                key={`${granularity}-${segment.spine.dateKey}-${index}`}
                group={segment}
              />
            )
          }

          return (
            <OverviewGapRow
              key={`${granularity}-${segment.fromDate}-${segment.toDate}-${segment.kind}-${index}`}
              gap={segment}
            />
          )
        })}
        <NoDateSection items={noDate} />
      </div>
    </div>
  )
}
