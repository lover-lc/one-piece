import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { X } from 'lucide-react'
import { GanttFullscreenContext } from './gantt-layout'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type GanttFullscreenHandle = {
  enter: () => Promise<void>
  exit: () => Promise<void>
}

type GanttFullscreenProps = {
  children: ReactNode
  className?: string
}

const GanttFullscreen = forwardRef<GanttFullscreenHandle, GanttFullscreenProps>(
  function GanttFullscreen({ children, className }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [isFullscreen, setIsFullscreen] = useState(false)

    const exit = useCallback(async () => {
      const orientation = screen.orientation as ScreenOrientation & {
        unlock?: () => void
      }
      orientation.unlock?.()
      if (document.fullscreenElement) {
        await document.exitFullscreen().catch(() => undefined)
      }
    }, [])

    const enter = useCallback(async () => {
      const el = containerRef.current
      if (!el) return

      await el.requestFullscreen?.().catch(() => undefined)

      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>
      }
      await orientation.lock?.('landscape').catch(() => undefined)
    }, [])

    useImperativeHandle(ref, () => ({ enter, exit }), [enter, exit])

    useEffect(() => {
      function onFullscreenChange() {
        setIsFullscreen(document.fullscreenElement === containerRef.current)
      }

      document.addEventListener('fullscreenchange', onFullscreenChange)
      return () => document.removeEventListener('fullscreenchange', onFullscreenChange)
    }, [])

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative flex min-h-0 flex-1 flex-col bg-card',
          isFullscreen && 'p-2',
          className,
        )}
        onClick={isFullscreen ? () => void exit() : undefined}
      >
        {isFullscreen ? (
          <div className="absolute right-2 top-2 z-30">
            <Button
              type="button"
              size="icon-sm"
              variant="outline"
              className="size-8 bg-background/90"
              aria-label="退出全屏"
              onClick={(event) => {
                event.stopPropagation()
                void exit()
              }}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : null}
        <div
          className="flex min-h-0 flex-1 flex-col"
          onClick={isFullscreen ? (event) => event.stopPropagation() : undefined}
        >
          <GanttFullscreenContext.Provider value={isFullscreen}>
            {children}
          </GanttFullscreenContext.Provider>
        </div>
      </div>
    )
  },
)

export default GanttFullscreen
