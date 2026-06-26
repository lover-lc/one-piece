import { ArrowUpDown, Check, SlidersHorizontal } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Area, Category } from '../lib/types'
import {
  areasWithItems,
  categoriesWithItems,
  SORT_FIELD_LABELS,
  SORT_ORDER_LABELS,
} from '../lib/sort-filter'
import type { Item } from '../lib/types'
import {
  useUiStore,
  type SortField,
  type SortOrder,
} from '../store/ui-store'

interface FilterSortMenuProps {
  areas: Area[]
  categories: Category[]
  items: Item[]
  sortOnly?: boolean
}

function MenuPanel({
  open,
  onClose,
  children,
  align = 'left',
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  align?: 'left' | 'right'
}) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handleClick(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={ref}
      className={[
        'absolute top-full z-20 mt-1 max-h-[70vh] min-w-44 overflow-y-auto rounded-card bg-bg-card py-1 shadow-lg ring-1 ring-black/5',
        align === 'left' ? 'left-0' : 'right-0',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

function FilterMenuItem({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-bg-hover"
    >
      <span className="flex size-4 shrink-0 items-center justify-center rounded border border-bg-hover">
        {selected ? <Check className="size-3 text-primary" /> : null}
      </span>
      <span>{label}</span>
    </button>
  )
}

function SortMenuItem({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text hover:bg-bg-hover"
    >
      <span className="size-4 shrink-0">
        {selected ? <Check className="size-4" /> : null}
      </span>
      <span>{label}</span>
    </button>
  )
}

function MenuDivider() {
  return <div className="my-1 border-t border-bg-hover" />
}

function MenuSectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-1.5 text-xs font-medium text-text-tertiary">{children}</p>
  )
}

export default function FilterSortMenu({
  areas,
  categories,
  items,
  sortOnly = false,
}: FilterSortMenuProps) {
  const [filterOpen, setFilterOpen] = useState(false)
  const [sortOpen, setSortOpen] = useState(false)

  const areaFilterIds = useUiStore((s) => s.areaFilterIds)
  const categoryFilterIds = useUiStore((s) => s.categoryFilterIds)
  const sortField = useUiStore((s) => s.sortField)
  const sortOrder = useUiStore((s) => s.sortOrder)
  const toggleAreaFilter = useUiStore((s) => s.toggleAreaFilter)
  const toggleCategoryFilter = useUiStore((s) => s.toggleCategoryFilter)
  const clearFilters = useUiStore((s) => s.clearFilters)
  const setSortField = useUiStore((s) => s.setSortField)
  const setSortOrder = useUiStore((s) => s.setSortOrder)

  const filterableAreas = useMemo(() => areasWithItems(areas, items), [areas, items])
  const filterableCategories = useMemo(
    () => categoriesWithItems(categories, items),
    [categories, items],
  )

  const hasActiveFilter =
    areaFilterIds.length > 0 || categoryFilterIds.length > 0

  const sortFields = Object.keys(SORT_FIELD_LABELS) as SortField[]
  const sortOrders: SortOrder[] = ['asc', 'desc']

  return (
    <div className="flex items-center gap-1">
      {!sortOnly ? (
        <div className="relative">
          <button
            type="button"
            aria-label="筛选"
            onClick={() => {
              setSortOpen(false)
              setFilterOpen((v) => !v)
            }}
            className={[
              'rounded-button p-2 hover:bg-bg-hover hover:text-text',
              hasActiveFilter ? 'text-primary' : 'text-text-secondary',
            ].join(' ')}
          >
            <SlidersHorizontal className="size-5" strokeWidth={1.75} />
          </button>
          <MenuPanel open={filterOpen} onClose={() => setFilterOpen(false)}>
            <MenuSectionTitle>区域</MenuSectionTitle>
            {filterableAreas.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-tertiary">暂无区域</p>
            ) : (
              filterableAreas.map((area) => (
                <FilterMenuItem
                  key={area.id}
                  label={area.name}
                  selected={areaFilterIds.includes(area.id)}
                  onClick={() => toggleAreaFilter(area.id)}
                />
              ))
            )}
            <MenuDivider />
            <MenuSectionTitle>分类</MenuSectionTitle>
            {filterableCategories.length === 0 ? (
              <p className="px-3 py-2 text-sm text-text-tertiary">暂无分类</p>
            ) : (
              filterableCategories.map((category) => (
                <FilterMenuItem
                  key={category.id}
                  label={category.name}
                  selected={categoryFilterIds.includes(category.id)}
                  onClick={() => toggleCategoryFilter(category.id)}
                />
              ))
            )}
            {hasActiveFilter ? (
              <>
                <MenuDivider />
                <button
                  type="button"
                  onClick={clearFilters}
                  className="w-full px-3 py-2 text-left text-sm text-primary hover:bg-bg-hover"
                >
                  清除筛选
                </button>
              </>
            ) : null}
          </MenuPanel>
        </div>
      ) : null}

      <div className="relative">
        <button
          type="button"
          aria-label="排序"
          onClick={() => {
            setFilterOpen(false)
            setSortOpen((v) => !v)
          }}
          className="rounded-button p-2 text-text-secondary hover:bg-bg-hover hover:text-text"
        >
          <ArrowUpDown className="size-5" strokeWidth={1.75} />
        </button>
        <MenuPanel open={sortOpen} onClose={() => setSortOpen(false)}>
          {sortFields.map((field) => (
            <SortMenuItem
              key={field}
              label={SORT_FIELD_LABELS[field]}
              selected={sortField === field}
              onClick={() => setSortField(field)}
            />
          ))}
          <MenuDivider />
          {sortOrders.map((order) => (
            <SortMenuItem
              key={order}
              label={SORT_ORDER_LABELS[order]}
              selected={sortOrder === order}
              onClick={() => setSortOrder(order)}
            />
          ))}
        </MenuPanel>
      </div>
    </div>
  )
}
