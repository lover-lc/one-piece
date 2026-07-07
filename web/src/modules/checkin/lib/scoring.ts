export type CompareResult = 'a' | 'b' | 'tie'

type ResolveDimensionWinnerOptions = {
  dimension?: 'diet' | 'goal'
  overA?: boolean
  overB?: boolean
  missingA?: boolean
  missingB?: boolean
}

function normalizeRate(rate: number | null | undefined): number | null {
  if (rate == null) {
    return null
  }
  return rate
}

function compareNumericRates(
  rateA: number | null | undefined,
  rateB: number | null | undefined,
): CompareResult | null {
  const normalizedA = normalizeRate(rateA)
  const normalizedB = normalizeRate(rateB)

  if (normalizedA == null && normalizedB == null) {
    return null
  }

  const a = normalizedA ?? 0
  const b = normalizedB ?? 0

  if (a > b) return 'a'
  if (b > a) return 'b'
  return 'tie'
}

export function compareDietRates(
  rateA: number | null | undefined,
  rateB: number | null | undefined,
  overA: boolean,
  overB: boolean,
): CompareResult | null {
  const normalizedA = normalizeRate(rateA)
  const normalizedB = normalizeRate(rateB)

  if (normalizedA == null && normalizedB == null) {
    return null
  }

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

export function compareGoalRates(
  rateA: number | null | undefined,
  rateB: number | null | undefined,
): CompareResult {
  return compareNumericRates(rateA, rateB) ?? 'tie'
}

export function resolveDimensionWinner(
  memberAId: string,
  memberBId: string,
  rateA: number | null | undefined,
  rateB: number | null | undefined,
  options: ResolveDimensionWinnerOptions = {},
): { winnerId: string | null; result: CompareResult } {
  const { dimension = 'goal', overA = false, overB = false, missingA = false, missingB = false } =
    options

  if (missingA && missingB) {
    return { winnerId: null, result: 'tie' }
  }
  if (missingA && !missingB) {
    return { winnerId: memberBId, result: 'b' }
  }
  if (!missingA && missingB) {
    return { winnerId: memberAId, result: 'a' }
  }

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
