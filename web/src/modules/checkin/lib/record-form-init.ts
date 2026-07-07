import { formatEnergyInput } from './energy-units'
import type {
  CheckinRecord,
  DietPayload,
  ExercisePayload,
  WaterPayload,
} from '../types/checkin-types'

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function per100gFromDietPayload(payload: DietPayload) {
  if (!payload.g || payload.g <= 0) return null
  const factor = 100 / payload.g
  return {
    kcalPer100g: round1(payload.calories * factor),
    proteinGPer100g: round1(payload.protein * factor),
    fatGPer100g: round1(payload.fat * factor),
    carbsGPer100g: round1(payload.carbs * factor),
  }
}

export function dietRecordToCustomFields(record: CheckinRecord) {
  const payload = record.payload as DietPayload
  const per100g = per100gFromDietPayload(payload)
  return {
    customName: payload.name,
    grams: String(payload.g),
    mealType: payload.amount ?? '',
    customEnergy: per100g ? formatEnergyInput(per100g.kcalPer100g, 'kcal') : '',
    customProtein: per100g ? String(per100g.proteinGPer100g) : '',
    customFat: per100g ? String(per100g.fatGPer100g) : '',
    customCarbs: per100g ? String(per100g.carbsGPer100g) : '',
    foodId: payload.foodId ?? null,
  }
}

export function exerciseRecordToFields(record: CheckinRecord) {
  const payload = record.payload as ExercisePayload
  return {
    name: payload.name,
    minutes: String(payload.value),
  }
}

export function waterRecordToFields(
  record: CheckinRecord,
  presets: { id: string; name: string; ml: number }[],
) {
  const payload = record.payload as WaterPayload
  const matched = presets.find((p) => p.ml === payload.ml && p.name === payload.name)
  if (matched) {
    return {
      mode: 'preset' as const,
      presetId: matched.id,
      customName: payload.name,
      customMl: String(payload.ml),
    }
  }
  const byMl = presets.find((p) => p.ml === payload.ml)
  if (byMl && payload.name === byMl.name) {
    return {
      mode: 'preset' as const,
      presetId: byMl.id,
      customName: payload.name,
      customMl: String(payload.ml),
    }
  }
  return {
    mode: 'custom' as const,
    presetId: presets[0]?.id ?? 'cup',
    customName: payload.name,
    customMl: String(payload.ml),
  }
}
