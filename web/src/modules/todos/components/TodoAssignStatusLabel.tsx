import {
  ASSIGNED_CARD_STATUS_TONE,
  getAssignedTodoCardStatusLabel,
} from '../lib/todo-card-status'
import type { TodoItem } from '../types/todo-types'
import { cn } from '@/lib/utils'

type TodoAssignStatusLabelProps = {
  todo: Pick<TodoItem, 'status' | 'creatorId' | 'assigneeId' | 'requireFeedback'>
  className?: string
}

export default function TodoAssignStatusLabel({
  todo,
  className,
}: TodoAssignStatusLabelProps) {
  const label = getAssignedTodoCardStatusLabel(todo)
  if (!label) return null

  return (
    <p
      className={cn(
        'text-xs',
        ASSIGNED_CARD_STATUS_TONE[todo.status],
        className,
      )}
    >
      {label}
    </p>
  )
}
