import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import FilterSortMenu from '../components/FilterSortMenu'
import ItemCard from '../components/ItemCard'
import { useAreas } from '../hooks/use-areas'
import { useCategories } from '../hooks/use-categories'
import { useItems } from '../hooks/use-items'
import { computeItemDailyCost, sortItems } from '../lib/sort-filter'
import { parseISODate } from '../../../shared/lib/date-utils'
import { getItemStatus } from '../lib/item-status'
import { searchItems } from '../lib/search'
import { useUiStore } from '../store/ui-store'

export default function SearchPage() {
  const [query, setQuery] = useState('')

  const { data: items = [], isLoading: itemsLoading } = useItems()
  const { data: areas = [] } = useAreas()
  const { data: categories = [] } = useCategories()

  const sortField = useUiStore((s) => s.sortField)
  const sortOrder = useUiStore((s) => s.sortOrder)

  const trimmedQuery = query.trim()

  const results = useMemo(() => {
    const matched = searchItems(items, trimmedQuery, areas, categories)
    return sortItems(matched, sortField, sortOrder)
  }, [items, trimmedQuery, areas, categories, sortField, sortOrder])

  return (
    <>
      <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <FilterSortMenu areas={areas} categories={categories} items={items} sortOnly />
          <h1 className="flex-1 text-center text-lg font-medium text-text">搜索</h1>
          <div className="size-9 shrink-0" aria-hidden="true" />
        </div>
      </header>

      <div className="px-4 py-4">
        <label className="relative block">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-tertiary"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索物品、区域或位置"
            className="w-full rounded-card border border-bg-hover bg-bg-card py-2.5 pr-3 pl-9 text-sm text-text outline-none placeholder:text-text-tertiary focus:border-primary/30"
          />
        </label>

        {itemsLoading ? (
          <p className="py-12 text-center text-sm text-text-secondary">加载中…</p>
        ) : trimmedQuery === '' ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="size-12 text-text-tertiary" strokeWidth={1.25} />
            <p className="mt-4 text-sm text-text-secondary">输入关键词搜索</p>
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Search className="size-12 text-text-tertiary" strokeWidth={1.25} />
            <p className="mt-4 text-sm text-text-secondary">未找到匹配物品</p>
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {results.map((item) => {
              const isUsedUp =
                getItemStatus({
                  endDate: item.endDate ? parseISODate(item.endDate) : null,
                  expiryDate: item.expiryDate ? parseISODate(item.expiryDate) : null,
                  today: new Date(),
                }) === 'usedUp'

              return (
              <Link
                key={item.id}
                to={`/items/${item.id}`}
                className={[
                  'block rounded-card px-4 py-3 hover:bg-bg-hover',
                  isUsedUp ? 'bg-bg-hover/80' : 'bg-bg-card',
                ].join(' ')}
              >
                <ItemCard
                  item={item}
                  dailyCost={computeItemDailyCost(item)}
                  highlightQuery={trimmedQuery}
                />
              </Link>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
