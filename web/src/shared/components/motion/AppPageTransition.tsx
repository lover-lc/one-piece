import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { pageTransitionVariants } from '../../motion/app-motion'
import { useAppMotion } from '../../motion/use-app-motion'

export default function AppPageTransition({ children }: { children: ReactNode }) {
  const location = useLocation()
  const { pageTransition, spring, reducedMotion } = useAppMotion()
  const variants = pageTransitionVariants(pageTransition, reducedMotion)

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        transition={spring}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
