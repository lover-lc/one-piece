import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../../../shared/hooks/use-auth'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { supabase } from '../../../shared/lib/supabase'
import {
  createReminder,
  fetchItemTags,
  fetchTodoItems,
  getInitialStatus,
  logStatusChange,
  toTodoItem,
  toTodoList,
  toTodoTag,
  toStatusLog,
  canTransition,
} from '../services/todo-service'
import type { RecurrenceRule, TodoFormInput, TodoPriority } from '../types/todo-types'

type DbList = {
  id: string
  name: string
  owner_id: string
  color: string | null
  sort_order: number
  created_at: string
}

type DbItem = Parameters<typeof toTodoItem>[0]

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
        .eq('owner_id', currentMemberId)
        .order('sort_order', { ascending: true })

      if (error) throw error
      return (data as DbList[]).map(toTodoList)
    },
  })
}

export function useCreateTodoList() {
  const queryClient = useQueryClient()
  const { currentMemberId } = useCurrentMember()

  return useMutation({
    mutationFn: async (input: { name: string; color?: string }) => {
      if (!supabase || !currentMemberId) throw new Error('未选择成员')

      const { data: existing } = await supabase
        .from('todo_lists')
        .select('sort_order')
        .eq('owner_id', currentMemberId)
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
          .from('todo_items')
          .update({ list_id: input.moveToListId })
          .eq('list_id', input.id)
        if (moveError) throw moveError
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
      return items.map((item) => ({ ...item, tags: tagMap.get(item.id) ?? [] }))
    },
  })
}

export function useTodo(id: string | undefined) {
  const { currentMemberId } = useCurrentMember()

  return useQuery({
    queryKey: ['todo', id],
    enabled: Boolean(id && currentMemberId && supabase),
    queryFn: async () => {
      if (!supabase || !id) throw new Error('无效待办')

      const { data, error } = await supabase
        .from('todo_items')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      const tagMap = await fetchItemTags([id])
      return { ...toTodoItem(data as DbItem), tags: tagMap.get(id) ?? [] }
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

      const { data, error } = await supabase
        .from('todo_items')
        .insert({
          title: input.title.trim(),
          description: input.description?.trim() || null,
          list_id: input.listId,
          creator_id: currentMemberId,
          assignee_id: input.assigneeId,
          priority: input.priority,
          start_date: input.startDate || null,
          due_date: input.dueDate,
          require_feedback: input.requireFeedback,
          status,
          recurrence_rule: input.recurrenceRule ?? null,
        })
        .select()
        .single()

      if (error) throw error
      const item = toTodoItem(data as DbItem)

      if (input.tagIds?.length) {
        await supabase.from('todo_item_tags').insert(
          input.tagIds.map((tagId) => ({
            todo_item_id: item.id,
            tag_id: tagId,
          })),
        )
      }

      if (input.reminderOffset && input.reminderOffset !== 'custom') {
        await createReminder(item.id, input.assigneeId, input.dueDate, input.reminderOffset)
      } else if (input.customRemindAt) {
        await supabase.from('todo_reminders').insert({
          todo_item_id: item.id,
          member_id: input.assigneeId,
          remind_at: input.customRemindAt,
        })
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

      const patch: Record<string, unknown> = {}
      if (input.patch.title !== undefined) patch.title = input.patch.title.trim()
      if (input.patch.description !== undefined) {
        patch.description = input.patch.description?.trim() || null
      }
      if (input.patch.listId !== undefined) patch.list_id = input.patch.listId
      if (input.patch.assigneeId !== undefined) patch.assignee_id = input.patch.assigneeId
      if (input.patch.priority !== undefined) patch.priority = input.patch.priority
      if (input.patch.startDate !== undefined) patch.start_date = input.patch.startDate || null
      if (input.patch.dueDate !== undefined) patch.due_date = input.patch.dueDate
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

      return toTodoItem(data as DbItem)
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo', vars.id] })
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

      if (input.action === 'complete') {
        const { data: item } = await supabase
          .from('todo_items')
          .select('require_feedback')
          .eq('id', input.id)
          .single()

        if (!(item as { require_feedback: boolean }).require_feedback) {
          transitions.complete = {
            status: 'completed',
            completedAt: new Date().toISOString(),
          }
        }
      }

      const next = transitions[input.action]
      const patch: Record<string, unknown> = { status: next.status }
      if (next.completedAt !== undefined) patch.completed_at = next.completedAt

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

      return toTodoItem(data as DbItem)
    },
    onSuccess: (_data, vars) => {
      void queryClient.invalidateQueries({ queryKey: ['todos'] })
      void queryClient.invalidateQueries({ queryKey: ['todo', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['todo-logs', vars.id] })
      void queryClient.invalidateQueries({ queryKey: ['notifications'] })
      void queryClient.invalidateQueries({ queryKey: ['portal-stats'] })
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
