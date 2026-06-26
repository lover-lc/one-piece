import { useMemo, type ReactNode } from 'react'
import Picker from 'react-mobile-picker'
import { parseISODate, toISODate } from '../../../shared/lib/date-utils'

const PICKER_HEIGHT = 200
const ITEM_HEIGHT = 40

type PickerState = {
  year: string
  month: string
  day: string
}

interface YMDPickerProps {
  value: string
  onChange: (value: string) => void
  yearMin?: number
  yearMax?: number
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

function parseValue(iso: string): { year: number; month: number; day: number } {
  const date = parseISODate(iso)
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
  }
}

function toPickerState(iso: string): PickerState {
  const { year, month, day } = parseValue(iso)
  const maxDay = daysInMonth(year, month)
  const safeDay = Math.min(day, maxDay)
  return {
    year: String(year),
    month: String(month).padStart(2, '0'),
    day: String(safeDay).padStart(2, '0'),
  }
}

function fromPickerState(state: PickerState): string {
  const year = Number(state.year)
  const month = Number(state.month)
  const day = Number(state.day)
  const maxDay = daysInMonth(year, month)
  const safeDay = Math.min(day, maxDay)
  return toISODate(new Date(year, month - 1, safeDay))
}

function clampPickerState(state: PickerState, changedKey: string): PickerState {
  if (changedKey !== 'year' && changedKey !== 'month') {
    return state
  }
  const year = Number(state.year)
  const month = Number(state.month)
  const maxDay = daysInMonth(year, month)
  const day = Number(state.day)
  if (day <= maxDay) {
    return state
  }
  return {
    ...state,
    day: String(maxDay).padStart(2, '0'),
  }
}

function PickerItemLabel({
  children,
  selected,
}: {
  children: ReactNode
  selected: boolean
}) {
  return (
    <div
      className={[
        'text-base tabular-nums leading-none',
        selected ? 'font-medium text-text' : 'text-text-secondary',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export default function YMDPicker({
  value,
  onChange,
  yearMin = 1970,
  yearMax = 2100,
}: YMDPickerProps) {
  const pickerValue = useMemo(() => toPickerState(value), [value])

  const years = useMemo(
    () => Array.from({ length: yearMax - yearMin + 1 }, (_, i) => String(yearMin + i)),
    [yearMin, yearMax],
  )
  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    [],
  )

  const yearNum = Number(pickerValue.year)
  const monthNum = Number(pickerValue.month)
  const maxDay = daysInMonth(yearNum, monthNum)
  const days = useMemo(
    () => Array.from({ length: maxDay }, (_, i) => String(i + 1).padStart(2, '0')),
    [maxDay],
  )

  function handleChange(next: PickerState, key: string) {
    const clamped = clampPickerState(next, key)
    onChange(fromPickerState(clamped))
  }

  return (
    <div className="ymd-picker">
      <Picker
        className="ymd-picker-root w-full"
        value={pickerValue}
        onChange={handleChange}
        height={PICKER_HEIGHT}
        itemHeight={ITEM_HEIGHT}
        wheelMode="natural"
      >
        <Picker.Column name="year">
          {years.map((year) => (
            <Picker.Item key={year} value={year}>
              {({ selected }) => (
                <PickerItemLabel selected={selected}>{year}</PickerItemLabel>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="month">
          {months.map((month) => (
            <Picker.Item key={month} value={month}>
              {({ selected }) => (
                <PickerItemLabel selected={selected}>{month}</PickerItemLabel>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
        <Picker.Column name="day">
          {days.map((day) => (
            <Picker.Item key={day} value={day}>
              {({ selected }) => (
                <PickerItemLabel selected={selected}>{day}</PickerItemLabel>
              )}
            </Picker.Item>
          ))}
        </Picker.Column>
      </Picker>
    </div>
  )
}
