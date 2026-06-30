import {
  AlertTriangle,
  ChevronRight,
  MinusCircle,
  XCircle,
} from 'lucide-react'
import type { ReactNode } from 'react'
import DateField, { dateFieldFromIso, isoFromDateField } from '../../../shared/components/DateField'
import { composeAllDayIso } from '../../../shared/lib/datetime-utils'
import { parseISODate } from '../../../shared/lib/date-utils'
import type { ItemStatus } from '../lib/item-status'

export const fieldInputClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary'

export const compactFieldInputClass =
  'h-9 w-full min-w-0 rounded-button border border-bg-hover bg-bg px-2 text-sm text-text outline-none focus:border-primary'

export const compactFieldBoxClass =
  'box-border flex h-9 w-full min-w-0 items-center rounded-button border border-bg-hover bg-bg text-sm leading-none'

export const dateInputClass =
  'rounded-button border border-bg-hover bg-bg px-2 py-1.5 text-sm text-text outline-none focus:border-primary'

const STATUS_CONFIG: Record<
  ItemStatus,
  {
    label: string
    colorClass: string
    bgClass: string
    borderClass: string
    Icon: typeof MinusCircle | null
  }
> = {
  usedUp: {
    label: '已用完',
    colorClass: 'text-status-usedUp',
    bgClass: 'bg-status-usedUp/25',
    borderClass: 'border-status-usedUp/45',
    Icon: MinusCircle,
  },
  expired: {
    label: '已过期',
    colorClass: 'text-status-expired',
    bgClass: 'bg-status-expired/25',
    borderClass: 'border-status-expired/45',
    Icon: XCircle,
  },
  expiringSoon: {
    label: '即将过期',
    colorClass: 'text-status-expiring',
    bgClass: 'bg-status-expiring/25',
    borderClass: 'border-status-expiring/45',
    Icon: AlertTriangle,
  },
  active: {
    label: '使用中',
    colorClass: 'text-status-active',
    bgClass: 'bg-status-active/25',
    borderClass: 'border-status-active/45',
    Icon: null,
  },
}

export function formatDisplayDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function FormSection({
  title,
  children,
}: {
  title?: string
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-card bg-bg-card">
      {title ? (
        <h2 className="px-4 pt-3 pb-1.5 text-sm font-medium text-text-secondary">{title}</h2>
      ) : null}
      <div className="divide-y divide-bg-hover">{children}</div>
    </section>
  )
}

export function FormRow({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="px-4 py-2.5">
      <label className="mb-1 block text-xs text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

export function FormRowGrid({
  columns = 2,
  children,
}: {
  columns?: 2 | 3 | 4
  children: ReactNode
}) {
  return (
    <div
      className={[
        'grid divide-x divide-bg-hover',
        columns === 4 ? 'grid-cols-4' : columns === 3 ? 'grid-cols-3' : 'grid-cols-2',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function FormField({
  label,
  children,
  compact = false,
}: {
  label: string
  children: ReactNode
  compact?: boolean
}) {
  return (
    <div className={compact ? 'px-2 py-2.5' : 'px-4 py-2.5'}>
      <label className="mb-1 block text-xs text-text-secondary">{label}</label>
      {children}
    </div>
  )
}

export function ReadOnlyValue({
  value,
  placeholder = '—',
  compact = false,
  highlight = false,
}: {
  value: string | null
  placeholder?: string
  compact?: boolean
  highlight?: boolean
}) {
  return (
    <div
      className={[
        compactFieldBoxClass,
        compact ? 'px-2' : 'px-3 py-2',
        !compact && 'h-auto min-h-[38px]',
        value ? (highlight ? 'font-medium text-cost' : 'text-text') : 'text-text-tertiary',
      ].join(' ')}
    >
      <span className="block truncate">{value ?? placeholder}</span>
    </div>
  )
}

export function ItemStatusBadge({ status }: { status: ItemStatus }) {
  const statusInfo = STATUS_CONFIG[status]
  const StatusIcon = statusInfo.Icon

  return (
    <div
      className={[
        compactFieldBoxClass,
        'justify-center gap-0.5 px-1 text-xs font-semibold',
        statusInfo.bgClass,
        statusInfo.borderClass,
        statusInfo.colorClass,
      ].join(' ')}
    >
      {StatusIcon ? <StatusIcon className="size-3.5 shrink-0" /> : null}
      <span className="truncate">{statusInfo.label}</span>
    </div>
  )
}

export function ItemStatusPill({ status }: { status: ItemStatus }) {
  const statusInfo = STATUS_CONFIG[status]
  const StatusIcon = statusInfo.Icon

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
        statusInfo.bgClass,
        statusInfo.borderClass,
        statusInfo.colorClass,
        'border',
      ].join(' ')}
    >
      {StatusIcon ? <StatusIcon className="size-3.5 shrink-0" /> : null}
      {statusInfo.label}
    </span>
  )
}

export function DateInputRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const fieldValue = dateFieldFromIso(
    value ? composeAllDayIso(value) : null,
    true,
  )

  return (
    <div className="px-4 py-2.5">
      <DateField
        label={label}
        value={fieldValue}
        onChange={(next) => {
          const iso = isoFromDateField(next, true)
          onChange(iso ? iso.slice(0, 10) : '')
        }}
        allowClear={false}
      />
    </div>
  )
}

export function ReadOnlyDateRow({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <span className="shrink-0 text-sm text-text-secondary">{label}</span>
      <span className="text-sm text-text">
        {value ? formatDisplayDate(value) : '—'}
      </span>
    </div>
  )
}

export function ToggleRow({
  label,
  checked,
  onToggle,
}: {
  label: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-sm text-text">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-primary' : 'bg-bg-hover'
        }`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-transform ${
            checked ? 'left-[22px]' : 'left-0.5'
          }`}
        />
      </button>
    </div>
  )
}

export function PickerButton({
  value,
  placeholder,
  onClick,
  compact = false,
}: {
  value: string | null
  placeholder: string
  onClick: () => void
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        compact ? compactFieldBoxClass : 'flex w-full min-w-0 items-center rounded-button border border-bg-hover bg-bg text-sm',
        'justify-between text-left',
        compact ? 'gap-0.5 px-2' : 'px-3 py-2',
      ].join(' ')}
    >
      <span
        className={[
          'truncate',
          value ? 'text-text' : 'text-text-tertiary',
        ].join(' ')}
      >
        {value ?? placeholder}
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-tertiary" />
    </button>
  )
}
