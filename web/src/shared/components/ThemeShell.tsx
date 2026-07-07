import { useMemo, type ReactNode } from 'react'
import { useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'

export type AppTheme = 'auth' | 'portal' | 'items' | 'todos' | 'checkin'

export function themeFromPathname(pathname: string): AppTheme {
  if (pathname.startsWith('/login')) return 'auth'
  if (pathname.startsWith('/items')) return 'items'
  if (pathname.startsWith('/todos')) return 'todos'
  if (pathname.startsWith('/checkin')) return 'checkin'
  return 'portal'
}

type ThemeShellProps = {
  children: ReactNode
  className?: string
}

export default function ThemeShell({ children, className }: ThemeShellProps) {
  const { pathname } = useLocation()
  const theme = useMemo(() => themeFromPathname(pathname), [pathname])

  return (
    <div
      data-theme={theme}
      className={cn('min-h-dvh bg-background text-foreground font-sans', className)}
    >
      {children}
    </div>
  )
}
