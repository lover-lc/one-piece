import type { TodoItem, TodoList } from '../types/todo-types'

export type TodoListPlacements = {
  memberLists: Map<string, string>
  sharedLists: Map<string, string[]>
}

export function effectiveListIdFromTodo(
  todo: Pick<TodoItem, 'privateListId' | 'sharedListId' | 'listId'>,
): string {
  return todo.sharedListId ?? todo.privateListId ?? todo.listId ?? ''
}

export function listFormToPlacements(
  listId: string,
  lists: TodoList[],
): { privateListId: string; sharedListId: string | null } {
  if (!listId) return { privateListId: '', sharedListId: null }
  const list = lists.find((l) => l.id === listId)
  if (!list) return { privateListId: listId, sharedListId: null }
  if (list.visibility === 'shared') {
    return { privateListId: '', sharedListId: listId }
  }
  return { privateListId: listId, sharedListId: null }
}

export function listOptionLabel(list: TodoList): string {
  return list.name
}

export type ListGroup = {
  list: TodoList
  items: TodoItem[]
}

export function buildListGroups(
  todos: TodoItem[],
  lists: TodoList[],
  memberId: string | null,
  placements: TodoListPlacements,
): ListGroup[] {
  if (!memberId) return []

  const privateLists = lists.filter((l) => l.visibility === 'private')
  const sharedLists = lists.filter((l) => l.visibility === 'shared')
  const orderedLists = [...privateLists, ...sharedLists]

  const groups: ListGroup[] = orderedLists.map((list) => ({ list, items: [] }))

  for (const todo of todos) {
    const sharedIds = placements.sharedLists.get(todo.id) ?? []
    const hasShared = sharedIds.length > 0

    if (!hasShared) {
      const privateListId =
        placements.memberLists.get(`${todo.id}:${memberId}`) ??
        placements.memberLists.get(todo.id) ??
        null
      if (privateListId) {
        const group = groups.find((g) => g.list.id === privateListId)
        if (group) group.items.push(todo)
      } else if (todo.listId) {
        const fallback = groups.find((g) => g.list.id === todo.listId)
        if (fallback) fallback.items.push(todo)
      }
    }

    for (const sharedListId of sharedIds) {
      const group = groups.find((g) => g.list.id === sharedListId)
      if (group && !group.items.some((item) => item.id === todo.id)) {
        group.items.push(todo)
      }
    }
  }

  return groups
}

export function countTodosPerList(
  todos: TodoItem[],
  lists: TodoList[],
  memberId: string | null,
  placements: TodoListPlacements,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const list of lists) counts[list.id] = 0

  const groups = buildListGroups(todos, lists, memberId, placements)
  for (const group of groups) {
    counts[group.list.id] = group.items.length
  }

  return counts
}
