import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import SwipeRow from '../../../shared/components/ui/SwipeRow'
import { useOptimisticSortableList } from '../../../shared/hooks/use-optimistic-sortable-list'
import { cn } from '@/lib/utils'
import { SYSTEM_RESERVED_NAME } from '../lib/seed-defaults'

export type ManageEntityType = 'area' | 'category' | 'unit' | 'container'
export type ManageEntity = {
  id: string
  name: string
  isSystemReserved: boolean
  isDisabled?: boolean
}

const TYPE_LABELS: Record<ManageEntityType, string> = {
  area: '区域',
  category: '分类',
  unit: '计量单位',
  container: '容器',
}

function NamePromptDialog({
  title,
  message,
  defaultValue = '',
  confirmLabel,
  onCancel,
  onConfirm,
  isPending,
}: {
  title: string
  message: string
  defaultValue?: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: (name: string) => void
  isPending?: boolean
}) {
  const [name, setName] = useState(defaultValue)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="name-prompt-title"
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
      >
        <h2 id="name-prompt-title" className="text-lg font-medium text-text">
          {title}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="mt-4 w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
        />
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-button bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '保存中…' : confirmLabel}
          </button>
        </div>
      </form>
    </div>
  )
}

function SortableManageRow({
  entity,
  type,
  compact = false,
  interactionMode = 'rename',
  selected = false,
  onSelect,
  onRename,
  onDelete,
  onToggleDisabled,
}: {
  entity: ManageEntity
  type: ManageEntityType
  compact?: boolean
  interactionMode?: 'rename' | 'select'
  selected?: boolean
  onSelect?: () => void
  onRename?: () => void
  onDelete?: () => void
  onToggleDisabled?: () => void
}) {
  const isDisabled =
    type === 'unit' && 'isDisabled' in entity && entity.isDisabled === true
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: entity.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  function handleContentClick() {
    if (interactionMode === 'select') {
      onSelect?.()
      return
    }
    onRename?.()
  }

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'z-10')}>
      <SwipeRow
        deleteDisabled={!onDelete}
        onDelete={onDelete}
        onContentClick={
          interactionMode === 'select' ? onSelect : onRename
        }
      >
        <div
          className={cn(
            'flex items-center gap-1',
            compact ? 'px-2 py-2' : 'gap-2 px-4 py-3',
            isDragging && 'shadow-md ring-1 ring-bg-hover',
            selected && 'bg-primary/5 ring-1 ring-primary/20',
          )}
        >
          <button
            type="button"
            className={cn(
              'shrink-0 touch-none rounded text-text-tertiary hover:bg-bg-hover',
              compact ? 'p-0.5' : 'p-1',
            )}
            aria-label="拖动排序"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className={compact ? 'size-3.5' : 'size-4'} />
          </button>
          <button
            type="button"
            onClick={handleContentClick}
            className={cn(
              'min-w-0 flex-1 truncate text-left text-text',
              compact ? 'text-xs' : 'text-sm',
            )}
          >
            <span
              className={[
                isDisabled ? 'text-status-expired' : 'text-text',
              ].join(' ')}
            >
              {entity.name}
              {isDisabled ? (
                <span className="ml-2 text-xs font-normal text-status-expired">
                  已停用
                </span>
              ) : null}
            </span>
          </button>
          {interactionMode === 'select' && onRename ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRename()
              }}
              aria-label={`编辑${entity.name}`}
              className={cn(
                'shrink-0 rounded-button text-text-secondary hover:bg-bg-hover',
                compact ? 'p-1' : 'p-1.5',
              )}
            >
              <Pencil className={compact ? 'size-3' : 'size-3.5'} strokeWidth={2} />
            </button>
          ) : null}
          {type === 'unit' && onToggleDisabled ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onToggleDisabled()
              }}
              className="shrink-0 rounded-button px-2 py-1 text-xs text-text-secondary hover:bg-bg-hover"
            >
              {isDisabled ? '启用' : '停用'}
            </button>
          ) : null}
        </div>
      </SwipeRow>
    </li>
  )
}

interface ManageListProps {
  type: ManageEntityType
  entities: ManageEntity[]
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDeleteRequest: (entity: ManageEntity) => void
  onToggleDisabled?: (entity: ManageEntity) => void
  onReorder: (orderedIds: string[]) => void
  isLoading?: boolean
  interactionMode?: 'rename' | 'select'
  selectedId?: string | null
  onSelect?: (entity: ManageEntity) => void
  addDisabled?: boolean
  layout?: 'list' | 'grid-2'
}

export default function ManageList({
  type,
  entities,
  onAdd,
  onRename,
  onDeleteRequest,
  onToggleDisabled,
  onReorder,
  isLoading = false,
  interactionMode = 'rename',
  selectedId = null,
  onSelect,
  addDisabled = false,
  layout = 'list',
}: ManageListProps) {
  const typeLabel = TYPE_LABELS[type]
  const isGrid = layout === 'grid-2'

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [entityToRename, setEntityToRename] = useState<ManageEntity | null>(
    null,
  )
  const [showSystemDeleteAlert, setShowSystemDeleteAlert] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { sortedItems, applySortedItems } = useOptimisticSortableList(entities)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function attemptDelete(entity: ManageEntity) {
    if (entity.isSystemReserved || entity.name === SYSTEM_RESERVED_NAME) {
      setShowSystemDeleteAlert(true)
      return
    }
    onDeleteRequest(entity)
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedItems.findIndex((entity) => entity.id === active.id)
    const newIndex = sortedItems.findIndex((entity) => entity.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const nextItems = arrayMove(sortedItems, oldIndex, newIndex)
    applySortedItems(nextItems)
    onReorder(nextItems.map((entity) => entity.id))
  }

  async function handleAdd(name: string) {
    setIsSubmitting(true)
    try {
      await onAdd(name)
      setShowAddDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRename(name: string) {
    if (!entityToRename) return
    setIsSubmitting(true)
    try {
      await onRename(entityToRename.id, name)
      setEntityToRename(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">{typeLabel}</h2>
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          disabled={addDisabled}
          className="flex items-center gap-1 rounded-button px-2 py-1.5 text-sm text-primary hover:bg-bg-hover disabled:opacity-40"
        >
          <Plus className="size-4" strokeWidth={2} />
          新建
        </button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-text-secondary">加载中…</p>
      ) : sortedItems.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          暂无{typeLabel}
        </p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedItems.map((entity) => entity.id)}
            strategy={isGrid ? rectSortingStrategy : verticalListSortingStrategy}
          >
            <ul
              className={cn(
                'mt-3',
                isGrid ? 'grid grid-cols-2 gap-2' : 'space-y-2',
              )}
            >
              {sortedItems.map((entity) => {
                const isSystem = entity.isSystemReserved

                return (
                  <SortableManageRow
                    key={entity.id}
                    entity={entity}
                    type={type}
                    compact={isGrid}
                    interactionMode={interactionMode}
                    selected={selectedId === entity.id}
                    onSelect={
                      interactionMode === 'select' && onSelect
                        ? () => onSelect(entity)
                        : undefined
                    }
                    onRename={
                      isSystem ? undefined : () => setEntityToRename(entity)
                    }
                    onDelete={
                      isSystem ? undefined : () => attemptDelete(entity)
                    }
                    onToggleDisabled={
                      type === 'unit' && onToggleDisabled && !isSystem
                        ? () => onToggleDisabled(entity)
                        : undefined
                    }
                  />
                )
              })}
            </ul>
          </SortableContext>
        </DndContext>
      )}

      {showAddDialog ? (
        <NamePromptDialog
          title={`新建${typeLabel}`}
          message={`请输入新${typeLabel}名称`}
          confirmLabel="添加"
          onCancel={() => setShowAddDialog(false)}
          onConfirm={handleAdd}
          isPending={isSubmitting}
        />
      ) : null}

      {entityToRename ? (
        <NamePromptDialog
          title={`重命名${typeLabel}`}
          message={`请输入新的${typeLabel}名称`}
          defaultValue={entityToRename.name}
          confirmLabel="保存"
          onCancel={() => setEntityToRename(null)}
          onConfirm={handleRename}
          isPending={isSubmitting}
        />
      ) : null}

      {showSystemDeleteAlert ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="system-delete-title"
            className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
          >
            <h2
              id="system-delete-title"
              className="text-lg font-medium text-text"
            >
              无法删除
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              「{SYSTEM_RESERVED_NAME}」是系统保留{typeLabel}，无法删除。
            </p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSystemDeleteAlert(false)}
                className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
              >
                确定
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export type { ManageListProps }
