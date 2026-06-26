import { ArrowLeft, Bell, BellOff, LogOut, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/hooks/use-auth'
import {
  MEMBER_COLORS,
  useCreateFamilyMember,
  useDeleteFamilyMember,
  useFamilyMembers,
  useUpdateFamilyMember,
} from '../../../shared/hooks/use-family-members'
import { useMemberStore } from '../../../shared/store/member-store'
import { usePushSubscription } from '../../todos/hooks/use-push-subscription'

const fieldClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm outline-none focus:border-primary'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: members = [] } = useFamilyMembers()
  const createMember = useCreateFamilyMember()
  const updateMember = useUpdateFamilyMember()
  const deleteMember = useDeleteFamilyMember()
  const setCurrentMemberId = useMemberStore((s) => s.setCurrentMemberId)
  const { isSupported, permission, subscribe, unsubscribe } = usePushSubscription()

  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState<string>(MEMBER_COLORS[0])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState<string>(MEMBER_COLORS[0])

  async function handleAddMember(event: React.FormEvent) {
    event.preventDefault()
    if (!newName.trim()) return
    await createMember.mutateAsync({ name: newName.trim(), color: newColor })
    setNewName('')
  }

  async function handleSignOut() {
    setCurrentMemberId(null)
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-dvh bg-bg">
      <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="mx-auto flex max-w-lg items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-button p-1 text-text-secondary hover:bg-bg-hover"
            aria-label="返回"
          >
            <ArrowLeft className="size-5" />
          </button>
          <h1 className="text-lg font-medium text-text">设置</h1>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 p-4">
        <section>
          <h2 className="mb-3 text-sm font-medium text-text-secondary">家庭成员</h2>
          <ul className="space-y-2">
            {members.map((member) => (
              <li
                key={member.id}
                className="flex items-center gap-3 rounded-card border border-bg-hover bg-bg-card p-3"
              >
                {editingId === member.id ? (
                  <form
                    className="flex flex-1 flex-wrap items-center gap-2"
                    onSubmit={async (e) => {
                      e.preventDefault()
                      await updateMember.mutateAsync({
                        id: member.id,
                        name: editName,
                        color: editColor,
                      })
                      setEditingId(null)
                    }}
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className={fieldClass}
                    />
                    <div className="flex gap-1">
                      {MEMBER_COLORS.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={`size-6 rounded-full ${editColor === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                          style={{ backgroundColor: c }}
                          onClick={() => setEditColor(c)}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      className="rounded-button bg-primary px-3 py-1 text-sm text-white"
                    >
                      保存
                    </button>
                  </form>
                ) : (
                  <>
                    <span
                      className="size-8 shrink-0 rounded-full"
                      style={{ backgroundColor: member.color }}
                    />
                    <span className="flex-1 text-sm">{member.name}</span>
                    <button
                      type="button"
                      className="text-xs text-primary"
                      onClick={() => {
                        setEditingId(member.id)
                        setEditName(member.name)
                        setEditColor(member.color)
                      }}
                    >
                      编辑
                    </button>
                    {members.length > 1 ? (
                      <button
                        type="button"
                        className="text-status-expired"
                        onClick={() => deleteMember.mutate(member.id)}
                        aria-label="删除"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>

          <form onSubmit={handleAddMember} className="mt-3 space-y-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="新成员名称"
              className={fieldClass}
            />
            <div className="flex gap-1">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`size-6 rounded-full ${newColor === c ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={createMember.isPending}
              className="flex w-full items-center justify-center gap-1 rounded-button border border-bg-hover py-2 text-sm"
            >
              <Plus className="size-4" />
              添加成员
            </button>
          </form>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-text-secondary">通知</h2>
          <div className="rounded-card border border-bg-hover bg-bg-card p-4">
            {!isSupported ? (
              <p className="text-sm text-text-secondary">当前浏览器不支持推送通知</p>
            ) : (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm">
                  {permission === 'granted' ? (
                    <Bell className="size-4 text-status-active" />
                  ) : (
                    <BellOff className="size-4 text-text-secondary" />
                  )}
                  浏览器推送通知
                </div>
                {permission === 'granted' ? (
                  <button
                    type="button"
                    onClick={() => void unsubscribe()}
                    className="text-sm text-text-secondary"
                  >
                    关闭
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void subscribe()}
                    className="text-sm text-primary"
                  >
                    启用
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            className="flex w-full items-center justify-center gap-2 rounded-button border border-bg-hover py-2.5 text-sm text-status-expired"
          >
            <LogOut className="size-4" />
            退出登录
          </button>
        </section>

        <p className="text-center text-xs text-text-tertiary">
          <Link to="/portal" className="text-primary">
            返回门户
          </Link>
        </p>
      </main>
    </div>
  )
}
