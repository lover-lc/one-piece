import type { CheckinRecordType } from '../types/checkin-types'

export function checkinRecordDetailPath(id: string) {
  return `/checkin/records/${id}`
}

export function checkinRecordEditPath(id: string) {
  return `/checkin/records/${id}/edit`
}

export function checkinRecordNewPath(type: CheckinRecordType, slotDate?: string) {
  const params = new URLSearchParams({ type })
  if (slotDate) params.set('slotDate', slotDate)
  return `/checkin/records/new?${params.toString()}`
}

export const RECORD_TYPE_LABELS: Record<CheckinRecordType, string> = {
  diet: '饮食',
  exercise: '运动',
  water: '喝水',
}
