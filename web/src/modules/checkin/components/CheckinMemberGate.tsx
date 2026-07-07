import { Link } from 'react-router-dom'
import { useFamilyMembers } from '@/shared/hooks/use-family-members'
import { Button } from '@/components/ui/button'

type CheckinMemberGateProps = {
  children: React.ReactNode
}

export default function CheckinMemberGate({ children }: CheckinMemberGateProps) {
  const { data: members = [], isLoading } = useFamilyMembers()

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        加载中…
      </div>
    )
  }

  if (members.length !== 2) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h2 className="font-[family-name:var(--font-heading)] text-xl font-semibold tracking-tight">
          需要两名家庭成员
        </h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          打卡模块需要恰好两名家庭成员参与。请先在待办模块的管理页配置两名成员后再使用打卡功能。
        </p>
        <Button asChild variant="outline">
          <Link to="/todos/manage">前往待办管理</Link>
        </Button>
      </div>
    )
  }

  return <>{children}</>
}
