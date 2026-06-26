import { ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'

export default function MemberSwitcher() {
  const { currentMember, members, setCurrentMemberId } = useCurrentMember()
  const [open, setOpen] = useState(false)

  if (!currentMember) return null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-button border border-bg-hover bg-bg-card px-3 py-1.5 text-sm"
      >
        <span
          className="size-6 shrink-0 rounded-full"
          style={{ backgroundColor: currentMember.color }}
          aria-hidden
        />
        <span className="max-w-[6rem] truncate">{currentMember.name}</span>
        <ChevronDown className="size-4 text-text-secondary" />
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="关闭"
            onClick={() => setOpen(false)}
          />
          <ul className="absolute left-0 top-full z-50 mt-1 min-w-[10rem] rounded-card border border-bg-hover bg-bg-card py-1 shadow-lg">
            {members.map((member) => (
              <li key={member.id}>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentMemberId(member.id)
                    setOpen(false)
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-bg-hover"
                >
                  <span
                    className="size-5 shrink-0 rounded-full"
                    style={{ backgroundColor: member.color }}
                    aria-hidden
                  />
                  {member.name}
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </div>
  )
}
