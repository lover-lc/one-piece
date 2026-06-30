import type { ReactNode } from 'react'
import { DayPicker, type DateRange } from 'react-day-picker'
import { zhCN } from 'react-day-picker/locale'
import { cn } from '@/lib/utils'
import 'react-day-picker/style.css'

const pickerClass = 'rdp-root p-2'

function CalendarFrame({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex w-full justify-center px-2 pb-1', className)}>{children}</div>
}

type SingleDatePickerProps = {
  mode?: 'single'
  selected?: Date
  onSelect: (date: Date | undefined) => void
  className?: string
}

type RangeDatePickerProps = {
  mode: 'range'
  selected?: DateRange | undefined
  onSelect: (range: DateRange | undefined) => void
  className?: string
}

export function DatePickerCalendar(props: SingleDatePickerProps): ReactNode
export function DatePickerCalendar(props: RangeDatePickerProps): ReactNode
export function DatePickerCalendar(
  props: SingleDatePickerProps | RangeDatePickerProps,
): ReactNode {
  if (props.mode === 'range') {
    return (
      <CalendarFrame className={props.className}>
        <DayPicker
          mode="range"
          locale={zhCN}
          weekStartsOn={1}
          selected={props.selected}
          onSelect={props.onSelect}
          className={pickerClass}
        />
      </CalendarFrame>
    )
  }

  return (
    <CalendarFrame className={props.className}>
      <DayPicker
        mode="single"
        locale={zhCN}
        weekStartsOn={1}
        selected={props.selected}
        onSelect={props.onSelect}
        className={pickerClass}
      />
    </CalendarFrame>
  )
}
