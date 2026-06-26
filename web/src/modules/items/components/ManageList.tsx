import { Plus } from 'lucide-react'
import { useState } from 'react'
import SwipeRow from '../../../shared/components/ui/SwipeRow'
import type { Area, Category, Unit } from '../lib/types'
import { SYSTEM_RESERVED_NAME } from '../lib/seed-defaults'

export type ManageEntityType = 'area' | 'category' | 'unit'
export type ManageEntity = Area | Category | Unit

const TYPE_LABELS: Record<ManageEntityType, string> = {
  area: '区域',
  category: '分类',
  unit: '计量单位',
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

interface ManageListProps {
  type: ManageEntityType
  entities: ManageEntity[]
  itemCounts: Record<string, number>
  onAdd: (name: string) => Promise<void>
  onRename: (id: string, name: string) => Promise<void>
  onDeleteRequest: (entity: ManageEntity) => void
  isLoading?: boolean
}

export default function ManageList({
  type,
  entities,
  itemCounts,
  onAdd,
  onRename,
  onDeleteRequest,
  isLoading = false,
}: ManageListProps) {
  const typeLabel = TYPE_LABELS[type]

  const [showAddDialog, setShowAddDialog] = useState(false)
  const [entityToRename, setEntityToRename] = useState<ManageEntity | null>(
    null,
  )
  const [showSystemDeleteAlert, setShowSystemDeleteAlert] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function attemptDelete(entity: ManageEntity) {
    if (entity.isSystemReserved || entity.name === SYSTEM_RESERVED_NAME) {
      setShowSystemDeleteAlert(true)
      return
    }
    onDeleteRequest(entity)
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
          className="flex items-center gap-1 rounded-button px-2 py-1.5 text-sm text-primary hover:bg-bg-hover"
        >
          <Plus className="size-4" strokeWidth={2} />
          新建
        </button>
      </div>

      {isLoading ? (
        <p className="py-8 text-center text-sm text-text-secondary">加载中…</p>
      ) : entities.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-secondary">
          暂无{typeLabel}
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {entities.map((entity) => {
            const count = itemCounts[entity.id] ?? 0
            const isSystem = entity.isSystemReserved

            return (
              <li key={entity.id}>
                <SwipeRow
                  deleteDisabled={isSystem}
                  onDelete={
                    isSystem ? undefined : () => attemptDelete(entity)
                  }
                  onContentClick={
                    isSystem ? undefined : () => setEntityToRename(entity)
                  }
                >
                  <div className="flex items-center gap-2 px-4 py-3">
                    <span className="min-w-0 flex-1 truncate text-sm text-text">
                      {entity.name}
                    </span>
                    <span className="shrink-0 text-sm text-text-secondary">
                      {count} 件
                    </span>
                  </div>
                </SwipeRow>
              </li>
            )
          })}
        </ul>
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
