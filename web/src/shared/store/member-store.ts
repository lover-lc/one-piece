import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type MemberStore = {
  currentMemberId: string | null
  setCurrentMemberId: (id: string | null) => void
}

export const useMemberStore = create<MemberStore>()(
  persist(
    (set) => ({
      currentMemberId: null,
      setCurrentMemberId: (id) => set({ currentMemberId: id }),
    }),
    { name: 'current-member' },
  ),
)
