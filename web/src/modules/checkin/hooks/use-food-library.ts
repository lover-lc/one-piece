import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/use-auth'
import { supabase } from '../../../shared/lib/supabase'
import type { FoodLibraryItem, FoodPreset } from '../types/checkin-types'

type DbFoodLibraryItem = {
  id: string
  user_id: string | null
  name: string
  kcal_per_100g: number
  protein_g_per_100g: number
  fat_g_per_100g: number
  carbs_g_per_100g: number
  created_at: string
  updated_at: string
}

type DbFoodPreset = {
  id: string
  member_id: string
  user_id: string
  food_library_id: string | null
  name: string | null
  kcal_per_100g: number | null
  protein_g_per_100g: number | null
  fat_g_per_100g: number | null
  carbs_g_per_100g: number | null
  sort_order: number
  created_at: string
  updated_at: string
}

function toFoodLibraryItem(row: DbFoodLibraryItem): FoodLibraryItem {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    kcalPer100g: row.kcal_per_100g,
    proteinGPer100g: row.protein_g_per_100g,
    fatGPer100g: row.fat_g_per_100g,
    carbsGPer100g: row.carbs_g_per_100g,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function toFoodPreset(row: DbFoodPreset): FoodPreset {
  return {
    id: row.id,
    memberId: row.member_id,
    userId: row.user_id,
    foodLibraryId: row.food_library_id,
    name: row.name,
    kcalPer100g: row.kcal_per_100g,
    proteinGPer100g: row.protein_g_per_100g,
    fatGPer100g: row.fat_g_per_100g,
    carbsGPer100g: row.carbs_g_per_100g,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type FoodPresetInput = {
  id?: string
  memberId: string
  foodLibraryId?: string | null
  name?: string | null
  kcalPer100g?: number | null
  proteinGPer100g?: number | null
  fatGPer100g?: number | null
  carbsGPer100g?: number | null
  sortOrder?: number
}

function toDbFoodPreset(input: FoodPresetInput, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    member_id: input.memberId,
    user_id: userId,
  }
  if (input.id !== undefined) row.id = input.id
  if (input.foodLibraryId !== undefined) row.food_library_id = input.foodLibraryId
  if (input.name !== undefined) row.name = input.name
  if (input.kcalPer100g !== undefined) row.kcal_per_100g = input.kcalPer100g
  if (input.proteinGPer100g !== undefined) row.protein_g_per_100g = input.proteinGPer100g
  if (input.fatGPer100g !== undefined) row.fat_g_per_100g = input.fatGPer100g
  if (input.carbsGPer100g !== undefined) row.carbs_g_per_100g = input.carbsGPer100g
  if (input.sortOrder !== undefined) row.sort_order = input.sortOrder
  return row
}

export function useFoodLibrary(search?: string) {
  const { session } = useAuth()
  const trimmed = search?.trim() ?? ''

  return useQuery({
    queryKey: ['checkin-food-library', session?.user.id, trimmed],
    enabled: Boolean(session?.user.id && supabase),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      let query = supabase
        .from('checkin_food_library')
        .select('*')
        .or(`user_id.is.null,user_id.eq.${session.user.id}`)
        .order('name', { ascending: true })

      if (trimmed) {
        query = query.ilike('name', `%${trimmed}%`)
      }

      const { data, error } = await query
      if (error) throw error
      return (data as DbFoodLibraryItem[]).map(toFoodLibraryItem)
    },
    staleTime: 60_000,
  })
}

export function useFoodPresets(memberId: string | undefined) {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['checkin-food-presets', session?.user.id, memberId],
    enabled: Boolean(session?.user.id && supabase && memberId),
    queryFn: async () => {
      if (!supabase || !session?.user.id || !memberId) return []

      const { data, error } = await supabase
        .from('checkin_food_presets')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('member_id', memberId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data as DbFoodPreset[]).map(toFoodPreset)
    },
    staleTime: 60_000,
  })
}

export function useUpsertFoodPreset() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: FoodPresetInput) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const row = toDbFoodPreset(input, session.user.id)

      if (input.id) {
        const { data, error } = await supabase
          .from('checkin_food_presets')
          .update(row)
          .eq('id', input.id)
          .select()
          .single()

        if (error) throw error
        return toFoodPreset(data as DbFoodPreset)
      }

      const { data, error } = await supabase
        .from('checkin_food_presets')
        .insert(row)
        .select()
        .single()

      if (error) throw error
      return toFoodPreset(data as DbFoodPreset)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checkin-food-presets'] })
    },
  })
}
