import { Trash2 } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'

const ACTION_WIDTH = 72

interface SwipeRowProps {
  children: ReactNode
  onDelete?: () => void
  deleteDisabled?: boolean
  onContentClick?: () => void
}

export default function SwipeRow({
  children,
  onDelete,
  deleteDisabled = false,
  onContentClick,
}: SwipeRowProps) {
  const [offsetX, setOffsetX] = useState(0)
  const touchStartX = useRef(0)
  const swiped = useRef(false)

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    swiped.current = false
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (deleteDisabled) return
    const delta = e.touches[0].clientX - touchStartX.current
    if (delta < -10) swiped.current = true
    setOffsetX(Math.max(Math.min(delta, 0), -ACTION_WIDTH))
  }

  function handleTouchEnd() {
    if (deleteDisabled) return
    setOffsetX((prev) => (prev < -ACTION_WIDTH / 2 ? -ACTION_WIDTH : 0))
  }

  function handleContentClick() {
    if (swiped.current) {
      swiped.current = false
      setOffsetX(0)
      return
    }
    onContentClick?.()
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (!swiped.current) return
    e.preventDefault()
    e.stopPropagation()
    swiped.current = false
    setOffsetX(0)
  }

  const content = onContentClick ? (
    <div
      className="cursor-pointer hover:bg-bg-hover"
      onClick={handleContentClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleContentClick()
        }
      }}
    >
      {children}
    </div>
  ) : (
    <div onClickCapture={handleClickCapture}>{children}</div>
  )

  return (
    <div className="relative overflow-hidden rounded-card">
      {!deleteDisabled && onDelete ? (
        <div
          className="absolute inset-y-0 right-0 flex items-center justify-center bg-status-expired"
          style={{ width: ACTION_WIDTH }}
        >
          <button
            type="button"
            aria-label="删除"
            onClick={onDelete}
            className="p-3 text-white"
          >
            <Trash2 className="size-5" />
          </button>
        </div>
      ) : null}
      <div
        className="relative bg-bg-card transition-transform duration-150"
        style={{ transform: `translateX(${offsetX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {content}
      </div>
    </div>
  )
}
