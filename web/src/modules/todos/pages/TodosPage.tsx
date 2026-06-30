import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { useLocation } from 'react-router-dom'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import TimelineView from '../components/TimelineView'
import TimelineViewModeToggle from '../components/TimelineViewModeToggle'
import DateRangeField from '../../../shared/components/DateRangeField'
import TimelineGranularityToggle from '../components/TimelineGranularityToggle'
import TodoFilterBar from '../components/TodoFilterBar'
import TodoCard from '../components/TodoCard'
import { useTimelineMode } from '../hooks/use-timeline-mode'
import { useGanttPrefs } from '../hooks/use-gantt-prefs'
import { applyTodoFilters } from '../lib/todo-filter'
import { useTodoUiStore } from '../store/todo-ui-store'
import { buildListGroups } from '../lib/todo-list-placement'
import { canDeleteTodo } from '../lib/negotiation-ui'
import TodoActionDialog from '../components/TodoActionDialog'
import SwipeRow from '../../../shared/components/ui/SwipeRow'
import {
  useDeleteTodo,
  useNegotiationAction,
  useRemindTodoCreator,
  useTodoLists,
  useTodoStatusAction,
  useTodoStatusReasons,
  useTodoTags,
  useTodos,
  useToggleTodoComplete,
} from '../hooks/use-todos'
import { getTodoCheckboxAction } from '../services/todo-service'
import type { TodoItem } from '../types/todo-types'

function TodoListGroup({
  title,
  color,
  items,
  currentMemberId,
  onCheckboxAction,
  onDelete,
  statusReasons,
}: {
  title: string
  color?: string | null
  items: TodoItem[]
  currentMemberId: string | null
  onCheckboxAction: (todo: TodoItem) => void
  onDelete: (todo: TodoItem) => void
  statusReasons?: Map<string, string>
}) {
  if (items.length === 0) return null

  return (
    <section>
      <div className="mb-1 flex items-center gap-2 px-1">
        {color ? (
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color }}
          />
        ) : null}
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h2>
      </div>
      <Card className="overflow-hidden py-0 shadow-card">
        <ul className="divide-y divide-border">
          {items.map((todo) => {
            const card = (
              <TodoCard
                todo={todo}
                checkboxAction={getTodoCheckboxAction(todo, currentMemberId)}
                onCheckboxAction={onCheckboxAction}
                statusReason={statusReasons?.get(todo.id)}
              />
            )
            const deletable = canDeleteTodo(todo, currentMemberId)
            return (
              <li key={todo.id}>
                {deletable ? (
                  <SwipeRow onDelete={() => onDelete(todo)}>{card}</SwipeRow>
                ) : (
                  card
                )}
              </li>
            )
          })}
        </ul>
      </Card>
    </section>
  )
}

export default function TodosPage() {
  const location = useLocation()
  const isTimeline = location.pathname.endsWith('/timeline')
  const { currentMemberId } = useCurrentMember()

  const filter: 'created' | 'all' = location.pathname.endsWith('/created') ? 'created' : 'all'

  const { data: todos = [], isLoading } = useTodos(filter === 'all' ? undefined : filter)
  const [timelineMode, setTimelineMode] = useTimelineMode()
  const { granularity, range, setGranularity, setRange } = useGanttPrefs()
  const { data: lists = [] } = useTodoLists()
  const { data: tags = [] } = useTodoTags()
  const { data: statusReasons = new Map<string, string>() } = useTodoStatusReasons(todos)
  const toggleComplete = useToggleTodoComplete()
  const statusAction = useTodoStatusAction()
  const confirmNegotiation = useNegotiationAction()
  const remindCreator = useRemindTodoCreator()
  const deleteTodo = useDeleteTodo()
  const [search, setSearch] = useState('')
  const [toast, setToast] = useState<string | null>(null)
  const [completeDialogTodo, setCompleteDialogTodo] = useState<TodoItem | null>(null)

  const showCompleted = useTodoUiStore((s) => s.showCompleted)
  const listFilterIds = useTodoUiStore((s) => s.listFilterIds)
  const tagFilterIds = useTodoUiStore((s) => s.tagFilterIds)
  const sortField = useTodoUiStore((s) => s.sortField)
  const sortOrder = useTodoUiStore((s) => s.sortOrder)

  const searchedTodos = useMemo(() => {
    if (!search.trim()) return todos
    const q = search.trim().toLowerCase()
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    )
  }, [todos, search])

  const filteredTodos = useMemo(
    () =>
      applyTodoFilters(isTimeline ? todos : searchedTodos, {
        showCompleted,
        listFilterIds,
        tagFilterIds,
        sortField,
        sortOrder,
      }),
    [
      isTimeline,
      todos,
      searchedTodos,
      showCompleted,
      listFilterIds,
      tagFilterIds,
      sortField,
      sortOrder,
    ],
  )

  const grouped = useMemo(() => {
    const memberLists = new Map<string, string>()
    const sharedLists = new Map<string, string[]>()
    for (const todo of filteredTodos) {
      if (todo.privateListId && currentMemberId) {
        memberLists.set(`${todo.id}:${currentMemberId}`, todo.privateListId)
      }
      if (todo.sharedListId) sharedLists.set(todo.id, [todo.sharedListId])
    }
    return buildListGroups(filteredTodos, lists, currentMemberId, {
      memberLists,
      sharedLists,
    })
  }, [lists, filteredTodos, currentMemberId])

  async function handleCheckboxAction(todo: TodoItem) {
    const action = getTodoCheckboxAction(todo, currentMemberId)
    if (action === 'none') return

    try {
      if (action === 'remind') {
        await remindCreator.mutateAsync(todo)
        setToast('已提醒创建人验收')
        return
      }

      if (action === 'verify') {
        await statusAction.mutateAsync({
          id: todo.id,
          action: 'verify',
          role: 'creator',
          currentStatus: todo.status,
        })
        return
      }

      if (action === 'accept') {
        await confirmNegotiation.mutateAsync({
          id: todo.id,
          action: 'agree',
          patch: {
            title: todo.title,
            description: todo.description ?? undefined,
            privateListId: todo.privateListId ?? todo.listId,
            sharedListId: todo.sharedListId,
            assigneeId: todo.assigneeId,
            priority: todo.priority,
            startDate: todo.startDate ?? undefined,
            dueDate: todo.dueDate,
            requireFeedback: todo.requireFeedback,
            recurrenceRule: todo.recurrenceRule,
            tagIds: todo.tags?.map((t) => t.id),
          },
          todo,
        })
        return
      }

      if (action === 'uncomplete') {
        await toggleComplete.mutateAsync({ id: todo.id, status: todo.status })
        return
      }

      if (action === 'complete') {
        if (todo.requireFeedback) {
          setCompleteDialogTodo(todo)
          return
        }

        await statusAction.mutateAsync({
          id: todo.id,
          action: 'complete',
          role: 'assignee',
          currentStatus: todo.status,
        })
      }
    } catch (err) {
      setToast(String((err as Error).message || '操作失败'))
    }
  }

  async function handleDelete(todo: TodoItem) {
    try {
      if (todo.recurrenceRule || todo.parentRecurrenceId) {
        const series = window.confirm('删除所有重复实例？取消则仅删除此项')
        await deleteTodo.mutateAsync({ id: todo.id, deleteSeries: series })
      } else {
        await deleteTodo.mutateAsync({ id: todo.id })
      }
    } catch (err) {
      setToast(String((err as Error).message || '删除失败'))
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (isTimeline) {
    return (
      <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden px-4 py-2">
        <div className="shrink-0 space-y-1">
          <TodoFilterBar lists={lists} tags={tags} todos={todos} />
          <TimelineViewModeToggle value={timelineMode} onChange={setTimelineMode} />
          <DateRangeField range={range} onApply={setRange} />
          {timelineMode === 'due' ? (
            <TimelineGranularityToggle value={granularity} onChange={setGranularity} />
          ) : null}
        </div>
        <div className="mt-1 flex min-h-0 flex-1 flex-col overflow-hidden">
          <TimelineView
            todos={filteredTodos}
            mode={timelineMode}
            granularity={granularity}
            range={range}
            onGranularityChange={setGranularity}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索待办…"
        className="mb-3 shadow-sm"
      />
      <TodoFilterBar lists={lists} tags={tags} todos={searchedTodos} />

      {toast ? (
        <p className="mb-3 rounded-button bg-primary/10 px-3 py-2 text-sm text-primary">
          {toast}
        </p>
      ) : null}

      {lists.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          暂无清单，请先创建清单
        </p>
      ) : (
        <div className="space-y-5">
          {grouped.map(({ list, items }) => {
            if (items.length === 0 && filter !== 'all') return null

            return (
              <TodoListGroup
                key={list.id}
                title={list.name}
                color={list.color}
                items={items}
                currentMemberId={currentMemberId}
                onCheckboxAction={(todo) => void handleCheckboxAction(todo)}
                onDelete={(todo) => void handleDelete(todo)}
                statusReasons={statusReasons}
              />
            )
          })}
        </div>
      )}

      <TodoActionDialog
        mode="confirm_complete"
        open={Boolean(completeDialogTodo)}
        todoTitle={completeDialogTodo?.title ?? ''}
        onCancel={() => setCompleteDialogTodo(null)}
        onConfirm={async () => {
          if (!completeDialogTodo) return
          try {
            await statusAction.mutateAsync({
              id: completeDialogTodo.id,
              action: 'complete',
              role: 'assignee',
              currentStatus: completeDialogTodo.status,
            })
            setCompleteDialogTodo(null)
          } catch (err) {
            setToast(String((err as Error).message || '操作失败'))
          }
        }}
        isPending={statusAction.isPending}
      />
    </div>
  )
}
