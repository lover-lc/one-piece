import { describe, it, expect } from 'vitest'
import { Object3D, PerspectiveCamera } from 'three'
import { getScreenPosition } from '../src/modules/everything/lib/projection-utils'

describe('getScreenPosition', () => {
  it('应该将3D物体位置投影到2D屏幕坐标', () => {
    const camera = new PerspectiveCamera(75, 800 / 600, 0.1, 1000)
    camera.position.set(0, 0, 5)

    const object = new Object3D()
    object.position.set(0, 0, 0)

    // Mock window.innerWidth and innerHeight
    global.innerWidth = 800
    global.innerHeight = 600

    const result = getScreenPosition(object, camera)

    expect(result).toHaveProperty('x')
    expect(result).toHaveProperty('y')
    expect(result).toHaveProperty('visible')
    expect(result.visible).toBe(true)
    expect(result.x).toBeCloseTo(400, 0) // 屏幕中心
    expect(result.y).toBeCloseTo(300, 0)
  })

  it('当物体在相机背后时应该返回 visible: false', () => {
    const camera = new PerspectiveCamera(75, 800 / 600, 0.1, 1000)
    camera.position.set(0, 0, 0)

    const object = new Object3D()
    object.position.set(0, 0, 5) // 在相机背后

    global.innerWidth = 800
    global.innerHeight = 600

    const result = getScreenPosition(object, camera)

    expect(result.visible).toBe(false)
  })

  it('当物体在视野外时应该返回 visible: false', () => {
    const camera = new PerspectiveCamera(75, 800 / 600, 0.1, 1000)
    camera.position.set(0, 0, 5)

    const object = new Object3D()
    object.position.set(100, 0, 0) // 远离视野中心

    global.innerWidth = 800
    global.innerHeight = 600

    const result = getScreenPosition(object, camera)

    expect(result.visible).toBe(false)
  })
})
