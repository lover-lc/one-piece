import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import type { Container } from '../../everything/types/scene-types'
import type { Area, Category, Item } from '../lib/types'

export const SCATTERED_ITEMS_KEY = '__scattered__'

export type AreaMigrationAssignment = {
  key: string
  name: string
  targetAreaId: string
  itemCount: number
}

export type ContainerMigrationAssignment = {
  itemIds: string[]
  targetAreaId: string
  targetContainerId: string | null
}

export type CategoryMigrationAssignment = {
  itemIds: string[]
  targetCategoryId: string
}

type AreaPendingEntry = {
  key: string
  name: string
  itemCount: number
}

type ItemPendingEntry = {
  id: string
  name: string
}

type EntityMigrationDialogProps =
  | {
      mode: 'deleteArea'
      entityName: string
      areas: Area[]
      excludeAreaId: string
      containers: Array<{ id: string; name: string; itemCount: number }>
      scatteredItemCount: number
      onConfirm: (assignments: AreaMigrationAssignment[]) => void | Promise<void>
      onCancel: () => void
      isPending?: boolean
    }
  | {
      mode: 'deleteContainer'
      entityName: string
      items: Item[]
      areas: Area[]
      containers: Container[]
      excludeContainerId: string
      onConfirm: (
        assignments: ContainerMigrationAssignment[],
        remainingAreaId: string,
        remainingItemIds: string[],
      ) => void | Promise<void>
      onCancel: () => void
      isPending?: boolean
    }
  | {
      mode: 'deleteCategory'
      entityName: string
      items: Item[]
      categories: Category[]
      excludeCategoryId: string
      onConfirm: (
        assignments: CategoryMigrationAssignment[],
        remainingItemIds: string[],
      ) => void | Promise<void>
      onCancel: () => void
      isPending?: boolean
    }

function CheckboxRow({
  checked,
  onChange,
  label,
  suffix,
}: {
  checked: boolean
  onChange: () => void
  label: string
  suffix?: string
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-button px-2 py-2 hover:bg-bg-hover">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 accent-primary"
      />
      <span className="min-w-0 flex-1 truncate text-sm text-text">{label}</span>
      {suffix ? (
        <span className="shrink-0 text-xs text-text-secondary">{suffix}</span>
      ) : null}
    </label>
  )
}

export default function EntityMigrationDialog(props: EntityMigrationDialogProps) {
  const { onCancel, isPending = false } = props

  const [selectedPendingKeys, setSelectedPendingKeys] = useState<Set<string>>(
    new Set(),
  )
  const [selectedAssignedKeys, setSelectedAssignedKeys] = useState<Set<string>>(
    new Set(),
  )
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(
    new Set(),
  )
  const [selectedAssignmentIndexes, setSelectedAssignmentIndexes] = useState<
    Set<number>
  >(new Set())

  const [targetAreaId, setTargetAreaId] = useState('')
  const [targetContainerId, setTargetContainerId] = useState('')
  const [targetCategoryId, setTargetCategoryId] = useState('')

  const areaPending = useMemo((): AreaPendingEntry[] => {
    if (props.mode !== 'deleteArea') return []
    const entries: AreaPendingEntry[] = props.containers.map((c) => ({
      key: c.id,
      name: c.name,
      itemCount: c.itemCount,
    }))
    if (props.scatteredItemCount > 0) {
      entries.push({
        key: SCATTERED_ITEMS_KEY,
        name: '散落物体',
        itemCount: props.scatteredItemCount,
      })
    }
    return entries
  }, [props])

  const [areaPendingState, setAreaPendingState] = useState<AreaPendingEntry[]>(
    [],
  )
  const [areaAssigned, setAreaAssigned] = useState<AreaMigrationAssignment[]>(
    [],
  )

  const [itemPendingState, setItemPendingState] = useState<ItemPendingEntry[]>(
    [],
  )
  const [containerAssigned, setContainerAssigned] = useState<
    ContainerMigrationAssignment[]
  >([])
  const [categoryAssigned, setCategoryAssigned] = useState<
    CategoryMigrationAssignment[]
  >([])

  useEffect(() => {
    if (props.mode === 'deleteArea') {
      setAreaPendingState(areaPending)
      setAreaAssigned([])
      setTargetAreaId(
        props.areas.find((a) => a.id !== props.excludeAreaId)?.id ?? '',
      )
    } else if (props.mode === 'deleteContainer') {
      setItemPendingState(
        props.items.map((item) => ({ id: item.id, name: item.name })),
      )
      setContainerAssigned([])
      setTargetAreaId(props.items[0]?.areaId ?? props.areas[0]?.id ?? '')
      setTargetContainerId('')
    } else {
      setItemPendingState(
        props.items.map((item) => ({ id: item.id, name: item.name })),
      )
      setCategoryAssigned([])
      setTargetCategoryId(
        props.categories.find((c) => c.id !== props.excludeCategoryId)?.id ??
          '',
      )
    }
    setSelectedPendingKeys(new Set())
    setSelectedAssignedKeys(new Set())
    setSelectedItemIds(new Set())
    setSelectedAssignmentIndexes(new Set())
  }, [props, areaPending])

  const targetAreas = useMemo((): Area[] => {
    if (props.mode === 'deleteArea') {
      return props.areas.filter((a) => a.id !== props.excludeAreaId)
    }
    if (props.mode === 'deleteContainer') {
      return props.areas
    }
    return []
  }, [props])

  const targetContainers = useMemo((): Container[] => {
    if (props.mode !== 'deleteContainer' || !targetAreaId) return []
    return props.containers.filter(
      (c) => c.areaId === targetAreaId && c.id !== props.excludeContainerId,
    )
  }, [props, targetAreaId])

  const targetCategories = useMemo((): Category[] => {
    if (props.mode !== 'deleteCategory') return []
    return props.categories.filter((c) => c.id !== props.excludeCategoryId)
  }, [props])

  const title =
    props.mode === 'deleteArea'
      ? `删除区域「${props.entityName}」`
      : props.mode === 'deleteContainer'
        ? `删除容器「${props.entityName}」`
        : `删除分类「${props.entityName}」`

  function togglePendingKey(key: string) {
    setSelectedPendingKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAssignedKey(key: string) {
    setSelectedAssignedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleItemId(id: string) {
    setSelectedItemIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAssignmentIndex(index: number) {
    setSelectedAssignmentIndexes((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  function moveAreaToAssigned() {
    if (!targetAreaId || selectedPendingKeys.size === 0) return
    const targetArea = targetAreas.find((a) => a.id === targetAreaId)
    if (!targetArea) return

    const moving = areaPendingState.filter((e) => selectedPendingKeys.has(e.key))
    setAreaAssigned((prev) => [
      ...prev,
      ...moving.map((entry) => ({
        key: entry.key,
        name: entry.name,
        targetAreaId,
        itemCount: entry.itemCount,
      })),
    ])
    setAreaPendingState((prev) =>
      prev.filter((e) => !selectedPendingKeys.has(e.key)),
    )
    setSelectedPendingKeys(new Set())
  }

  function moveAreaToPending() {
    if (selectedAssignedKeys.size === 0) return
    const moving = areaAssigned.filter((a) => selectedAssignedKeys.has(a.key))
    setAreaPendingState((prev) => [
      ...prev,
      ...moving.map((entry) => ({
        key: entry.key,
        name: entry.name,
        itemCount: entry.itemCount,
      })),
    ])
    setAreaAssigned((prev) =>
      prev.filter((a) => !selectedAssignedKeys.has(a.key)),
    )
    setSelectedAssignedKeys(new Set())
  }

  function moveItemsToAssigned() {
    if (selectedItemIds.size === 0) return

    if (props.mode === 'deleteContainer') {
      if (!targetAreaId) return
      const itemIds = [...selectedItemIds]
      setContainerAssigned((prev) => [
        ...prev,
        {
          itemIds,
          targetAreaId,
          targetContainerId: targetContainerId || null,
        },
      ])
      setItemPendingState((prev) =>
        prev.filter((item) => !selectedItemIds.has(item.id)),
      )
      setSelectedItemIds(new Set())
      return
    }

    if (props.mode === 'deleteCategory') {
      if (!targetCategoryId) return
      const itemIds = [...selectedItemIds]
      setCategoryAssigned((prev) => [
        ...prev,
        { itemIds, targetCategoryId },
      ])
      setItemPendingState((prev) =>
        prev.filter((item) => !selectedItemIds.has(item.id)),
      )
      setSelectedItemIds(new Set())
    }
  }

  function moveItemsToPending() {
    if (selectedAssignmentIndexes.size === 0) return

    if (props.mode === 'deleteContainer') {
      const moving = containerAssigned.filter((_, index) =>
        selectedAssignmentIndexes.has(index),
      )
      const restored = moving.flatMap((entry) =>
        entry.itemIds.map((id) => {
          const item = props.items.find((i) => i.id === id)
          return { id, name: item?.name ?? id }
        }),
      )
      setItemPendingState((prev) => [...prev, ...restored])
      setContainerAssigned((prev) =>
        prev.filter((_, index) => !selectedAssignmentIndexes.has(index)),
      )
      setSelectedAssignmentIndexes(new Set())
      return
    }

    if (props.mode === 'deleteCategory') {
      const moving = categoryAssigned.filter((_, index) =>
        selectedAssignmentIndexes.has(index),
      )
      const restored = moving.flatMap((entry) =>
        entry.itemIds.map((id) => {
          const item = props.items.find((i) => i.id === id)
          return { id, name: item?.name ?? id }
        }),
      )
      setItemPendingState((prev) => [...prev, ...restored])
      setCategoryAssigned((prev) =>
        prev.filter((_, index) => !selectedAssignmentIndexes.has(index)),
      )
      setSelectedAssignmentIndexes(new Set())
    }
  }

  const canConfirm =
    props.mode === 'deleteArea'
      ? areaPendingState.length === 0 &&
        (areaAssigned.length > 0 || areaPending.length === 0)
      : props.mode === 'deleteContainer'
        ? itemPendingState.length === 0 ||
          (itemPendingState.length > 0 && Boolean(targetAreaId))
        : true

  async function handleConfirm() {
    if (props.mode === 'deleteArea') {
      if (areaPendingState.length > 0) return
      await props.onConfirm(areaAssigned)
    } else if (props.mode === 'deleteContainer') {
      if (itemPendingState.length > 0 && !targetAreaId) return
      await props.onConfirm(
        containerAssigned,
        targetAreaId,
        itemPendingState.map((item) => item.id),
      )
    } else {
      await props.onConfirm(
        categoryAssigned,
        itemPendingState.map((item) => item.id),
      )
    }
  }

  function formatContainerAssignment(
    assignment: ContainerMigrationAssignment,
    index: number,
  ) {
    if (props.mode !== 'deleteContainer') return null
    const areaName =
      props.areas.find((a) => a.id === assignment.targetAreaId)?.name ?? ''
    const containerName = assignment.targetContainerId
      ? (props.containers.find((c) => c.id === assignment.targetContainerId)
          ?.name ?? '')
      : '仅区域'
    return (
      <CheckboxRow
        key={`ca-${index}`}
        checked={selectedAssignmentIndexes.has(index)}
        onChange={() => toggleAssignmentIndex(index)}
        label={`${assignment.itemIds.length} 件 → ${areaName} / ${containerName}`}
      />
    )
  }

  function formatCategoryAssignment(
    assignment: CategoryMigrationAssignment,
    index: number,
  ) {
    if (props.mode !== 'deleteCategory') return null
    const categoryName =
      props.categories.find((c) => c.id === assignment.targetCategoryId)
        ?.name ?? ''
    return (
      <CheckboxRow
        key={`ca-${index}`}
        checked={selectedAssignmentIndexes.has(index)}
        onChange={() => toggleAssignmentIndex(index)}
        label={`${assignment.itemIds.length} 件 → ${categoryName}`}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="migration-dialog-title"
        className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-card bg-bg-card shadow-lg"
      >
        <div className="border-b border-bg-hover px-4 py-3">
          <h2 id="migration-dialog-title" className="text-lg font-medium text-text">
            {title}
          </h2>
          <p className="mt-1 text-sm text-text-secondary">
            分配待迁移内容后确认删除
          </p>
        </div>

        <div className="flex min-h-0 flex-1 gap-2 overflow-hidden p-4">
          <div className="flex min-w-0 flex-[2] flex-col rounded-button border border-bg-hover">
            <div className="border-b border-bg-hover px-3 py-2 text-xs font-medium text-text-secondary">
              待处理
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-1">
              {props.mode === 'deleteArea'
                ? areaPendingState.map((entry) => (
                    <CheckboxRow
                      key={entry.key}
                      checked={selectedPendingKeys.has(entry.key)}
                      onChange={() => togglePendingKey(entry.key)}
                      label={entry.name}
                      suffix={`${entry.itemCount} 件`}
                    />
                  ))
                : itemPendingState.map((item) => (
                    <CheckboxRow
                      key={item.id}
                      checked={selectedItemIds.has(item.id)}
                      onChange={() => toggleItemId(item.id)}
                      label={item.name}
                    />
                  ))}
              {(props.mode === 'deleteArea'
                ? areaPendingState.length === 0
                : itemPendingState.length === 0) ? (
                <p className="px-2 py-4 text-center text-xs text-text-tertiary">
                  无待处理项
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center gap-2">
            <button
              type="button"
              onClick={
                props.mode === 'deleteArea'
                  ? moveAreaToAssigned
                  : moveItemsToAssigned
              }
              disabled={
                isPending ||
                (props.mode === 'deleteArea'
                  ? selectedPendingKeys.size === 0 || !targetAreaId
                  : selectedItemIds.size === 0 ||
                    (props.mode === 'deleteContainer'
                      ? !targetAreaId
                      : !targetCategoryId))
              }
              aria-label="分配到目标"
              className="rounded-button border border-bg-hover p-2 text-text-secondary hover:bg-bg-hover disabled:opacity-40"
            >
              <ArrowRight className="size-4" />
            </button>
            <button
              type="button"
              onClick={
                props.mode === 'deleteArea'
                  ? moveAreaToPending
                  : moveItemsToPending
              }
              disabled={
                isPending ||
                (props.mode === 'deleteArea'
                  ? selectedAssignedKeys.size === 0
                  : selectedAssignmentIndexes.size === 0)
              }
              aria-label="撤回待处理"
              className="rounded-button border border-bg-hover p-2 text-text-secondary hover:bg-bg-hover disabled:opacity-40"
            >
              <ArrowLeft className="size-4" />
            </button>
          </div>

          <div className="flex min-w-0 flex-[3] flex-col gap-3">
            <div className="rounded-button border border-bg-hover p-3">
              <p className="mb-2 text-xs font-medium text-text-secondary">目标</p>
              {props.mode === 'deleteArea' ? (
                <select
                  value={targetAreaId}
                  onChange={(e) => setTargetAreaId(e.target.value)}
                  className="w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary/30"
                >
                  {targetAreas.map((area) => (
                    <option key={area.id} value={area.id}>
                      {area.name}
                    </option>
                  ))}
                </select>
              ) : null}

              {props.mode === 'deleteContainer' ? (
                <div className="space-y-2">
                  <select
                    value={targetAreaId}
                    onChange={(e) => {
                      setTargetAreaId(e.target.value)
                      setTargetContainerId('')
                    }}
                    className="w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary/30"
                  >
                    {targetAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={targetContainerId}
                    onChange={(e) => setTargetContainerId(e.target.value)}
                    className="w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary/30"
                  >
                    <option value="">仅区域</option>
                    {targetContainers.map((container) => (
                      <option key={container.id} value={container.id}>
                        {container.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : null}

              {props.mode === 'deleteCategory' ? (
                <select
                  value={targetCategoryId}
                  onChange={(e) => setTargetCategoryId(e.target.value)}
                  className="w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-sm text-text outline-none focus:border-primary/30"
                >
                  {targetCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-button border border-bg-hover">
              <div className="border-b border-bg-hover px-3 py-2 text-xs font-medium text-text-secondary">
                已分配
              </div>
              <div className="p-1">
                {props.mode === 'deleteArea'
                  ? areaAssigned.map((entry) => (
                      <CheckboxRow
                        key={entry.key}
                        checked={selectedAssignedKeys.has(entry.key)}
                        onChange={() => toggleAssignedKey(entry.key)}
                        label={entry.name}
                        suffix={
                          targetAreas.find((a) => a.id === entry.targetAreaId)
                            ?.name
                        }
                      />
                    ))
                  : null}
                {props.mode === 'deleteContainer'
                  ? containerAssigned.map(formatContainerAssignment)
                  : null}
                {props.mode === 'deleteCategory'
                  ? categoryAssigned.map(formatCategoryAssignment)
                  : null}
                {(props.mode === 'deleteArea'
                  ? areaAssigned.length === 0
                  : props.mode === 'deleteContainer'
                    ? containerAssigned.length === 0
                    : categoryAssigned.length === 0) ? (
                  <p className="px-2 py-4 text-center text-xs text-text-tertiary">
                    暂无已分配项
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-bg-hover px-4 py-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-50"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending || !canConfirm}
            className="rounded-button bg-status-expired px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '处理中…' : '确认并删除'}
          </button>
        </div>
      </div>
    </div>
  )
}
