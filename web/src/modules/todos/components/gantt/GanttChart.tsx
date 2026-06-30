import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  buildColumns,
  computeBarLayout,
  computeTodayColumnOffset,
  filterTodosByRangeFilter,
  formatColumnHeader,
  parseRangeFilter,
  sumTimelineWidth,
  type GanttGranularity,
  type GanttRange,
} from '../../lib/gantt-scale'
import {
  ensureDateInViewport,
  expandGanttViewportEnd,
  expandGanttViewportStart,
  initialGanttViewport,
} from '../../lib/gantt-viewport'
import { compareTodoSchedule } from '../../../../shared/lib/todo-schedule'
import {
  effectiveStart,
  getTodayIso,
  partitionTodos,
} from '../../lib/timeline-utils'
import type { TodoItem } from '../../types/todo-types'
import {
  GANTT_BAR_HEIGHT,
  GANTT_ROW_HEIGHT,
  GanttEmptyState,
  GanttLabelCell,
  GanttNoDateSection,
  getBarColor,
  getGanttRowHeight,
  isWeekend,
} from './gantt-shared'
import { useGanttLabelWidth } from './gantt-layout'
import { cn } from '@/lib/utils'

export type GanttChartHandle = {
  scrollToToday: () => void
}

type GanttChartProps = {
  todos: TodoItem[]
  granularity: GanttGranularity
  range: GanttRange
}

function scrollChartToTodayOffset(
  scrollRef: React.RefObject<HTMLDivElement | null>,
  todayOffset: number | null,
  labelWidth: number,
) {
  if (todayOffset == null || !scrollRef.current) return
  const target = todayOffset + labelWidth - scrollRef.current.clientWidth / 2
  scrollRef.current.scrollLeft = Math.max(0, target)
}

const GanttChart = forwardRef<GanttChartHandle, GanttChartProps>(function GanttChart(
  { todos, granularity, range },
  ref,
) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const prependedWidthRef = useRef(0)
  const expandingRef = useRef(false)
  const today = getTodayIso()
  const labelWidth = useGanttLabelWidth()
  const [viewportRange, setViewportRange] = useState(() =>
    initialGanttViewport(granularity, today),
  )
  const [viewportAnchor, setViewportAnchor] = useState({ granularity, today })

  if (granularity !== viewportAnchor.granularity || today !== viewportAnchor.today) {
    setViewportAnchor({ granularity, today })
    setViewportRange(initialGanttViewport(granularity, today))
  }

  const rangeFilter = useMemo(() => parseRangeFilter(range), [range])

  const { visibleTodos, noDate } = useMemo(() => {
    const { dated, noDate: undated } = partitionTodos(todos)
    const filtered = filterTodosByRangeFilter(dated, rangeFilter)
    const sorted = [...filtered].sort((a, b) => {
      const scheduleCmp = compareTodoSchedule(a, b)
      if (scheduleCmp !== 0) return scheduleCmp
      const startCmp = effectiveStart(a).localeCompare(effectiveStart(b))
      if (startCmp !== 0) return startCmp
      return a.title.localeCompare(b.title, 'zh-CN')
    })
    return { visibleTodos: sorted, noDate: undated }
  }, [todos, rangeFilter])

  const columns = useMemo(
    () => buildColumns(granularity, viewportRange),
    [granularity, viewportRange],
  )

  const timelineWidth = sumTimelineWidth(columns)
  const columnOffsets = useMemo(() => {
    let offset = 0
    return columns.map((column) => {
      offset += column.widthPx
      return offset
    })
  }, [columns])
  const todayOffset = computeTodayColumnOffset(columns, today, viewportRange, granularity)
  const todayColumnLayout = useMemo(() => {
    let offset = 0
    for (const column of columns) {
      if (today >= column.start && today <= column.end) {
        return { offset, width: column.widthPx }
      }
      offset += column.widthPx
    }
    return null
  }, [columns, today])
  const pendingScrollToTodayRef = useRef(false)
  const [todayHighlight, setTodayHighlight] = useState(false)
  const todayHighlightTimerRef = useRef<number | null>(null)

  const triggerTodayHighlight = useCallback(() => {
    if (todayHighlightTimerRef.current != null) {
      window.clearTimeout(todayHighlightTimerRef.current)
    }
    setTodayHighlight(true)
    todayHighlightTimerRef.current = window.setTimeout(() => {
      setTodayHighlight(false)
      todayHighlightTimerRef.current = null
    }, 1000)
  }, [])

  useEffect(() => {
    return () => {
      if (todayHighlightTimerRef.current != null) {
        window.clearTimeout(todayHighlightTimerRef.current)
      }
    }
  }, [])

  const scrollToTodayImpl = useCallback(
    (viewport: GanttRange) => {
      const cols = buildColumns(granularity, viewport)
      const offset = computeTodayColumnOffset(cols, today, viewport, granularity)
      scrollChartToTodayOffset(scrollRef, offset, labelWidth)
      if (offset != null) triggerTodayHighlight()
    },
    [granularity, today, triggerTodayHighlight, labelWidth],
  )

  const scrollToToday = useCallback(() => {
    setViewportRange((prev) => {
      const next = ensureDateInViewport(prev, today, granularity)
      if (next.start === prev.start && next.end === prev.end) {
        requestAnimationFrame(() => scrollToTodayImpl(next))
      } else {
        pendingScrollToTodayRef.current = true
      }
      return next
    })
  }, [granularity, today, scrollToTodayImpl])

  useImperativeHandle(ref, () => ({ scrollToToday }), [scrollToToday])

  useLayoutEffect(() => {
    if (prependedWidthRef.current > 0 && scrollRef.current) {
      scrollRef.current.scrollLeft += prependedWidthRef.current
      prependedWidthRef.current = 0
    }
    expandingRef.current = false

    if (pendingScrollToTodayRef.current) {
      scrollChartToTodayOffset(scrollRef, todayOffset, labelWidth)
      if (todayOffset != null) triggerTodayHighlight()
      pendingScrollToTodayRef.current = false
    }
  }, [viewportRange, todayOffset, triggerTodayHighlight, labelWidth])

  useLayoutEffect(() => {
    const cols = buildColumns(granularity, viewportRange)
    const offset = computeTodayColumnOffset(cols, today, viewportRange, granularity)
    scrollChartToTodayOffset(scrollRef, offset, labelWidth)
  }, [viewportAnchor, labelWidth])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el || expandingRef.current) return

    const edgeThreshold = Math.max(80, el.clientWidth * 0.12)

    if (el.scrollLeft < edgeThreshold) {
      expandingRef.current = true
      const { viewport, prependedWidth } = expandGanttViewportStart(viewportRange, granularity)
      prependedWidthRef.current = prependedWidth
      setViewportRange(viewport)
      return
    }

    if (el.scrollLeft + el.clientWidth > el.scrollWidth - edgeThreshold) {
      expandingRef.current = true
      const { viewport } = expandGanttViewportEnd(viewportRange, granularity)
      setViewportRange(viewport)
    }
  }, [granularity, viewportRange])

  if (columns.length === 0 && noDate.length === 0) {
    return <GanttEmptyState />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden border border-border/60 bg-card">
      <div
        ref={scrollRef}
        className="gantt-scroll-x-hidden min-h-0 flex-1 overflow-x-auto overflow-y-auto"
        onScroll={handleScroll}
      >
        <div className="relative" style={{ minWidth: labelWidth + timelineWidth }}>
          {todayHighlight && todayColumnLayout ? (
            <span
              className="gantt-today-highlight pointer-events-none absolute bottom-0 top-0 z-[3] bg-primary/20"
              style={{
                left: labelWidth + todayColumnLayout.offset,
                width: todayColumnLayout.width,
              }}
              aria-hidden
            />
          ) : null}
          {todayOffset != null && granularity !== 'month' ? (
            <span
              className="pointer-events-none absolute bottom-0 top-0 z-[4] border-l border-dashed border-primary"
              style={{ left: labelWidth + todayOffset }}
              aria-hidden
            />
          ) : null}
          <div
            className="sticky top-0 z-20 flex border-b border-border/60 bg-card"
            style={{ height: GANTT_ROW_HEIGHT }}
          >
            <div
              className="sticky left-0 z-30 shrink-0 border-r border-border/50 bg-card"
              style={{ width: labelWidth }}
            />
            <div className="relative flex shrink-0" style={{ width: timelineWidth }}>
              {columns.map((column) => {
                const header = formatColumnHeader(column, granularity, today)
                return (
                  <div
                    key={column.key}
                    className={cn(
                      'flex shrink-0 flex-col items-center justify-center border-r border-border/30 px-0.5 text-[10px] tabular-nums',
                      granularity === 'day' &&
                        isWeekend(column.start) &&
                        'bg-muted/20',
                      header.isToday
                        ? 'font-semibold text-primary'
                        : 'text-muted-foreground',
                    )}
                    style={{ width: column.widthPx, height: GANTT_ROW_HEIGHT }}
                  >
                    <span className="truncate">{header.label}</span>
                    {header.sublabel ? (
                      <span className="truncate text-[9px] leading-none">
                        {header.sublabel}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="relative">
            {columns.map((column, colIndex) => (
              <span
                key={`grid-${column.key}`}
                className="pointer-events-none absolute bottom-0 top-0 z-[1] border-r border-border/20"
                style={{
                  left: labelWidth + columnOffsets[colIndex]!,
                }}
                aria-hidden
              />
            ))}

            {visibleTodos.length === 0 ? (
              <p className="py-8 text-center text-xs text-muted-foreground">
                当前筛选下无待办
              </p>
            ) : (
              visibleTodos.map((todo, rowIndex) => {
                const bar = computeBarLayout(todo, columns, viewportRange, rangeFilter)
                const isCompleted = todo.status === 'completed'
                const rowHeight = getGanttRowHeight(todo)
                return (
                  <div
                    key={todo.id}
                    className={cn(
                      'relative flex border-b border-border/50 hover:bg-muted/20',
                      rowIndex % 2 === 1 && 'bg-muted/10',
                      isCompleted && 'opacity-45',
                    )}
                    style={{ height: rowHeight }}
                  >
                    <GanttLabelCell todo={todo} labelWidth={labelWidth} />
                    <div
                      className="relative shrink-0"
                      style={{ width: timelineWidth, height: rowHeight }}
                    >
                      <span
                        className={cn(
                          'absolute top-1/2 -translate-y-1/2',
                          bar.isDot ? 'rounded-full' : 'rounded-sm',
                          getBarColor(todo, today),
                          bar.clipStart &&
                            'border-l border-dashed border-foreground/40 opacity-70',
                          bar.clipEnd &&
                            'border-r border-dashed border-foreground/40 opacity-70',
                        )}
                        style={{
                          left: bar.leftPx,
                          width: bar.widthPx,
                          height: bar.isDot ? 8 : GANTT_BAR_HEIGHT,
                        }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
      <GanttNoDateSection items={noDate} />
    </div>
  )
})

export default GanttChart
