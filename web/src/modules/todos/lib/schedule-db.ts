import { isoToLocalDate } from '../../../shared/lib/datetime-utils'
import type { NegotiationSnapshot, TodoFormInput } from '../types/todo-types'

export function scheduleFieldsFromInput(
  input:
    | Pick<TodoFormInput, 'isAllDay' | 'startAt' | 'dueAt' | 'startDate' | 'dueDate'>
    | Pick<NegotiationSnapshot, 'isAllDay' | 'startAt' | 'dueAt' | 'startDate' | 'dueDate'>,
) {
  const isAllDay = input.isAllDay ?? true
  const startAt = input.startAt ?? null
  const dueAt = input.dueAt ?? null
  const startDate = startAt ? isoToLocalDate(startAt) : input.startDate || null
  const dueDate = dueAt ? isoToLocalDate(dueAt) : input.dueDate ?? null

  return {
    is_all_day: isAllDay,
    start_at: startAt,
    due_at: dueAt,
    start_date: startDate,
    due_date: dueDate,
  }
}
