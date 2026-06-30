import type { TodoItem } from '../types/todo-types'
import { compareTodoSchedule } from '../../../shared/lib/todo-schedule'
import type { TodoSortField, TodoSortOrder } from '../store/todo-ui-store'

export const TODO_SORT_FIELD_LABELS: Record<TodoSortField, string> = {
  dueDate: '截止日期',
  createdAt: '创建时间',
  title: '标题',
}

export const TODO_SORT_ORDER_LABELS: Record<TodoSortOrder, string> = {
  asc: '升序',
  desc: '降序',
}

export type TodoFilterOptions = {
  showCompleted: boolean
  listFilterIds: string[]
  tagFilterIds: string[]
  sortField: TodoSortField
  sortOrder: TodoSortOrder
}

export function applyTodoFilters(
  todos: TodoItem[],
  options: TodoFilterOptions,
): TodoItem[] {
  let result = [...todos]

  if (!options.showCompleted) {
    result = result.filter((todo) => todo.status !== 'completed')
  }

  if (options.listFilterIds.length > 0) {
    const set = new Set(options.listFilterIds)
    result = result.filter((todo) => set.has(todo.listId))
  }

  if (options.tagFilterIds.length > 0) {
    const set = new Set(options.tagFilterIds)
    result = result.filter((todo) =>
      todo.tags?.some((tag) => set.has(tag.id)),
    )
  }

  result.sort((a, b) => compareTodos(a, b, options.sortField, options.sortOrder))
  return result
}

function compareTodos(
  a: TodoItem,
  b: TodoItem,
  field: TodoSortField,
  order: TodoSortOrder,
): number {
  const aDone = a.status === 'completed' ? 1 : 0
  const bDone = b.status === 'completed' ? 1 : 0
  if (aDone !== bDone) return aDone - bDone

  let cmp = 0
  switch (field) {
    case 'dueDate':
      cmp = compareTodoSchedule(a, b)
      break
    case 'createdAt':
      cmp = a.createdAt.localeCompare(b.createdAt)
      break
    case 'title':
      cmp = a.title.localeCompare(b.title, 'zh-CN')
      break
  }

  if (cmp === 0) {
    cmp = a.title.localeCompare(b.title, 'zh-CN')
  }

  return order === 'asc' ? cmp : -cmp
}

export function listsWithTodos(
  lists: { id: string; name: string }[],
  todos: TodoItem[],
): { id: string; name: string }[] {
  const ids = new Set(todos.map((t) => t.listId))
  return lists.filter((list) => ids.has(list.id))
}

export function tagsWithTodos(
  tags: { id: string; name: string }[],
  todos: TodoItem[],
): { id: string; name: string }[] {
  const ids = new Set<string>()
  for (const todo of todos) {
    for (const tag of todo.tags ?? []) {
      ids.add(tag.id)
    }
  }
  return tags.filter((tag) => ids.has(tag.id))
}
