import { Outlet } from 'react-router-dom'
import CheckinMemberGate from '../CheckinMemberGate'

export default function CheckinModuleLayout() {
  return (
    <CheckinMemberGate>
      <Outlet />
    </CheckinMemberGate>
  )
}
