import { useEffect, useMemo } from 'react'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import PageHeaderBar from '../../../shared/components/PageHeaderBar'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { parseISODate } from '../../../shared/lib/date-utils'
import DietRecordForm from '../components/records/DietRecordForm'
import ExerciseRecordForm from '../components/records/ExerciseRecordForm'
import WaterRecordForm from '../components/records/WaterRecordForm'
import { getShanghaiDateString, isRecordEditable } from '../lib/checkin-dates'
import { checkinRecordDetailPath, RECORD_TYPE_LABELS } from '../lib/checkin-record-routes'
import {
  useCheckinRecord,
  useCreateCheckinRecord,
  useUpdateCheckinRecord,
} from '../hooks/use-checkin-records'
import type {
  CheckinRecordType,
  DietPayload,
  ExercisePayload,
  WaterPayload,
} from '../types/checkin-types'

function parseRecordType(value: string | null): CheckinRecordType | null {
  if (value === 'diet' || value === 'exercise' || value === 'water') return value
  return null
}

function defaultRecordedAtFromSlot(slotDate: string | null) {
  if (!slotDate) return new Date()
  const d = parseISODate(slotDate)
  const now = new Date()
  d.setHours(now.getHours(), now.getMinutes(), 0, 0)
  return d
}

export default function CheckinRecordFormPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isEdit = Boolean(id)
  const { currentMemberId } = useCurrentMember()

  const { data: existingRecord, isLoading } = useCheckinRecord(isEdit ? id : undefined)
  const createRecord = useCreateCheckinRecord()
  const updateRecord = useUpdateCheckinRecord()

  const typeFromQuery = parseRecordType(searchParams.get('type'))
  const slotDateFromQuery = searchParams.get('slotDate')
  const recordType = existingRecord?.recordType ?? typeFromQuery

  const editable = existingRecord
    ? isRecordEditable(existingRecord.slotDate)
    : slotDateFromQuery
      ? isRecordEditable(slotDateFromQuery)
      : isRecordEditable(getShanghaiDateString())

  const defaultRecordedAt = useMemo(
    () =>
      existingRecord
        ? new Date(existingRecord.recordedAt)
        : defaultRecordedAtFromSlot(slotDateFromQuery),
    [existingRecord, slotDateFromQuery],
  )

  useEffect(() => {
    if (!isEdit || isLoading || !existingRecord) return
    if (!isRecordEditable(existingRecord.slotDate)) {
      navigate(checkinRecordDetailPath(existingRecord.id), { replace: true })
    }
  }, [isEdit, isLoading, existingRecord, navigate])

  if (!recordType) {
    return <Navigate to="/checkin" replace />
  }

  if (isEdit && isLoading) {
    return (
      <div className="min-h-svh bg-background">
        <PageHeaderBar
          leading={{
            kind: 'button',
            label: '取消',
            onClick: () => navigate(-1),
            variant: 'outline',
          }}
          title={isEdit ? `编辑${RECORD_TYPE_LABELS[recordType]}` : `新增${RECORD_TYPE_LABELS[recordType]}`}
        />
        <p className="py-12 text-center text-sm text-muted-foreground">加载中…</p>
      </div>
    )
  }

  if (isEdit && !existingRecord) {
    return (
      <div className="min-h-svh bg-background">
        <PageHeaderBar
          leading={{
            kind: 'button',
            label: '返回',
            onClick: () => navigate(-1),
            variant: 'outline',
          }}
          title="记录"
        />
        <p className="py-12 text-center text-sm text-muted-foreground">记录不存在</p>
      </div>
    )
  }

  if (!editable) {
    return <Navigate to={existingRecord ? checkinRecordDetailPath(existingRecord.id) : '/checkin'} replace />
  }

  const formId = `${recordType}-record-form`
  const title = isEdit
    ? `编辑${RECORD_TYPE_LABELS[recordType]}`
    : `新增${RECORD_TYPE_LABELS[recordType]}`

  function handleSuccess() {
    if (isEdit && existingRecord) {
      navigate(checkinRecordDetailPath(existingRecord.id), { replace: true })
      return
    }
    navigate(-1)
  }

  async function createDiet(value: {
    foodId?: string | null
    name: string
    g: number
    mealType?: string | null
    recordedAt: string
    nutrition: { calories: number; protein: number; fat: number; carbs: number }
  }) {
    if (!currentMemberId) throw new Error('请先选择成员')
    const payload: DietPayload = {
      foodId: value.foodId ?? null,
      name: value.name,
      calories: value.nutrition.calories,
      protein: value.nutrition.protein,
      fat: value.nutrition.fat,
      carbs: value.nutrition.carbs,
      amount: value.mealType ?? null,
      g: value.g,
    }
    await createRecord.mutateAsync({
      memberId: currentMemberId,
      recordType: 'diet',
      recordedAt: value.recordedAt,
      payload,
    })
  }

  async function createExercise(value: { name: string; minutes: number; recordedAt: string }) {
    if (!currentMemberId) throw new Error('请先选择成员')
    const payload: ExercisePayload = {
      name: value.name,
      value: value.minutes,
      unit: 'min',
      presetId: null,
    }
    await createRecord.mutateAsync({
      memberId: currentMemberId,
      recordType: 'exercise',
      recordedAt: value.recordedAt,
      payload,
    })
  }

  async function createWater(value: { name: string; ml: number; recordedAt: string }) {
    if (!currentMemberId) throw new Error('请先选择成员')
    const payload: WaterPayload = {
      name: value.name,
      ml: value.ml,
      presetId: null,
      iconKey: null,
    }
    await createRecord.mutateAsync({
      memberId: currentMemberId,
      recordType: 'water',
      recordedAt: value.recordedAt,
      payload,
    })
  }

  async function updateDiet(value: {
    foodId?: string | null
    name: string
    g: number
    mealType?: string | null
    recordedAt: string
    nutrition: { calories: number; protein: number; fat: number; carbs: number }
  }) {
    if (!existingRecord) return
    const payload: DietPayload = {
      foodId: value.foodId ?? null,
      name: value.name,
      calories: value.nutrition.calories,
      protein: value.nutrition.protein,
      fat: value.nutrition.fat,
      carbs: value.nutrition.carbs,
      amount: value.mealType ?? null,
      g: value.g,
    }
    await updateRecord.mutateAsync({
      id: existingRecord.id,
      recordedAt: value.recordedAt,
      payload,
    })
  }

  async function updateExercise(value: { name: string; minutes: number; recordedAt: string }) {
    if (!existingRecord) return
    const payload: ExercisePayload = {
      name: value.name,
      value: value.minutes,
      unit: 'min',
      presetId: null,
    }
    await updateRecord.mutateAsync({
      id: existingRecord.id,
      recordedAt: value.recordedAt,
      payload,
    })
  }

  async function updateWater(value: { name: string; ml: number; recordedAt: string }) {
    if (!existingRecord) return
    const payload: WaterPayload = {
      name: value.name,
      ml: value.ml,
      presetId: null,
      iconKey: null,
    }
    await updateRecord.mutateAsync({
      id: existingRecord.id,
      recordedAt: value.recordedAt,
      payload,
    })
  }

  return (
    <div className="min-h-svh bg-background pb-8">
      <PageHeaderBar
        leading={{
          kind: 'button',
          label: '取消',
          onClick: () => navigate(-1),
          variant: 'outline',
        }}
        title={title}
        trailing={{
          kind: 'button',
          label: '保存',
          onClick: () => {
            const form = document.getElementById(formId) as HTMLFormElement | null
            form?.requestSubmit()
          },
          variant: 'default',
        }}
      />

      <div className="px-4 py-3">
        {recordType === 'diet' ? (
          <DietRecordForm
            formId={formId}
            memberId={currentMemberId}
            defaultRecordedAt={defaultRecordedAt}
            editingRecord={existingRecord}
            showSubmitButton={false}
            onSuccess={handleSuccess}
            onSubmit={(v) => (isEdit ? updateDiet(v) : createDiet(v))}
          />
        ) : recordType === 'exercise' ? (
          <ExerciseRecordForm
            formId={formId}
            defaultRecordedAt={defaultRecordedAt}
            editingRecord={existingRecord}
            showSubmitButton={false}
            onSuccess={handleSuccess}
            onSubmit={(v) => (isEdit ? updateExercise(v) : createExercise(v))}
          />
        ) : (
          <WaterRecordForm
            formId={formId}
            defaultRecordedAt={defaultRecordedAt}
            editingRecord={existingRecord}
            showSubmitButton={false}
            onSuccess={handleSuccess}
            onSubmit={(v) => (isEdit ? updateWater(v) : createWater(v))}
          />
        )}
      </div>
    </div>
  )
}
