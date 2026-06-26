import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from './use-auth'
import { supabase } from '../lib/supabase'

export type FamilyMember = {
  id: string
  userId: string
  name: string
  avatarUrl: string | null
  color: string
  sortOrder: number
  createdAt: string
}

type DbMember = {
  id: string
  user_id: string
  name: string
  avatar_url: string | null
  color: string
  sort_order: number
  created_at: string
}

function toMember(row: DbMember): FamilyMember {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  }
}

export const MEMBER_COLORS = [
  '#2c3e50',
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#9b59b6',
  '#f39c12',
  '#1abc9c',
  '#e91e63',
] as const

export function useFamilyMembers() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['family-members', session?.user.id],
    enabled: Boolean(session?.user.id && supabase),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('todo_family_members')
        .select('*')
        .eq('user_id', session.user.id)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data as DbMember[]).map(toMember)
    },
  })
}

export function useCreateFamilyMember() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const { data: existing } = await supabase
        .from('todo_family_members')
        .select('sort_order')
        .eq('user_id', session.user.id)
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextOrder =
        existing && existing.length > 0
          ? (existing[0] as { sort_order: number }).sort_order + 1
          : 0

      const { data, error } = await supabase
        .from('todo_family_members')
        .insert({
          user_id: session.user.id,
          name: input.name.trim(),
          color: input.color,
          sort_order: nextOrder,
        })
        .select()
        .single()

      if (error) throw error
      return toMember(data as DbMember)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}

export function useUpdateFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      color?: string
      sortOrder?: number
    }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const patch: Record<string, unknown> = {}
      if (input.name !== undefined) patch.name = input.name.trim()
      if (input.color !== undefined) patch.color = input.color
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

      const { data, error } = await supabase
        .from('todo_family_members')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return toMember(data as DbMember)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}

export function useDeleteFamilyMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { error } = await supabase
        .from('todo_family_members')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}

export function useSeedDefaultMember() {
  const { session } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!supabase || !session?.user.id) return null

      const { count, error: countError } = await supabase
        .from('todo_family_members')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', session.user.id)

      if (countError) throw countError
      if (count && count > 0) return null

      const { data, error } = await supabase
        .from('todo_family_members')
        .insert({
          user_id: session.user.id,
          name: '我',
          color: MEMBER_COLORS[0],
          sort_order: 0,
        })
        .select()
        .single()

      if (error) throw error
      return toMember(data as DbMember)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['family-members'] })
    },
  })
}
