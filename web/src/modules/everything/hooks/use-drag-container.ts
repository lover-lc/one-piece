import { useEffect, useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Plane, Vector3, Vector2 } from 'three'
import { useSceneStore } from '../store/scene-store'
import { useContainers } from './use-containers'
import type { ThreeEvent } from '@react-three/fiber'

export function useDragContainer(containerId: string) {
  const { camera, size } = useThree()
  const { data: containers = [] } = useContainers()

  // 复用Three.js对象，避免每次pointermove创建新对象
  const raycasterRef = useRef(new Raycaster())
  const planeRef = useRef(new Plane(new Vector3(0, 1, 0), 0))
  const mouseRef = useRef(new Vector2())
  const intersectionRef = useRef(new Vector3())

  const handlePointerMove = useCallback(
    (e: PointerEvent) => {
      const store = useSceneStore.getState()
      if (!store.isDraggingObject) return

      // 计算标准化设备坐标
      const mouse = mouseRef.current
      mouse.x = (e.clientX / size.width) * 2 - 1
      mouse.y = -(e.clientY / size.height) * 2 + 1

      // 射线与地板平面求交
      const raycaster = raycasterRef.current
      raycaster.setFromCamera(mouse, camera)

      const intersection = intersectionRef.current
      const intersected = raycaster.ray.intersectPlane(planeRef.current, intersection)

      if (!intersected) return

      // 边界限制
      const clampedX = Math.max(-2.3, Math.min(2.3, intersection.x))
      const clampedZ = Math.max(-2.3, Math.min(2.3, intersection.z))

      // 获取当前 draft
      const draft = store.draftTransformsById[containerId]
      const container = containers.find((c) => c.id === containerId)
      if (!container || !draft) return

      // 更新位置
      store.setDraftTransform(containerId, {
        ...draft,
        x: clampedX,
        z: clampedZ,
      })
    },
    [camera, size, containerId, containers],
  )

  const handlePointerUp = useCallback(() => {
    useSceneStore.getState().setDraggingObject(false)
  }, [])

  useEffect(() => {
    const unsubscribe = useSceneStore.subscribe(
      (state) => state.isDraggingObject,
      (isDragging) => {
        if (!isDragging) {
          window.removeEventListener('pointermove', handlePointerMove)
          window.removeEventListener('pointerup', handlePointerUp)
          return
        }

        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
      },
    )

    return () => {
      unsubscribe()
      // 强制清理事件监听器，防止内存泄漏
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  function handlePointerDown(e: ThreeEvent<PointerEvent>) {
    e.stopPropagation()

    const store = useSceneStore.getState()
    store.setSelectedObjectId(containerId)
    store.setDraggingObject(true)

    // 初始化 draft transform
    const container = containers.find((c) => c.id === containerId)
    if (!container) return

    const draft = store.draftTransformsById[containerId]
    if (!draft) {
      store.setDraftTransform(containerId, {
        x: container.position.x,
        y: container.position.y,
        z: container.position.z,
        rotationY: container.position.rotationY,
        scale: container.position.scale,
      })
    }
  }

  return { handlePointerDown }
}
