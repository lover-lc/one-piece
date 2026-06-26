import { ArrowLeft, GripVertical, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  useCreateTodoList,
  useDeleteTodoList,
  useTodoLists,
  useTodos,
  useUpdateTodoList,
} from '../hooks/use-todos'

const fieldClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm outline-none focus:border-primary'

export default function ListManagePage() {
  const navigate = useNavigate()
  const { data: lists = [] } = useTodoLists()
  const { data: todos = [] } = useTodos()
  const createList = useCreateTodoList()
  const updateList = useUpdateTodoList()
  const deleteList = useDeleteTodoList()

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const todoCountByList = new Map<string, number>()
  for (const todo of todos) {
    todoCountByList.set(todo.listId, (todoCountByList.get(todo.listId) ?? 0) + 1)
  }

  return (
    <div className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <button type="button" onClick={() => navigate(-1)} className="p-1">
          <ArrowLeft className="size-5 text-text-secondary" />
        </button>
        <h1 className="text-lg font-medium">清单管理</h1>
      </div>

      <ul className="space-y-2">
        {lists.map((list, index) => (
          <li
            key={list.id}
            className="flex items-center gap-2 rounded-card border border-bg-hover bg-bg-card p-3"
          >
            <GripVertical className="size-4 text-text-tertiary" />
            <span
              className="size-4 shrink-0 rounded-full"
              style={{ backgroundColor: list.color ?? '#2c3e50' }}
            />
            {editingId === list.id ? (
              <form
                className="flex flex-1 gap-2"
                onSubmit={async (e) => {
                  e.preventDefault()
                  await updateList.mutateAsync({ id: list.id, name: editName })
                  setEditingId(null)
                }}
              >
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className={fieldClass}
                />
                <button type="submit" className="text-sm text-primary">
                  保存
                </button>
              </form>
            ) : (
              <>
                <span className="flex-1 text-sm">
                  {list.name}
                  <span className="ml-1 text-text-tertiary">
                    ({todoCountByList.get(list.id) ?? 0})
                  </span>
                </span>
                <button
                  type="button"
                  className="text-xs text-primary"
                  onClick={() => {
                    setEditingId(list.id)
                    setEditName(list.name)
                  }}
                >
                  编辑
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const count = todoCountByList.get(list.id) ?? 0
                    if (count > 0) {
                      const moveTo = lists.find((l) => l.id !== list.id)
                      if (
                        moveTo &&
                        window.confirm(`将 ${count} 个待办移至「${moveTo.name}」并删除清单？`)
                      ) {
                        await deleteList.mutateAsync({
                          id: list.id,
                          moveToListId: moveTo.id,
                        })
                      } else if (
                        window.confirm(`删除清单及其中 ${count} 个待办？`)
                      ) {
                        await deleteList.mutateAsync({ id: list.id })
                      }
                    } else {
                      await deleteList.mutateAsync({ id: list.id })
                    }
                  }}
                  className="text-status-expired"
                >
                  <Trash2 className="size-4" />
                </button>
                {index > 0 ? (
                  <button
                    type="button"
                    className="text-xs text-text-secondary"
                    onClick={() =>
                      updateList.mutate({
                        id: list.id,
                        sortOrder: lists[index - 1].sortOrder,
                      })
                    }
                  >
                    上移
                  </button>
                ) : null}
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        className="mt-4 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!newName.trim()) return
          await createList.mutateAsync({ name: newName.trim() })
          setNewName('')
        }}
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="新清单名称"
          className={fieldClass}
        />
        <button
          type="submit"
          className="flex shrink-0 items-center gap-1 rounded-button border border-bg-hover px-3 text-sm"
        >
          <Plus className="size-4" />
          添加
        </button>
      </form>
    </div>
  )
}
