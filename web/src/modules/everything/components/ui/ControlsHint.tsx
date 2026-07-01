import { useEffect, useState } from 'react'
import { shouldUseJoystick } from '../../lib/scene-controls'

export default function ControlsHint() {
  const [isCoarsePointer, setIsCoarsePointer] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setIsCoarsePointer(shouldUseJoystick(mq.matches))
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  if (dismissed) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-10 flex justify-center px-4">
      <div className="pointer-events-auto max-w-md rounded-lg bg-black/75 px-4 py-3 text-white backdrop-blur">
        <p className="mb-2 text-sm font-semibold">操作说明</p>
        <div className="space-y-1 text-xs text-gray-300">
          {isCoarsePointer ? (
            <>
              <p>单指拖拽 - 旋转视角</p>
              <p>双指捏合 - 缩放</p>
              <p>左下摇杆 - 移动</p>
              <p>点击容器 - 查看物品</p>
            </>
          ) : (
            <>
              <p>鼠标拖拽 - 旋转视角</p>
              <p>滚轮 - 缩放</p>
              <p>WASD - 移动</p>
              <p>点击容器 - 查看物品</p>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="mt-2 text-xs text-primary hover:underline"
        >
          知道了
        </button>
      </div>
    </div>
  )
}
