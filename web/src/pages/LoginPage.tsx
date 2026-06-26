import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

const fieldInputClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2.5 text-sm text-text outline-none focus:border-primary'

export default function LoginPage() {
  const { session, isLoading, isConfigured, householdEmail, signIn } = useAuth()
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isLoading && session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)

    if (!password.trim()) {
      setError('请输入密码')
      return
    }

    setIsSubmitting(true)
    try {
      await signIn(password.trim())
    } catch (err) {
      const message =
        err instanceof Error && err.message.includes('Invalid login credentials')
          ? '密码错误，请重试'
          : String((err as Error)?.message || '登录失败')
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <div className="flex flex-1 flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          <h1 className="text-center text-2xl font-medium text-text">物品整理</h1>
          <p className="mt-2 text-center text-sm text-text-secondary">
            请输入家庭密码以继续使用
          </p>

          {!isConfigured ? (
            <p className="mt-8 rounded-card bg-bg-card px-4 py-3 text-sm text-text-secondary">
              未配置 Supabase。请在本地创建 <code className="text-text">web/.env.local</code>{' '}
              并填写 URL 与 Publishable Key。
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="household-email"
                  className="mb-1 block text-xs text-text-secondary"
                >
                  账号
                </label>
                <input
                  id="household-email"
                  type="email"
                  value={householdEmail}
                  readOnly
                  className={`${fieldInputClass} bg-bg-hover text-text-secondary`}
                />
              </div>

              <div>
                <label
                  htmlFor="household-password"
                  className="mb-1 block text-xs text-text-secondary"
                >
                  密码
                </label>
                <input
                  id="household-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldInputClass}
                  placeholder="家庭密码"
                  disabled={isSubmitting || isLoading}
                />
              </div>

              {error ? (
                <p role="alert" className="text-sm text-status-expired">
                  {error}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting || isLoading}
                className="w-full rounded-button bg-primary px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting || isLoading ? '登录中…' : '登录'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
