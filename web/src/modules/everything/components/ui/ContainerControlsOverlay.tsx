import { useEffect, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useThree, useFrame } from '@react-three/fiber'
import { useSceneStore } from '../../store/scene-store'
import { getScreenPosition } from '../../lib/projection-utils'

export default function ContainerControlsOverlay() {
  const { camera } = useThree()
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const isEditMode = useSceneStore((s) => s.isEditMode)
  const isDraggingObject = useSceneStore((s) => s.isDraggingObject)
  const isCameraDragging = useSceneStore((s) => s.isCameraDragging)
  const containerGroupRefs = useSceneStore((s) => s.containerGroupRefs)
  const draftTransformsById = useSceneStore((s) => s.draftTransformsById)

  const [position, setPosition] = useState<{ x: number; y: number; visible: boolean } | null>(null)
  const rotationAnimationId = useRef<number | null>(null)

  const shouldShow = isEditMode && selectedObjectId && !isDraggingObject && !isCameraDragging

  // 更新屏幕位置
  useFrame(() => {
    if (!shouldShow || !selectedObjectId) {
      setPosition(null)
      return
    }

    const groupRef = containerGroupRefs[selectedObjectId]
    if (!groupRef?.current) {
      setPosition(null)
      return
    }

    const screenPos = getScreenPosition(groupRef.current, camera)
    setPosition(prev => {
      if (!prev ||
          Math.abs(prev.x - screenPos.x) > 1 ||
          Math.abs(prev.y - screenPos.y) > 1 ||
          prev.visible !== screenPos.visible) {
        return screenPos
      }
      return prev
    })
  })

  // 清理动画帧
  useEffect(() => {
    return () => {
      if (rotationAnimationId.current) {
        cancelAnimationFrame(rotationAnimationId.current)
      }
    }
  }, [])

  // 停止旋转
  function stopRotate() {
    if (rotationAnimationId.current) {
      cancelAnimationFrame(rotationAnimationId.current)
      rotationAnimationId.current = null
    }
  }

  // 开始左旋转
  function startRotateLeft() {
    stopRotate()
    const rotate = () => {
      if (!selectedObjectId) return

      const current = useSceneStore.getState().draftTransformsById[selectedObjectId]
      if (!current) return

      useSceneStore.getState().setDraftTransform(selectedObjectId, {
        ...current,
        rotationY: current.rotationY - 0.05, // 每帧 ~2.86 度
      })

      rotationAnimationId.current = requestAnimationFrame(rotate)
    }
    rotate()
  }

  // 开始右旋转
  function startRotateRight() {
    stopRotate()
    const rotate = () => {
      if (!selectedObjectId) return

      const current = useSceneStore.getState().draftTransformsById[selectedObjectId]
      if (!current) return

      useSceneStore.getState().setDraftTransform(selectedObjectId, {
        ...current,
        rotationY: current.rotationY + 0.05,
      })

      rotationAnimationId.current = requestAnimationFrame(rotate)
    }
    rotate()
  }

  // 更新缩放
  function updateScale(newScale: number) {
    if (!selectedObjectId) return

    const current = useSceneStore.getState().draftTransformsById[selectedObjectId]
    if (!current) return

    useSceneStore.getState().setDraftTransform(selectedObjectId, {
      ...current,
      scale: newScale,
    })
  }

  if (!shouldShow || !position?.visible || !selectedObjectId) return null

  const draft = draftTransformsById[selectedObjectId]
  if (!draft) return null

  return (
    <Html>
      <div className="pointer-events-auto">
        {/* 旋转控件 */}
        <div
          className="absolute flex gap-2 rounded-lg bg-black/80 p-2"
          style={{ left: position.x, top: position.y + 40 }}
        >
          <button
            aria-label="向左旋转"
            onPointerDown={startRotateLeft}
            onPointerUp={stopRotate}
            onPointerLeave={stopRotate}
            className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-xl text-white hover:bg-white/30"
          >
            ↺
          </button>
          <button
            aria-label="向右旋转"
            onPointerDown={startRotateRight}
            onPointerUp={stopRotate}
            onPointerLeave={stopRotate}
            className="flex h-10 w-10 items-center justify-center rounded bg-white/20 text-xl text-white hover:bg-white/30"
          >
            ↻
          </button>
        </div>

        {/* 缩放滑块 */}
        <div
          className="absolute flex h-32 flex-col items-center rounded-lg bg-black/80 p-2"
          style={{ left: position.x + 60, top: position.y - 60 }}
        >
          <input
            type="range"
            aria-label="缩放"
            aria-valuetext={`缩放 ${draft.scale.toFixed(1)} 倍`}
            min="0.5"
            max="2.0"
            step="0.1"
            value={draft.scale}
            onChange={(e) => updateScale(parseFloat(e.target.value))}
            className="h-full"
            style={{ writingMode: 'vertical-lr', direction: 'rtl' }}
          />
          <span className="mt-1 text-xs text-white">{draft.scale.toFixed(1)}x</span>
        </div>
      </div>
    </Html>
  )
}
