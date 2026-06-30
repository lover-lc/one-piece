import { useState } from 'react'
import {
  DEFAULT_TODO_LIST_COLOR,
  isValidListColor,
  TODO_LIST_COLOR_PALETTE,
} from '../lib/todo-list-colors'

export function ListColorPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (color: string) => void
}) {
  const [customOpen, setCustomOpen] = useState(false)
  const [customHex, setCustomHex] = useState(value)

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {TODO_LIST_COLOR_PALETTE.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`颜色 ${color}`}
            onClick={() => onChange(color)}
            className={[
              'size-8 rounded-full border-2 transition-transform',
              value === color ? 'scale-110 border-text' : 'border-transparent',
            ].join(' ')}
            style={{ backgroundColor: color }}
          />
        ))}
        <button
          type="button"
          onClick={() => {
            setCustomHex(value)
            setCustomOpen((v) => !v)
          }}
          className={[
            'flex size-8 items-center justify-center rounded-full border text-xs',
            !TODO_LIST_COLOR_PALETTE.includes(value as (typeof TODO_LIST_COLOR_PALETTE)[number])
              ? 'border-text'
              : 'border-bg-hover',
          ].join(' ')}
        >
          #
        </button>
      </div>
      {customOpen ? (
        <div className="flex gap-2">
          <input
            type="text"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            placeholder="#6366f1"
            className="min-w-0 flex-1 rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary/30"
          />
          <button
            type="button"
            disabled={!isValidListColor(customHex)}
            onClick={() => onChange(customHex)}
            className="rounded-button bg-primary px-3 py-2 text-sm text-white disabled:opacity-50"
          >
            应用
          </button>
        </div>
      ) : null}
    </div>
  )
}

export function useListColorState(initial = DEFAULT_TODO_LIST_COLOR) {
  const [color, setColor] = useState(initial)
  return { color, setColor, reset: (next = DEFAULT_TODO_LIST_COLOR) => setColor(next) }
}
