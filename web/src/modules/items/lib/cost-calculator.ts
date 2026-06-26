import { daysBetween, startOfDay } from '../../../shared/lib/date-utils'

export function usedDays(from: Date, to: Date): number {
  const startDay = startOfDay(from)
  const endDay = startOfDay(to)
  const days = daysBetween(startDay, endDay)
  return Math.max(days, 0) + 1
}

export function dailyCost(price: number, usedDaysCount: number): number {
  if (usedDaysCount <= 0) return 0
  if (price === 0) return 0
  const result = price / usedDaysCount
  return Math.round(result * 100) / 100
}

export function formatPrice(price: number): string {
  return price
    .toLocaleString('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    .replace('CN¥', '¥')
}

export function formatDailyCost(cost: number): string {
  const formatted = cost.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted.replace('CN¥', '¥')}/天`
}

export function unitPrice(price: number, quantity: number): number {
  if (quantity <= 0) return 0
  if (price === 0) return 0
  const result = price / quantity
  return Math.round(result * 100) / 100
}

export function formatUnitPrice(
  price: number,
  quantity: number,
  unitName: string,
): string {
  const value = unitPrice(price, quantity)
  const formatted = value.toLocaleString('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${formatted.replace('CN¥', '¥')}/${unitName}`
}

export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}
