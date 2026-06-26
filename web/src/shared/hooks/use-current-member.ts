import { useMemberStore } from '../store/member-store'
import { useFamilyMembers } from './use-family-members'

export function useCurrentMember() {
  const currentMemberId = useMemberStore((s) => s.currentMemberId)
  const setCurrentMemberId = useMemberStore((s) => s.setCurrentMemberId)
  const { data: members = [], isLoading } = useFamilyMembers()

  const currentMember =
    members.find((m) => m.id === currentMemberId) ?? members[0] ?? null

  return {
    currentMemberId: currentMember?.id ?? null,
    currentMember,
    members,
    isLoading,
    setCurrentMemberId,
  }
}
