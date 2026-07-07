import type { Variants } from 'framer-motion'
export {
  APP_MOTION,
  INSTANT,
  pageTransitionVariants,
  type PageTransitionMode,
} from '../../../shared/motion/app-motion'

export function monthSwipeVariants(reduced: boolean): Variants {
  if (reduced) {
    return {
      enter: { opacity: 1, x: 0 },
      center: { opacity: 1, x: 0 },
      exit: { opacity: 1, x: 0 },
    }
  }
  return {
    enter: (dir: number) => ({ x: dir > 0 ? '100%' : '-100%', opacity: 0.6 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? '-100%' : '100%', opacity: 0.6 }),
  }
}
