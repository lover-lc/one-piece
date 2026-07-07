import type {
  CheckinMemberProfile,
  CheckinRecord,
  DailySnapshot,
  DietPayload,
  ExercisePayload,
  WaterPayload,
} from '../types/checkin-types'

export type MemberDayRates = {
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

export function goalRate(actual: number, target: number | null | undefined): number {
  if (!target || target <= 0) {
    return actual > 0 ? 100 : 0
  }
  return (actual / target) * 100
}

function aggregateMemberRecords(records: CheckinRecord[], memberId: string) {
  let dietActualKcal = 0
  let exerciseActual = 0
  let waterActualMl = 0

  for (const record of records) {
    if (record.memberId !== memberId) continue
    if (record.recordType === 'diet') {
      dietActualKcal += (record.payload as DietPayload).calories
    } else if (record.recordType === 'exercise') {
      exerciseActual += (record.payload as ExercisePayload).value
    } else if (record.recordType === 'water') {
      waterActualMl += (record.payload as WaterPayload).ml
    }
  }

  return { dietActualKcal, exerciseActual, waterActualMl }
}

export function computeMemberDayRates(
  records: CheckinRecord[],
  memberId: string,
  profile: CheckinMemberProfile | null | undefined,
): MemberDayRates {
  const { dietActualKcal, exerciseActual, waterActualMl } = aggregateMemberRecords(
    records,
    memberId,
  )

  const dietTargetKcal = profile?.targetKcal ?? 0
  const exerciseTarget = profile?.targetExerciseMinutes ?? 0
  const waterTargetMl = profile?.targetWaterMl ?? 0

  const dietRate = goalRate(dietActualKcal, dietTargetKcal)
  const exerciseRate = goalRate(exerciseActual, exerciseTarget)
  const waterRate = goalRate(waterActualMl, waterTargetMl)

  return {
    dietActualKcal,
    dietTargetKcal,
    dietRate,
    dietOverLimit: dietTargetKcal > 0 && dietActualKcal > dietTargetKcal,
    exerciseActual,
    exerciseTarget,
    exerciseRate,
    waterActualMl,
    waterTargetMl,
    waterRate,
  }
}

export function memberDayRatesFromSnapshot(snapshot: DailySnapshot): MemberDayRates {
  return {
    dietActualKcal: snapshot.dietActualKcal,
    dietTargetKcal: snapshot.dietTargetKcal,
    dietRate: snapshot.dietRate,
    dietOverLimit: snapshot.dietOverLimit,
    exerciseActual: snapshot.exerciseActual,
    exerciseTarget: snapshot.exerciseTarget,
    exerciseRate: snapshot.exerciseRate,
    waterActualMl: snapshot.waterActualMl,
    waterTargetMl: snapshot.waterTargetMl,
    waterRate: snapshot.waterRate,
  }
}

export function addDays(dateStr: string, days: number): string {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

export function generateDateRange(from: string, to: string): string[] {
  if (from > to) return []
  const dates: string[] = []
  let current = from
  while (current <= to) {
    dates.push(current)
    current = addDays(current, 1)
  }
  return dates
}

export function formatMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split('-')
  return `${year}年${Number(month)}月`
}

export function formatDayLabel(dateStr: string, today: string): string {
  const [, month, day] = dateStr.split('-')
  if (dateStr === today) return '今天'
  return `${Number(month)}/${Number(day)}`
}
