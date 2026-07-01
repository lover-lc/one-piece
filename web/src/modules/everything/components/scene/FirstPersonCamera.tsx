import { OrbitControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { buildMoveVector } from '../../lib/scene-controls'
import { useSceneStore } from '../../store/scene-store'

const MOVE_SPEED = 0.1
// 房间边界：5×5×3m，留 0.2m 边距
const ROOM_BOUND_X = 2.3
const ROOM_BOUND_Z = 2.3
const ROOM_BOUND_Y_MIN = 0.5
const ROOM_BOUND_Y_MAX = 2.8
const DEFAULT_EYE_HEIGHT = 1.6

export default function FirstPersonCamera() {
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl>(null)
  const keysRef = useRef<Record<string, boolean>>({})
  const cameraState = useSceneStore((s) => s.cameraState)
  const saveCameraState = useSceneStore((s) => s.saveCameraState)
  const joystickInput = useSceneStore((s) => s.joystickInput)
  const setCameraDragging = useSceneStore((s) => s.setCameraDragging)

  useEffect(() => {
    if (cameraState) {
      camera.position.set(...cameraState.position)
      camera.rotation.set(...cameraState.rotation)
      const controls = controlsRef.current
      if (controls) {
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        controls.target.copy(camera.position).add(forward.multiplyScalar(2))
        controls.update()
      }
    } else {
      // 初始位置：(0, 1.6, 0) - 房间中心，人眼高度
      camera.position.set(0, DEFAULT_EYE_HEIGHT, 0)
      const controls = controlsRef.current
      if (controls) {
        controls.target.set(0, DEFAULT_EYE_HEIGHT, -2)
        controls.update()
      }
    }
  }, [camera, cameraState])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const isCameraDragging = useSceneStore((s) => s.isCameraDragging)

  useFrame(() => {
    const controls = controlsRef.current
    if (!controls) return

    const keys = keysRef.current
    const move = buildMoveVector(
      {
        w: Boolean(keys.w),
        a: Boolean(keys.a),
        s: Boolean(keys.s),
        d: Boolean(keys.d),
      },
      joystickInput,
    )

    if (move.x !== 0 || move.z !== 0) {
      const forward = new THREE.Vector3()
      camera.getWorldDirection(forward)
      forward.y = 0
      forward.normalize()

      const right = new THREE.Vector3()
      right.crossVectors(forward, camera.up).normalize()

      const delta = new THREE.Vector3()
      delta.addScaledVector(forward, -move.z * MOVE_SPEED)
      delta.addScaledVector(right, move.x * MOVE_SPEED)

      camera.position.add(delta)
      controls.target.add(delta)
    }

    // 边界限制（房间 5×5×3m，留 0.2m 边距）
    const clampedX = THREE.MathUtils.clamp(camera.position.x, -ROOM_BOUND_X, ROOM_BOUND_X)
    const clampedY = THREE.MathUtils.clamp(camera.position.y, ROOM_BOUND_Y_MIN, ROOM_BOUND_Y_MAX)
    const clampedZ = THREE.MathUtils.clamp(camera.position.z, -ROOM_BOUND_Z, ROOM_BOUND_Z)

    camera.position.set(clampedX, clampedY, clampedZ)
    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -ROOM_BOUND_X, ROOM_BOUND_X)
    controls.target.y = clampedY
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -ROOM_BOUND_Z, ROOM_BOUND_Z)

    // 仅在非拖拽状态时保存相机状态，避免idle时每帧保存
    if (!isCameraDragging) {
      saveCameraState(
        [camera.position.x, camera.position.y, camera.position.z],
        [camera.rotation.x, camera.rotation.y, camera.rotation.z],
      )
    }
  })

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableRotate
      enableZoom
      rotateSpeed={0.5}
      zoomSpeed={0.8}
      minDistance={0.5}
      maxDistance={20}
      onStart={() => setCameraDragging(true)}
      onEnd={() => setCameraDragging(false)}
    />
  )
}
