import type { ReactNode } from 'react'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'
import type {
  CheckinRecord,
  DietPayload,
  ExercisePayload,
  WaterPayload,
} from '../../types/checkin-types'
import { per100gFromDietPayload } from '../../lib/record-form-init'

function DetailSection({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card border border-border bg-card">
      <div className="divide-y divide-border">{children}</div>
    </section>
  )
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="px-4 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function formatRecordedAt(iso: string) {
  return format(new Date(iso), 'yyyy年M月d日 HH:mm', { locale: zhCN })
}

export function DietRecordDetailFields({ record }: { record: CheckinRecord }) {
  const payload = record.payload as DietPayload
  const per100g = per100gFromDietPayload(payload)

  return (
    <DetailSection>
      <DetailRow label="食物名称" value={payload.name} />
      <DetailRow label="重量" value={`${payload.g} g`} />
      {payload.amount ? <DetailRow label="餐次" value={payload.amount} /> : null}
      <DetailRow label="记录时间" value={formatRecordedAt(record.recordedAt)} />
      <DetailRow
        label="总览"
        value={
          <div className="space-y-1 font-normal">
            <p>热量 {payload.calories} kcal</p>
            <p className="text-xs text-muted-foreground">
              蛋白质 {payload.protein}g · 脂肪 {payload.fat}g · 碳水 {payload.carbs}g
            </p>
          </div>
        }
      />
      {per100g ? (
        <DetailRow
          label="每 100g"
          value={
            <div className="space-y-1 font-normal">
              <p>热量 {per100g.kcalPer100g} kcal</p>
              <p className="text-xs text-muted-foreground">
                蛋白质 {per100g.proteinGPer100g}g · 脂肪 {per100g.fatGPer100g}g · 碳水{' '}
                {per100g.carbsGPer100g}g
              </p>
            </div>
          }
        />
      ) : null}
    </DetailSection>
  )
}

export function ExerciseRecordDetailFields({ record }: { record: CheckinRecord }) {
  const payload = record.payload as ExercisePayload

  return (
    <DetailSection>
      <DetailRow label="项目名称" value={payload.name} />
      <DetailRow label="时长" value={`${payload.value} 分钟`} />
      <DetailRow label="记录时间" value={formatRecordedAt(record.recordedAt)} />
    </DetailSection>
  )
}

export function WaterRecordDetailFields({ record }: { record: CheckinRecord }) {
  const payload = record.payload as WaterPayload

  return (
    <DetailSection>
      <DetailRow label="名称" value={payload.name} />
      <DetailRow label="饮水量" value={`${payload.ml} ml`} />
      <DetailRow label="记录时间" value={formatRecordedAt(record.recordedAt)} />
    </DetailSection>
  )
}
