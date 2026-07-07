import { Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PageHeaderBar from '../../../shared/components/PageHeaderBar'
import { useFamilyMembers } from '../../../shared/hooks/use-family-members'
import {
  DietRecordDetailFields,
  ExerciseRecordDetailFields,
  WaterRecordDetailFields,
} from '../components/records/RecordDetailFields'
import { isRecordEditable } from '../lib/checkin-dates'
import { checkinRecordEditPath, RECORD_TYPE_LABELS } from '../lib/checkin-record-routes'
import { useCheckinRecord, useDeleteCheckinRecord } from '../hooks/use-checkin-records'

function DeleteConfirmDialog({
  onCancel,
  onConfirm,
  isPending,
}: {
  onCancel: () => void
  onConfirm: () => void
  isPending: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-record-title"
        className="w-full max-w-sm rounded-card border border-border bg-card p-6 shadow-lg"
      >
        <h2 id="delete-record-title" className="text-lg font-medium text-foreground">
          删除记录
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">确定删除这条记录？此操作无法撤销。</p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPending}
            className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            取消
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="rounded-md bg-destructive px-4 py-2 text-sm text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '删除中…' : '删除'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckinRecordDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: record, isLoading } = useCheckinRecord(id)
  const { data: members = [] } = useFamilyMembers()
  const deleteRecord = useDeleteCheckinRecord()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const memberName = useMemo(() => {
    if (!record) return null
    return members.find((m) => m.id === record.memberId)?.name ?? null
  }, [record, members])

  const editable = record ? isRecordEditable(record.slotDate) : false

  if (isLoading) {
    return (
      <div className="min-h-svh bg-background">
        <PageHeaderBar
          leading={{
            kind: 'button',
            label: '返回',
            onClick: () => navigate(-1),
            variant: 'outline',
          }}
          title="记录详情"
        />
        <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-svh bg-background">
        <PageHeaderBar
          leading={{
            kind: 'button',
            label: '返回',
            onClick: () => navigate(-1),
            variant: 'outline',
          }}
          title="记录详情"
        />
        <p className="py-12 text-center text-sm text-muted-foreground">记录不存在</p>
      </div>
    )
  }

  const typeLabel = RECORD_TYPE_LABELS[record.recordType]

  async function handleDelete() {
    await deleteRecord.mutateAsync({ id: record!.id })
    navigate(-1)
  }

  return (
    <div className="min-h-svh bg-background pb-8">
      <PageHeaderBar
        leading={{
          kind: 'button',
          label: '返回',
          onClick: () => navigate(-1),
          variant: 'outline',
        }}
        title={`${typeLabel}详情`}
        trailing={
          editable
            ? {
                kind: 'link',
                label: '编辑',
                to: checkinRecordEditPath(record.id),
                variant: 'default',
                icon: <Pencil className="size-3.5" />,
              }
            : undefined
        }
      />

      <div className="space-y-3 px-4 py-3">
        {memberName ? (
          <p className="text-sm text-muted-foreground">
            成员 · <span className="font-medium text-foreground">{memberName}</span>
          </p>
        ) : null}

        {record.recordType === 'diet' ? (
          <DietRecordDetailFields record={record} />
        ) : record.recordType === 'exercise' ? (
          <ExerciseRecordDetailFields record={record} />
        ) : (
          <WaterRecordDetailFields record={record} />
        )}

        {editable ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex w-full items-center justify-center gap-2 rounded-card border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive"
          >
            <Trash2 className="size-4" />
            删除记录
          </button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">历史记录仅可查看</p>
        )}
      </div>

      {showDeleteConfirm ? (
        <DeleteConfirmDialog
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={() => void handleDelete()}
          isPending={deleteRecord.isPending}
        />
      ) : null}
    </div>
  )
}
