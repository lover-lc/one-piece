import { AlertTriangle } from 'lucide-react'
import {
  formatDailyCost,
  formatPrice,
  formatUnitPrice,
} from '../lib/cost-calculator'
import { parseISODate } from '../../../shared/lib/date-utils'
import { getItemStatus, type ItemStatus } from '../lib/item-status'
import { computeItemUsedDays } from '../lib/sort-filter'
import { highlightNameParts } from '../lib/search'
import type { Item } from '../lib/types'

interface ItemCardProps {
  item: Item
  dailyCost: number
  highlightQuery?: string
}

function ItemName({
  name,
  highlightQuery,
  muted,
}: {
  name: string
  highlightQuery?: string
  muted?: boolean
}) {
  const parts = highlightQuery ? highlightNameParts(name, highlightQuery) : null
  const nameClass = muted ? 'text-text-tertiary' : 'text-text'

  if (!parts) {
    return <span className={`truncate ${nameClass}`}>{name}</span>
  }

  return (
    <span className="truncate">
      {parts.before}
      <mark
        className={`rounded font-semibold ${
          muted ? 'bg-text-tertiary/15 text-text-tertiary' : 'bg-primary/15 text-text'
        }`}
      >
        {parts.match}
      </mark>
      {parts.after}
    </span>
  )
}

function rightMainText(status: ItemStatus, days: number): string {
  switch (status) {
    case 'usedUp':
      return '已用完'
    case 'expired':
      return '已过期'
    default:
      return `使用中 ${days}天`
  }
}

export default function ItemCard({ item, dailyCost, highlightQuery }: ItemCardProps) {
  const today = new Date()
  const status = getItemStatus({
    endDate: item.endDate ? parseISODate(item.endDate) : null,
    expiryDate: item.expiryDate ? parseISODate(item.expiryDate) : null,
    today,
  })
  const days = computeItemUsedDays(item, today)
  const isUsedUp = status === 'usedUp'
  const muted = isUsedUp

  const categoryName = item.category?.name ?? '—'
  const unitPriceText =
    item.quantity != null && item.quantity > 0 && item.unit
      ? formatUnitPrice(item.purchasePrice, item.quantity, item.unit.name)
      : null

  const priceParts = [formatPrice(item.purchasePrice), formatDailyCost(dailyCost)]
  if (unitPriceText) priceParts.push(unitPriceText)
  const priceLine = priceParts.join(' · ')

  const secondaryTextClass = muted ? 'text-text-tertiary' : 'text-text-secondary'
  const tertiaryTextClass = muted ? 'text-text-tertiary' : 'text-text-tertiary'
  const rightMainClass = muted
    ? 'text-base font-semibold text-text-tertiary'
    : 'text-base font-semibold text-text'

  return (
    <div className={isUsedUp ? 'opacity-75' : undefined}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">
            <ItemName name={item.name} highlightQuery={highlightQuery} muted={muted} />
          </p>
          <p className={`mt-0.5 truncate text-xs ${secondaryTextClass}`}>
            {priceLine}
          </p>
          <p className={`mt-0.5 truncate text-xs ${tertiaryTextClass}`}>
            {categoryName}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <div className="flex items-center gap-1">
            {status === 'expiringSoon' ? (
              <AlertTriangle
                className="size-4 text-status-expiring"
                aria-label="即将过期"
              />
            ) : null}
            <span className={rightMainClass}>{rightMainText(status, days)}</span>
          </div>
          {status === 'usedUp' || status === 'expired' ? (
            <span className={`mt-0.5 text-xs ${secondaryTextClass}`}>
              已用 {days}天
            </span>
          ) : null}
        </div>
      </div>
    </div>
  )
}
