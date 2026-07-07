import { describe, expect, it } from 'vitest'
import {
  convertEnergyInput,
  kjToKcal,
  kcalToKj,
  parseEnergyInput,
} from '../src/modules/checkin/lib/energy-units'

describe('energy-units', () => {
  it('converts kcal and kJ', () => {
    expect(kcalToKj(100)).toBe(418.4)
    expect(kjToKcal(418.4)).toBe(100)
  })

  it('parses input by unit', () => {
    expect(parseEnergyInput('120', 'kcal')).toBe(120)
    expect(parseEnergyInput('502', 'kj')).toBe(120)
  })

  it('converts display value when switching units', () => {
    expect(convertEnergyInput('100', 'kcal', 'kj')).toBe('418.4')
    expect(convertEnergyInput('418.4', 'kj', 'kcal')).toBe('100')
  })
})
