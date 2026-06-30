import { create } from 'zustand'

interface SceneState {
  selectedContainerId: string | null
  setSelectedContainerId: (id: string | null) => void

  showItemsModal: boolean
  setShowItemsModal: (show: boolean) => void

  isPointerLocked: boolean
  setPointerLocked: (locked: boolean) => void

  isEditMode: boolean
  setEditMode: (enabled: boolean) => void

  selectedObjectId: string | null
  setSelectedObjectId: (id: string | null) => void

  transformMode: 'rotate' | 'scale'
  setTransformMode: (mode: 'rotate' | 'scale') => void

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

  isPointerLocked: false,
  setPointerLocked: (locked) => set({ isPointerLocked: locked }),

  isEditMode: false,
  setEditMode: (enabled) => set({ isEditMode: enabled }),

  selectedObjectId: null,
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),

  transformMode: 'rotate',
  setTransformMode: (mode) => set({ transformMode: mode }),

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
  store.setPointerLocked(false)
  if (document.pointerLockElement) {
    document.exitPointerLock()
  }
}

export function closeContainerModal() {
  const store = useSceneStore.getState()
  store.setSelectedContainerId(null)
  store.setShowItemsModal(false)
}
