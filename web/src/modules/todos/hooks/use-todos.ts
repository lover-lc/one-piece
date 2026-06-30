import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/use-auth'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { supabase } from '../../../shared/lib/supabase'
import { isoToLocalDate } from '../../../shared/lib/datetime-utils'
import {
  createReminder,
  createReminderAt,
  ensureMemberPrivateList,
  fetchItemTags,
  fetchTodoItems,
  fetchTodoListPlacements,
  getInitialStatus,
  logStatusChange,
  markTodoNotificationsRead,
  sendExecutionStartedNotifications,
  sendProposalNotification,
  syncListSelection,
  syncSharedListPlacement,
  toTodoItem,
  toTodoList,
  toTodoTag,
  toStatusLog,
  canTransition,
} from '../services/todo-service'
import { pickStatusReasonsForTodos } from '../lib/todo-status-reason'
import {
  getNegotiationOtherParty,
} from '../lib/negotiation'
import { snapshotFromFormInput } from '../lib/negotiation-snapshot'
import { scheduleFieldsFromInput } from '../lib/schedule-db'
import type {
  RecurrenceRule,
  TodoFormInput,
  TodoItem,
  TodoPriority,
  TodoStatus,
} from '../types/todo-types'

type DbList = {
  id: string
  name: string
  owner_id: string
  color: string | null
  sort_order: number
  visibility: 'private' | 'shared'
  created_at: string
}

type DbItem = Parameters<typeof toTodoItem>[0]

function patchTodoInListCaches(
  queryClient: QueryClient,
  memberId: string | null,
  todoId: string,
  patch: Partial<TodoItem>,
) {
  if (!memberId) return
  queryClient.setQueriesData<TodoItem[]>(
    { queryKey: ['todos', memberId] },
    (old) => old?.map((t) => (t.id === todoId ? { ...t, ...patch } : t)),
  )
  queryClient.setQueryData<TodoItem>(['todo', todoId], (old) =>
    old ? { ...old, ...patch } : old,
  )
}

function snapshotToContentPatch(snapshot: ReturnType<typeof snapshotFromFormInput>) {
  return {
    title: snapshot.title,
    description: snapshot.description,
    priority: snapshot.priority,
    ...scheduleFieldsFromInput(snapshot),
    recurrence_rule: snapshot.recurrenceRule,
  }
}

export function useTodoLists() {
  const { currentMemberId } = useCurrentMember()

  return useQuery({
    queryKey: ['todo-lists', currentMemberId],
    enabled: Boolean(currentMemberId && supabase),
    queryFn: async () => {
      if (!supabase || !currentMemberId) return []

      const { data, error } = await supabase
        .from('todo_lists')
        .select('*')
        .or(`owner_id.eq.${currentMemberId},visibility.eq.shared`)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data as DbList[]).map(toTodoList)
    },
    staleTime: 60_000,
  })
}

export function useCreateTodoList() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (input: {
      name: string
      color?: string
      visibility?: 'private' | 'shared'
    }) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      const visibility = input.visibility ?? 'private'
      const { data: existing } = await supabase
        .from('todo_lists')
        .select('sort_order')
        .or(`owner_id.eq.${currentMemberId},visibility.eq.shared`)
        .order('sort_order', { ascending: false })
        .limit(1)

      const nextOrder =
        existing && existing.length > 0
          ? (existing[0] as { sort_order: number }).sort_order + 1
          : 0

      const { data, error } = await supabase
        .from('todo_lists')
        .insert({
          name: input.name.trim(),
          owner_id: currentMemberId,
          color: input.color ?? '#2c3e50',
          sort_order: nextOrder,
          visibility,
        })
        .select()
        .single()

      if (error) throw error
      return toTodoList(data as DbList)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todo-lists'] })
    },
  })
}

export function useUpdateTodoList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: {
      id: string
      name?: string
      color?: string
      sortOrder?: number
    }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const patch: Record<string, unknown> = {}
      if (input.name !== undefined) patch.name = input.name.trim()
      if (input.color !== undefined) patch.color = input.color
      if (input.sortOrder !== undefined) patch.sort_order = input.sortOrder

      const { data, error } = await supabase
        .from('todo_lists')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error
      return toTodoList(data as DbList)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todo-lists'] })
    },
  })
}

export function useDeleteTodoList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; moveToListId?: string }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      if (input.moveToListId) {
        const { error: moveError } = await supabase
          .from('todo_item_member_lists')
          .update({ list_id: input.moveToListId })
          .eq('list_id', input.id)
        if (moveError) throw moveError

        await supabase
          .from('todo_items')
          .update({ list_id: input.moveToListId })
          .eq('list_id', input.id)
      }

      const { error } = await supabase.from('todo_lists').delete().eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todo-lists'] })
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export function useTodos(filter?: 'assigned' | 'created' | 'all') {
  const { currentMemberId } = useCurrentMember()

  return useQuery({
    queryKey: ['todos', currentMemberId, filter],
    enabled: Boolean(currentMemberId && supabase),
    queryFn: async () => {
      if (!currentMemberId) return []

      let items = await fetchTodoItems(currentMemberId)

      if (filter === 'assigned') {
        items = items.filter((t) => t.assigneeId === currentMemberId)
      } else if (filter === 'created') {
        items = items.filter((t) => t.creatorId === currentMemberId)
      }

      const tagMap = await fetchItemTags(items.map((t) => t.id))
      const placements = await fetchTodoListPlacements(items.map((t) => t.id))

      const enriched = await Promise.all(
        items.map(async (item) => {
          const sharedListId = placements.sharedLists.get(item.id)?.[0] ?? null
          const tags = tagMap.get(item.id) ?? []

          if (sharedListId) {
            return { ...item, tags, privateListId: null, sharedListId }
          }

          let privateListId =
            placements.memberLists.get(`${item.id}:${currentMemberId}`) ?? null

          return { ...item, tags, privateListId, sharedListId: null }
        }),
      )

      return enriched
    },
  })
}

export function useTodoListPlacements(todoIds: string[]) {
  return useQuery({
    queryKey: ['todo-list-placements', todoIds.slice().sort().join(',')],
    enabled: Boolean(supabase && todoIds.length > 0),
    queryFn: async () => fetchTodoListPlacements(todoIds),
  })
}

export function useTodo(id: string | undefined) {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useQuery<TodoItem>({
    queryKey: ['todo', id],
    enabled: Boolean(id && currentMemberId && supabase),
    placeholderData: (previous) => {
      if (previous) return previous
      if (!id || !currentMemberId) return undefined
      const queries = queryClient.getQueriesData<TodoItem[]>({
        queryKey: ['todos', currentMemberId],
      })
      for (const [, data] of queries) {
        const found = data?.find((t) => t.id === id)
        if (found) return found
      }
      return undefined
    },
    queryFn: async () => {
      if (!supabase || !id) throw new Error('无效待办')

      const { data, error } = await supabase
        .from('todo_items')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      const placements = await fetchTodoListPlacements([id])
      const item = toTodoItem(data as DbItem)
      const tagMap = await fetchItemTags([id])

      const sharedListId = placements.sharedLists.get(id)?.[0] ?? null
      if (sharedListId) {
        return {
          ...item,
          tags: tagMap.get(id) ?? [],
          privateListId: null,
          sharedListId,
        }
      }

      let privateListId =
        placements.memberLists.get(`${id}:${currentMemberId}`) ?? null
      const isParticipant =
        item.creatorId === currentMemberId || item.assigneeId === currentMemberId
      if (!privateListId && isParticipant && currentMemberId) {
        privateListId = await ensureMemberPrivateList(id, currentMemberId)
      }

      return {
        ...item,
        tags: tagMap.get(id) ?? [],
        privateListId,
        sharedListId: null,
      }
    },
  })
}

export function useCreateTodo() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: TodoFormInput) => {
      if (!supabase || !currentMemberId || !session?.user.id) {
        throw new Error('未选择成员')
      }

      const status = getInitialStatus(input.requireFeedback)
      const snapshot = snapshotFromFormInput(input)
      const now = new Date().toISOString()

      const listId = input.sharedListId ?? input.privateListId
      if (!listId) throw new Error('请选择清单')

      const insert: Record<string, unknown> = {
        title: input.title.trim(),
        description: input.description?.trim() || null,
        list_id: listId,
        creator_id: currentMemberId,
        assignee_id: input.assigneeId,
        ...scheduleFieldsFromInput(input),
        require_feedback: input.requireFeedback,
        status,
        recurrence_rule: input.recurrenceRule ?? null,
        awaiting_member_id: input.requireFeedback ? input.assigneeId : null,
        negotiation_snapshot: snapshot,
        creator_agreed_at: input.requireFeedback ? now : null,
        assignee_agreed_at:
          input.requireFeedback && input.assigneeId === currentMemberId ? now : null,
      }
      if (input.priority) insert.priority = input.priority

      const { data, error } = await supabase
        .from('todo_items')
        .insert(insert)
        .select()
        .single()

      if (error) throw error
      const item = toTodoItem(data as DbItem)

      if (input.sharedListId) {
        await syncListSelection(item.id, currentMemberId, input.sharedListId, 'shared')
      } else {
        await syncListSelection(item.id, currentMemberId, input.privateListId, 'private')
      }

      if (input.tagIds?.length) {
        await supabase.from('todo_item_tags').insert(
          input.tagIds.map((tagId) => ({
            todo_item_id: item.id,
            tag_id: tagId,
          })),
        )
      }

      if (input.customRemindAt) {
        await createReminderAt(item.id, input.assigneeId, input.customRemindAt)
      } else if (
        input.dueAt &&
        input.reminderOffset &&
        input.reminderOffset !== 'custom'
      ) {
        const dueDate = isoToLocalDate(input.dueAt)
        if (dueDate) {
          await createReminder(item.id, input.assigneeId, dueDate, input.reminderOffset)
        }
      }

      await logStatusChange(item.id, null, status, currentMemberId)

      if (status === 'pending_accept' && input.assigneeId !== currentMemberId) {
        const { data: creator } = await supabase
          .from('todo_family_members')
          .select('name')
          .eq('id', currentMemberId)
          .single()
        await supabase.from('todo_notifications').insert({
          recipient_id: input.assigneeId,
          type: 'assigned',
          todo_item_id: item.id,
          message: `${(creator as { name: string })?.name ?? '成员'} 分配了待办给你：${item.title}`,
        })
      }

      return item
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
    },
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: Partial<TodoFormInput>
      updateRecurrenceSeries?: boolean
    }) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      const { data: existingItem, error: fetchError } = await supabase
        .from('todo_items')
        .select('creator_id, list_id')
        .eq('id', input.id)
        .single()
      if (fetchError) throw fetchError
      const isCreator =
        (existingItem as { creator_id: string }).creator_id === currentMemberId

      const patch: Record<string, unknown> = {}
      if (input.patch.title !== undefined) patch.title = input.patch.title.trim()
      if (input.patch.description !== undefined) {
        patch.description = input.patch.description?.trim() || null
      }
      const nextListId = input.patch.sharedListId ?? input.patch.privateListId
      if (nextListId !== undefined && isCreator) {
        patch.list_id = nextListId || (existingItem as { list_id: string }).list_id
      }
      if (input.patch.assigneeId !== undefined) {
        patch.assignee_id = input.patch.assigneeId
        const creatorId = (existingItem as { creator_id: string }).creator_id
        patch.require_feedback = input.patch.assigneeId !== creatorId
      }
      if (input.patch.priority) {
        patch.priority = input.patch.priority
      }
      if (
        input.patch.isAllDay !== undefined ||
        input.patch.startAt !== undefined ||
        input.patch.dueAt !== undefined ||
        input.patch.startDate !== undefined ||
        input.patch.dueDate !== undefined
      ) {
        Object.assign(patch, scheduleFieldsFromInput(input.patch))
      }
      if (input.patch.requireFeedback !== undefined) {
        patch.require_feedback = input.patch.requireFeedback
      }
      if (input.patch.recurrenceRule !== undefined) {
        patch.recurrence_rule = input.patch.recurrenceRule
      }

      const { data, error } = await supabase
        .from('todo_items')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error

      if (input.updateRecurrenceSeries && input.patch.recurrenceRule) {
        const parentId =
          (data as DbItem).parent_recurrence_id ?? (data as DbItem).id
        await supabase
          .from('todo_items')
          .update({ recurrence_rule: input.patch.recurrenceRule })
          .eq('id', parentId)
      }

      if (input.patch.tagIds) {
        await supabase.from('todo_item_tags').delete().eq('todo_item_id', input.id)
        if (input.patch.tagIds.length > 0) {
          await supabase.from('todo_item_tags').insert(
            input.patch.tagIds.map((tagId) => ({
              todo_item_id: input.id,
              tag_id: tagId,
            })),
          )
        }
      }

      if (input.patch.sharedListId !== undefined) {
        if (input.patch.sharedListId) {
          await syncListSelection(input.id, currentMemberId, input.patch.sharedListId, 'shared')
        } else if (input.patch.privateListId) {
          await syncListSelection(input.id, currentMemberId, input.patch.privateListId, 'private')
        } else {
          await syncSharedListPlacement(input.id, null)
        }
      } else if (input.patch.privateListId !== undefined) {
        await syncListSelection(input.id, currentMemberId, input.patch.privateListId, 'private')
      }

      return toTodoItem(data as DbItem)
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo', vars.id] })
    },
  })
}

export function useNegotiationAction() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (input: {
      id: string
      action: 'agree' | 'submit' | 'resend'
      patch: Partial<TodoFormInput> & { tagIds?: string[] }
      todo: Pick<
        TodoItem,
        | 'status'
        | 'creatorId'
        | 'assigneeId'
        | 'awaitingMemberId'
        | 'creatorAgreedAt'
        | 'assigneeAgreedAt'
      >
    }) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      const isCreator = input.todo.creatorId === currentMemberId
      const isAssignee = input.todo.assigneeId === currentMemberId
      const otherParty = getNegotiationOtherParty(input.todo, currentMemberId)
      const now = new Date().toISOString()

      const { data: existingRow, error: fetchError } = await supabase
        .from('todo_items')
        .select('*')
        .eq('id', input.id)
        .single()
      if (fetchError) throw fetchError
      const existing = existingRow as DbItem

      const snapshot = snapshotFromFormInput({
        title: input.patch.title ?? existing.title,
        description: input.patch.description ?? existing.description ?? undefined,
        priority: input.patch.priority ?? existing.priority,
        isAllDay: input.patch.isAllDay ?? existing.is_all_day ?? true,
        startAt:
          input.patch.startAt !== undefined ? input.patch.startAt : existing.start_at,
        dueAt: input.patch.dueAt !== undefined ? input.patch.dueAt : existing.due_at,
        startDate: input.patch.startDate ?? existing.start_date ?? undefined,
        dueDate: input.patch.dueDate ?? existing.due_date ?? undefined,
        tagIds: input.patch.tagIds,
        recurrenceRule: input.patch.recurrenceRule ?? existing.recurrence_rule,
      })

      const contentPatch: Record<string, unknown> = {}
      if (input.patch.title !== undefined) contentPatch.title = input.patch.title.trim()
      if (input.patch.description !== undefined) {
        contentPatch.description = input.patch.description?.trim() || null
      }
      if (input.patch.priority) contentPatch.priority = input.patch.priority
      if (
        input.patch.isAllDay !== undefined ||
        input.patch.startAt !== undefined ||
        input.patch.dueAt !== undefined ||
        input.patch.startDate !== undefined ||
        input.patch.dueDate !== undefined
      ) {
        Object.assign(
          contentPatch,
          scheduleFieldsFromInput({
            isAllDay: input.patch.isAllDay ?? existing.is_all_day ?? true,
            startAt:
              input.patch.startAt !== undefined ? input.patch.startAt : existing.start_at,
            dueAt: input.patch.dueAt !== undefined ? input.patch.dueAt : existing.due_at,
            startDate: input.patch.startDate,
            dueDate: input.patch.dueDate,
          }),
        )
      }
      if (input.patch.recurrenceRule !== undefined) {
        contentPatch.recurrence_rule = input.patch.recurrenceRule
      }

      let patch: Record<string, unknown>
      let agreed = false

      if (input.action === 'agree') {
        if (input.todo.awaitingMemberId !== currentMemberId) {
          throw new Error('尚未轮到您确认')
        }
        patch = {}
        if (isCreator) patch.creator_agreed_at = now
        if (isAssignee) patch.assignee_agreed_at = now

        const nextCreatorAgreed = isCreator ? now : input.todo.creatorAgreedAt
        const nextAssigneeAgreed = isAssignee ? now : input.todo.assigneeAgreedAt
        agreed = Boolean(
          nextCreatorAgreed &&
            (input.todo.creatorId === input.todo.assigneeId || nextAssigneeAgreed),
        )

        if (agreed) {
          Object.assign(patch, snapshotToContentPatch(snapshot), {
            status: 'in_progress',
            awaiting_member_id: null,
            negotiation_snapshot: snapshot,
          })
        } else {
          patch.awaiting_member_id = otherParty
        }
      } else if (input.action === 'submit') {
        patch = {
          negotiation_snapshot: snapshot,
          creator_agreed_at: isCreator ? now : null,
          assignee_agreed_at: isAssignee ? now : null,
          awaiting_member_id: otherParty,
        }

        if (input.todo.status === 'rejected') {
          patch.status = 'pending_accept'
        }

        const nextListId = input.patch.sharedListId ?? input.patch.privateListId
        if (nextListId !== undefined && isCreator) {
          patch.list_id = nextListId
        }
      } else {
        if (!isCreator || input.todo.status !== 'rejected') {
          throw new Error('当前状态不允许重新派发')
        }
        patch = {
          ...contentPatch,
          status: 'pending_accept',
          awaiting_member_id: input.todo.assigneeId,
          creator_agreed_at: now,
          assignee_agreed_at: null,
          negotiation_snapshot: snapshot,
        }

        const nextListId = input.patch.sharedListId ?? input.patch.privateListId
        if (nextListId !== undefined && isCreator) {
          patch.list_id = nextListId
        }
      }

      const { data, error } = await supabase
        .from('todo_items')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error

      if (input.action !== 'submit' || isCreator) {
        if (input.patch.sharedListId) {
          await syncListSelection(input.id, currentMemberId, input.patch.sharedListId, 'shared')
        } else if (input.patch.privateListId) {
          await syncListSelection(input.id, currentMemberId, input.patch.privateListId, 'private')
        }
      }

      const shouldSyncTags =
        input.patch.tagIds !== undefined &&
        (input.action === 'resend' || (input.action === 'agree' && agreed))

      if (shouldSyncTags && input.patch.tagIds) {
        await supabase.from('todo_item_tags').delete().eq('todo_item_id', input.id)
        if (input.patch.tagIds.length > 0) {
          await supabase.from('todo_item_tags').insert(
            input.patch.tagIds.map((tagId) => ({
              todo_item_id: input.id,
              tag_id: tagId,
            })),
          )
        }
      }

      if (input.action === 'submit' || input.action === 'resend') {
        const { data: editor } = await supabase
          .from('todo_family_members')
          .select('name')
          .eq('id', currentMemberId)
          .single()
        const recipient =
          input.action === 'resend' ? input.todo.assigneeId : otherParty
        await sendProposalNotification(
          input.id,
          recipient,
          (editor as { name: string })?.name ?? '成员',
          snapshot.title,
        )
      }

      await markTodoNotificationsRead(input.id, currentMemberId)

      if (input.action === 'agree' && agreed) {
        await logStatusChange(input.id, input.todo.status, 'in_progress', currentMemberId)
        await sendExecutionStartedNotifications(
          input.id,
          input.todo.creatorId,
          input.todo.assigneeId,
          snapshot.title,
        )
      }

      return toTodoItem(data as DbItem)
    },
    onSuccess: (data, vars) => {
      patchTodoInListCaches(queryClient, currentMemberId, vars.id, data)
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['todo-list-placements'] })
      void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
    },
  })
}

/** @deprecated Use useNegotiationAction */
export function useSaveTodoNegotiation() {
  const negotiation = useNegotiationAction()
  return useMutation({
    mutationFn: async (input: {
      id: string
      patch: Partial<TodoFormInput>
      currentStatus: TodoStatus
      creatorId: string
      assigneeId: string
    }) => {
      return negotiation.mutateAsync({
        id: input.id,
        action: 'submit',
        patch: input.patch,
        todo: {
          status: input.currentStatus,
          creatorId: input.creatorId,
          assigneeId: input.assigneeId,
          awaitingMemberId: null,
          creatorAgreedAt: null,
          assigneeAgreedAt: null,
        },
      })
    },
  })
}

/** @deprecated Use useNegotiationAction */
export function useConfirmNegotiation() {
  const negotiation = useNegotiationAction()
  return useMutation({
    mutationFn: async (input: {
      id: string
      todo: Pick<
        TodoItem,
        | 'status'
        | 'creatorId'
        | 'assigneeId'
        | 'awaitingMemberId'
        | 'creatorAgreedAt'
        | 'assigneeAgreedAt'
      >
    }) => {
      return negotiation.mutateAsync({
        id: input.id,
        action: 'agree',
        patch: {},
        todo: input.todo,
      })
    },
  })
}

export function useDeleteTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; deleteSeries?: boolean }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      if (input.deleteSeries) {
        const { data: item } = await supabase
          .from('todo_items')
          .select('id, parent_recurrence_id, recurrence_rule')
          .eq('id', input.id)
          .single()

        const parentId =
          (item as { parent_recurrence_id: string | null })?.parent_recurrence_id ??
          (item as { recurrence_rule: RecurrenceRule | null })?.recurrence_rule
            ? input.id
            : null

        if (parentId) {
          await supabase
            .from('todo_items')
            .delete()
            .or(`id.eq.${parentId},parent_recurrence_id.eq.${parentId}`)
        }
      }

      const { error } = await supabase.from('todo_items').delete().eq('id', input.id)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
    },
  })
}

export function useTodoStatusAction() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (input: {
      id: string
      action: 'accept' | 'reject' | 'complete' | 'verify' | 'return'
      reason?: string
      role: 'creator' | 'assignee'
      currentStatus: string
    }) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      if (!canTransition(input.currentStatus as never, input.action, input.role)) {
        throw new Error('当前状态不允许此操作')
      }

      const transitions: Record<string, { status: string; completedAt?: string | null }> = {
        accept: { status: 'accepted' },
        reject: { status: 'rejected' },
        complete: { status: 'pending_review' },
        verify: { status: 'completed', completedAt: new Date().toISOString() },
        return: { status: 'returned' },
      }

      let awaitingMemberId: string | null | undefined

      if (input.action === 'complete') {
        const { data: item } = await supabase
          .from('todo_items')
          .select('require_feedback, creator_id, assignee_id')
          .eq('id', input.id)
          .single()

        const row = item as {
          require_feedback: boolean
          creator_id: string
          assignee_id: string
        }

        if (!row.require_feedback) {
          transitions.complete = {
            status: 'completed',
            completedAt: new Date().toISOString(),
          }
        } else {
          awaitingMemberId = row.creator_id
        }
      }

      if (input.action === 'return') {
        const { data: item } = await supabase
          .from('todo_items')
          .select('assignee_id')
          .eq('id', input.id)
          .single()
        awaitingMemberId = (item as { assignee_id: string }).assignee_id
      }

      const next = transitions[input.action]
      const patch: Record<string, unknown> = { status: next.status }
      if (awaitingMemberId !== undefined) patch.awaiting_member_id = awaitingMemberId
      if (next.completedAt !== undefined) patch.completed_at = next.completedAt
      if (input.action === 'accept' || input.action === 'reject') {
        if (input.action === 'reject') {
          const { data: item } = await supabase
            .from('todo_items')
            .select('creator_id')
            .eq('id', input.id)
            .single()
          patch.awaiting_member_id = (item as { creator_id: string }).creator_id
        } else {
          patch.awaiting_member_id = null
        }
      }

      const { data, error } = await supabase
        .from('todo_items')
        .update(patch)
        .eq('id', input.id)
        .select()
        .single()

      if (error) throw error

      await logStatusChange(
        input.id,
        input.currentStatus as never,
        next.status as never,
        currentMemberId,
        input.reason,
      )

      await markTodoNotificationsRead(input.id, currentMemberId)

      return toTodoItem(data as DbItem)
    },
    onSuccess: (data, vars) => {
      patchTodoInListCaches(queryClient, currentMemberId, vars.id, data)
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['todo-logs', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['todo-status-reasons'] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
    },
  })
}

export function useToggleTodoComplete() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (todo: { id: string; status: string }) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      const { data, error } = await supabase
        .from('todo_items')
        .update({ status: 'in_progress', completed_at: null })
        .eq('id', todo.id)
        .select()
        .single()

      if (error) throw error

      await logStatusChange(
        todo.id,
        todo.status as never,
        'in_progress',
        currentMemberId,
      )

      return toTodoItem(data as DbItem)
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
    },
  })
}

export function useRemindTodoCreator() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (todo: Pick<TodoItem, 'id' | 'title' | 'creatorId'>) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      const { data: member } = await supabase
        .from('todo_family_members')
        .select('name')
        .eq('id', currentMemberId)
        .single()

      const { error } = await supabase.from('todo_notifications').insert({
        recipient_id: todo.creatorId,
        type: 'reminder',
        todo_item_id: todo.id,
        message: `${(member as { name: string })?.name ?? '负责人'} 催办验收：${todo.title}`,
      })

      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useTodoStatusLogs(todoItemId: string | undefined) {
  return useQuery({
    queryKey: ['todo-logs', todoItemId],
    enabled: Boolean(todoItemId && supabase),
    queryFn: async () => {
      if (!supabase || !todoItemId) return []

      const { data, error } = await supabase
        .from('todo_status_logs')
        .select('*')
        .eq('todo_item_id', todoItemId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return (data ?? []).map((row) => toStatusLog(row as never))
    },
  })
}

export function useTodoStatusReasons(todos: { id: string; status: TodoStatus }[]) {
  const todoIds = todos
    .filter((t) => t.status === 'rejected' || t.status === 'returned')
    .map((t) => t.id)
    .sort()
    .join(',')

  return useQuery({
    queryKey: ['todo-status-reasons', todoIds],
    enabled: Boolean(supabase && todoIds.length > 0),
    queryFn: async () => {
      if (!supabase || !todoIds) return new Map<string, string>()

      const ids = todoIds.split(',')
      const { data, error } = await supabase
        .from('todo_status_logs')
        .select('*')
        .in('todo_item_id', ids)
        .in('to_status', ['rejected', 'returned'])
        .not('reason', 'is', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      const logs = (data ?? []).map((row) => toStatusLog(row as never))
      return pickStatusReasonsForTodos(todos, logs)
    },
  })
}

export function useTodoTags() {
  const { session } = useAuth()

  return useQuery({
    queryKey: ['todo-tags', session?.user.id],
    enabled: Boolean(session?.user.id && supabase),
    queryFn: async () => {
      if (!supabase || !session?.user.id) return []

      const { data, error } = await supabase
        .from('todo_tags')
        .select('*')
        .eq('user_id', session.user.id)
        .order('name')

      if (error) throw error
      return (data ?? []).map((row) => toTodoTag(row as never))
    },
    staleTime: 60_000,
  })
}

export function useCreateTodoTag() {
  const queryClient = useQueryClient()
  const { session } = useAuth()

  return useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      if (!supabase || !session?.user.id) throw new Error('未登录')

      const { data, error } = await supabase
        .from('todo_tags')
        .insert({
          user_id: session.user.id,
          name: input.name.trim(),
          color: input.color ?? '#6b7280',
        })
        .select()
        .single()

      if (error) throw error
      return toTodoTag(data as never)
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todo-tags'] })
    },
  })
}

export function usePortalStats() {
  const { currentMemberId } = useCurrentMember()

  return useQuery({
    queryKey: ['portal-stats', currentMemberId],
    enabled: Boolean(currentMemberId && supabase),
    queryFn: async () => {
      if (!supabase || !currentMemberId) {
        return { itemCount: 0, expiringCount: 0, activeTodos: 0, dueToday: 0 }
      }

      const today = new Date().toISOString().slice(0, 10)

      const [itemsRes, todosRes] = await Promise.all([
        supabase.from('items').select('id, expiry_date', { count: 'exact' }),
        supabase
          .from('todo_items')
          .select('id, status, due_date')
          .or(`creator_id.eq.${currentMemberId},assignee_id.eq.${currentMemberId}`),
      ])

      const items = itemsRes.data ?? []
      const expiringCount = items.filter((i) => {
        const exp = (i as { expiry_date: string | null }).expiry_date
        if (!exp) return false
        const diff = (new Date(exp).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        return diff >= 0 && diff <= 7
      }).length

      const todos = todosRes.data ?? []
      const activeTodos = todos.filter(
        (t) => (t as { status: string }).status !== 'completed',
      ).length
      const dueToday = todos.filter(
        (t) =>
          (t as { due_date: string | null }).due_date === today &&
          (t as { status: string }).status !== 'completed',
      ).length

      return {
        itemCount: itemsRes.count ?? items.length,
        expiringCount,
        activeTodos,
        dueToday,
      }
    },
  })
}

export function useUpdateTodoDueDate() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { id: string; dueDate: string }) => {
      if (!supabase) throw new Error('未配置 Supabase')

      const { error } = await supabase
        .from('todo_items')
        .update({ due_date: input.dueDate })
        .eq('id', input.id)

      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}

export type { TodoPriority }
