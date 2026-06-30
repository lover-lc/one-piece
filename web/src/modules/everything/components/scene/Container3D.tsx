import { useEffect, useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { TransformControls } from '@react-three/drei'
import { Box3, BoxGeometry, Color, EdgesGeometry, LineBasicMaterial, Vector3 } from 'three'
import type { Group } from 'three'
import { isBuiltinModelRef } from '../../lib/builtin-models'
import BuiltinModel from './BuiltinModel'
import CustomModel from './CustomModel'
import type { Container } from '../../types/scene-types'
import { useSceneStore } from '../../store/scene-store'

interface Container3DProps {
  container: Container
  onClick: (id: string) => void
}

export default function Container3D({ container, onClick }: Container3DProps) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef<Group>(null)
  const isEditMode = useSceneStore((s) => s.isEditMode)
  const selectedObjectId = useSceneStore((s) => s.selectedObjectId)
  const setSelectedObjectId = useSceneStore((s) => s.setSelectedObjectId)
  const transformMode = useSceneStore((s) => s.transformMode)
  const draftTransformsById = useSceneStore((s) => s.draftTransformsById)
  const setDraftTransform = useSceneStore((s) => s.setDraftTransform)

  const { position, modelRef } = container
  const draft = draftTransformsById[container.id]
  const { x, y, z, rotationY, scale } = draft ?? position

  const isSelected = selectedObjectId === container.id
  const isCustomGlb = useMemo(() => modelRef.endsWith('.glb'), [modelRef])
  const [selectionBox, setSelectionBox] = useState<{
    center: [number, number, number]
    size: [number, number, number]
  } | null>(null)

  function handleClick() {
    if (isEditMode) {
      setSelectedObjectId(container.id)
      return
    }
    onClick(container.id)
  }

  useEffect(() => {
    if (!isSelected) return
    const g = groupRef.current
    if (!g) return

    // Compute a simple bounding box in local space
    const box = new Box3().setFromObject(g)
    const size = new Vector3()
    const center = new Vector3()
    box.getSize(size)
    box.getCenter(center)

    // Convert world center to local by inverse world matrix
    const inv = g.matrixWorld.clone().invert()
    center.applyMatrix4(inv)

    // Add a little padding to make it readable
    const padded: [number, number, number] = [
      Math.max(0.5, size.x * 1.05),
      Math.max(0.5, size.y * 1.05),
      Math.max(0.5, size.z * 1.05),
    ]

    setSelectionBox({
      center: [center.x, center.y, center.z],
      size: padded,
    })
  }, [isSelected, modelRef, x, y, z, rotationY, scale])

  const edgesGeometry = useMemo(() => {
    if (!selectionBox) return null
    const [sx, sy, sz] = selectionBox.size
    return new EdgesGeometry(new BoxGeometry(sx, sy, sz))
  }, [selectionBox])
  const edgesMaterial = useMemo(() => new LineBasicMaterial({ color: new Color('#22c55e') }), [])

  return (
    <group
      ref={groupRef}
      position={[x, y + 0.01, z]}
      rotation={[0, rotationY, 0]}
      scale={scale}
    >
      {isBuiltinModelRef(modelRef) ? (
        <BuiltinModel
          modelRef={modelRef}
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        />
      ) : isCustomGlb ? (
        <group
          onClick={handleClick}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
        >
          <CustomModel url={modelRef} />
        </group>
      ) : (
        <group onClick={handleClick}>
          <mesh>
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshStandardMaterial color="#9E9E9E" />
          </mesh>
        </group>
      )}

      {isSelected && selectionBox && edgesGeometry ? (
        <group position={selectionBox.center}>
          <lineSegments geometry={edgesGeometry} material={edgesMaterial} />
        </group>
      ) : null}

      {isEditMode && isSelected && groupRef.current ? (
        <TransformControls
          object={groupRef.current}
          mode={transformMode}
          showX={transformMode !== 'scale'}
          showZ={transformMode !== 'scale'}
          onObjectChange={() => {
            const g = groupRef.current
            if (!g) return
            setDraftTransform(container.id, {
              x: g.position.x,
              y: g.position.y,
              z: g.position.z,
              rotationY: g.rotation.y,
              scale: g.scale.x,
            })
          }}
        />
      ) : null}

      {hovered && (
        <Html distanceFactor={10} position={[0, 1, 0]}>
          <div className="rounded bg-black/80 px-2 py-1 text-sm text-white">
            {container.name}
          </div>
        </Html>
      )}
    </group>
  )
}
