import { Plus, RotateCcw, Save, Scale, Trash2, Pencil } from 'lucide-react'
import { useMemo } from 'react'
import {
  useCreateContainer,
  useDeleteContainer,
  useUpdateContainersBatch,
} from '../../hooks/use-containers'
import { useSceneStore } from '../../store/scene-store'

const SOFA_MODEL = 'everything-models/sofa_glb.glb'
const CABINET_MODEL = 'everything-models/bathroom_sink_cabinet.glb'

export default function EditorToolbar() {
  const isEditMode = useSceneStore((s) => s.isEditMode)
  const setEditMode = useSceneStore((s) => s.setEditMode)
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useSceneStore((s) => s.setSelectedObjectId)
  const transformMode = useSceneStore((s) => s.transformMode)
  const setTransformMode = useSceneStore((s) => s.setTransformMode)
  const draftTransformsById = useSceneStore((s) => s.draftTransformsById)
  const clearDraftTransforms = useSceneStore((s) => s.clearDraftTransforms)
  const setShowItemsModal = useSceneStore((s) => s.setShowItemsModal)
  const setSelectedContainerId = useSceneStore((s) => s.setSelectedContainerId)

  const createContainer = useCreateContainer()
  const deleteContainer = useDeleteContainer()
  const updateContainersBatch = useUpdateContainersBatch()

  const canActOnSelection = Boolean(selectedObjectId)
  const selectionLabel = useMemo(() => (selectedObjectId ? '已选中' : '未选中'), [selectedObjectId])
  const hasUnsavedChanges = Object.keys(draftTransformsById).length > 0

  async function handleAddCabinet() {
    await createContainer.mutateAsync({
      name: '浴室柜',
      position: { x: 0.8, y: 0, z: -0.8, rotationY: 0, scale: 1 },
      modelRef: CABINET_MODEL,
      modelType: 'custom',
    })
  }

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
          onClick={() => setTransformMode('rotate')}
          disabled={!isEditMode || !canActOnSelection}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm',
            transformMode === 'rotate' ? 'bg-bg-hover text-text' : 'text-text',
            !isEditMode || !canActOnSelection ? 'opacity-40' : 'hover:bg-bg-hover',
          ].join(' ')}
        >
          <RotateCcw className="size-4" />
          旋转
        </button>

        <button
          type="button"
          onClick={() => setTransformMode('scale')}
          disabled={!isEditMode || !canActOnSelection}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm',
            transformMode === 'scale' ? 'bg-bg-hover text-text' : 'text-text',
            !isEditMode || !canActOnSelection ? 'opacity-40' : 'hover:bg-bg-hover',
          ].join(' ')}
        >
          <Scale className="size-4" />
          缩放
        </button>

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
          onClick={() => void handleAddCabinet()}
          disabled={!isEditMode || createContainer.isPending}
          className={[
            'inline-flex items-center gap-1.5 rounded-button px-3 py-2 text-sm text-text',
            !isEditMode ? 'opacity-40' : 'hover:bg-bg-hover',
          ].join(' ')}
        >
          <Plus className="size-4" />
          添加柜子
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

      {/* hidden constant to keep bundlers from tree-shaking */}
      <span className="hidden">{SOFA_MODEL}</span>
    </div>
  )
}

