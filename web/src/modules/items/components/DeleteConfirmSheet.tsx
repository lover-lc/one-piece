import { useEffect, useState } from 'react'
import type { Area, Category } from '../lib/types'
import Sheet from '../../../shared/components/ui/Sheet'

export type ManageEntityType = 'area' | 'category'

export type DeleteAction =
  | 'moveToOther'
  | 'deleteAllItems'
  | 'moveToUncategorized'

export type ManageEntity = Area | Category

const ACTION_LABELS: Record<
  ManageEntityType,
  Record<DeleteAction, string>
> = {
  area: {
    moveToOther: '迁到其他区域',
    deleteAllItems: '删除全部物品',
    moveToUncategorized: '移至「未分类」',
  },
  category: {
    moveToOther: '迁到其他分类',
    deleteAllItems: '删除全部物品',
    moveToUncategorized: '移至「未分类」',
  },
}

const TYPE_LABELS: Record<ManageEntityType, string> = {
  area: '区域',
  category: '分类',
}

interface DeleteConfirmSheetProps {
  open: boolean
  onClose: () => void
  type: ManageEntityType
  entity: ManageEntity
  itemCount: number
  targets: ManageEntity[]
  onConfirm: (action: DeleteAction, targetId?: string) => void | Promise<void>
  isPending?: boolean
}

export default function DeleteConfirmSheet({
  open,
  onClose,
  type,
  entity,
  itemCount,
  targets,
  onConfirm,
  isPending = false,
}: DeleteConfirmSheetProps) {
  const [selectedAction, setSelectedAction] =
    useState<DeleteAction>('moveToOther')
  const [targetId, setTargetId] = useState<string | undefined>(
    targets[0]?.id,
  )

  useEffect(() => {
    if (!open) return
    setSelectedAction('moveToOther')
    setTargetId(targets[0]?.id)
  }, [open, entity.id, targets])

  useEffect(() => {
    if (selectedAction === 'moveToOther' && !targetId && targets[0]) {
      setTargetId(targets[0].id)
    }
  }, [selectedAction, targetId, targets])

  const typeLabel = TYPE_LABELS[type]
  const canConfirm =
    selectedAction !== 'moveToOther' ||
    (targetId !== undefined && targets.length > 0)

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={`删除${typeLabel}`}
    >
      <div className="px-4 py-4">
        <p className="text-sm text-text-secondary">
          {typeLabel}「{entity.name}」中有 {itemCount} 件物品，请选择删除方式。
        </p>

        <fieldset className="mt-4 space-y-1">
          <legend className="mb-2 text-xs font-medium text-text-secondary">
            处理方式
          </legend>
          {(Object.keys(ACTION_LABELS[type]) as DeleteAction[]).map(
            (action) => (
              <label
                key={action}
                className="flex cursor-pointer items-center gap-3 rounded-button px-3 py-2.5 hover:bg-bg-hover"
              >
                <input
                  type="radio"
                  name="delete-action"
                  value={action}
                  checked={selectedAction === action}
                  onChange={() => setSelectedAction(action)}
                  className="size-4 accent-primary"
                />
                <span className="text-sm text-text">
                  {ACTION_LABELS[type][action]}
                </span>
              </label>
            ),
          )}
        </fieldset>

        {selectedAction === 'moveToOther' ? (
          <div className="mt-4">
            <label
              htmlFor="delete-target"
              className="mb-2 block text-xs font-medium text-text-secondary"
            >
              目标{typeLabel}
            </label>
            {targets.length === 0 ? (
              <p className="text-sm text-text-secondary">没有其他可用{typeLabel}</p>
            ) : (
              <select
                id="delete-target"
                value={targetId ?? ''}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2.5 text-sm text-text outline-none focus:border-primary/30"
              >
                {targets.map((target) => (
                  <option key={target.id} value={target.id}>
                    {target.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        ) : null}

        <div className="mt-6 flex gap-3 border-t border-bg-hover pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 rounded-button px-4 py-2.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm(
                selectedAction,
                selectedAction === 'moveToOther' ? targetId : undefined,
              )
            }
            disabled={isPending || !canConfirm}
            className="flex-1 rounded-button bg-status-expired px-4 py-2.5 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '处理中…' : '确认'}
          </button>
        </div>
      </div>
    </Sheet>
  )
}
