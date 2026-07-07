import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/use-auth'
import { supabase } from '../../../shared/lib/supabase'
import type { DailyDuel, DailySnapshot } from '../types/checkin-types'

type DbSnapshot = {
  id: string
  snapshot_date: string
  member_id: string
  diet_actual_kcal: number
  diet_target_kcal: number
  diet_rate: number
  diet_over_limit: boolean
  exercise_actual: number
  exercise_target: number
  exercise_rate: number
  water_actual_ml: number
  water_target_ml: number
  water_rate: number
  locked_at: string
}

type DbDuel = {
  snapshot_date: string
  diet_winner_member_id: string | null
  exercise_winner_member_id: string | null
  water_winner_member_id: string | null
  locked_at: string
}

function toSnapshot(row: DbSnapshot): DailySnapshot {
  return {
    id: row.id,
    snapshotDate: row.snapshot_date,
    memberId: row.member_id,
    dietActualKcal: row.diet_actual_kcal,
    dietTargetKcal: row.diet_target_kcal,
    dietRate: row.diet_rate,
    dietOverLimit: row.diet_over_limit,
    exerciseActual: row.exercise_actual,
    exerciseTarget: row.exercise_target,
    exerciseRate: row.exercise_rate,
    waterActualMl: row.water_actual_ml,
    waterTargetMl: row.water_target_ml,
    waterRate: row.water_rate,
    lockedAt: row.locked_at,
  }
}

function toDuel(row: DbDuel): DailyDuel {
  return {
    snapshotDate: row.snapshot_date,
    dietWinnerMemberId: row.diet_winner_member_id,
    exerciseWinnerMemberId: row.exercise_winner_member_id,
    waterWinnerMemberId: row.water_winner_member_id,
    lockedAt: row.locked_at,
  }
}

export function useDailySnapshots(filters: { from: string; to: string }) {
  const { session } = useAuth()
  const { from, to } = filters

  return useQuery({
    queryKey: ['checkin-daily-snapshots', session?.user.id, from, to],
    enabled: Boolean(session?.user.id && supabase && from && to),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('checkin_daily_snapshots')
        .select('*')
        .gte('snapshot_date', from)
        .lte('snapshot_date', to)
        .order('snapshot_date', { ascending: true })

      if (error) throw error
      return (data as DbSnapshot[]).map(toSnapshot)
    },
    staleTime: 60_000,
  })
}

export function useDailyDuels(filters: { from: string; to: string }) {
  const { session } = useAuth()
  const { from, to } = filters

  return useQuery({
    queryKey: ['checkin-daily-duels', session?.user.id, from, to],
    enabled: Boolean(session?.user.id && supabase && from && to),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('checkin_daily_duels')
        .select('*')
        .gte('snapshot_date', from)
        .lte('snapshot_date', to)
        .order('snapshot_date', { ascending: true })

      if (error) throw error
      return (data as DbDuel[]).map(toDuel)
    },
    staleTime: 60_000,
  })
}
