export const TODO_LIST_COLOR_PALETTE = [
  '#6366f1',
  '#8b5cf6',
  '#ec4899',
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#14b8a6',
  '#3b82f6',
  '#64748b',
] as const

export const DEFAULT_TODO_LIST_COLOR = TODO_LIST_COLOR_PALETTE[0]

export function isValidListColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value)
}
