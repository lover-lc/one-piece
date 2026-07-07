// Cron: 0 16 * * * UTC (= Asia/Shanghai midnight)
// Daily settlement: lock yesterday's records, upsert snapshots and duels.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SHANGHAI_TIMEZONE = 'Asia/Shanghai'

type CompareResult = 'a' | 'b' | 'tie'

type MemberDayRates = {
  dietActualKcal: number
  dietTargetKcal: number
  dietRate: number
  dietOverLimit: boolean
  exerciseActual: number
  exerciseTarget: number
  exerciseRate: number
  waterActualMl: number
  waterTargetMl: number
  waterRate: number
}

type FamilyMember = {
  id: string
  sort_order: number
}

type MemberProfile = {
  member_id: string
  target_kcal: number | null
  target_exercise_minutes: number | null
  target_water_ml: number | null
}

type CheckinRecord = {
  member_id: string
  record_type: 'diet' | 'exercise' | 'water'
  payload: {
    calories?: number
    value?: number
    ml?: number
  }
}

type SettlementResult = {
  snapshotDate: string
  usersProcessed: number
  usersSkipped: number
  errors: number
}

function getShanghaiDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SHANGHAI_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function getShanghaiYesterday(): string {
  const today = getShanghaiDateString()
  const date = new Date(`${today}T12:00:00`)
  date.setDate(date.getDate() - 1)
  return date.toISOString().slice(0, 10)
}

function goalRate(actual: number, target: number | null | undefined): number {
  if (!target || target <= 0) {
    return actual > 0 ? 100 : 0
  }
  return (actual / target) * 100
}

function normalizeRate(rate: number | null | undefined): number | null {
  if (rate == null) return null
  return rate
}

function compareNumericRates(
  rateA: number | null | undefined,
  rateB: number | null | undefined,
): CompareResult | null {
  const normalizedA = normalizeRate(rateA)
  const normalizedB = normalizeRate(rateB)

  if (normalizedA == null && normalizedB == null) return null

  const a = normalizedA ?? 0
  const b = normalizedB ?? 0

  if (a > b) return 'a'
  if (b > a) return 'b'
  return 'tie'
}

function compareDietRates(
  rateA: number | null | undefined,
  rateB: number | null | undefined,
  overA: boolean,
  overB: boolean,
): CompareResult | null {
  const normalizedA = normalizeRate(rateA)
  const normalizedB = normalizeRate(rateB)

  if (normalizedA == null && normalizedB == null) return null

  const a = normalizedA ?? 0
  const b = normalizedB ?? 0

  if (!overA && !overB) {
    if (a > b) return 'a'
    if (b > a) return 'b'
    return 'tie'
  }

  if (overA && !overB) return 'b'
  if (!overA && overB) return 'a'

  const distanceA = Math.abs(a - 100)
  const distanceB = Math.abs(b - 100)
  if (distanceA < distanceB) return 'a'
  if (distanceB < distanceA) return 'b'
  return 'tie'
}

function compareGoalRates(
  rateA: number | null | undefined,
  rateB: number | null | undefined,
): CompareResult {
  return compareNumericRates(rateA, rateB) ?? 'tie'
}

function resolveDimensionWinner(
  memberAId: string,
  memberBId: string,
  rateA: number | null | undefined,
  rateB: number | null | undefined,
  options: {
    dimension?: 'diet' | 'goal'
    overA?: boolean
    overB?: boolean
    missingA?: boolean
    missingB?: boolean
  } = {},
): { winnerId: string | null; result: CompareResult } {
  const {
    dimension = 'goal',
    overA = false,
    overB = false,
    missingA = false,
    missingB = false,
  } = options

  if (missingA && missingB) return { winnerId: null, result: 'tie' }
  if (missingA && !missingB) return { winnerId: memberBId, result: 'b' }
  if (!missingA && missingB) return { winnerId: memberAId, result: 'a' }

  const result =
    dimension === 'diet'
      ? compareDietRates(rateA, rateB, overA, overB)
      : compareGoalRates(rateA, rateB)

  if (result == null || result === 'tie') {
    return { winnerId: null, result: 'tie' }
  }

  return {
    winnerId: result === 'a' ? memberAId : memberBId,
    result,
  }
}

function aggregateMemberRecords(records: CheckinRecord[], memberId: string) {
  let dietActualKcal = 0
  let exerciseActual = 0
  let waterActualMl = 0

  for (const record of records) {
    if (record.member_id !== memberId) continue
    if (record.record_type === 'diet') {
      dietActualKcal += record.payload.calories ?? 0
    } else if (record.record_type === 'exercise') {
      exerciseActual += record.payload.value ?? 0
    } else if (record.record_type === 'water') {
      waterActualMl += record.payload.ml ?? 0
    }
  }

  return { dietActualKcal, exerciseActual, waterActualMl }
}

function computeMemberDayRates(
  records: CheckinRecord[],
  memberId: string,
  profile: MemberProfile | undefined,
): MemberDayRates {
  const { dietActualKcal, exerciseActual, waterActualMl } = aggregateMemberRecords(
    records,
    memberId,
  )

  const dietTargetKcal = profile?.target_kcal ?? 0
  const exerciseTarget = profile?.target_exercise_minutes ?? 0
  const waterTargetMl = profile?.target_water_ml ?? 0

  const dietRate = goalRate(dietActualKcal, dietTargetKcal)
  const exerciseRate = goalRate(exerciseActual, exerciseTarget)
  const waterRate = goalRate(waterActualMl, waterTargetMl)

  return {
    dietActualKcal,
    dietTargetKcal,
    dietRate,
    dietOverLimit: dietRate > 100,
    exerciseActual,
    exerciseTarget,
    exerciseRate,
    waterActualMl,
    waterTargetMl,
    waterRate,
  }
}

async function logSettlementError(
  supabase: SupabaseClient,
  snapshotDate: string,
  errorMessage: string,
  details: Record<string, unknown>,
) {
  await supabase.from('checkin_settlement_logs').insert({
    snapshot_date: snapshotDate,
    error_message: errorMessage,
    details,
  })
}

async function settleUser(
  supabase: SupabaseClient,
  userId: string,
  snapshotDate: string,
  lockedAt: string,
): Promise<void> {
  const { data: members, error: membersError } = await supabase
    .from('todo_family_members')
    .select('id, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })

  if (membersError) throw membersError
  if (!members || members.length !== 2) {
    throw new Error(`Expected exactly 2 family members, found ${members?.length ?? 0}`)
  }

  const [memberA, memberB] = members as FamilyMember[]

  const { data: profiles, error: profilesError } = await supabase
    .from('checkin_member_profiles')
    .select('member_id, target_kcal, target_exercise_minutes, target_water_ml')
    .eq('user_id', userId)

  if (profilesError) throw profilesError
  if (!profiles || profiles.length === 0) {
    throw new Error('No checkin profiles found for user')
  }

  const profileA = (profiles as MemberProfile[]).find((p) => p.member_id === memberA.id)
  const profileB = (profiles as MemberProfile[]).find((p) => p.member_id === memberB.id)

  const { data: records, error: recordsError } = await supabase
    .from('checkin_records')
    .select('member_id, record_type, payload')
    .eq('user_id', userId)
    .eq('slot_date', snapshotDate)

  if (recordsError) throw recordsError

  const dayRecords = (records ?? []) as CheckinRecord[]
  const ratesA = computeMemberDayRates(dayRecords, memberA.id, profileA)
  const ratesB = computeMemberDayRates(dayRecords, memberB.id, profileB)

  const snapshotRows = [
    {
      snapshot_date: snapshotDate,
      member_id: memberA.id,
      diet_actual_kcal: ratesA.dietActualKcal,
      diet_target_kcal: ratesA.dietTargetKcal,
      diet_rate: ratesA.dietRate,
      diet_over_limit: ratesA.dietOverLimit,
      exercise_actual: ratesA.exerciseActual,
      exercise_target: ratesA.exerciseTarget,
      exercise_rate: ratesA.exerciseRate,
      water_actual_ml: ratesA.waterActualMl,
      water_target_ml: ratesA.waterTargetMl,
      water_rate: ratesA.waterRate,
      locked_at: lockedAt,
    },
    {
      snapshot_date: snapshotDate,
      member_id: memberB.id,
      diet_actual_kcal: ratesB.dietActualKcal,
      diet_target_kcal: ratesB.dietTargetKcal,
      diet_rate: ratesB.dietRate,
      diet_over_limit: ratesB.dietOverLimit,
      exercise_actual: ratesB.exerciseActual,
      exercise_target: ratesB.exerciseTarget,
      exercise_rate: ratesB.exerciseRate,
      water_actual_ml: ratesB.waterActualMl,
      water_target_ml: ratesB.waterTargetMl,
      water_rate: ratesB.waterRate,
      locked_at: lockedAt,
    },
  ]

  const { error: snapshotError } = await supabase
    .from('checkin_daily_snapshots')
    .upsert(snapshotRows, { onConflict: 'snapshot_date,member_id' })

  if (snapshotError) throw snapshotError

  const dietWinner = resolveDimensionWinner(
    memberA.id,
    memberB.id,
    ratesA.dietRate,
    ratesB.dietRate,
    {
      dimension: 'diet',
      overA: ratesA.dietOverLimit,
      overB: ratesB.dietOverLimit,
      missingA: !profileA,
      missingB: !profileB,
    },
  )
  const exerciseWinner = resolveDimensionWinner(
    memberA.id,
    memberB.id,
    ratesA.exerciseRate,
    ratesB.exerciseRate,
    { missingA: !profileA, missingB: !profileB },
  )
  const waterWinner = resolveDimensionWinner(
    memberA.id,
    memberB.id,
    ratesA.waterRate,
    ratesB.waterRate,
    { missingA: !profileA, missingB: !profileB },
  )

  const { error: duelError } = await supabase.from('checkin_daily_duels').upsert(
    {
      snapshot_date: snapshotDate,
      diet_winner_member_id: dietWinner.winnerId,
      exercise_winner_member_id: exerciseWinner.winnerId,
      water_winner_member_id: waterWinner.winnerId,
      locked_at: lockedAt,
    },
    { onConflict: 'snapshot_date' },
  )

  if (duelError) throw duelError
}

async function runSettlement(supabase: SupabaseClient): Promise<SettlementResult> {
  const snapshotDate = getShanghaiYesterday()
  const lockedAt = new Date().toISOString()

  const { data: profileUsers, error: profileUsersError } = await supabase
    .from('checkin_member_profiles')
    .select('user_id')

  if (profileUsersError) throw profileUsersError

  const userIds = [...new Set((profileUsers ?? []).map((row) => row.user_id as string))]

  let usersProcessed = 0
  let usersSkipped = 0
  let errors = 0

  for (const userId of userIds) {
    const { count, error: countError } = await supabase
      .from('todo_family_members')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (countError) {
      errors += 1
      await logSettlementError(supabase, snapshotDate, countError.message, {
        userId,
        step: 'count_family_members',
      })
      continue
    }

    if (count !== 2) {
      usersSkipped += 1
      continue
    }

    try {
      await settleUser(supabase, userId, snapshotDate, lockedAt)
      usersProcessed += 1
    } catch (error) {
      errors += 1
      const message = error instanceof Error ? error.message : String(error)
      await logSettlementError(supabase, snapshotDate, message, { userId })
    }
  }

  return { snapshotDate, usersProcessed, usersSkipped, errors }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST' && req.method !== 'GET') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(
      JSON.stringify({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    const result = await runSettlement(supabase)
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const snapshotDate = getShanghaiYesterday()
    const message = error instanceof Error ? error.message : String(error)
    await logSettlementError(supabase, snapshotDate, message, { step: 'run_settlement' })
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
