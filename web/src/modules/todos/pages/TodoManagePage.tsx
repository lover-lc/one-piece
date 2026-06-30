import { useMemo, useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import TodoListManage from '../components/TodoListManage'
import RecurrenceManagePanel from '../components/RecurrenceManagePanel'
import MemberManagePanel from '../components/MemberManagePanel'
import ReminderManagePanel from '../components/ReminderManagePanel'
import {
  useCreateTodoList,
  useDeleteTodoList,
  useTodoLists,
  useTodos,
  useUpdateTodoList,
} from '../hooks/use-todos'
import { countTodosPerList } from '../lib/todo-list-placement'
import type { TodoList } from '../types/todo-types'

function DeleteListDialog({
  listName,
  count,
  onCancel,
  onDeleteWithMove,
  onDeleteAll,
  canMove,
  moveTargetName,
  isPending,
}: {
  listName: string
  count: number
  onCancel: () => void
  onDeleteWithMove?: () => void
  onDeleteAll: () => void
  canMove: boolean
  moveTargetName?: string
  isPending?: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-lg">
        <h2 className="text-lg font-medium">删除清单</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          「{listName}」中有 {count} 个待办，如何处理？
        </p>
        <div className="mt-6 flex flex-col gap-2">
          {canMove && onDeleteWithMove ? (
            <Button onClick={onDeleteWithMove} disabled={isPending}>
              移至「{moveTargetName}」并删除清单
            </Button>
          ) : null}
          <Button variant="destructive" onClick={onDeleteAll} disabled={isPending}>
            删除清单及全部待办
          </Button>
          <Button variant="outline" onClick={onCancel} disabled={isPending}>
            取消
          </Button>
        </div>
      </div>
    </div>
  )
}

const segments = [
  { id: 'lists', label: '清单' },
  { id: 'members', label: '成员' },
  { id: 'recurrence', label: '重复' },
  { id: 'reminders', label: '提醒' },
] as const

type SegmentId = (typeof segments)[number]['id']

export default function TodoManagePage() {
  const [searchParams] = useSearchParams()
  const initialTab = searchParams.get('tab')
  const [segment, setSegment] = useState<SegmentId>(() => {
    if (
      initialTab === 'reminders' ||
      initialTab === 'recurrence' ||
      initialTab === 'members' ||
      initialTab === 'lists'
    ) {
      return initialTab
    }
    return 'lists'
  })
  const { currentMemberId } = useCurrentMember()
  const { data: lists = [], isLoading } = useTodoLists()
  const { data: todos = [] } = useTodos()
  const createList = useCreateTodoList()
  const updateList = useUpdateTodoList()
  const deleteList = useDeleteTodoList()
  const [listToDelete, setListToDelete] = useState<TodoList | null>(null)

  const todoCounts = useMemo(() => {
    const memberLists = new Map<string, string>()
    const sharedLists = new Map<string, string[]>()
    for (const todo of todos) {
      if (todo.privateListId && currentMemberId) {
        memberLists.set(`${todo.id}:${currentMemberId}`, todo.privateListId)
      }
      if (todo.sharedListId) sharedLists.set(todo.id, [todo.sharedListId])
    }
    return countTodosPerList(todos, lists, currentMemberId, {
      memberLists,
      sharedLists,
    })
  }, [todos, lists, currentMemberId])

  const moveTarget = lists.find((l) => l.id !== listToDelete?.id)

  return (
    <div className="flex h-full flex-col px-4 py-3">
      <div
        role="tablist"
        aria-label="待办管理"
        className="mb-3 flex rounded-button bg-bg-hover p-1"
      >
        {segments.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={segment === item.id}
            onClick={() => setSegment(item.id)}
            className={[
              'flex-1 rounded-button py-2 text-sm font-medium transition-colors',
              segment === item.id
                ? 'bg-bg-card text-text shadow-sm'
                : 'text-text-secondary hover:text-text',
            ].join(' ')}
          >
            {item.label}
          </button>
        ))}
      </div>

      {segment === 'lists' ? (
        <TodoListManage
          lists={lists}
          todoCounts={todoCounts}
          isLoading={isLoading}
          onAdd={async (name, color) => {
            await createList.mutateAsync({ name, visibility: 'private', color })
          }}
          onAddShared={async (name, color) => {
            await createList.mutateAsync({ name, visibility: 'shared', color })
          }}
          onRename={async (id, name, color) => {
            await updateList.mutateAsync({ id, name, color })
          }}
          onDeleteRequest={(list) => {
            const count = todoCounts[list.id] ?? 0
            if (count === 0) {
              void deleteList.mutateAsync({ id: list.id })
            } else {
              setListToDelete(list)
            }
          }}
        />
      ) : segment === 'members' ? (
        <MemberManagePanel />
      ) : segment === 'recurrence' ? (
        <RecurrenceManagePanel />
      ) : (
        <ReminderManagePanel />
      )}

      {listToDelete ? (
        <DeleteListDialog
          listName={listToDelete.name}
          count={todoCounts[listToDelete.id] ?? 0}
          canMove={Boolean(moveTarget)}
          moveTargetName={moveTarget?.name}
          isPending={deleteList.isPending}
          onCancel={() => setListToDelete(null)}
          onDeleteWithMove={
            moveTarget
              ? () => {
                  void deleteList
                    .mutateAsync({
                      id: listToDelete.id,
                      moveToListId: moveTarget.id,
                    })
                    .then(() => setListToDelete(null))
                }
              : undefined
          }
          onDeleteAll={() => {
            void deleteList
              .mutateAsync({ id: listToDelete.id })
              .then(() => setListToDelete(null))
          }}
        />
      ) : null}
    </div>
  )
}

export function TodoListsRedirect() {
  return <Navigate to="/todos/manage" replace />
}
