import { Plus, Save, Trash2, Pencil } from 'lucide-react'
import { useMemo } from 'react'
import {
  useDeleteContainer,
  useUpdateContainersBatch,
} from '../../hooks/use-containers'
import { useSceneStore } from '../../store/scene-store'

export default function EditorToolbar() {
  const isEditMode = useSceneStore((s) => s.isEditMode)
  const setEditMode = useSceneStore((s) => s.setEditMode)
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useSceneStore((s) => s.setSelectedObjectId)
  const draftTransformsById = useSceneStore((s) => s.draftTransformsById)
  const clearDraftTransforms = useSceneStore((s) => s.clearDraftTransforms)
  const setShowItemsModal = useSceneStore((s) => s.setShowItemsModal)
  const setSelectedContainerId = useSceneStore((s) => s.setSelectedContainerId)
  const setShowModelSelectionModal = useSceneStore((s) => s.setShowModelSelectionModal)

  const deleteContainer = useDeleteContainer()
  const updateContainersBatch = useUpdateContainersBatch()

  const canActOnSelection = Boolean(selectedObjectId)
  const selectionLabel = useMemo(() => (selectedObjectId ? '已选中' : '未选中'), [selectedObjectId])
  const hasUnsavedChanges = Object.keys(draftTransformsById).length > 0

  async function handleSave() {
    const updates = Object.entries(draftTransformsById).map(([id, t]) => ({
      id,
      position_3d: t,
    }))
    if (updates.length === 0) {
      setEditMode(false)
      setSelectedObjectId(null)
      return
    }

    await updateContainersBatch.mutateAsync(updates)
    clearDraftTransforms()
    setEditMode(false)
    setSelectedObjectId(null)
  }

  async function handleRemoveSelected() {
    if (!selectedObjectId) return
    await deleteContainer.mutateAsync(selectedObjectId)
    setSelectedObjectId(null)
  }

  function handleMaintainItems() {
    if (!selectedObjectId) return
    setSelectedContainerId(selectedObjectId)
    setShowItemsModal(true)
  }

  return (
    <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
      <div className="flex items-center gap-2 rounded-xl border border-bg-hover bg-bg-card/90 p-2 shadow-lg backdrop-blur">
        <button
          type="button"
          onClick={() => {
            if (isEditMode) return
            setEditMode(true)
          }}
          className="inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm text-text hover:bg-bg-hover"
        >
          <Pencil className="size-4" />
          编辑
        </button>

        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!isEditMode || updateContainersBatch.isPending}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm',
            hasUnsavedChanges ? 'bg-primary text-white' : 'text-text',
            !isEditMode ? 'opacity-40' : hasUnsavedChanges ? 'hover:bg-primary/90' : 'hover:bg-bg-hover',
          ].join(' ')}
          title={hasUnsavedChanges ? '保存并写入 Supabase' : '没有改动'}
        >
          <Save className="size-4" />
          保存
        </button>

        <div className="h-6 w-px bg-bg-hover" />

        <button
          type="button"
          onClick={() => void handleRemoveSelected()}
          disabled={!isEditMode || !canActOnSelection || deleteContainer.isPending}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm text-red-500',
            !isEditMode || !canActOnSelection ? 'opacity-40' : 'hover:bg-bg-hover',
          ].join(' ')}
        >
          <Trash2 className="size-4" />
          移除
        </button>

        <div className="h-6 w-px bg-bg-hover" />

        <button
          type="button"
          onClick={() => setShowModelSelectionModal(true)}
          disabled={!isEditMode}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm text-text',
            !isEditMode ? 'opacity-40' : 'hover:bg-bg-hover',
          ].join(' ')}
        >
          <Plus className="size-4" />
          添加容器
        </button>

        <button
          type="button"
          onClick={handleMaintainItems}
          disabled={!canActOnSelection}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm text-text',
            !canActOnSelection ? 'opacity-40' : 'hover:bg-bg-hover',
          ].join(' ')}
          title={`${selectionLabel}：点击后维护内部物品`}
        >
          维护物品
        </button>
      </div>
    </div>
  )
}

