import { useMemo } from 'react'
import { useFamilyMembers } from '@/shared/hooks/use-family-members'
import MonthlyCalendar from '../components/calendar/MonthlyCalendar'

export default function CheckinOverviewPage() {
  const { data: membersRaw = [], isLoading } = useFamilyMembers()

  const members = useMemo(
    () => [...membersRaw].sort((a, b) => a.sortOrder - b.sortOrder).slice(0, 2),
    [membersRaw],
  )
  const memberA = members[0]
  const memberB = members[1]

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-2">
      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          加载中…
        </div>
      ) : !memberA || !memberB ? (
        <div className="flex flex-1 items-center justify-center rounded-card border border-dashed border-border bg-card/50 p-6 text-center text-sm text-muted-foreground">
          需要两名家庭成员
        </div>
      ) : (
        <MonthlyCalendar memberA={memberA} memberB={memberB} />
      )}
    </div>
  )
}
