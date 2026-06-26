import { startOfDay } from '../../../shared/lib/date-utils'

export type ItemStatus = 'active' | 'expiringSoon' | 'expired' | 'usedUp'

export type ItemStatusInput = {
  endDate: Date | null | undefined
  expiryDate: Date | null | undefined
  today: Date
}

export function getItemStatus(input: ItemStatusInput): ItemStatus {
  if (input.endDate != null) {
    return 'usedUp'
  }

  if (input.expiryDate != null) {
    const expiryDay = startOfDay(input.expiryDate)
    const today = startOfDay(input.today)

    if (expiryDay < today) {
      return 'expired'
    }

    const sevenDaysLater = new Date(today)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    if (expiryDay >= today && expiryDay <= sevenDaysLater) {
      return 'expiringSoon'
    }
  }

  return 'active'
}
