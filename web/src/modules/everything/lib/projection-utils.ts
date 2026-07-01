import { Vector3 } from 'three'
import type { Object3D, Camera } from 'three'

export interface ScreenPosition {
  x: number
  y: number
  visible: boolean
}

/**
 * 将3D物体的世界坐标投影到2D屏幕坐标
 * @param object3D - 3D物体
 * @param camera - 相机
 * @returns 屏幕坐标和可见性
 */
export function getScreenPosition(
  object3D: Object3D,
  camera: Camera
): ScreenPosition {
  // 确保矩阵是最新的
  camera.updateMatrixWorld()
  object3D.updateMatrixWorld()

  const vector = new Vector3()
  object3D.getWorldPosition(vector)
  vector.project(camera)

  // 检查是否在相机前方和视锥内
  const visible =
    vector.z < 1 && // 在相机前方
    vector.x >= -1 && vector.x <= 1 && // 水平视野内
    vector.y >= -1 && vector.y <= 1 // 垂直视野内

  const x = (vector.x * 0.5 + 0.5) * window.innerWidth
  const y = (-(vector.y * 0.5) + 0.5) * window.innerHeight

  return { x, y, visible }
}
