import { Link } from 'react-router-dom'
import type { TodoCheckboxAction } from '../services/todo-service'
import { isTodoCheckboxChecked } from '../services/todo-service'
import type { TodoItem } from '../types/todo-types'
import { TODO_PRIORITY_LABELS } from '../types/todo-types'
import { isReasonStatus } from '../lib/todo-status-reason'
import TodoStatusReasonBanner from './TodoStatusReasonBanner'
import { Checkbox } from '@/components/ui/checkbox'
import { getTodoDisplayTitle } from '../lib/todo-display'
import { cn } from '@/lib/utils'
import TodoAssignStatusLabel from './TodoAssignStatusLabel'
import TodoRelationBadge from './TodoRelationBadge'

type TodoCardProps = {
  todo: TodoItem
  checkboxAction: TodoCheckboxAction
  onCheckboxAction?: (todo: TodoItem) => void
  statusReason?: string | null
}

function formatDueLabel(dueDate: string, isOverdue: boolean): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (dueDate === today) return '今天'
  if (dueDate === tomorrow) return '明天'
  if (isOverdue) return dueDate.slice(5).replace('-', '/')
  return dueDate.slice(5).replace('-', '/')
}

export default function TodoCard({
  todo,
  checkboxAction,
  onCheckboxAction,
  statusReason,
}: TodoCardProps) {
  const isChecked = isTodoCheckboxChecked(todo.status)
  const isPendingReview = todo.status === 'pending_review'
  const reasonStatus = isReasonStatus(todo.status) ? todo.status : null
  const isCompleted = todo.status === 'completed'
  const isOverdue =
    !isChecked &&
    !isPendingReview &&
    todo.dueDate != null &&
    todo.dueDate < new Date().toISOString().slice(0, 10)
  const canInteract = checkboxAction !== 'none'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-2.5',
        isPendingReview && 'bg-purple-50 dark:bg-purple-950/25',
        reasonStatus && 'bg-orange-50/70 dark:bg-orange-950/20',
        todo.status === 'rejected' && 'bg-red-50/70 dark:bg-red-950/20',
      )}
    >
      <Checkbox
        checked={isChecked}
        onCheckedChange={() => {
          if (canInteract) onCheckboxAction?.(todo)
        }}
        disabled={!canInteract}
        aria-label={
          checkboxAction === 'remind'
            ? '催办验收'
            : checkboxAction === 'verify'
              ? '验收通过'
              : isChecked
                ? '标记为未完成'
                : '标记为完成'
        }
        className={cn(
          'size-[22px] rounded-full',
          isChecked && 'bg-primary data-[state=checked]:bg-primary',
          isPendingReview &&
            'border-purple-500 data-[state=unchecked]:border-purple-500 data-[state=unchecked]:bg-transparent',
          !canInteract && 'opacity-50',
        )}
      />

      <Link to={`/todos/${todo.id}/edit`} className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p
              className={cn(
                'truncate text-[17px] leading-snug',
                isCompleted
                  ? 'text-muted-foreground line-through'
                  : isPendingReview
                    ? 'text-purple-700 dark:text-purple-300'
                    : 'text-foreground',
              )}
            >
              {getTodoDisplayTitle(todo)}
            </p>
            {todo.description ? (
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {todo.description}
              </p>
            ) : null}
            <TodoAssignStatusLabel todo={todo} className="mt-0.5" />
            {statusReason && reasonStatus ? (
              <TodoStatusReasonBanner
                status={reasonStatus}
                reasonText={statusReason}
                compact
                className="mt-0.5 line-clamp-2"
              />
            ) : null}
            <TodoRelationBadge todo={todo} className="mt-0.5" />
            {todo.priority ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {TODO_PRIORITY_LABELS[todo.priority]}优先级
              </p>
            ) : null}
          </div>
          {todo.dueDate ? (
            <span
              className={cn(
                'shrink-0 text-[15px]',
                isOverdue ? 'text-destructive' : 'text-muted-foreground',
                isPendingReview && 'text-purple-600 dark:text-purple-400',
              )}
            >
              {formatDueLabel(todo.dueDate, isOverdue)}
            </span>
          ) : null}
        </div>
      </Link>
    </div>
  )
}
