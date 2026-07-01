import { Canvas } from '@react-three/fiber'
import { Suspense, useRef } from 'react'
import FirstPersonCamera from './FirstPersonCamera'
import Environment from './Environment'
import Room from './Room'
import Container3D from './Container3D'
import ContainerControlsOverlay from '../ui/ContainerControlsOverlay'
import { useContainers } from '../../hooks/use-containers'
import { DRAG_THRESHOLD_PX, isDragGesture } from '../../lib/scene-controls'
import { openContainerModal, useSceneStore } from '../../store/scene-store'
import LoadingScreen from '../ui/LoadingScreen'

export default function SceneCanvas() {
  const { data: containers, isLoading } = useContainers()
  const setSceneLoading = useSceneStore((s) => s.setSceneLoading)
  const setPointerDragDistance = useSceneStore((s) => s.setPointerDragDistance)
  const resetPointerDrag = useSceneStore((s) => s.resetPointerDrag)
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null)

  const onCreated = () => {
    setSceneLoading(false)
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (e.pointerType === 'touch' && e.isPrimary === false) return
    pointerStartRef.current = { x: e.clientX, y: e.clientY }
    resetPointerDrag()
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current
    if (!start) return
    if (isDragGesture(start, { x: e.clientX, y: e.clientY }, DRAG_THRESHOLD_PX)) {
      const dx = e.clientX - start.x
      const dy = e.clientY - start.y
      setPointerDragDistance(Math.hypot(dx, dy))
    }
  }

  function handlePointerUp() {
    pointerStartRef.current = null
  }

  if (isLoading) {
    return <LoadingScreen message="加载场景中..." />
  }

  return (
    <div
      className="h-screen w-screen touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <Canvas
        shadows
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 2]}
        performance={{ min: 0.5 }}
        onCreated={onCreated}
      >
        <Suspense fallback={null}>
          <FirstPersonCamera />
          <Environment />

          {containers?.map((container) => (
            <Container3D
              key={container.id}
              container={container}
              onClick={openContainerModal}
            />
          ))}

          <ContainerControlsOverlay />
        </Suspense>
      </Canvas>
    </div>
  )
}
