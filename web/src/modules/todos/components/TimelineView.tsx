import { useMemo, useState } from 'react'
import { useUpdateTodoDueDate } from '../hooks/use-todos'
import type { TodoItem } from '../types/todo-types'
import TodoCard from './TodoCard'

type TimelineGroup = {
  key: string
  label: string
  className?: string
  items: TodoItem[]
}

function getTimelineGroup(dueDate: string | null, today: string): Omit<TimelineGroup, 'items'> {
  if (!dueDate) return { key: 'no-date', label: '无截止日期' }

  if (dueDate < today) return { key: 'overdue', label: '逾期', className: 'text-status-expired' }

  const todayDate = new Date(`${today}T00:00:00`)
  const due = new Date(`${dueDate}T00:00:00`)
  const diffDays = Math.round((due.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return { key: 'today', label: '今天' }
  if (diffDays === 1) return { key: 'tomorrow', label: '明天' }
  if (diffDays <= 7) return { key: 'this-week', label: '本周' }
  if (diffDays <= 14) return { key: 'next-week', label: '下周' }
  return { key: 'later', label: '更晚' }
}

function groupTodos(todos: TodoItem[]): TimelineGroup[] {
  const today = new Date().toISOString().slice(0, 10)
  const order = ['overdue', 'today', 'tomorrow', 'this-week', 'next-week', 'later', 'no-date']
  const map = new Map<string, TimelineGroup>()

  for (const todo of todos) {
    const meta = getTimelineGroup(todo.dueDate, today)
    const existing = map.get(meta.key) ?? { ...meta, items: [] }
    existing.items.push(todo)
    map.set(meta.key, existing)
  }

  return order
    .filter((k) => map.has(k))
    .map((k) => map.get(k)!)
}

type TimelineViewProps = {
  todos: TodoItem[]
}

export default function TimelineView({ todos }: TimelineViewProps) {
  const groups = useMemo(() => groupTodos(todos), [todos])
  const updateDueDate = useUpdateTodoDueDate()
  const [draggingId, setDraggingId] = useState<string | null>(null)

  function handleDrop(targetDate: string) {
    if (!draggingId) return
    updateDueDate.mutate({ id: draggingId, dueDate: targetDate })
    setDraggingId(null)
  }

  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)

  return (
    <div className="space-y-6">
      {groups.map((group) => (
        <section key={group.key}>
          <h3 className={`mb-2 text-sm font-medium ${group.className ?? 'text-text-secondary'}`}>
            {group.label}
            <span className="ml-1 text-text-tertiary">({group.items.length})</span>
          </h3>

          <div
            className="relative space-y-2 border-l-2 border-bg-hover pl-4"
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              const dates: Record<string, string> = {
                today,
                tomorrow,
                'this-week': today,
                'next-week': tomorrow,
              }
              if (group.key in dates) handleDrop(dates[group.key]!)
            }}
          >
            {group.items.map((todo) => (
              <div
                key={todo.id}
                draggable
                onDragStart={() => setDraggingId(todo.id)}
                onDragEnd={() => setDraggingId(null)}
              >
                <TodoCard todo={todo} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
