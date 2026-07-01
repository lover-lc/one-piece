import { describe, expect, test } from 'vitest'
import {
  buildMoveVector,
  isDragGesture,
  shouldUseJoystick,
} from '../src/modules/everything/lib/scene-controls'

describe('scene controls utils', () => {
  test('builds keyboard movement vector for WASD', () => {
    const move = buildMoveVector(
      { w: true, a: false, s: false, d: true },
      { x: 0, y: 0 },
    )

    expect(move.z).toBeCloseTo(-0.707)
    expect(move.x).toBeCloseTo(0.707)
  })

  test('merges joystick vector with keyboard vector', () => {
    const move = buildMoveVector(
      { w: false, a: false, s: false, d: false },
      { x: 0.4, y: -0.6 },
    )

    expect(move.x).toBeCloseTo(0.4)
    expect(move.z).toBeCloseTo(-0.6)
  })

  test('treats movement over threshold as drag', () => {
    expect(isDragGesture({ x: 10, y: 10 }, { x: 16, y: 10 }, 5)).toBe(true)
    expect(isDragGesture({ x: 10, y: 10 }, { x: 13, y: 12 }, 5)).toBe(false)
  })

  test('uses joystick only on coarse pointer devices', () => {
    expect(shouldUseJoystick(true)).toBe(true)
    expect(shouldUseJoystick(false)).toBe(false)
  })
})
