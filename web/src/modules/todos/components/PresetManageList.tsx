import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import SwipeRow from '../../../shared/components/ui/SwipeRow'
import { useOptimisticSortableList } from '../../../shared/hooks/use-optimistic-sortable-list'
import { cn } from '@/lib/utils'

export type PresetManageItem = {
  id: string
  title: string
  builtin?: boolean
  disabled?: boolean
}

type PresetManageListProps = {
  items: PresetManageItem[]
  onReorder: (order: string[]) => void
  onToggleDisabled: (id: string) => void
  onEdit: (id: string) => void
  onDelete?: (id: string) => void
}

function SortablePresetRow({
  item,
  onToggleDisabled,
  onEdit,
  onDelete,
}: {
  item: PresetManageItem
  onToggleDisabled: (id: string) => void
  onEdit: (id: string) => void
  onDelete?: (id: string) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'z-10')}>
      <SwipeRow
        onDelete={!item.builtin && onDelete ? () => onDelete(item.id) : undefined}
        onContentClick={() => onEdit(item.id)}
      >
        <div
          className={cn(
            'flex items-center gap-2 bg-card px-3 py-3',
            isDragging && 'shadow-md ring-1 ring-border/60',
          )}
        >
          <button
            type="button"
            className="shrink-0 touch-none rounded p-1 text-muted-foreground hover:bg-muted/50"
            aria-label="拖动排序"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </button>
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'truncate text-sm font-medium',
                item.disabled ? 'text-status-expired' : 'text-foreground',
              )}
            >
              {item.title}
              {item.disabled ? (
                <span className="ml-2 text-xs font-normal text-status-expired">已停用</span>
              ) : null}
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onToggleDisabled(item.id)
            }}
            className="shrink-0 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted/50"
          >
            {item.disabled ? '启用' : '停用'}
          </button>
        </div>
      </SwipeRow>
    </li>
  )
}

export default function PresetManageList({
  items,
  onReorder,
  onToggleDisabled,
  onEdit,
  onDelete,
}: PresetManageListProps) {
  const { sortedItems, applySortedItems } = useOptimisticSortableList(items)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedItems.findIndex((item) => item.id === active.id)
    const newIndex = sortedItems.findIndex((item) => item.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const nextItems = arrayMove(sortedItems, oldIndex, newIndex)
    applySortedItems(nextItems)
    onReorder(nextItems.map((item) => item.id))
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sortedItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {sortedItems.map((item) => (
            <SortablePresetRow
              key={item.id}
              item={item}
              onToggleDisabled={onToggleDisabled}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
