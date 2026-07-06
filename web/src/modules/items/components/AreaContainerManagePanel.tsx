import { useMemo, useState } from 'react'
import {
  DEFAULT_CONTAINER_POSITION,
  useContainers,
  useCreateContainer,
  useReorderContainers,
  useUpdateContainer,
} from '../../everything/hooks/use-containers'
import type { Container } from '../../everything/types/scene-types'
import ManageList, { type ManageEntity } from './ManageList'
import type { Area } from '../lib/types'

function toManageEntity(entity: {
  id: string
  name: string
  isSystemReserved: boolean
  isDisabled?: boolean
}): ManageEntity {
  return {
    id: entity.id,
    name: entity.name,
    isSystemReserved: entity.isSystemReserved,
    isDisabled: entity.isDisabled,
  }
}

function containerToManageEntity(container: Container): ManageEntity {
  return {
    id: container.id,
    name: container.name,
    isSystemReserved: false,
  }
}

interface AreaContainerManagePanelProps {
  areas: Area[]
  areasLoading: boolean
  containersLoading: boolean
  onAddArea: (name: string) => Promise<void>
  onRenameArea: (id: string, name: string) => Promise<void>
  onReorderAreas: (orderedIds: string[]) => void
  onDeleteAreaRequest: (entity: ManageEntity) => void
  onDeleteContainerRequest: (entity: ManageEntity) => void
}

export default function AreaContainerManagePanel({
  areas,
  areasLoading,
  containersLoading,
  onAddArea,
  onRenameArea,
  onReorderAreas,
  onDeleteAreaRequest,
  onDeleteContainerRequest,
}: AreaContainerManagePanelProps) {
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null)

  const { data: allContainers = [] } = useContainers()
  const createContainer = useCreateContainer()
  const updateContainer = useUpdateContainer()
  const reorderContainers = useReorderContainers()

  const areaEntities = useMemo(
    () => areas.map(toManageEntity),
    [areas],
  )

  const containersInArea = useMemo(() => {
    if (!selectedAreaId) return []
    return allContainers.filter((c) => c.areaId === selectedAreaId)
  }, [allContainers, selectedAreaId])

  const containerEntities = useMemo(
    () => containersInArea.map(containerToManageEntity),
    [containersInArea],
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="min-w-0">
        <ManageList
          type="area"
          entities={areaEntities}
          layout="grid-2"
          interactionMode="select"
          selectedId={selectedAreaId}
          onSelect={(entity) => setSelectedAreaId(entity.id)}
          onAdd={onAddArea}
          onRename={onRenameArea}
          onReorder={onReorderAreas}
          onDeleteRequest={onDeleteAreaRequest}
          isLoading={areasLoading}
        />
      </div>

      <div className="min-w-0 border-t border-bg-hover pt-6">
        <ManageList
          type="container"
          entities={containerEntities}
          addDisabled={!selectedAreaId}
          onAdd={async (name) => {
            if (!selectedAreaId) return
            await createContainer.mutateAsync({
              name,
              areaId: selectedAreaId,
              position: DEFAULT_CONTAINER_POSITION,
              modelRef: 'storage_box',
              modelType: 'builtin',
            })
          }}
          onRename={async (id, name) => {
            await updateContainer.mutateAsync({ id, name })
          }}
          onReorder={(orderedIds) => {
            if (!selectedAreaId) return
            reorderContainers.mutate({ areaId: selectedAreaId, orderedIds })
          }}
          onDeleteRequest={onDeleteContainerRequest}
          isLoading={containersLoading}
        />
      </div>
    </div>
  )
}

export { containerToManageEntity, toManageEntity }
