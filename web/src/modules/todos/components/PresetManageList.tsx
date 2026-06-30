import { ChevronDown, ChevronUp } from 'lucide-react'
import SwipeRow from '../../../shared/components/ui/SwipeRow'

export type PresetManageItem = {
  id: string
  title: string
  subtitle?: string
  builtin?: boolean
  disabled?: boolean
}

type PresetManageListProps = {
  items: PresetManageItem[]
  onMove: (id: string, direction: 'up' | 'down') => void
  onToggleDisabled: (id: string) => void
  onEdit: (id: string) => void
  onDelete?: (id: string) => void
}

export default function PresetManageList({
  items,
  onMove,
  onToggleDisabled,
  onEdit,
  onDelete,
}: PresetManageListProps) {
  return (
    <ul className="space-y-2">
      {items.map((item, index) => (
        <li key={item.id}>
          <SwipeRow
            onDelete={!item.builtin && onDelete ? () => onDelete(item.id) : undefined}
            onContentClick={() => onEdit(item.id)}
          >
            <div className="flex items-center gap-2 bg-card px-3 py-3">
              <div className="flex shrink-0 flex-col gap-0.5">
                <button
                  type="button"
                  aria-label="上移"
                  disabled={index === 0}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(item.id, 'up')
                  }}
                  className="rounded p-0.5 text-text-tertiary hover:bg-bg-hover disabled:opacity-30"
                >
                  <ChevronUp className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="下移"
                  disabled={index === items.length - 1}
                  onClick={(e) => {
                    e.stopPropagation()
                    onMove(item.id, 'down')
                  }}
                  className="rounded p-0.5 text-text-tertiary hover:bg-bg-hover disabled:opacity-30"
                >
                  <ChevronDown className="size-4" />
                </button>
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className={[
                    'text-sm font-medium',
                    item.disabled ? 'text-status-expired' : 'text-text',
                  ].join(' ')}
                >
                  {item.title}
                  {item.disabled ? (
                    <span className="ml-2 text-xs font-normal text-status-expired">已停用</span>
                  ) : null}
                </p>
                {item.subtitle ? (
                  <p
                    className={[
                      'mt-0.5 text-xs',
                      item.disabled ? 'text-status-expired/80' : 'text-text-secondary',
                    ].join(' ')}
                  >
                    {item.subtitle}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onToggleDisabled(item.id)
                }}
                className="shrink-0 rounded-button px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
              >
                {item.disabled ? '启用' : '停用'}
              </button>
            </div>
          </SwipeRow>
        </li>
      ))}
    </ul>
  )
}
