import { motion } from 'framer-motion'
import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useAppMotion } from '../../motion/use-app-motion'

type AppPressableProps = {
  children: ReactNode
  className?: string
  style?: CSSProperties
  as?: 'button' | 'div'
  type?: 'button' | 'submit' | 'reset'
  onClick?: MouseEventHandler<HTMLButtonElement & HTMLDivElement>
  disabled?: boolean
  'aria-label'?: string
}

export default function AppPressable({
  children,
  className,
  style,
  as = 'button',
  type = 'button',
  onClick,
  disabled,
  'aria-label': ariaLabel,
}: AppPressableProps) {
  const { pressScale, spring } = useAppMotion()
  const tap = pressScale < 1 ? { scale: pressScale } : undefined

  if (as === 'div') {
    return (
      <motion.div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={ariaLabel}
        aria-disabled={disabled || undefined}
        className={cn(className, disabled && 'pointer-events-none opacity-50')}
        style={style}
        whileTap={disabled ? undefined : tap}
        transition={spring}
        onClick={disabled ? undefined : onClick}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <motion.button
      type={type}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cn(className)}
      style={style}
      whileTap={disabled ? undefined : tap}
      transition={spring}
      onClick={onClick}
    >
      {children}
    </motion.button>
  )
}
