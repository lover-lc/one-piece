import {
  AlertTriangle,
  MinusCircle,
  Pencil,
  Trash2,
  XCircle,
} from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useDeleteItem, useItem, useUpdateItem } from '../hooks/use-items'
import {
  formatDailyCost,
  formatPrice,
  formatQuantity,
  formatUnitPrice,
} from '../lib/cost-calculator'
import { parseISODate, toISODate } from '../../../shared/lib/date-utils'
import { getItemStatus, type ItemStatus } from '../lib/item-status'
import { computeItemDailyCost, computeItemUsedDays } from '../lib/sort-filter'

function formatDate(iso: string): string {
  return parseISODate(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

const STATUS_CONFIG: Record<
  ItemStatus,
  { label: string; colorClass: string; bgClass: string; Icon: typeof MinusCircle | null }
> = {
  usedUp: {
    label: '已用完',
    colorClass: 'text-status-usedUp',
    bgClass: 'bg-status-usedUp/15',
    Icon: MinusCircle,
  },
  expired: {
    label: '已过期',
    colorClass: 'text-status-expired',
    bgClass: 'bg-status-expired/15',
    Icon: XCircle,
  },
  expiringSoon: {
    label: '即将过期',
    colorClass: 'text-status-expiring',
    bgClass: 'bg-status-expiring/15',
    Icon: AlertTriangle,
  },
  active: {
    label: '使用中',
    colorClass: 'text-status-active',
    bgClass: 'bg-status-active/15',
    Icon: null,
  },
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 px-4 py-3">
      <span className="shrink-0 text-sm text-text-secondary">{label}</span>
      <span className="text-right text-sm text-text">{children}</span>
    </div>
  )
}

function DeleteConfirmDialog({
  itemName,
  onCancel,
  onConfirm,
  isPending,
}: {
  itemName: string
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
        className="w-full max-w-sm rounded-card bg-bg-card p-6 shadow-lg"
      >
        <h2 id="delete-dialog-title" className="text-lg font-medium text-text">
          删除物品
        </h2>
        <p className="mt-2 text-sm text-text-secondary">
          确定要删除「{itemName}」吗？此操作无法撤销。
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-button bg-status-expired px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ItemDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: item, isLoading } = useItem(id)
  const updateItem = useUpdateItem()
  const deleteItem = useDeleteItem()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-svh bg-bg">
        <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
          <h1 className="text-center text-lg font-medium text-text">物品详情</h1>
        </header>
        <p className="py-12 text-center text-sm text-text-secondary">加载中…</p>
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-svh bg-bg">
        <header className="border-b border-bg-hover bg-bg-card px-4 py-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-primary"
          >
            返回
          </button>
        </header>
        <p className="py-12 text-center text-sm text-text-secondary">物品不存在</p>
      </div>
    )
  }

  const status = getItemStatus({
    endDate: item.endDate ? parseISODate(item.endDate) : null,
    expiryDate: item.expiryDate ? parseISODate(item.expiryDate) : null,
    today: new Date(),
  })
  const statusInfo = STATUS_CONFIG[status]
  const StatusIcon = statusInfo.Icon

  const days = computeItemUsedDays(item)
  const dailyCost = computeItemDailyCost(item)
  const isUsedUp = item.endDate != null
  const hasUnitPrice =
    item.quantity != null && item.quantity > 0 && item.unit != null

  async function handleMarkUsedUp() {
    await updateItem.mutateAsync({
      id: item!.id,
      endDate: toISODate(new Date()),
    })
  }

  async function handleDelete() {
    await deleteItem.mutateAsync(item!.id)
    navigate(-1)
  }

  return (
    <div className="min-h-svh bg-bg pb-8">
      <header className="sticky top-0 z-10 border-b border-bg-hover bg-bg-card px-4 py-3">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="text-sm text-primary"
          >
            返回
          </button>
          <h1 className="max-w-[50%] truncate text-lg font-medium text-text">
            {item.name}
          </h1>
          <Link
            to={`/items/${item.id}/edit`}
            className="flex items-center gap-1 text-sm text-primary"
          >
            <Pencil className="size-3.5" />
            编辑
          </Link>
        </div>
      </header>

      <div className="space-y-4 px-4 py-4">
        <div className="px-1">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${statusInfo.colorClass} ${statusInfo.bgClass}`}
          >
            {StatusIcon ? <StatusIcon className="size-4" /> : null}
            {statusInfo.label}
          </span>
        </div>

        <section className="overflow-hidden rounded-card bg-bg-card">
          <h2 className="px-4 pt-4 pb-2 text-sm font-medium text-text-secondary">
            基本信息
          </h2>
          <div className="divide-y divide-bg-hover">
            <DetailRow label="物品名称">{item.name}</DetailRow>
            <DetailRow label="买入价格">{formatPrice(item.purchasePrice)}</DetailRow>
            <DetailRow label="数量">
              {item.quantity != null ? formatQuantity(item.quantity) : '—'}
            </DetailRow>
            <DetailRow label="计量单位">{item.unit?.name ?? '—'}</DetailRow>
          </div>
        </section>

        <section className="overflow-hidden rounded-card bg-bg-card">
          <h2 className="px-4 pt-4 pb-2 text-sm font-medium text-text-secondary">
            位置与分类
          </h2>
          <div className="divide-y divide-bg-hover">
            <DetailRow label="区域">{item.area?.name ?? '—'}</DetailRow>
            <DetailRow label="具体位置">
              {item.specificLocation.trim() || '—'}
            </DetailRow>
            <DetailRow label="分类">{item.category?.name ?? '—'}</DetailRow>
          </div>
        </section>

        <section className="overflow-hidden rounded-card bg-bg-card">
          <h2 className="px-4 pt-4 pb-2 text-sm font-medium text-text-secondary">
            时间信息
          </h2>
          <div className="divide-y divide-bg-hover">
            <DetailRow label="购入时间">{formatDate(item.purchaseDate)}</DetailRow>
            <DetailRow label="开始使用时间">{formatDate(item.startDate)}</DetailRow>
            {item.endDate ? (
              <DetailRow label="用完时间">{formatDate(item.endDate)}</DetailRow>
            ) : null}
            {item.expiryDate ? (
              <DetailRow label="过期时间">{formatDate(item.expiryDate)}</DetailRow>
            ) : null}
          </div>
        </section>

        <section className="overflow-hidden rounded-card bg-bg-card">
          <h2 className="px-4 pt-4 pb-2 text-sm font-medium text-text-secondary">
            成本统计
          </h2>
          <div className="divide-y divide-bg-hover">
            <DetailRow label="已使用天数">{days} 天</DetailRow>
            <DetailRow label="每日成本">
              <span className="font-medium text-cost">{formatDailyCost(dailyCost)}</span>
            </DetailRow>
            {hasUnitPrice && item.unit ? (
              <DetailRow label="单价">
                <span className="font-medium text-cost">
                  {formatUnitPrice(
                    item.purchasePrice,
                    item.quantity!,
                    item.unit.name,
                  )}
                </span>
              </DetailRow>
            ) : null}
          </div>
        </section>

        <div className="space-y-2 pt-2">
          {!isUsedUp ? (
            <button
              type="button"
              onClick={handleMarkUsedUp}
              disabled={updateItem.isPending}
              className="w-full rounded-card bg-bg-card px-4 py-3 text-sm font-medium text-primary hover:bg-bg-hover disabled:opacity-50"
            >
              {updateItem.isPending ? '处理中…' : '标记已用完'}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex w-full items-center justify-center gap-1.5 rounded-card bg-bg-card px-4 py-3 text-sm font-medium text-status-expired hover:bg-bg-hover"
          >
            <Trash2 className="size-4" />
            删除
          </button>
        </div>
      </div>

      {showDeleteConfirm ? (
        <DeleteConfirmDialog
          itemName={item.name}
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          isPending={deleteItem.isPending}
        />
      ) : null}
    </div>
  )
}
