import { useRef } from 'react'
import type { Mesh } from 'three'

interface EnvironmentProps {
  floorSize?: [number, number]
}

export default function Environment({ floorSize = [20, 20] }: EnvironmentProps) {
  const floorRef = useRef<Mesh>(null)

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow />

      <mesh
        ref={floorRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={floorSize} />
        <meshStandardMaterial color="#D2B48C" roughness={0.8} />
      </mesh>

      {/* Corner demo: only two walls (north + west) */}
      <mesh position={[0, 1.5, -floorSize[1] / 2]} receiveShadow>
        <boxGeometry args={[floorSize[0], 3, 0.2]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>
      <mesh position={[-floorSize[0] / 2, 1.5, 0]} receiveShadow>
        <boxGeometry args={[0.2, 3, floorSize[1]]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>
    </>
  )
}
