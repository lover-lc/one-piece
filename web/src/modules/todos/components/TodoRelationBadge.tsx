import MemberAvatar from '../../../shared/components/MemberAvatar'
import { useFamilyMembers } from '../../../shared/hooks/use-family-members'
import { isAssignedTodo } from '../lib/negotiation-ui'
import type { TodoItem } from '../types/todo-types'
import { cn } from '@/lib/utils'

type TodoRelationBadgeProps = {
  todo: Pick<TodoItem, 'creatorId' | 'assigneeId' | 'requireFeedback'>
  className?: string
}

export default function TodoRelationBadge({ todo, className }: TodoRelationBadgeProps) {
  const { data: members = [] } = useFamilyMembers()

  if (!isAssignedTodo(todo)) return null

  const assignee = members.find((m) => m.id === todo.assigneeId)
  if (!assignee) return null

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full bg-muted/80 px-1 py-0.5 text-muted-foreground',
        className,
      )}
      title={`指派给 ${assignee.name}`}
    >
      <span className="text-[10px] leading-none" aria-hidden>
        →
      </span>
      <MemberAvatar member={assignee} size="sm" className="!size-3.5 !text-[8px]" />
    </span>
  )
}
