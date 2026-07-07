import { AnimatePresence, motion, useDragControls, useMotionValue } from 'framer-motion'
import type { ReactNode, PointerEvent } from 'react'
import { useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useAppMotion } from '../../motion/use-app-motion'

type AppMotionBottomSheetProps = {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  className?: string
}

export default function AppMotionBottomSheet({
  open,
  onClose,
  title,
  children,
  className,
}: AppMotionBottomSheetProps) {
  const { sheetSpring, enableDragSheet, reducedMotion } = useAppMotion()
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  useEffect(() => {
    if (!open) y.set(0)
  }, [open, y])

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.button
            type="button"
            aria-label="关闭"
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={sheetSpring}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal
            className={cn(
              'fixed inset-x-0 bottom-0 z-50 flex max-h-[85svh] flex-col rounded-t-2xl border-t border-border bg-popover pb-safe-bottom shadow-lg',
              className,
            )}
            style={{ y }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={sheetSpring}
            drag={enableDragSheet && !reducedMotion ? 'y' : false}
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.35 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 600) onClose()
              else y.set(0)
            }}
          >
            <div
              className="flex shrink-0 cursor-grab flex-col items-center border-b border-border px-4 py-3 active:cursor-grabbing"
              onPointerDown={(e: PointerEvent) => {
                if (enableDragSheet && !reducedMotion) dragControls.start(e)
              }}
            >
              <div className="mb-2 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
              {title ? <p className="text-center text-base font-medium">{title}</p> : null}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  )
}
