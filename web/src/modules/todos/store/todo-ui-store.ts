import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RecurrencePreset } from '../lib/recurrence-presets'
import type { ReminderPreset } from '../lib/reminder-presets'

export type TodoSortField = 'dueDate' | 'createdAt' | 'title'
export type TodoSortOrder = 'asc' | 'desc'

function moveIdInOrder(order: string[], id: string, direction: 'up' | 'down'): string[] {
  const index = order.indexOf(id)
  if (index === -1) return order
  const swapWith = direction === 'up' ? index - 1 : index + 1
  if (swapWith < 0 || swapWith >= order.length) return order
  const next = [...order]
  ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
  return next
}

function toggleIdInList(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

type TodoUiState = {
  showCompleted: boolean
  listFilterIds: string[]
  tagFilterIds: string[]
  sortField: TodoSortField
  sortOrder: TodoSortOrder
  lastUsedListId: string | null
  reminderPresets: ReminderPreset[]
  reminderPresetOrder: string[]
  reminderPresetDisabled: string[]
  recurrencePresets: RecurrencePreset[]
  recurrencePresetOrder: string[]
  recurrencePresetDisabled: string[]
  setShowCompleted: (value: boolean) => void
  toggleListFilter: (id: string) => void
  toggleTagFilter: (id: string) => void
  clearListFilters: () => void
  clearTagFilters: () => void
  clearFilters: () => void
  setSortField: (field: TodoSortField) => void
  setSortOrder: (order: TodoSortOrder) => void
  setLastUsedListId: (id: string | null) => void
  addReminderPreset: (preset: ReminderPreset) => void
  updateReminderPreset: (
    id: string,
    patch: Partial<Pick<ReminderPreset, 'name' | 'kind' | 'offsetMinutes' | 'fixedTime'>>,
  ) => void
  removeReminderPreset: (id: string) => void
  setReminderPresetOrder: (order: string[]) => void
  moveReminderPreset: (id: string, direction: 'up' | 'down') => void
  toggleReminderPresetDisabled: (id: string) => void
  addRecurrencePreset: (preset: RecurrencePreset) => void
  updateRecurrencePreset: (
    id: string,
    patch: Partial<Pick<RecurrencePreset, 'name' | 'rule'>>,
  ) => void
  removeRecurrencePreset: (id: string) => void
  setRecurrencePresetOrder: (order: string[]) => void
  moveRecurrencePreset: (id: string, direction: 'up' | 'down') => void
  toggleRecurrencePresetDisabled: (id: string) => void
}

export const useTodoUiStore = create<TodoUiState>()(
  persist(
    (set, get) => ({
      showCompleted: false,
      listFilterIds: [],
      tagFilterIds: [],
      sortField: 'dueDate',
      sortOrder: 'asc',
      lastUsedListId: null,
      reminderPresets: [],
      reminderPresetOrder: [],
      reminderPresetDisabled: [],
      recurrencePresets: [],
      recurrencePresetOrder: [],
      recurrencePresetDisabled: [],
      setShowCompleted: (value) => set({ showCompleted: value }),
      toggleListFilter: (id) => {
        const current = get().listFilterIds
        set({
          listFilterIds: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        })
      },
      toggleTagFilter: (id) => {
        const current = get().tagFilterIds
        set({
          tagFilterIds: current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id],
        })
      },
      clearListFilters: () => set({ listFilterIds: [] }),
      clearTagFilters: () => set({ tagFilterIds: [] }),
      clearFilters: () => set({ listFilterIds: [], tagFilterIds: [] }),
      setSortField: (field) => set({ sortField: field }),
      setSortOrder: (order) => set({ sortOrder: order }),
      setLastUsedListId: (id) => set({ lastUsedListId: id }),
      addReminderPreset: (preset) =>
        set({
          reminderPresets: [...get().reminderPresets, preset],
          reminderPresetOrder: [...get().reminderPresetOrder, preset.id],
        }),
      updateReminderPreset: (id, patch) =>
        set({
          reminderPresets: get().reminderPresets.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        }),
      removeReminderPreset: (id) =>
        set({
          reminderPresets: get().reminderPresets.filter((p) => p.id !== id),
          reminderPresetOrder: get().reminderPresetOrder.filter((x) => x !== id),
          reminderPresetDisabled: get().reminderPresetDisabled.filter((x) => x !== id),
        }),
      setReminderPresetOrder: (order) => set({ reminderPresetOrder: order }),
      moveReminderPreset: (id, direction) =>
        set({
          reminderPresetOrder: moveIdInOrder(get().reminderPresetOrder, id, direction),
        }),
      toggleReminderPresetDisabled: (id) =>
        set({
          reminderPresetDisabled: toggleIdInList(get().reminderPresetDisabled, id),
        }),
      addRecurrencePreset: (preset) =>
        set({
          recurrencePresets: [...get().recurrencePresets, preset],
          recurrencePresetOrder: [...get().recurrencePresetOrder, preset.id],
        }),
      updateRecurrencePreset: (id, patch) =>
        set({
          recurrencePresets: get().recurrencePresets.map((p) =>
            p.id === id ? { ...p, ...patch } : p,
          ),
        }),
      removeRecurrencePreset: (id) =>
        set({
          recurrencePresets: get().recurrencePresets.filter((p) => p.id !== id),
          recurrencePresetOrder: get().recurrencePresetOrder.filter((x) => x !== id),
          recurrencePresetDisabled: get().recurrencePresetDisabled.filter((x) => x !== id),
        }),
      setRecurrencePresetOrder: (order) => set({ recurrencePresetOrder: order }),
      moveRecurrencePreset: (id, direction) =>
        set({
          recurrencePresetOrder: moveIdInOrder(get().recurrencePresetOrder, id, direction),
        }),
      toggleRecurrencePresetDisabled: (id) =>
        set({
          recurrencePresetDisabled: toggleIdInList(get().recurrencePresetDisabled, id),
        }),
    }),
    { name: 'todo-ui-preferences' },
  ),
)
