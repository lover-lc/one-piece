import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/use-auth'
import { supabase } from '../../../shared/lib/supabase'
import type { CheckinMemberProfile } from '../types/checkin-types'
import type { CheckinActivityLevel, CheckinGender } from '../lib/bmr'

type DbProfile = {
  id: string
  member_id: string
  user_id: string
  height_cm: number | null
  weight_kg: number | null
  gender: string | null
  birth_date: string | null
  activity_level: string | null
  target_kcal: number | null
  target_fat_g: number | null
  target_protein_g: number | null
  target_carbs_g: number | null
  target_exercise_minutes: number | null
  target_water_ml: number | null
  created_at: string
  updated_at: string
}

function toProfile(row: DbProfile): CheckinMemberProfile {
  return {
    id: row.id,
    memberId: row.member_id,
    userId: row.user_id,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    gender: row.gender as CheckinGender | null,
    birthDate: row.birth_date,
    activityLevel: row.activity_level as CheckinActivityLevel | null,
    targetKcal: row.target_kcal,
    targetFatG: row.target_fat_g,
    targetProteinG: row.target_protein_g,
    targetCarbsG: row.target_carbs_g,
    targetExerciseMinutes: row.target_exercise_minutes,
    targetWaterMl: row.target_water_ml,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export type CheckinProfileInput = {
  memberId: string
  heightCm?: number | null
  weightKg?: number | null
  gender?: CheckinGender | null
  birthDate?: string | null
  activityLevel?: CheckinActivityLevel | null
  targetKcal?: number | null
  targetFatG?: number | null
  targetProteinG?: number | null
  targetCarbsG?: number | null
  targetExerciseMinutes?: number | null
  targetWaterMl?: number | null
}

function toDbProfile(input: CheckinProfileInput, userId: string): Record<string, unknown> {
  const row: Record<string, unknown> = {
    member_id: input.memberId,
    user_id: userId,
  }
  if (input.heightCm !== undefined) row.height_cm = input.heightCm
  if (input.weightKg !== undefined) row.weight_kg = input.weightKg
  if (input.gender !== undefined) row.gender = input.gender
  if (input.birthDate !== undefined) row.birth_date = input.birthDate
  if (input.activityLevel !== undefined) row.activity_level = input.activityLevel
  if (input.targetKcal !== undefined) row.target_kcal = input.targetKcal
  if (input.targetFatG !== undefined) row.target_fat_g = input.targetFatG
  if (input.targetProteinG !== undefined) row.target_protein_g = input.targetProteinG
  if (input.targetCarbsG !== undefined) row.target_carbs_g = input.targetCarbsG
  if (input.targetExerciseMinutes !== undefined) {
    row.target_exercise_minutes = input.targetExerciseMinutes
  }
  if (input.targetWaterMl !== undefined) row.target_water_ml = input.targetWaterMl
  return row
}

export function useCheckinProfiles() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['checkin-profiles', session?.user.id],
    enabled: Boolean(session?.user.id && supabase),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('checkin_member_profiles')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: true })

      if (error) throw error
      return (data as DbProfile[]).map(toProfile)
    },
    staleTime: 60_000,
  })
}

export function useUpsertCheckinProfile() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: CheckinProfileInput) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const { data, error } = await supabase
        .from('checkin_member_profiles')
        .upsert(toDbProfile(input, session.user.id), { onConflict: 'member_id' })
        .select()
        .single()

      if (error) throw error
      return toProfile(data as DbProfile)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checkin-profiles'] })
    },
  })
}
