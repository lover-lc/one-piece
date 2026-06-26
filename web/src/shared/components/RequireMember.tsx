import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useCurrentMember } from '../hooks/use-current-member'
import { useSeedDefaultMember } from '../hooks/use-family-members'

export default function RequireMember() {
  const { currentMemberId, members, isLoading, setCurrentMemberId } =
    useCurrentMember()
  const seedMember = useSeedDefaultMember()

  useEffect(() => {
    if (isLoading || seedMember.isPending) return
    if (members.length === 0 && !seedMember.isSuccess) {
      void seedMember.mutateAsync()
    }
  }, [isLoading, members.length, seedMember])

  useEffect(() => {
    if (!currentMemberId && members.length > 0) {
      setCurrentMemberId(members[0].id)
    }
  }, [currentMemberId, members, setCurrentMemberId])

  if (isLoading || seedMember.isPending) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-text-secondary">
        加载中…
      </div>
    )
  }

  if (members.length === 0) {
    return <Navigate to="/settings" replace />
  }

  if (!currentMemberId) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-text-secondary">
        加载中…
      </div>
    )
  }

  return <Outlet />
}
