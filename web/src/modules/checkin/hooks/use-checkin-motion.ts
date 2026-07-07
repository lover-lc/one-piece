import { useAppMotion } from '../../../shared/motion/use-app-motion'

const CHECKIN_EXTRAS = {
  enableTodayPulse: true,
  enableWinnerPop: true,
  enableDragSheet: true,
  segmentedLayoutId: true,
  chipEnterY: 8 as number,
}

export function useCheckinMotion() {
  return { ...useAppMotion(), ...CHECKIN_EXTRAS }
}
