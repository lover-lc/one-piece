export const DRAG_THRESHOLD_PX = 7

export interface KeyboardMoveInput {
  w: boolean
  a: boolean
  s: boolean
  d: boolean
}

export interface JoystickMoveInput {
  x: number
  y: number
}

export interface MoveVector {
  x: number
  z: number
}

export function buildMoveVector(
  keys: KeyboardMoveInput,
  joystick: JoystickMoveInput,
): MoveVector {
  let x = joystick.x
  let z = joystick.y

  if (keys.w) z -= 1
  if (keys.s) z += 1
  if (keys.a) x -= 1
  if (keys.d) x += 1

  const length = Math.hypot(x, z)
  if (length > 1) {
    x /= length
    z /= length
  }

  return { x, z }
}

export function isDragGesture(
  start: { x: number; y: number },
  current: { x: number; y: number },
  threshold = DRAG_THRESHOLD_PX,
): boolean {
  const dx = current.x - start.x
  const dy = current.y - start.y
  return Math.hypot(dx, dy) >= threshold
}

export function shouldUseJoystick(isCoarsePointer: boolean): boolean {
  return isCoarsePointer
}
