import { create } from 'zustand'

export type SortField =
  | 'name'
  | 'createdAt'
  | 'dailyCost'
  | 'purchasePrice'
  | 'startDate'

export type SortOrder = 'asc' | 'desc'

interface UiState {
  areaFilterIds: string[]
  categoryFilterIds: string[]
  sortField: SortField
  sortOrder: SortOrder
  toggleAreaFilter: (id: string) => void
  toggleCategoryFilter: (id: string) => void
  clearFilters: () => void
  setSortField: (field: SortField) => void
  setSortOrder: (order: SortOrder) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  areaFilterIds: [],
  categoryFilterIds: [],
  sortField: 'name',
  sortOrder: 'asc',
  toggleAreaFilter: (id) => {
    const current = get().areaFilterIds
    set({
      areaFilterIds: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    })
  },
  toggleCategoryFilter: (id) => {
    const current = get().categoryFilterIds
    set({
      categoryFilterIds: current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    })
  },
  clearFilters: () => set({ areaFilterIds: [], categoryFilterIds: [] }),
  setSortField: (field) => set({ sortField: field }),
  setSortOrder: (order) => set({ sortOrder: order }),
}))
