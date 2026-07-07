import type { Transition, Variants } from 'framer-motion'

export type PageTransitionMode = 'slide' | 'fade' | 'none'

export type AppMotionPreset = {
  pageTransition: PageTransitionMode
  pressScale: number
  spring: Transition
  gentle: Transition
  sheetSpring: Transition
  enableDragSheet: boolean
}

const DEFAULT_SPRING = { type: 'spring' as const, stiffness: 360, damping: 30, mass: 0.85 }

export const APP_MOTION: AppMotionPreset = {
  pageTransition: 'fade',
  pressScale: 0.96,
  spring: DEFAULT_SPRING,
  gentle: DEFAULT_SPRING,
  sheetSpring: DEFAULT_SPRING,
  enableDragSheet: true,
}

export const INSTANT: Transition = { duration: 0 }

export function pageTransitionVariants(
  mode: PageTransitionMode,
  reduced: boolean,
): Variants {
  if (reduced || mode === 'none') {
    return {
      initial: { opacity: 1, x: 0 },
      animate: { opacity: 1, x: 0 },
      exit: { opacity: 1, x: 0 },
    }
  }
  if (mode === 'fade') {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    }
  }
  return {
    initial: { opacity: 0.92, x: 24 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0.92, x: -24 },
  }
}
