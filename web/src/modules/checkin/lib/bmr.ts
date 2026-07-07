export type CheckinGender = 'male' | 'female'
export type CheckinActivityLevel = 'sedentary' | 'light' | 'moderate' | 'heavy'

const ACTIVITY_MULTIPLIERS: Record<CheckinActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  heavy: 1.725,
}

type BmrInput = {
  weightKg: number
  heightCm: number
  gender: CheckinGender
  birthDate: string
}

function ageFromBirthDate(birthDate: string, asOf: Date = new Date()): number {
  const [year, month, day] = birthDate.split('-').map(Number)
  const birthdayThisYear = new Date(asOf.getFullYear(), month - 1, day)
  let age = asOf.getFullYear() - year
  if (asOf < birthdayThisYear) {
    age -= 1
  }
  return age
}

export function calcBmrMifflinStJeor({
  weightKg,
  heightCm,
  gender,
  birthDate,
}: BmrInput): number {
  const age = ageFromBirthDate(birthDate)
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(gender === 'male' ? base + 5 : base - 161)
}

export function calcDailyKcalTarget(
  bmr: number,
  activityLevel: CheckinActivityLevel,
): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activityLevel])
}
