import { useEffect, useRef, useState } from 'react'
import { shouldUseJoystick } from '../../lib/scene-controls'
import { useSceneStore } from '../../store/scene-store'

const KNOB_RADIUS = 28
const BASE_RADIUS = 56
const MAX_OFFSET = BASE_RADIUS - KNOB_RADIUS

export default function MobileJoystick() {
  const setJoystickInput = useSceneStore((s) => s.setJoystickInput)
  const [enabled, setEnabled] = useState(false)
  const baseRef = useRef<HTMLDivElement>(null)
  const activePointerId = useRef<number | null>(null)
  const centerRef = useRef({ x: 0, y: 0 })
  const [knobOffset, setKnobOffset] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setEnabled(shouldUseJoystick(mq.matches))
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  function resetJoystick() {
    activePointerId.current = null
    setKnobOffset({ x: 0, y: 0 })
    setJoystickInput({ x: 0, y: 0 })
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!enabled || activePointerId.current !== null) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    activePointerId.current = e.pointerId

    const rect = baseRef.current?.getBoundingClientRect()
    if (!rect) return
    centerRef.current = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    }
    updateKnob(e.clientX, e.clientY)
  }

  function updateKnob(clientX: number, clientY: number) {
    const dx = clientX - centerRef.current.x
    const dy = clientY - centerRef.current.y
    const distance = Math.hypot(dx, dy)
    const clamped = Math.min(distance, MAX_OFFSET)
    const angle = Math.atan2(dy, dx)
    const x = Math.cos(angle) * clamped
    const y = Math.sin(angle) * clamped

    setKnobOffset({ x, y })
    setJoystickInput({
      x: x / MAX_OFFSET,
      y: y / MAX_OFFSET,
    })
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return
    e.stopPropagation()
    updateKnob(e.clientX, e.clientY)
  }

  function handlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (activePointerId.current !== e.pointerId) return
    e.stopPropagation()
    e.currentTarget.releasePointerCapture(e.pointerId)
    resetJoystick()
  }

  if (!enabled) return null

  return (
    <div className="pointer-events-none fixed bottom-6 left-6 z-40">
      <div
        ref={baseRef}
        className="pointer-events-auto relative touch-none"
        style={{ width: BASE_RADIUS * 2, height: BASE_RADIUS * 2 }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="absolute inset-0 rounded-full border border-white/20 bg-black/30 backdrop-blur-sm" />
        <div
          className="absolute rounded-full border border-white/30 bg-white/20"
          style={{
            width: KNOB_RADIUS * 2,
            height: KNOB_RADIUS * 2,
            left: BASE_RADIUS - KNOB_RADIUS + knobOffset.x,
            top: BASE_RADIUS - KNOB_RADIUS + knobOffset.y,
          }}
        />
      </div>
    </div>
  )
}
