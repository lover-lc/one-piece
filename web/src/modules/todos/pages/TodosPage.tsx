import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useRealtimeTodos } from '../../../shared/hooks/use-realtime'
import TimelineView from '../components/TimelineView'
import TodoCard from '../components/TodoCard'
import {
  useTodoLists,
  useTodos,
  useTodoStatusAction,
} from '../hooks/use-todos'

export default function TodosPage() {
  const location = useLocation()
  const isTimeline = location.pathname.endsWith('/timeline')

  const filter: 'assigned' | 'created' | 'all' = location.pathname.endsWith('/assigned')
    ? 'assigned'
    : location.pathname.endsWith('/created')
      ? 'created'
      : 'all'

  const { data: todos = [], isLoading } = useTodos(
    filter === 'all' ? undefined : filter,
  )
  const { data: lists = [] } = useTodoLists()
  const statusAction = useTodoStatusAction()
  const [collapsedLists, setCollapsedLists] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  useRealtimeTodos()

  const filteredTodos = useMemo(() => {
    if (!search.trim()) return todos
    const q = search.trim().toLowerCase()
    return todos.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q),
    )
  }, [todos, search])

  const grouped = useMemo(() => {
    const map = new Map<string, typeof filteredTodos>()
    for (const list of lists) {
      map.set(list.id, [])
    }
    for (const todo of filteredTodos) {
      const arr = map.get(todo.listId) ?? []
      arr.push(todo)
      map.set(todo.listId, arr)
    }
    return map
  }, [lists, filteredTodos])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-text-secondary">
        加载中…
      </div>
    )
  }

  if (isTimeline) {
    return (
      <div className="p-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索待办…"
          className="mb-4 w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-sm outline-none focus:border-primary"
        />
        <TimelineView todos={filteredTodos.filter((t) => t.status !== 'completed')} />
      </div>
    )
  }

  return (
    <div className="p-4">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="搜索待办…"
        className="mb-4 w-full rounded-button border border-bg-hover bg-bg-card px-3 py-2 text-sm outline-none focus:border-primary"
      />

      {lists.length === 0 ? (
        <p className="text-center text-sm text-text-secondary">
          暂无清单，请先创建清单
        </p>
      ) : (
        <div className="space-y-4">
          {lists.map((list) => {
            const items = grouped.get(list.id) ?? []
            if (items.length === 0 && filter !== 'all') return null
            const collapsed = collapsedLists.has(list.id)

            return (
              <section key={list.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCollapsedLists((prev) => {
                      const next = new Set(prev)
                      if (next.has(list.id)) next.delete(list.id)
                      else next.add(list.id)
                      return next
                    })
                  }}
                  className="mb-2 flex w-full items-center gap-2 text-left text-sm font-medium"
                >
                  <span
                    className="size-3 rounded-full"
                    style={{ backgroundColor: list.color ?? '#2c3e50' }}
                  />
                  {list.name}
                  <span className="text-text-tertiary">({items.length})</span>
                </button>
                {!collapsed ? (
                  <div className="space-y-2">
                    {items.map((todo) => (
                      <TodoCard
                        key={todo.id}
                        todo={todo}
                        onQuickComplete={(id) => {
                          const item = items.find((t) => t.id === id)
                          if (!item) return
                          const role =
                            item.assigneeId === item.creatorId ? 'assignee' : 'assignee'
                          void statusAction.mutateAsync({
                            id,
                            action: 'complete',
                            role,
                            currentStatus: item.status,
                          })
                        }}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
