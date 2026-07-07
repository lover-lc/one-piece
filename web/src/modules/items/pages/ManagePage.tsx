import { useQueryClient } from '@tanstack/react-query'
import { HelpCircle } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  useContainers,
  useDeleteContainer,
  useMigrateContainerToArea,
} from '../../everything/hooks/use-containers'
import AreaContainerManagePanel, {
  toManageEntity,
} from '../components/AreaContainerManagePanel'
import EntityMigrationDialog, {
  SCATTERED_ITEMS_KEY,
  type AreaMigrationAssignment,
  type CategoryMigrationAssignment,
  type ContainerMigrationAssignment,
} from '../components/EntityMigrationDialog'
import ManageList, { type ManageEntity } from '../components/ManageList'
import AppSegmentedControl from '../../../shared/components/motion/AppSegmentedControl'
import {
  useAreas,
  useCreateArea,
  useDeleteArea,
  useReorderAreas,
  useUpdateArea,
} from '../hooks/use-areas'
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useReorderCategories,
  useUpdateCategory,
} from '../hooks/use-categories'
import {
  useBatchUpdateItemsCategory,
  useBatchUpdateItemsLocation,
  useItems,
} from '../hooks/use-items'
import {
  useCreateUnit,
  useDeleteUnit,
  useReorderUnits,
  useUnits,
  useUpdateUnit,
} from '../hooks/use-units'
import {
  exportBackup,
  importBackup,
  parseBackupJson,
  validateBackupData,
} from '../lib/backup'
import { SYSTEM_RESERVED_NAME } from '../lib/seed-defaults'
import { supabase } from '../../../shared/lib/supabase'
import type { Item } from '../lib/types'

type ManageMode = 'area' | 'category' | 'unit'

type DeleteTarget =
  | { kind: 'area'; entity: ManageEntity }
  | { kind: 'container'; entity: ManageEntity }
  | { kind: 'category'; entity: ManageEntity }
  | { kind: 'unit'; entity: ManageEntity }

function EmptyDeleteDialog({
  entityName,
  typeLabel,
  message,
  onCancel,
  onConfirm,
  isPending,
}: {
  entityName: string
  typeLabel: string
  message?: string
  onCancel: () => void
  onConfirm: () => void
  isPending?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="empty-delete-title"
        className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
      >
        <h2 id="empty-delete-title" className="text-lg font-medium text-text">
          删除{typeLabel}
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          {message ??
            `确定要删除「${entityName}」吗？此操作无法撤销。`}
        </p>
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
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-button bg-status-expired px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </div>
  )
}

function countItemsByField(
  items: Item[],
  field: 'areaId' | 'categoryId' | 'unitId' | 'containerId',
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const item of items) {
    const id = item[field]
    if (!id) continue
    counts[id] = (counts[id] ?? 0) + 1
  }
  return counts
}

function findUncategorized(
  entities: Array<{ id: string; isSystemReserved: boolean; name: string }>,
) {
  return entities.find(
    (e) => e.isSystemReserved && e.name === SYSTEM_RESERVED_NAME,
  )
}

export default function ManagePage() {
  const queryClient = useQueryClient()
  const importInputRef = useRef<HTMLInputElement>(null)

  const [mode, setMode] = useState<ManageMode>('area')
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const { data: areas = [], isLoading: areasLoading } = useAreas()
  const { data: categories = [], isLoading: categoriesLoading } =
    useCategories()
  const { data: units = [], isLoading: unitsLoading } = useUnits()
  const { data: containers = [], isLoading: containersLoading } =
    useContainers()
  const { data: items = [] } = useItems()

  const createArea = useCreateArea()
  const updateArea = useUpdateArea()
  const deleteArea = useDeleteArea()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()
  const createUnit = useCreateUnit()
  const updateUnit = useUpdateUnit()
  const deleteUnit = useDeleteUnit()
  const reorderAreas = useReorderAreas()
  const reorderCategories = useReorderCategories()
  const reorderUnits = useReorderUnits()
  const deleteContainer = useDeleteContainer()
  const migrateContainerToArea = useMigrateContainerToArea()
  const batchUpdateItemsLocation = useBatchUpdateItemsLocation()
  const batchUpdateItemsCategory = useBatchUpdateItemsCategory()

  const unitCounts = useMemo(
    () => countItemsByField(items, 'unitId'),
    [items],
  )

  const uncategorizedCategory = useMemo(
    () => findUncategorized(categories),
    [categories],
  )

  const deleteMigrationContext = useMemo(() => {
    if (!deleteTarget) return null

    if (deleteTarget.kind === 'area') {
      const areaId = deleteTarget.entity.id
      const areaContainers = containers
        .filter((c) => c.areaId === areaId)
        .map((c) => ({
          id: c.id,
          name: c.name,
          itemCount: items.filter((i) => i.containerId === c.id).length,
        }))
      const scatteredItemCount = items.filter(
        (i) => i.areaId === areaId && !i.containerId,
      ).length
      const needsMigration =
        areaContainers.length > 0 || scatteredItemCount > 0

      return {
        kind: 'area' as const,
        needsMigration,
        areaContainers,
        scatteredItemCount,
        scatteredItemIds: items
          .filter((i) => i.areaId === areaId && !i.containerId)
          .map((i) => i.id),
      }
    }

    if (deleteTarget.kind === 'container') {
      const containerItems = items.filter(
        (i) => i.containerId === deleteTarget.entity.id,
      )
      return {
        kind: 'container' as const,
        needsMigration: containerItems.length > 0,
        containerItems,
      }
    }

    if (deleteTarget.kind === 'category') {
      const categoryItems = items.filter(
        (i) => i.categoryId === deleteTarget.entity.id,
      )
      return {
        kind: 'category' as const,
        needsMigration: categoryItems.length > 0,
        categoryItems,
      }
    }

    return {
      kind: 'unit' as const,
      needsMigration: false,
      unitItemCount: unitCounts[deleteTarget.entity.id] ?? 0,
    }
  }, [deleteTarget, containers, items, unitCounts])

  useEffect(() => {
    setDeleteTarget(null)
  }, [mode])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  function handleDeleteAreaRequest(entity: ManageEntity) {
    setDeleteTarget({ kind: 'area', entity })
  }

  function handleDeleteContainerRequest(entity: ManageEntity) {
    setDeleteTarget({ kind: 'container', entity })
  }

  function handleDeleteCategoryRequest(entity: ManageEntity) {
    setDeleteTarget({ kind: 'category', entity })
  }

  function handleDeleteUnitRequest(entity: ManageEntity) {
    setDeleteTarget({ kind: 'unit', entity })
  }

  async function deleteEntityOnly(target: DeleteTarget) {
    if (target.kind === 'area') {
      await deleteArea.mutateAsync(target.entity.id)
    } else if (target.kind === 'category') {
      await deleteCategory.mutateAsync(target.entity.id)
    } else if (target.kind === 'container') {
      await deleteContainer.mutateAsync(target.entity.id)
    } else {
      await deleteUnit.mutateAsync(target.entity.id)
    }
  }

  async function handleEmptyDelete() {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteEntityOnly(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleAreaMigration(assignments: AreaMigrationAssignment[]) {
    if (!deleteTarget || deleteTarget.kind !== 'area') return
    const areaId = deleteTarget.entity.id
    const scatteredItemIds = items
      .filter((i) => i.areaId === areaId && !i.containerId)
      .map((i) => i.id)

    setIsDeleting(true)
    try {
      for (const assignment of assignments) {
        if (assignment.key === SCATTERED_ITEMS_KEY) {
          if (scatteredItemIds.length === 0) continue
          await batchUpdateItemsLocation.mutateAsync({
            itemIds: scatteredItemIds,
            areaId: assignment.targetAreaId,
            containerId: null,
          })
        } else {
          await migrateContainerToArea.mutateAsync({
            containerId: assignment.key,
            targetAreaId: assignment.targetAreaId,
          })
        }
      }
      await deleteEntityOnly(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleContainerMigration(
    assignments: ContainerMigrationAssignment[],
    remainingAreaId: string,
    remainingItemIds: string[],
  ) {
    if (!deleteTarget || deleteTarget.kind !== 'container') return

    setIsDeleting(true)
    try {
      for (const assignment of assignments) {
        await batchUpdateItemsLocation.mutateAsync({
          itemIds: assignment.itemIds,
          areaId: assignment.targetAreaId,
          containerId: assignment.targetContainerId,
        })
      }
      if (remainingItemIds.length > 0) {
        await batchUpdateItemsLocation.mutateAsync({
          itemIds: remainingItemIds,
          areaId: remainingAreaId,
          containerId: null,
        })
      }
      await deleteEntityOnly(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleCategoryMigration(
    assignments: CategoryMigrationAssignment[],
    remainingItemIds: string[],
  ) {
    if (!deleteTarget || deleteTarget.kind !== 'category') return
    if (!uncategorizedCategory) return

    setIsDeleting(true)
    try {
      for (const assignment of assignments) {
        await batchUpdateItemsCategory.mutateAsync({
          itemIds: assignment.itemIds,
          categoryId: assignment.targetCategoryId,
        })
      }
      if (remainingItemIds.length > 0) {
        await batchUpdateItemsCategory.mutateAsync({
          itemIds: remainingItemIds,
          categoryId: uncategorizedCategory.id,
        })
      }
      await deleteEntityOnly(deleteTarget)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  function showHelp() {
    window.alert('引导页即将推出')
  }

  async function handleExport() {
    if (!supabase) {
      window.alert('未登录或未配置 Supabase')
      return
    }

    setIsExporting(true)
    try {
      await exportBackup(supabase)
      setToast('导出成功')
    } catch (err) {
      window.alert(String((err as Error)?.message || '导出失败'))
    } finally {
      setIsExporting(false)
    }
  }

  function handleImportClick() {
    importInputRef.current?.click()
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file || !supabase) return

    const confirmed = window.confirm('导入将覆盖云端所有数据，是否继续？')
    if (!confirmed) return

    setIsImporting(true)
    try {
      const text = await file.text()
      const parsed = parseBackupJson(text)
      const validation = validateBackupData(parsed)
      if (!validation.ok) {
        throw new Error('备份文件格式无效')
      }

      await importBackup(supabase, validation.data)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['areas'] }),
        queryClient.invalidateQueries({ queryKey: ['categories'] }),
        queryClient.invalidateQueries({ queryKey: ['units'] }),
        queryClient.invalidateQueries({ queryKey: ['items'] }),
        queryClient.invalidateQueries({ queryKey: ['containers'] }),
      ])
      setToast('导入成功')
    } catch (err) {
      window.alert(String((err as Error)?.message || '导入失败'))
    } finally {
      setIsImporting(false)
    }
  }

  const emptyDeleteTypeLabel =
    deleteTarget?.kind === 'area'
      ? '区域'
      : deleteTarget?.kind === 'container'
        ? '容器'
        : deleteTarget?.kind === 'category'
          ? '分类'
          : '计量单位'

  return (
    <>
      <header className="border-b border-bg-hover bg-bg-card px-4 py-2.5">
        <button
          type="button"
          onClick={showHelp}
          aria-label="帮助"
          className="flex size-9 items-center justify-center rounded-button text-text-secondary hover:bg-bg-hover"
        >
          <HelpCircle className="size-5" strokeWidth={1.75} />
        </button>
      </header>

      <div className="px-4 py-4">
        <AppSegmentedControl
          aria-label="管理类型"
          className="w-full rounded-button bg-bg-hover"
          segmentClassName="rounded-button"
          size="md"
          layoutIdPrefix="items-manage"
          options={[
            { value: 'area' as const, label: '区域/容器' },
            { value: 'category' as const, label: '分类' },
            { value: 'unit' as const, label: '单位' },
          ]}
          value={mode}
          onChange={setMode}
        />

        <div className="mt-4">
          {mode === 'area' ? (
            <AreaContainerManagePanel
              areas={areas}
              areasLoading={areasLoading}
              containersLoading={containersLoading}
              onAddArea={async (name) => {
                await createArea.mutateAsync({ name })
              }}
              onRenameArea={async (id, name) => {
                await updateArea.mutateAsync({ id, name })
              }}
              onReorderAreas={(orderedIds) => {
                reorderAreas.mutate(orderedIds)
              }}
              onDeleteAreaRequest={handleDeleteAreaRequest}
              onDeleteContainerRequest={handleDeleteContainerRequest}
            />
          ) : mode === 'category' ? (
            <ManageList
              type="category"
              entities={categories.map(toManageEntity)}
              onAdd={async (name) => {
                await createCategory.mutateAsync({ name })
              }}
              onRename={async (id, name) => {
                await updateCategory.mutateAsync({ id, name })
              }}
              onReorder={(orderedIds) => {
                reorderCategories.mutate(orderedIds)
              }}
              onDeleteRequest={handleDeleteCategoryRequest}
              isLoading={categoriesLoading}
            />
          ) : (
            <ManageList
              type="unit"
              entities={units.map(toManageEntity)}
              onAdd={async (name) => {
                await createUnit.mutateAsync({ name })
              }}
              onRename={async (id, name) => {
                await updateUnit.mutateAsync({ id, name })
              }}
              onToggleDisabled={async (entity) => {
                const unit = units.find((u) => u.id === entity.id)
                if (!unit) return
                await updateUnit.mutateAsync({
                  id: entity.id,
                  isDisabled: !unit.isDisabled,
                })
              }}
              onReorder={(orderedIds) => {
                reorderUnits.mutate(orderedIds)
              }}
              onDeleteRequest={handleDeleteUnitRequest}
              isLoading={unitsLoading}
            />
          )}
        </div>

        <section className="mt-8 border-t border-bg-hover pt-6">
          <h2 className="text-sm font-medium text-text-secondary">数据备份</h2>
          <p className="mt-1 text-xs text-text-tertiary">
            导出 JSON 备份，或从备份文件全量恢复数据
          </p>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={handleExport}
              disabled={isExporting || isImporting}
              className="flex-1 rounded-button border border-bg-hover px-4 py-2.5 text-sm text-text hover:bg-bg-hover disabled:opacity-50"
            >
              {isExporting ? '导出中…' : '导出数据'}
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              disabled={isExporting || isImporting}
              className="flex-1 rounded-button border border-bg-hover px-4 py-2.5 text-sm text-text hover:bg-bg-hover disabled:opacity-50"
            >
              {isImporting ? '导入中…' : '导入数据'}
            </button>
          </div>
        </section>
      </div>

      {deleteTarget &&
      deleteMigrationContext &&
      !deleteMigrationContext.needsMigration ? (
        <EmptyDeleteDialog
          entityName={deleteTarget.entity.name}
          typeLabel={emptyDeleteTypeLabel}
          message={
            deleteTarget.kind === 'unit' &&
            deleteMigrationContext.kind === 'unit' &&
            deleteMigrationContext.unitItemCount > 0
              ? `确定要删除「${deleteTarget.entity.name}」吗？${deleteMigrationContext.unitItemCount} 个物品的单位将被清空，数量保留。`
              : undefined
          }
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleEmptyDelete}
          isPending={isDeleting}
        />
      ) : null}

      {deleteTarget &&
      deleteMigrationContext?.kind === 'area' &&
      deleteMigrationContext.needsMigration ? (
        <EntityMigrationDialog
          mode="deleteArea"
          entityName={deleteTarget.entity.name}
          areas={areas}
          excludeAreaId={deleteTarget.entity.id}
          containers={deleteMigrationContext.areaContainers}
          scatteredItemCount={deleteMigrationContext.scatteredItemCount}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleAreaMigration}
          isPending={isDeleting}
        />
      ) : null}

      {deleteTarget &&
      deleteMigrationContext?.kind === 'container' &&
      deleteMigrationContext.needsMigration ? (
        <EntityMigrationDialog
          mode="deleteContainer"
          entityName={deleteTarget.entity.name}
          items={deleteMigrationContext.containerItems}
          areas={areas}
          containers={containers}
          excludeContainerId={deleteTarget.entity.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleContainerMigration}
          isPending={isDeleting}
        />
      ) : null}

      {deleteTarget &&
      deleteMigrationContext?.kind === 'category' &&
      deleteMigrationContext.needsMigration ? (
        <EntityMigrationDialog
          mode="deleteCategory"
          entityName={deleteTarget.entity.name}
          items={deleteMigrationContext.categoryItems}
          categories={categories}
          excludeCategoryId={deleteTarget.entity.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleCategoryMigration}
          isPending={isDeleting}
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-button bg-text px-4 py-2 text-sm text-white shadow-lg"
        >
          {toast}
        </div>
      ) : null}
    </>
  )
}
