import { ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { useFamilyMembers } from '../../../shared/hooks/use-family-members'
import StatusBadge from '../components/StatusBadge'
import {
  useDeleteTodo,
  useTodo,
  useTodoLists,
  useTodoStatusAction,
  useTodoStatusLogs,
} from '../hooks/use-todos'
import {
  TODO_PRIORITY_LABELS,
  TODO_STATUS_LABELS,
} from '../types/todo-types'

export default function TodoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { currentMemberId } = useCurrentMember()
  const { data: todo, isLoading } = useTodo(id)
  const { data: members = [] } = useFamilyMembers()
  const { data: lists = [] } = useTodoLists()
  const { data: logs = [] } = useTodoStatusLogs(id)
  const statusAction = useTodoStatusAction()
  const deleteTodo = useDeleteTodo()

  const [reason, setReason] = useState('')
  const [showReasonInput, setShowReasonInput] = useState<string | null>(null)

  if (isLoading || !todo) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-text-secondary">
        加载中…
      </div>
    )
  }

  const isCreator = todo.creatorId === currentMemberId
  const isAssignee = todo.assigneeId === currentMemberId
  const creator = members.find((m) => m.id === todo.creatorId)
  const assignee = members.find((m) => m.id === todo.assigneeId)
  const list = lists.find((l) => l.id === todo.listId)

  async function handleAction(
    action: 'accept' | 'reject' | 'complete' | 'verify' | 'return',
  ) {
    const needsReason = action === 'reject' || action === 'return'
    if (needsReason && !reason.trim()) {
      setShowReasonInput(action)
      return
    }

    const role = action === 'verify' || action === 'return' ? 'creator' : 'assignee'
    await statusAction.mutateAsync({
      id: todo!.id,
      action,
      reason: reason.trim() || undefined,
      role,
      currentStatus: todo!.status,
    })
    setReason('')
    setShowReasonInput(null)
  }

  return (
    <div className="min-h-dvh bg-bg pb-8">
      <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-button p-1 text-text-secondary hover:bg-bg-hover"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="flex-1 truncate text-lg font-medium">待办详情</h1>
          {isCreator ? (
            <Link to={`/todos/${todo.id}/edit`} className="p-1 text-text-secondary">
              <Pencil className="size-5" />
            </Link>
          ) : null}
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-medium">{todo.title}</h2>
            <StatusBadge status={todo.status} />
          </div>
          {todo.description ? (
            <p className="mt-2 text-sm text-text-secondary">{todo.description}</p>
          ) : null}
        </div>

        <section className="rounded-card border border-bg-hover bg-bg-card p-4 text-sm">
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-text-secondary">创建人</dt>
              <dd>{creator?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">负责人</dt>
              <dd>{assignee?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">清单</dt>
              <dd>{list?.name ?? '—'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">优先级</dt>
              <dd>{TODO_PRIORITY_LABELS[todo.priority]}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-secondary">需要反馈</dt>
              <dd>{todo.requireFeedback ? '是' : '否'}</dd>
            </div>
            {todo.startDate ? (
              <div className="flex justify-between">
                <dt className="text-text-secondary">开始日期</dt>
                <dd>{todo.startDate}</dd>
              </div>
            ) : null}
            {todo.dueDate ? (
              <div className="flex justify-between">
                <dt className="text-text-secondary">截止日期</dt>
                <dd>{todo.dueDate}</dd>
              </div>
            ) : null}
            {todo.recurrenceRule ? (
              <div className="flex justify-between">
                <dt className="text-text-secondary">重复</dt>
                <dd>
                  每{todo.recurrenceRule.interval}
                  {todo.recurrenceRule.frequency === 'daily'
                    ? '天'
                    : todo.recurrenceRule.frequency === 'weekly'
                      ? '周'
                      : '月'}
                </dd>
              </div>
            ) : null}
          </dl>
        </section>

        {todo.tags && todo.tags.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {todo.tags.map((tag) => (
              <span
                key={tag.id}
                className="rounded-full px-2 py-0.5 text-xs"
                style={{ backgroundColor: `${tag.color}22`, color: tag.color }}
              >
                {tag.name}
              </span>
            ))}
          </div>
        ) : null}

        {showReasonInput ? (
          <div className="space-y-2">
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请填写理由"
              className="w-full rounded-button border border-bg-hover bg-bg-card p-3 text-sm outline-none focus:border-primary"
              rows={3}
            />
            <button
              type="button"
              onClick={() =>
                void handleAction(showReasonInput as 'reject' | 'return')
              }
              className="w-full rounded-button bg-primary py-2 text-sm text-white"
            >
              确认
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {isAssignee && todo.status === 'pending_accept' ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleAction('accept')}
                  className="rounded-button bg-status-active px-4 py-2 text-sm text-white"
                >
                  同意
                </button>
                <button
                  type="button"
                  onClick={() => setShowReasonInput('reject')}
                  className="rounded-button border border-status-expired px-4 py-2 text-sm text-status-expired"
                >
                  拒绝
                </button>
              </>
            ) : null}
            {isAssignee &&
            ['accepted', 'in_progress', 'returned'].includes(todo.status) ? (
              <button
                type="button"
                onClick={() => void handleAction('complete')}
                className="rounded-button bg-primary px-4 py-2 text-sm text-white"
              >
                标记完成
              </button>
            ) : null}
            {isCreator && todo.status === 'pending_review' ? (
              <>
                <button
                  type="button"
                  onClick={() => void handleAction('verify')}
                  className="rounded-button bg-status-active px-4 py-2 text-sm text-white"
                >
                  验收通过
                </button>
                <button
                  type="button"
                  onClick={() => setShowReasonInput('return')}
                  className="rounded-button border border-status-expiring px-4 py-2 text-sm text-status-expiring"
                >
                  驳回
                </button>
              </>
            ) : null}
            {isCreator ? (
              <button
                type="button"
                onClick={async () => {
                  if (todo.recurrenceRule || todo.parentRecurrenceId) {
                    const series = window.confirm('删除所有重复实例？取消则仅删除此项')
                    await deleteTodo.mutateAsync({ id: todo.id, deleteSeries: series })
                  } else {
                    await deleteTodo.mutateAsync({ id: todo.id })
                  }
                  navigate('/todos')
                }}
                className="flex items-center gap-1 rounded-button border border-bg-hover px-4 py-2 text-sm text-status-expired"
              >
                <Trash2 className="size-4" />
                删除
              </button>
            ) : null}
          </div>
        )}

        {logs.length > 0 ? (
          <section>
            <h3 className="mb-2 text-sm font-medium text-text-secondary">状态历史</h3>
            <ul className="space-y-2 border-l-2 border-bg-hover pl-4">
              {logs.map((log) => {
                const operator = members.find((m) => m.id === log.operatorId)
                return (
                  <li key={log.id} className="text-sm">
                    <p className="text-text-tertiary text-xs">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                    <p>
                      {operator?.name}：{' '}
                      {log.fromStatus ? TODO_STATUS_LABELS[log.fromStatus] : '新建'} →{' '}
                      {TODO_STATUS_LABELS[log.toStatus]}
                    </p>
                    {log.reason ? (
                      <p className="text-text-secondary">理由：{log.reason}</p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </section>
        ) : null}
      </main>
    </div>
  )
}
