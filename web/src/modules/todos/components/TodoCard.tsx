import { Link } from 'react-router-dom'
import { useFamilyMembers } from '../../../shared/hooks/use-family-members'
import type { TodoItem } from '../types/todo-types'
import { TODO_PRIORITY_LABELS } from '../types/todo-types'
import StatusBadge from './StatusBadge'

type TodoCardProps = {
  todo: TodoItem
  onQuickComplete?: (id: string) => void
}

export default function TodoCard({ todo, onQuickComplete }: TodoCardProps) {
  const { data: members = [] } = useFamilyMembers()
  const assignee = members.find((m) => m.id === todo.assigneeId)
  const isOverdue =
    todo.dueDate &&
    todo.status !== 'completed' &&
    todo.dueDate < new Date().toISOString().slice(0, 10)

  return (
    <div className="flex items-start gap-3 rounded-card border border-bg-hover bg-bg-card p-3">
      {onQuickComplete && todo.status !== 'completed' ? (
        <input
          type="checkbox"
          className="mt-1 size-4 shrink-0 accent-primary"
          onChange={() => onQuickComplete(todo.id)}
          aria-label="快速完成"
        />
      ) : (
        <span className="size-4 shrink-0" />
      )}

      <Link to={`/todos/${todo.id}`} className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-text">{todo.title}</span>
          <StatusBadge status={todo.status} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
          <span
            className={
              todo.priority === 'high'
                ? 'text-status-expired'
                : todo.priority === 'low'
                  ? 'text-text-tertiary'
                  : ''
            }
          >
            {TODO_PRIORITY_LABELS[todo.priority]}
          </span>
          {todo.dueDate ? (
            <span className={isOverdue ? 'text-status-expired' : ''}>
              {isOverdue ? '逾期 ' : ''}
              {todo.dueDate}
            </span>
          ) : null}
          {assignee ? (
            <span className="flex items-center gap-1">
              <span
                className="size-3 rounded-full"
                style={{ backgroundColor: assignee.color }}
              />
              {assignee.name}
            </span>
          ) : null}
        </div>

        {todo.tags && todo.tags.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1">
            {todo.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-[10px]"
                style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}
      </Link>
    </div>
  )
}
