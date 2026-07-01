import { useEffect } from 'react'
import { useSceneStore } from '../../store/scene-store'
import { AVAILABLE_MODELS, type AvailableModel } from '../../lib/available-models'
import { useCreateContainer } from '../../hooks/use-containers'

export default function ModelSelectionModal() {
  const showModal = useSceneStore((s) => s.showModelSelectionModal)
  const setShowModal = useSceneStore((s) => s.setShowModelSelectionModal)
  const createContainer = useCreateContainer()
  const isLoading = createContainer.isLoading

  // ESC键关闭弹窗
  useEffect(() => {
    if (!showModal) return

    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setShowModal(false)
    }

    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [showModal, setShowModal])

  if (!showModal) return null

  async function handleSelectModel(model: AvailableModel) {
    try {
      const newContainer = await createContainer.mutateAsync({
        name: model.name,
        position: { x: 0, y: 0, z: 0, rotationY: 0, scale: 1 },
        modelRef: model.modelRef,
        modelType: model.modelType,
      })

      setShowModal(false)

      // 自动选中新容器
      useSceneStore.getState().setSelectedObjectId(newContainer.id)
    } catch (error) {
      console.error('创建容器失败:', error)
      // 保持弹窗打开，让用户可以重试
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg rounded-lg bg-bg-card p-6">
        <h2 className="mb-4 text-xl font-semibold">选择容器类型</h2>

        <div className="grid grid-cols-2 gap-4">
          {AVAILABLE_MODELS.map((model) => (
            <button
              key={model.id}
              onClick={() => handleSelectModel(model)}
              disabled={isLoading}
              className="flex flex-col items-center rounded-lg border-2 border-bg-hover p-4 hover:border-primary disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="text-5xl">{model.icon}</span>
              <span className="mt-2 font-medium">{model.name}</span>
              {model.description && (
                <span className="mt-1 text-sm text-text-secondary">
                  {model.description}
                </span>
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowModal(false)}
          disabled={isLoading}
          className="mt-4 w-full rounded-button py-2 hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          取消
        </button>
      </div>
    </div>
  )
}
