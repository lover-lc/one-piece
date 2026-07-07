import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/use-auth'
import { supabase } from '../../../shared/lib/supabase'
import { getShanghaiDateString, isRecordEditable } from '../lib/checkin-dates'
import type {
  CheckinRecord,
  CheckinRecordPayload,
  CheckinRecordSource,
  CheckinRecordType,
} from '../types/checkin-types'

const LOCKED_RECORD_ERROR = '该日期的记录已锁定，无法修改'

type DbRecord = {
  id: string
  user_id: string
  member_id: string
  record_type: CheckinRecordType
  recorded_at: string
  slot_date: string
  payload: CheckinRecordPayload
  source: CheckinRecordSource
  healthkit_uuid: string | null
  created_at: string
  updated_at: string
}

function toRecord(row: DbRecord): CheckinRecord {
  return {
    id: row.id,
    userId: row.user_id,
    memberId: row.member_id,
    recordType: row.record_type,
    recordedAt: row.recorded_at,
    slotDate: row.slot_date,
    payload: row.payload,
    source: row.source,
    healthkitUuid: row.healthkit_uuid,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function assertEditable(slotDate: string) {
  if (!isRecordEditable(slotDate)) {
    throw new Error(LOCKED_RECORD_ERROR)
  }
}

export type CheckinRecordCreateInput = {
  memberId: string
  recordType: CheckinRecordType
  recordedAt: string
  payload: CheckinRecordPayload
  source?: CheckinRecordSource
  healthkitUuid?: string | null
}

export type CheckinRecordUpdateInput = {
  id: string
  memberId?: string
  recordedAt?: string
  payload?: CheckinRecordPayload
}

export function useCheckinRecords(filters: {
  slotDate: string
  recordType: CheckinRecordType
}) {
  const { session } = useAuth()
  const { slotDate, recordType } = filters

  return useQuery({
    queryKey: ['checkin-records', session?.user.id, slotDate, recordType],
    enabled: Boolean(session?.user.id && supabase && slotDate),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('checkin_records')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('slot_date', slotDate)
        .eq('record_type', recordType)
        .order('recorded_at', { ascending: true })

      if (error) throw error
      return (data as DbRecord[]).map(toRecord)
    },
  })
}

export function useCheckinRecordsForDate(slotDate: string) {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['checkin-records', session?.user.id, slotDate, 'all'],
    enabled: Boolean(session?.user.id && supabase && slotDate),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('checkin_records')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('slot_date', slotDate)
        .order('recorded_at', { ascending: true })

      if (error) throw error
      return (data as DbRecord[]).map(toRecord)
    },
  })
}

export function useCreateCheckinRecord() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: CheckinRecordCreateInput) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const slotDate = getShanghaiDateString(new Date(input.recordedAt))
      assertEditable(slotDate)

      const { data, error } = await supabase
        .from('checkin_records')
        .insert({
          user_id: session.user.id,
          member_id: input.memberId,
          record_type: input.recordType,
          recorded_at: input.recordedAt,
          slot_date: slotDate,
          payload: input.payload,
          source: input.source ?? 'manual',
          healthkit_uuid: input.healthkitUuid ?? null,
        })
        .select()
        .single()

      if (error) throw error
      return toRecord(data as DbRecord)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checkin-records'] })
    },
  })
}

export function useUpdateCheckinRecord() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: CheckinRecordUpdateInput) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const { data: existing, error: fetchError } = await supabase
        .from('checkin_records')
        .select('*')
        .eq('id', input.id)
        .single()

      if (fetchError) throw fetchError
      const row = existing as DbRecord
      assertEditable(row.slot_date)

      const patch: Record<string, unknown> = {}
      if (input.memberId !== undefined) patch.member_id = input.memberId
      if (input.payload !== undefined) patch.payload = input.payload
      if (input.recordedAt !== undefined) {
        patch.recorded_at = input.recordedAt
        patch.slot_date = getShanghaiDateString(new Date(input.recordedAt))
        assertEditable(patch.slot_date as string)
      }

      const { data, error } = await supabase
        .from('checkin_records')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return toRecord(data as DbRecord)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checkin-records'] })
    },
  })
}

export function useDeleteCheckinRecord() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: { id: string }) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const { data: existing, error: fetchError } = await supabase
        .from('checkin_records')
        .select('slot_date, record_type')
        .eq('id', input.id)
        .single()

      if (fetchError) throw fetchError
      const row = existing as { slot_date: string; record_type: CheckinRecordType }
      assertEditable(row.slot_date)

      const { error } = await supabase.from('checkin_records').delete().eq('id', input.id)
      if (error) throw error

      return { slotDate: row.slot_date, recordType: row.record_type }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['checkin-records'] })
    },
  })
}
