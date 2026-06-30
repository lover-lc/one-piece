import type {
  NegotiationSnapshot,
  RecurrenceRule,
  TodoFormInput,
  TodoItem,
  TodoPriority,
} from '../types/todo-types'
import { isoToLocalDate } from '../../../shared/lib/datetime-utils'

export type { NegotiationSnapshot }

export type NegotiationFormState = {
  title: string
  description: string
  priority: TodoPriority | ''
  isAllDay: boolean
  startAt: string | null
  dueAt: string | null
  startDate: string
  dueDate: string
  tagIds: string[]
  selectedRecurrencePresetId: string
  recurrenceRule: RecurrenceRule | null
}

function syncLegacyDates(snapshot: NegotiationSnapshot): NegotiationSnapshot {
  return {
    ...snapshot,
    startDate: snapshot.startAt ? isoToLocalDate(snapshot.startAt) : snapshot.startDate,
    dueDate: snapshot.dueAt ? isoToLocalDate(snapshot.dueAt) : snapshot.dueDate,
  }
}

export function formStateToSnapshot(state: NegotiationFormState): NegotiationSnapshot {
  return syncLegacyDates({
    title: state.title.trim(),
    description: state.description.trim() || null,
    priority: state.priority || null,
    isAllDay: state.isAllDay,
    startAt: state.startAt,
    dueAt: state.dueAt,
    startDate: state.startDate || null,
    dueDate: state.dueDate || null,
    tagIds: [...state.tagIds].sort(),
    recurrenceRule: state.recurrenceRule,
  })
}

export function snapshotFromFormInput(
  input: Partial<TodoFormInput> & { tagIds?: string[] },
): NegotiationSnapshot {
  const schedule = {
    isAllDay: input.isAllDay ?? true,
    startAt: input.startAt ?? null,
    dueAt: input.dueAt ?? null,
    startDate: input.startDate || null,
    dueDate: input.dueDate ?? null,
  }

  return syncLegacyDates({
    title: (input.title ?? '').trim(),
    description: input.description?.trim() || null,
    priority: input.priority ?? null,
    ...schedule,
    tagIds: [...(input.tagIds ?? [])].sort(),
    recurrenceRule: input.recurrenceRule ?? null,
  })
}

export function snapshotsEqual(a: NegotiationSnapshot | null, b: NegotiationSnapshot): boolean {
  if (!a) return false
  return JSON.stringify(a) === JSON.stringify(b)
}

export type NegotiationFieldKey =
  | 'title'
  | 'description'
  | 'priority'
  | 'isAllDay'
  | 'startAt'
  | 'dueAt'
  | 'startDate'
  | 'dueDate'
  | 'tagIds'
  | 'recurrenceRule'

export function diffSnapshotFields(
  baseline: NegotiationSnapshot | null,
  current: NegotiationSnapshot,
): Set<NegotiationFieldKey> {
  const changed = new Set<NegotiationFieldKey>()
  if (!baseline) return changed

  if (baseline.title !== current.title) changed.add('title')
  if (baseline.description !== current.description) changed.add('description')
  if (baseline.priority !== current.priority) changed.add('priority')
  if (baseline.isAllDay !== current.isAllDay) changed.add('isAllDay')
  if (baseline.startAt !== current.startAt) {
    changed.add('startAt')
    changed.add('startDate')
  }
  if (baseline.dueAt !== current.dueAt) {
    changed.add('dueAt')
    changed.add('dueDate')
  }
  if (JSON.stringify(baseline.tagIds) !== JSON.stringify(current.tagIds)) {
    changed.add('tagIds')
  }
  if (JSON.stringify(baseline.recurrenceRule) !== JSON.stringify(current.recurrenceRule)) {
    changed.add('recurrenceRule')
  }

  return changed
}

export function parseNegotiationSnapshot(raw: unknown): NegotiationSnapshot | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const startDate = row.startDate == null ? null : String(row.startDate)
  const dueDate = row.dueDate == null ? null : String(row.dueDate)
  const startAt =
    row.startAt == null
      ? startDate
        ? `${startDate}T00:00:00.000Z`
        : null
      : String(row.startAt)
  const dueAt =
    row.dueAt == null
      ? dueDate
        ? `${dueDate}T00:00:00.000Z`
        : null
      : String(row.dueAt)

  return syncLegacyDates({
    title: String(row.title ?? ''),
    description: row.description == null ? null : String(row.description),
    priority: (row.priority as TodoPriority | null) ?? null,
    isAllDay: row.isAllDay == null ? true : Boolean(row.isAllDay),
    startAt,
    dueAt,
    startDate,
    dueDate,
    tagIds: Array.isArray(row.tagIds) ? row.tagIds.map(String).sort() : [],
    recurrenceRule: (row.recurrenceRule as RecurrenceRule | null) ?? null,
  })
}

export function snapshotToFormState(snapshot: NegotiationSnapshot): NegotiationFormState {
  return {
    title: snapshot.title,
    description: snapshot.description ?? '',
    priority: snapshot.priority ?? '',
    isAllDay: snapshot.isAllDay,
    startAt: snapshot.startAt,
    dueAt: snapshot.dueAt,
    startDate: snapshot.startDate ?? '',
    dueDate: snapshot.dueDate ?? '',
    tagIds: [...snapshot.tagIds],
    selectedRecurrencePresetId: 'builtin:none',
    recurrenceRule: snapshot.recurrenceRule,
  }
}

export function todoToCommittedSnapshot(
  todo: Pick<
    TodoItem,
    | 'title'
    | 'description'
    | 'priority'
    | 'isAllDay'
    | 'startAt'
    | 'dueAt'
    | 'startDate'
    | 'dueDate'
    | 'recurrenceRule'
  > & { tags?: { id: string }[] },
): NegotiationSnapshot {
  return syncLegacyDates({
    title: todo.title,
    description: todo.description,
    priority: todo.priority,
    isAllDay: todo.isAllDay,
    startAt: todo.startAt,
    dueAt: todo.dueAt,
    startDate: todo.startDate,
    dueDate: todo.dueDate,
    tagIds: [...(todo.tags ?? []).map((t) => t.id)].sort(),
    recurrenceRule: todo.recurrenceRule,
  })
}
