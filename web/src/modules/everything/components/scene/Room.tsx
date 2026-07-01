import { useMemo } from 'react'
import * as THREE from 'three'
import { BackSide } from 'three'

// 房间尺寸常量
const ROOM_WIDTH = 5
const ROOM_HEIGHT = 3
const ROOM_DEPTH = 5
const HALF_WIDTH = ROOM_WIDTH / 2
const HALF_DEPTH = ROOM_DEPTH / 2

export default function Room() {
  // 共享墙面材质，避免重复创建
  const wallMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#F5F5DC', roughness: 0.9 }),
    []
  )

  return (
    <group>
      {/* 地板 */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#E0E0E0" roughness={0.8} />
      </mesh>

      {/* 北墙 (z = -HALF_DEPTH) */}
      <mesh position={[0, ROOM_HEIGHT / 2, -HALF_DEPTH]} receiveShadow castShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, 0.1]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      {/* 南墙 (z = HALF_DEPTH) */}
      <mesh position={[0, ROOM_HEIGHT / 2, HALF_DEPTH]} receiveShadow castShadow>
        <boxGeometry args={[ROOM_WIDTH, ROOM_HEIGHT, 0.1]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      {/* 东墙 (x = HALF_WIDTH) */}
      <mesh position={[HALF_WIDTH, ROOM_HEIGHT / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.1, ROOM_HEIGHT, ROOM_DEPTH]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      {/* 西墙 (x = -HALF_WIDTH) */}
      <mesh position={[-HALF_WIDTH, ROOM_HEIGHT / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[0.1, ROOM_HEIGHT, ROOM_DEPTH]} />
        <primitive object={wallMaterial} attach="material" />
      </mesh>

      {/* 天花板 */}
      <mesh position={[0, ROOM_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[ROOM_WIDTH, ROOM_DEPTH]} />
        <meshStandardMaterial color="#FFFFFF" roughness={0.7} side={BackSide} />
      </mesh>
    </group>
  )
}
