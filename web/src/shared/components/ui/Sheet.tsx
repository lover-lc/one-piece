import { useEffect, type ReactNode } from 'react'

interface SheetProps {
  open: boolean
  onClose: () => void
  title?: string
  children: ReactNode
}

export default function Sheet({ open, onClose, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <button
        type="button"
        aria-label="关闭"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'sheet-title' : undefined}
        className="relative max-h-[85svh] animate-sheet-up overflow-hidden rounded-t-2xl bg-bg-card shadow-lg"
      >
        {title ? (
          <div className="border-b border-bg-hover px-4 py-3">
            <h2 id="sheet-title" className="text-center text-base font-medium text-text">
              {title}
            </h2>
          </div>
        ) : null}
        <div className="overflow-y-auto pb-safe-bottom">{children}</div>
      </div>
    </div>
  )
}
