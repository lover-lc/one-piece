import type { Session } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { HOUSEHOLD_EMAIL } from '../lib/household-auth'
import { hasSupabaseConfig, supabase } from '../lib/supabase'

type AuthContextValue = {
  session: Session | null
  isLoading: boolean
  isConfigured: boolean
  householdEmail: string
  signIn: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }

    let cancelled = false

    supabase.auth.getSession().then(({ data: { session: current } }) => {
      if (cancelled) return
      setSession(current)
      setIsLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setIsLoading(false)
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (password: string) => {
    if (!supabase) {
      throw new Error('未配置 Supabase')
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: HOUSEHOLD_EMAIL,
      password,
    })

    if (error) {
      throw error
    }
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }, [])

  const value = useMemo(
    () => ({
      session,
      isLoading,
      isConfigured: hasSupabaseConfig,
      householdEmail: HOUSEHOLD_EMAIL,
      signIn,
      signOut,
    }),
    [session, isLoading, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
