import { describe, expect, it } from 'vitest'
import { parseISODate } from '../src/shared/lib/date-utils'
import {
  type ItemFormInput,
  validateItemForm,
} from '../src/modules/items/lib/validators'

const areaId = 'area-1'
const categoryId = 'category-1'

function validInput(overrides: Partial<ItemFormInput> = {}): ItemFormInput {
  return {
    name: '毛巾',
    priceText: '29.9',
    quantityText: '',
    unitId: null,
    areaId,
    categoryId,
    purchaseDate: new Date(),
    startDate: new Date(),
    endDate: null,
    ...overrides,
  }
}

describe('validateItemForm', () => {
  it('rejects empty name', () => {
    expect(validateItemForm(validInput({ name: '   ' }))).toBe('emptyName')
  })

  it('rejects negative price', () => {
    expect(validateItemForm(validInput({ priceText: '-1' }))).toBe('invalidPrice')
  })

  it('rejects missing area', () => {
    expect(validateItemForm(validInput({ areaId: null }))).toBe('missingArea')
  })

  it('rejects missing category', () => {
    expect(validateItemForm(validInput({ categoryId: null }))).toBe(
      'missingCategory',
    )
  })

  it('rejects start date after end date', () => {
    const purchaseDate = parseISODate('2026-06-01')
    const startDate = parseISODate('2026-06-10')
    const endDate = parseISODate('2026-06-05')
    expect(
      validateItemForm(validInput({ purchaseDate, startDate, endDate })),
    ).toBe('startAfterEnd')
  })

  it('rejects start date before purchase date', () => {
    const purchaseDate = parseISODate('2026-06-10')
    const startDate = parseISODate('2026-06-05')
    expect(
      validateItemForm(validInput({ purchaseDate, startDate })),
    ).toBe('startBeforePurchase')
  })

  it('accepts valid input', () => {
    expect(validateItemForm(validInput())).toBeNull()
  })

  it('does not require end date', () => {
    const purchaseDate = parseISODate('2026-01-01')
    const startDate = parseISODate('2026-01-01')
    expect(
      validateItemForm(
        validInput({
          name: '物品',
          priceText: '0',
          purchaseDate,
          startDate,
          endDate: null,
        }),
      ),
    ).toBeNull()
  })

  it('rejects quantity without unit', () => {
    expect(
      validateItemForm(validInput({ quantityText: '2', unitId: null })),
    ).toBe('incompleteQuantityUnit')
  })

  it('rejects unit without quantity', () => {
    expect(
      validateItemForm(validInput({ quantityText: '', unitId: 'unit-1' })),
    ).toBe('incompleteQuantityUnit')
  })

  it('rejects invalid quantity', () => {
    expect(
      validateItemForm(
        validInput({ quantityText: '0', unitId: 'unit-1' }),
      ),
    ).toBe('invalidQuantity')
  })

  it('accepts quantity and unit together', () => {
    expect(
      validateItemForm(
        validInput({ quantityText: '2.5', unitId: 'unit-1' }),
      ),
    ).toBeNull()
  })
})
