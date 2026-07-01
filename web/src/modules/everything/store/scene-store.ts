import { create } from 'zustand'
import type { RefObject } from 'react'
import type { Group } from 'three'
import type { JoystickMoveInput } from '../lib/scene-controls'

interface SceneState {
  selectedContainerId: string | null
  setSelectedContainerId: (id: string | null) => void

  showItemsModal: boolean
  setShowItemsModal: (show: boolean) => void

  isCameraDragging: boolean
  setCameraDragging: (dragging: boolean) => void

  pointerDragDistance: number
  setPointerDragDistance: (distance: number) => void
  resetPointerDrag: () => void

  joystickInput: JoystickMoveInput
  setJoystickInput: (input: JoystickMoveInput) => void

  isEditMode: boolean
  setEditMode: (enabled: boolean) => void

  selectedObjectId: string | null
  setSelectedObjectId: (id: string | null) => void

  isDraggingObject: boolean
  setDraggingObject: (dragging: boolean) => void

  hoveredObjectId: string | null
  setHoveredObjectId: (id: string | null) => void

  showModelSelectionModal: boolean
  setShowModelSelectionModal: (show: boolean) => void

  containerGroupRefs: Record<string, RefObject<Group>>
  setContainerGroupRef: (id: string, ref: RefObject<Group>) => void

  draftTransformsById: Record<
    string,
    {
      x: number
      y: number
      z: number
      rotationY: number
      scale: number
    }
  >
  setDraftTransform: (
    id: string,
    transform: { x: number; y: number; z: number; rotationY: number; scale: number },
  ) => void
  clearDraftTransforms: () => void

  isSceneLoading: boolean
  setSceneLoading: (loading: boolean) => void

  cameraState: {
    position: [number, number, number]
    rotation: [number, number, number]
  } | null
  saveCameraState: (
    position: [number, number, number],
    rotation: [number, number, number],
  ) => void
  clearCameraState: () => void
}

export const useSceneStore = create<SceneState>((set) => ({
  selectedContainerId: null,
  setSelectedContainerId: (id) => set({ selectedContainerId: id }),

  showItemsModal: false,
  setShowItemsModal: (show) => set({ showItemsModal: show }),

  isCameraDragging: false,
  setCameraDragging: (dragging) => set({ isCameraDragging: dragging }),

  pointerDragDistance: 0,
  setPointerDragDistance: (distance) => set({ pointerDragDistance: distance }),
  resetPointerDrag: () => set({ pointerDragDistance: 0 }),

  joystickInput: { x: 0, y: 0 },
  setJoystickInput: (input) => set({ joystickInput: input }),

  isEditMode: false,
  setEditMode: (enabled) => set({ isEditMode: enabled }),

  selectedObjectId: null,
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  isDraggingObject: false,
  setDraggingObject: (dragging) => set({ isDraggingObject: dragging }),

  hoveredObjectId: null,
  setHoveredObjectId: (id) => set({ hoveredObjectId: id }),

  showModelSelectionModal: false,
  setShowModelSelectionModal: (show) => set({ showModelSelectionModal: show }),

  containerGroupRefs: {},
  setContainerGroupRef: (id, ref) =>
    set((state) => ({
      containerGroupRefs: {
        ...state.containerGroupRefs,
        [id]: ref,
      },
    })),

  draftTransformsById: {},
  setDraftTransform: (id, transform) =>
    set((prev) => ({
      draftTransformsById: { ...prev.draftTransformsById, [id]: transform },
    })),
  clearDraftTransforms: () => set({ draftTransformsById: {} }),

  isSceneLoading: true,
  setSceneLoading: (loading) => set({ isSceneLoading: loading }),

  cameraState: null,
  saveCameraState: (position, rotation) =>
    set({ cameraState: { position, rotation } }),
  clearCameraState: () => set({ cameraState: null }),
}))

export function openContainerModal(containerId: string) {
  const store = useSceneStore.getState()
  store.setSelectedContainerId(containerId)
  store.setShowItemsModal(true)
}

export function closeContainerModal() {
  const store = useSceneStore.getState()
  store.setSelectedContainerId(null)
  store.setShowItemsModal(false)
}
