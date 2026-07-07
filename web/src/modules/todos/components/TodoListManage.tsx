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
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Plus } from 'lucide-react'
import { useEffect, useState } from 'react'
import SwipeRow from '../../../shared/components/ui/SwipeRow'
import { useOptimisticSortableList } from '../../../shared/hooks/use-optimistic-sortable-list'
import { cn } from '@/lib/utils'
import { DEFAULT_TODO_LIST_COLOR } from '../lib/todo-list-colors'
import type { TodoList } from '../types/todo-types'
import { ListColorPicker } from './ListColorPicker'

function NamePromptDialog({
  title,
  message,
  defaultValue = '',
  defaultColor = DEFAULT_TODO_LIST_COLOR,
  confirmLabel,
  onCancel,
  onConfirm,
  isPending,
}: {
  title: string
  message: string
  defaultValue?: string
  defaultColor?: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: (name: string, color: string) => void
  isPending?: boolean
}) {
  const [name, setName] = useState(defaultValue)
  const [color, setColor] = useState(defaultColor)

  useEffect(() => {
    setName(defaultValue)
    setColor(defaultColor)
  }, [defaultValue, defaultColor])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onConfirm(trimmed, color)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="todo-list-prompt-title"
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
      >
        <h2 id="todo-list-prompt-title" className="text-lg font-medium text-text">
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
        <div className="mt-4">
          <label className="mb-2 block text-xs text-text-secondary">颜色</label>
          <ListColorPicker value={color} onChange={setColor} />
        </div>
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

function SortableListRow({
  list,
  count,
  onRename,
  onDelete,
}: {
  list: TodoList
  count: number
  onRename: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: list.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : transition,
  }

  return (
    <li ref={setNodeRef} style={style} className={cn(isDragging && 'z-10')}>
      <SwipeRow onDelete={onDelete} onContentClick={onRename}>
        <div
          className={cn(
            'flex items-center gap-2 bg-card px-4 py-3',
            isDragging && 'shadow-md ring-1 ring-bg-hover',
          )}
        >
          <button
            type="button"
            className="shrink-0 touch-none rounded p-1 text-text-tertiary hover:bg-bg-hover"
            aria-label="拖动排序"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="size-4" />
          </button>
          <span
            className="size-3 shrink-0 rounded-full"
            style={{ backgroundColor: list.color ?? DEFAULT_TODO_LIST_COLOR }}
          />
          <span className="min-w-0 flex-1 truncate text-sm">{list.name}</span>
          {list.visibility === 'shared' ? (
            <span className="shrink-0 rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-secondary">
              共享
            </span>
          ) : null}
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
            {count}
          </span>
        </div>
      </SwipeRow>
    </li>
  )
}

function ListSection({
  title,
  lists,
  todoCounts,
  onAdd,
  onRename,
  onDeleteRequest,
  onReorder,
  emptyText,
}: {
  title: string
  lists: TodoList[]
  todoCounts: Record<string, number>
  onAdd: () => void
  onRename: (list: TodoList) => void
  onDeleteRequest: (list: TodoList) => void
  onReorder: (orderedIds: string[]) => void
  emptyText: string
}) {
  const { sortedItems, applySortedItems } = useOptimisticSortableList(lists)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = sortedItems.findIndex((list) => list.id === active.id)
    const newIndex = sortedItems.findIndex((list) => list.id === over.id)
    if (oldIndex < 0 || newIndex < 0) return

    const nextItems = arrayMove(sortedItems, oldIndex, newIndex)
    applySortedItems(nextItems)
    onReorder(nextItems.map((list) => list.id))
  }

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-text-secondary">{title}</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-button px-2 py-1.5 text-sm text-primary hover:bg-bg-hover"
        >
          <Plus className="size-4" strokeWidth={2} />
          新建
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <p className="py-6 text-center text-sm text-text-secondary">{emptyText}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={sortedItems.map((list) => list.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="mt-3 space-y-2">
              {sortedItems.map((list) => (
                <SortableListRow
                  key={list.id}
                  list={list}
                  count={todoCounts[list.id] ?? 0}
                  onRename={() => onRename(list)}
                  onDelete={() => onDeleteRequest(list)}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  )
}

type TodoListManageProps = {
  lists: TodoList[]
  todoCounts: Record<string, number>
  onAdd: (name: string, color: string) => Promise<void>
  onAddShared?: (name: string, color: string) => Promise<void>
  onRename: (id: string, name: string, color: string) => Promise<void>
  onDeleteRequest: (list: TodoList) => void
  onReorderPrivate: (orderedIds: string[]) => void
  onReorderShared: (orderedIds: string[]) => void
  isLoading?: boolean
}

export default function TodoListManage({
  lists,
  todoCounts,
  onAdd,
  onAddShared,
  onRename,
  onDeleteRequest,
  onReorderPrivate,
  onReorderShared,
  isLoading = false,
}: TodoListManageProps) {
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addMode, setAddMode] = useState<'private' | 'shared'>('private')
  const [listToRename, setListToRename] = useState<TodoList | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const privateLists = lists
    .filter((l) => l.visibility === 'private')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const sharedLists = lists
    .filter((l) => l.visibility === 'shared')
    .sort((a, b) => a.sortOrder - b.sortOrder)

  async function handleAdd(name: string, color: string) {
    setIsSubmitting(true)
    try {
      if (addMode === 'shared' && onAddShared) {
        await onAddShared(name, color)
      } else {
        await onAdd(name, color)
      }
      setShowAddDialog(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRename(name: string, color: string) {
    if (!listToRename) return
    setIsSubmitting(true)
    try {
      await onRename(listToRename.id, name, color)
      setListToRename(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return <p className="py-8 text-center text-sm text-text-secondary">加载中…</p>
  }

  return (
    <>
      <div className="space-y-8">
        <ListSection
          title="我的清单"
          lists={privateLists}
          todoCounts={todoCounts}
          emptyText="暂无私人清单"
          onAdd={() => {
            setAddMode('private')
            setShowAddDialog(true)
          }}
          onRename={setListToRename}
          onDeleteRequest={onDeleteRequest}
          onReorder={onReorderPrivate}
        />

        {onAddShared ? (
          <ListSection
            title="共享清单"
            lists={sharedLists}
            todoCounts={todoCounts}
            emptyText="暂无共享清单"
            onAdd={() => {
              setAddMode('shared')
              setShowAddDialog(true)
            }}
            onRename={setListToRename}
            onDeleteRequest={onDeleteRequest}
            onReorder={onReorderShared}
          />
        ) : null}
      </div>

      {showAddDialog ? (
        <NamePromptDialog
          title={addMode === 'shared' ? '新建共享清单' : '新建私人清单'}
          message="请输入新清单名称"
          confirmLabel="添加"
          onCancel={() => setShowAddDialog(false)}
          onConfirm={handleAdd}
          isPending={isSubmitting}
        />
      ) : null}

      {listToRename ? (
        <NamePromptDialog
          title="编辑清单"
          message="修改名称或颜色"
          defaultValue={listToRename.name}
          defaultColor={listToRename.color ?? DEFAULT_TODO_LIST_COLOR}
          confirmLabel="保存"
          onCancel={() => setListToRename(null)}
          onConfirm={handleRename}
          isPending={isSubmitting}
        />
      ) : null}
    </>
  )
}
