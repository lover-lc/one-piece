import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { useFamilyMembers } from '../../../shared/hooks/use-family-members'
import {
  useCreateTodo,
  useCreateTodoList,
  useCreateTodoTag,
  useTodo,
  useTodoLists,
  useTodoTags,
  useUpdateTodo,
} from '../hooks/use-todos'
import type { RecurrenceRule, TodoFormInput, TodoPriority } from '../types/todo-types'

const fieldClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm outline-none focus:border-primary'

export default function TodoFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { currentMemberId } = useCurrentMember()
  const { data: members = [] } = useFamilyMembers()
  const { data: lists = [] } = useTodoLists()
  const { data: tags = [] } = useTodoTags()
  const { data: existing } = useTodo(id)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const createList = useCreateTodoList()
  const createTag = useCreateTodoTag()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listId, setListId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [startDate, setStartDate] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [requireFeedback, setRequireFeedback] = useState(false)
  const [tagIds, setTagIds] = useState<string[]>([])
  const [recurrence, setRecurrence] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none')
  const [reminderOffset, setReminderOffset] = useState<'1h' | '1d' | '1w' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [updateSeries, setUpdateSeries] = useState(false)

  useEffect(() => {
    if (!existing) return
    setTitle(existing.title)
    setDescription(existing.description ?? '')
    setListId(existing.listId)
    setAssigneeId(existing.assigneeId)
    setPriority(existing.priority)
    setStartDate(existing.startDate ?? '')
    setDueDate(existing.dueDate ?? '')
    setRequireFeedback(existing.requireFeedback)
    setTagIds(existing.tags?.map((t) => t.id) ?? [])
    if (existing.recurrenceRule) {
      setRecurrence(existing.recurrenceRule.frequency as typeof recurrence)
    }
  }, [existing])

  useEffect(() => {
    if (!listId && lists.length > 0) setListId(lists[0].id)
    if (!assigneeId && currentMemberId) setAssigneeId(currentMemberId)
  }, [lists, listId, assigneeId, currentMemberId])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError('标题不能为空')
      return
    }
    if (!dueDate) {
      setError('请选择截止日期')
      return
    }
    if (startDate && dueDate < startDate) {
      setError('截止日期不能早于开始日期')
      return
    }
    if (requireFeedback && !assigneeId) {
      setError('需要反馈时必须指定负责人')
      return
    }

    let recurrenceRule: RecurrenceRule | null = null
    if (recurrence !== 'none') {
      recurrenceRule = {
        frequency: recurrence,
        interval: 1,
        endType: 'never',
        generatedCount: 0,
      }
    }

    const input: TodoFormInput = {
      title,
      description,
      listId,
      assigneeId,
      priority,
      startDate: startDate || undefined,
      dueDate,
      requireFeedback,
      recurrenceRule,
      tagIds,
      reminderOffset,
    }

    try {
      if (isEdit && id) {
        await updateTodo.mutateAsync({
          id,
          patch: input,
          updateRecurrenceSeries: updateSeries,
        })
        navigate(`/todos/${id}`)
      } else {
        const created = await createTodo.mutateAsync(input)
        navigate(`/todos/${created.id}`)
      }
    } catch (err) {
      setError(String((err as Error).message || '保存失败'))
    }
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1">
            <ArrowLeft className="size-5 text-text-secondary" />
          </button>
          <h1 className="text-lg font-medium">{isEdit ? '编辑待办' : '新建待办'}</h1>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto max-w-lg space-y-4 p-4">
        <div>
          <label className="mb-1 block text-xs text-text-secondary">标题 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
            required
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">描述</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={fieldClass}
            rows={3}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">所属清单</label>
          <select
            value={listId}
            onChange={(e) => setListId(e.target.value)}
            className={fieldClass}
          >
            {lists.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
          <div className="mt-1 flex gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="快速新建清单"
              className={`${fieldClass} flex-1`}
            />
            <button
              type="button"
              onClick={async () => {
                if (!newListName.trim()) return
                const list = await createList.mutateAsync({ name: newListName })
                setListId(list.id)
                setNewListName('')
              }}
              className="rounded-button border border-bg-hover px-3 text-sm"
            >
              添加
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">负责人 *</label>
          <select
            value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className={fieldClass}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={requireFeedback}
            onChange={(e) => setRequireFeedback(e.target.checked)}
          />
          需要反馈（同意/拒绝 → 完成 → 验收）
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-text-secondary">开始日期</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-text-secondary">截止日期 *</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className={fieldClass}
              required
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">重复</label>
          <select
            value={recurrence}
            onChange={(e) => setRecurrence(e.target.value as typeof recurrence)}
            className={fieldClass}
          >
            <option value="none">不重复</option>
            <option value="daily">每天</option>
            <option value="weekly">每周</option>
            <option value="monthly">每月</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">提醒</label>
          <select
            value={reminderOffset ?? ''}
            onChange={(e) =>
              setReminderOffset((e.target.value || null) as typeof reminderOffset)
            }
            className={fieldClass}
          >
            <option value="">不提醒</option>
            <option value="1h">截止前 1 小时</option>
            <option value="1d">截止前 1 天</option>
            <option value="1w">截止前 1 周</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">优先级</label>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as TodoPriority)}
            className={fieldClass}
          >
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs text-text-secondary">标签</label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <label key={tag.id} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={tagIds.includes(tag.id)}
                  onChange={(e) => {
                    setTagIds((prev) =>
                      e.target.checked
                        ? [...prev, tag.id]
                        : prev.filter((id) => id !== tag.id),
                    )
                  }}
                />
                {tag.name}
              </label>
            ))}
          </div>
          <div className="mt-1 flex gap-2">
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="快速新建标签"
              className={`${fieldClass} flex-1`}
            />
            <button
              type="button"
              onClick={async () => {
                if (!newTagName.trim()) return
                const tag = await createTag.mutateAsync({ name: newTagName })
                setTagIds((prev) => [...prev, tag.id])
                setNewTagName('')
              }}
              className="rounded-button border border-bg-hover px-3 text-sm"
            >
              添加
            </button>
          </div>
        </div>

        {isEdit && (existing?.recurrenceRule || existing?.parentRecurrenceId) ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={updateSeries}
              onChange={(e) => setUpdateSeries(e.target.checked)}
            />
            此项及后续所有（更新重复规则）
          </label>
        ) : null}

        {error ? <p className="text-sm text-status-expired">{error}</p> : null}

        <button
          type="submit"
          disabled={createTodo.isPending || updateTodo.isPending}
          className="w-full rounded-button bg-primary py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {createTodo.isPending || updateTodo.isPending ? '保存中…' : '保存'}
        </button>
      </form>
    </div>
  )
}
