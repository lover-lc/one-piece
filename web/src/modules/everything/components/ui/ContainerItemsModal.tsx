import { useNavigate } from 'react-router-dom'
import { X } from 'lucide-react'
import { closeContainerModal, useSceneStore } from '../../store/scene-store'
import { useContainer } from '../../hooks/use-containers'
import { useContainerItems } from '../../hooks/use-container-items'
import { useAreas } from '../../../items/hooks/use-areas'

export default function ContainerItemsModal() {
  const navigate = useNavigate()
  const selectedContainerId = useSceneStore((s) => s.selectedContainerId)
  const showModal = useSceneStore((s) => s.showItemsModal)

  const { data: container } = useContainer(selectedContainerId ?? undefined)
  const { items, isEmpty, isLoading } = useContainerItems(selectedContainerId)
  const { data: areas = [] } = useAreas()

  if (!showModal || !container) return null
  const areaName = areas.find((a) => a.id === container.areaId)?.name ?? null

  const handleManageItems = () => {
    navigate(`/items?container=${container.id}`)
  }

  const handleClose = () => {
    closeContainerModal()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="mx-4 w-full max-w-md rounded-lg bg-bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-bg-hover px-4 py-3">
          <h2 className="text-lg font-semibold text-text">
            📦 {areaName ? `${areaName} - ` : ''}{container.name}
          </h2>
          <button
            onClick={handleClose}
            className="rounded p-1 hover:bg-bg-hover"
            aria-label="关闭"
          >
            <X className="h-5 w-5 text-text-secondary" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-4">
          {isLoading && (
            <p className="text-center text-text-secondary">加载中...</p>
          )}

          {!isLoading && isEmpty && (
            <div className="text-center">
              <p className="mb-4 text-text-secondary">此容器暂无物品</p>
              <button
                onClick={handleManageItems}
                className="rounded-button bg-primary px-4 py-2 text-white hover:bg-primary/90"
              >
                添加物品
              </button>
            </div>
          )}

          {!isLoading && !isEmpty && (
            <ul className="space-y-2">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-bg-hover px-3 py-2"
                >
                  <div>
                    <p className="font-medium text-text">{item.name}</p>
                    {item.quantity != null && (
                      <p className="text-sm text-text-secondary">
                        数量: {item.quantity}
                        {item.unit?.name ? ` ${item.unit.name}` : ''}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {!isEmpty && (
          <div className="border-t border-bg-hover px-4 py-3">
            <button
              onClick={handleManageItems}
              className="w-full rounded-button bg-primary px-4 py-2 text-white hover:bg-primary/90"
            >
              管理物品
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
