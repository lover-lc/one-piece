export type EnergyUnit = 'kcal' | 'kj'

/** 1 kcal = 4.184 kJ (食品营养标签通用换算) */
export const KJ_PER_KCAL = 4.184

export function roundEnergy(n: number): number {
  return Math.round(n * 10) / 10
}

export function kcalToKj(kcal: number): number {
  return roundEnergy(kcal * KJ_PER_KCAL)
}

export function kjToKcal(kj: number): number {
  return roundEnergy(kj / KJ_PER_KCAL)
}

export function parseEnergyInput(value: string, unit: EnergyUnit): number | null {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return null
  return unit === 'kcal' ? roundEnergy(n) : kjToKcal(n)
}

export function formatEnergyInput(kcal: number, unit: EnergyUnit): string {
  if (unit === 'kj') return String(kcalToKj(kcal))
  return String(roundEnergy(kcal))
}

export function convertEnergyInput(value: string, from: EnergyUnit, to: EnergyUnit): string {
  if (!value.trim() || from === to) return value
  const kcal = parseEnergyInput(value, from)
  if (kcal == null) return value
  return formatEnergyInput(kcal, to)
}
