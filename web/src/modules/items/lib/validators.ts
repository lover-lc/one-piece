import { startOfDay } from '../../../shared/lib/date-utils'

export type ItemFormInput = {
  name: string
  priceText: string
  quantityText: string
  unitId: string | null | undefined
  areaId: string | null | undefined
  categoryId: string | null | undefined
  purchaseDate: Date
  startDate: Date
  endDate?: Date | null
}

export type ValidationError =
  | 'emptyName'
  | 'invalidPrice'
  | 'invalidQuantity'
  | 'incompleteQuantityUnit'
  | 'missingArea'
  | 'missingCategory'
  | 'startBeforePurchase'
  | 'startAfterEnd'

export function parsePrice(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
}

export function parseQuantity(text: string): number | null {
  const trimmed = text.trim()
  if (!trimmed) return null
  const value = Number(trimmed)
  if (!Number.isFinite(value)) return null
  return value
}

function hasAtMostTwoDecimalPlaces(value: number): boolean {
  return Math.round(value * 100) === value * 100
}

export function validateItemForm(input: ItemFormInput): ValidationError | null {
  if (input.name.trim().length === 0) {
    return 'emptyName'
  }

  const price = parsePrice(input.priceText)
  if (price === null || price < 0) {
    return 'invalidPrice'
  }

  const quantity = parseQuantity(input.quantityText)
  const hasQuantity = quantity !== null
  const hasUnit = Boolean(input.unitId)

  if (hasQuantity !== hasUnit) {
    return 'incompleteQuantityUnit'
  }

  if (hasQuantity && quantity !== null) {
    if (quantity <= 0 || !hasAtMostTwoDecimalPlaces(quantity)) {
      return 'invalidQuantity'
    }
  }

  if (!input.areaId) {
    return 'missingArea'
  }

  if (!input.categoryId) {
    return 'missingCategory'
  }

  const purchaseDay = startOfDay(input.purchaseDate)
  const startDay = startOfDay(input.startDate)
  if (startDay < purchaseDay) {
    return 'startBeforePurchase'
  }

  if (input.endDate) {
    const endDay = startOfDay(input.endDate)
    if (startDay > endDay) {
      return 'startAfterEnd'
    }
  }

  return null
}

export function validationErrorMessage(error: ValidationError): string {
  switch (error) {
    case 'emptyName':
      return '请输入物品名称'
    case 'invalidPrice':
      return '请输入有效的价格（≥ 0）'
    case 'invalidQuantity':
      return '请输入有效的数量（> 0，最多 2 位小数）'
    case 'incompleteQuantityUnit':
      return '请同时填写数量和计量单位'
    case 'missingArea':
      return '请选择区域'
    case 'missingCategory':
      return '请选择分类'
    case 'startBeforePurchase':
      return '开始使用时间不能早于购入时间'
    case 'startAfterEnd':
      return '开始时间不能晚于用完时间'
  }
}
