import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/use-auth'

export default function RequireAuth() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-text-secondary">
        加载中…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
