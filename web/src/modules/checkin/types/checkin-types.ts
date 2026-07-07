import type { CheckinActivityLevel, CheckinGender } from '../lib/bmr'

export type CheckinRecordType = 'diet' | 'exercise' | 'water'
export type CheckinRecordSource = 'manual' | 'healthkit'

export type CheckinMemberProfile = {
  id: string
  memberId: string
  userId: string
  heightCm: number | null
  weightKg: number | null
  gender: CheckinGender | null
  birthDate: string | null
  activityLevel: CheckinActivityLevel | null
  targetKcal: number | null
  targetFatG: number | null
  targetProteinG: number | null
  targetCarbsG: number | null
  targetExerciseMinutes: number | null
  targetWaterMl: number | null
  createdAt: string
  updatedAt: string
}

export type DietPayload = {
  foodId?: string | null
  name: string
  calories: number
  protein: number
  fat: number
  carbs: number
  amount?: string | null
  g: number
}

export type ExercisePayload = {
  name: string
  value: number
  unit: string
  presetId?: string | null
}

export type WaterPayload = {
  name: string
  ml: number
  presetId?: string | null
  iconKey?: string | null
}

export type CheckinRecordPayload = DietPayload | ExercisePayload | WaterPayload

export type CheckinRecord = {
  id: string
  userId: string
  memberId: string
  recordType: CheckinRecordType
  recordedAt: string
  slotDate: string
  payload: CheckinRecordPayload
  source: CheckinRecordSource
  healthkitUuid: string | null
  createdAt: string
  updatedAt: string
}

export type DailySnapshot = {
  id: string
  snapshotDate: string
  memberId: string
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
  lockedAt: string
}

export type DailyDuel = {
  snapshotDate: string
  dietWinnerMemberId: string | null
  exerciseWinnerMemberId: string | null
  waterWinnerMemberId: string | null
  lockedAt: string
}

export type FoodLibraryItem = {
  id: string
  userId: string | null
  name: string
  kcalPer100g: number
  proteinGPer100g: number
  fatGPer100g: number
  carbsGPer100g: number
  createdAt: string
  updatedAt: string
}

export type FoodPreset = {
  id: string
  memberId: string
  userId: string
  foodLibraryId: string | null
  name: string | null
  kcalPer100g: number | null
  proteinGPer100g: number | null
  fatGPer100g: number | null
  carbsGPer100g: number | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type ExercisePreset = {
  id: string
  memberId: string
  userId: string
  name: string
  unit: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type DrinkPreset = {
  id: string
  memberId: string
  userId: string
  name: string
  defaultMl: number
  iconKey: string | null
  sortOrder: number
  createdAt: string
  updatedAt: string
}
