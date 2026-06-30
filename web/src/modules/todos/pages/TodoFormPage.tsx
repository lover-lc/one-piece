import { ChevronRight, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import BottomSheet from '../../../shared/components/ui/BottomSheet'
import DateField, {
  dateFieldFromIso,
  isoFromDateField,
  type DateFieldValue,
} from '../../../shared/components/DateField'
import { isoToLocalDate } from '../../../shared/lib/datetime-utils'
import MemberAvatar from '../../../shared/components/MemberAvatar'
import PageHeaderBar from '../../../shared/components/PageHeaderBar'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { useFamilyMembers, type FamilyMember } from '../../../shared/hooks/use-family-members'
import {
  useCreateTodo,
  useCreateTodoList,
  useCreateTodoTag,
  useDeleteTodo,
  useNegotiationAction,
  useTodo,
  useTodoLists,
  useTodoStatusAction,
  useTodoStatusLogs,
  useTodoTags,
  useUpdateTodo,
} from '../hooks/use-todos'
import TodoActionDialog from '../components/TodoActionDialog'
import TodoStatusReasonBanner from '../components/TodoStatusReasonBanner'
import { deriveRequireFeedback } from '../lib/require-feedback'
import {
  effectiveListIdFromTodo,
  listFormToPlacements,
  listOptionLabel,
} from '../lib/todo-list-placement'
import {
  type NegotiationFieldKey,
  type NegotiationFormState,
  snapshotToFormState,
} from '../lib/negotiation-snapshot'
import {
  canDeleteTodo,
  getDetailHeaderMode,
  getNegotiationChangedFields,
  isFieldsLocked,
  shouldLoadProposalInForm,
} from '../lib/negotiation-ui'
import {
  formatReminderSelectionLabel,
  getEnabledReminderOptions,
  REMINDER_NONE_ID,
  resolveReminderAt,
  type ReminderSelection,
} from '../lib/reminder-presets'
import {
  findRecurrencePreset,
  formatRecurrenceRuleSummary,
  getOrderedRecurrencePresets,
  matchRecurrencePresetId,
  presetToRecurrenceRule,
} from '../lib/recurrence-presets'
import { useTodoUiStore } from '../store/todo-ui-store'
import {
  getLatestStatusReason,
  isReasonStatus,
} from '../lib/todo-status-reason'
import { DEFAULT_TODO_LIST_COLOR } from '../lib/todo-list-colors'
import type { RecurrenceRule, TodoFormInput, TodoPriority } from '../types/todo-types'
import { cn } from '@/lib/utils'

type FormFieldKey = 'title' | 'listId' | 'assigneeId' | 'dateRange'

const PRIORITY_OPTIONS: { id: string; name: string }[] = [
  { id: '', name: '未设置' },
  { id: 'high', name: '高' },
  { id: 'medium', name: '中' },
  { id: 'low', name: '低' },
]

const REMINDER_NONE_ID_LOCAL = REMINDER_NONE_ID

const fieldInputClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary'

function FormCard({ children }: { children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-card bg-bg-card">
      <div className="divide-y divide-bg-hover">{children}</div>
    </section>
  )
}

function FormRow({
  label,
  children,
  error,
  rowRef,
  highlighted,
}: {
  label: string
  children: ReactNode
  error?: string | null
  rowRef?: RefObject<HTMLDivElement | null>
  highlighted?: boolean
}) {
  return (
    <div
      ref={rowRef}
      className={cn(
        'px-4 py-2',
        error && 'bg-status-expired/5 ring-2 ring-inset ring-status-expired/40',
        highlighted &&
          !error &&
          'bg-amber-50 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800/50',
      )}
    >
      <label className="mb-1 block text-xs text-text-secondary">{label}</label>
      {children}
      {error ? <p className="mt-1 text-xs text-status-expired">{error}</p> : null}
    </div>
  )
}

function PickerButton({
  value,
  onClick,
}: {
  value: string | null
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full min-w-0 items-center justify-between rounded-button border border-bg-hover bg-bg px-3 py-2 text-left text-sm"
    >
      <span className={value ? 'truncate text-text' : 'truncate text-transparent'}>
        {value ?? '\u00a0'}
      </span>
      <ChevronRight className="size-4 shrink-0 text-text-tertiary" />
    </button>
  )
}

function QuickAddSheet({
  open,
  title,
  placeholder,
  onClose,
  onSubmit,
  isPending,
}: {
  open: boolean
  title: string
  placeholder: string
  onClose: () => void
  onSubmit: (name: string) => void
  isPending: boolean
}) {
  const [name, setName] = useState('')

  useEffect(() => {
    if (open) setName('')
  }, [open])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={placeholder}
          autoFocus
          className={fieldInputClass}
        />
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-button px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isPending || !name.trim()}
            className="rounded-button bg-primary px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
          >
            {isPending ? '添加中…' : '添加'}
          </button>
        </div>
      </form>
    </BottomSheet>
  )
}

function OptionSheet({
  open,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
  onAddNew,
  addLabel,
  manageHref,
  manageLabel = '管理清单',
  showMemberAvatar = false,
}: {
  open: boolean
  title: string
  options: {
    id: string
    name: string
    member?: FamilyMember
    color?: string | null
    badge?: string
  }[]
  selectedId: string | null
  onSelect: (id: string) => void
  onClose: () => void
  onAddNew?: () => void
  addLabel?: string
  manageHref?: string
  manageLabel?: string
  showMemberAvatar?: boolean
}) {
  return (
    <BottomSheet open={open} onClose={onClose} title={title}>
      <ul className="max-h-[50svh] overflow-y-auto">
        {options.map((opt) => (
          <li key={opt.id}>
            <button
              type="button"
              onClick={() => {
                onSelect(opt.id)
                onClose()
              }}
              className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-bg-hover ${
                selectedId === opt.id ? 'font-medium text-primary' : 'text-text'
              }`}
            >
              {showMemberAvatar && opt.member ? (
                <MemberAvatar member={opt.member} size="sm" />
              ) : null}
              {opt.color ? (
                <span
                  className="size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: opt.color }}
                />
              ) : null}
              <span className="min-w-0 flex-1 truncate">{opt.name}</span>
              {opt.badge ? (
                <span className="shrink-0 rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-secondary">
                  {opt.badge}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
      {onAddNew || manageHref ? (
        <div className="space-y-1 border-t border-bg-hover p-4">
          {addLabel && onAddNew ? (
            <button
              type="button"
              onClick={() => {
                onClose()
                onAddNew()
              }}
              className="flex w-full items-center justify-center gap-1.5 rounded-button py-2.5 text-sm text-primary hover:bg-bg-hover"
            >
              <Plus className="size-4" />
              {addLabel}
            </button>
          ) : null}
          {manageHref ? (
            <Link
              to={manageHref}
              onClick={onClose}
              className="flex w-full items-center justify-center rounded-button py-2.5 text-sm text-text-secondary hover:bg-bg-hover"
            >
              {manageLabel}
            </Link>
          ) : null}
        </div>
      ) : null}
    </BottomSheet>
  )
}

export default function TodoFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { currentMemberId } = useCurrentMember()
  const { data: members = [] } = useFamilyMembers()
  const { data: lists = [] } = useTodoLists()
  const { data: tags = [] } = useTodoTags()
  const { data: existing, isLoading: todoLoading } = useTodo(id)
  const { data: statusLogs = [] } = useTodoStatusLogs(id)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const saveNegotiation = useNegotiationAction()
  const statusAction = useTodoStatusAction()
  const deleteTodo = useDeleteTodo()
  const createList = useCreateTodoList()
  const createTag = useCreateTodoTag()
  const lastUsedListId = useTodoUiStore((s) => s.lastUsedListId)
  const setLastUsedListId = useTodoUiStore((s) => s.setLastUsedListId)
  const customReminderPresets = useTodoUiStore((s) => s.reminderPresets)
  const reminderPresetOrder = useTodoUiStore((s) => s.reminderPresetOrder)
  const reminderPresetDisabled = useTodoUiStore((s) => s.reminderPresetDisabled)
  const customRecurrencePresets = useTodoUiStore((s) => s.recurrencePresets)
  const recurrencePresetOrder = useTodoUiStore((s) => s.recurrencePresetOrder)
  const recurrencePresetDisabled = useTodoUiStore((s) => s.recurrencePresetDisabled)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [listId, setListId] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [priority, setPriority] = useState<TodoPriority | ''>('')
  const [isAllDay, setIsAllDay] = useState(false)
  const [startField, setStartField] = useState<DateFieldValue>({ iso: null, hasTime: false })
  const [dueField, setDueField] = useState<DateFieldValue>({ iso: null, hasTime: false })
  const [tagIds, setTagIds] = useState<string[]>([])
  const [selectedRecurrencePresetId, setSelectedRecurrencePresetId] = useState('builtin:none')
  const [preservedRecurrenceRule, setPreservedRecurrenceRule] = useState<RecurrenceRule | null>(
    null,
  )
  const [recurrenceUserChanged, setRecurrenceUserChanged] = useState(false)
  const [reminderSelection, setReminderSelection] = useState<ReminderSelection>({ type: 'none' })
  const [error, setError] = useState<string | null>(null)
  const [updateSeries, setUpdateSeries] = useState(false)
  const [listSheetOpen, setListSheetOpen] = useState(false)
  const [newListSheetOpen, setNewListSheetOpen] = useState(false)
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false)
  const [prioritySheetOpen, setPrioritySheetOpen] = useState(false)
  const [recurrenceSheetOpen, setRecurrenceSheetOpen] = useState(false)
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false)
  const [newTagSheetOpen, setNewTagSheetOpen] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FormFieldKey, string>>>({})
  const titleRowRef = useRef<HTMLDivElement>(null)
  const listRowRef = useRef<HTMLDivElement>(null)
  const assigneeRowRef = useRef<HTMLDivElement>(null)
  const dateRowRef = useRef<HTMLDivElement>(null)
  const formErrorRef = useRef<HTMLParagraphElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!existing) return

    const proposal = shouldLoadProposalInForm(existing, currentMemberId)
    const source = proposal && existing.negotiationSnapshot
      ? snapshotToFormState(existing.negotiationSnapshot)
      : null

    setTitle(source?.title ?? existing.title)
    setDescription(source?.description ?? existing.description ?? '')
    setListId(effectiveListIdFromTodo(existing))
    setAssigneeId(existing.assigneeId)
    setPriority(source?.priority ?? existing.priority ?? '')
    setIsAllDay(source?.isAllDay ?? existing.isAllDay)
    setStartField(
      dateFieldFromIso(
        source?.startAt ?? existing.startAt,
        source?.isAllDay ?? existing.isAllDay,
      ),
    )
    setDueField(
      dateFieldFromIso(source?.dueAt ?? existing.dueAt, source?.isAllDay ?? existing.isAllDay),
    )
    setTagIds(source?.tagIds ?? existing.tags?.map((t) => t.id) ?? [])

    const recurrenceRule = source?.recurrenceRule ?? existing.recurrenceRule
    const matched = matchRecurrencePresetId(recurrenceRule, customRecurrencePresets)
    if (matched) {
      setSelectedRecurrencePresetId(matched)
      setPreservedRecurrenceRule(null)
    } else if (recurrenceRule) {
      setSelectedRecurrencePresetId('builtin:none')
      setPreservedRecurrenceRule(recurrenceRule)
    } else {
      setSelectedRecurrencePresetId('builtin:none')
      setPreservedRecurrenceRule(null)
    }
    setRecurrenceUserChanged(false)
  }, [existing, currentMemberId, customRecurrencePresets])

  const selectableLists = lists

  useEffect(() => {
    if (currentMemberId) setAssigneeId((prev) => prev || currentMemberId)
  }, [currentMemberId])

  useEffect(() => {
    if (isEdit || listId) return
    if (lastUsedListId && lists.some((l) => l.id === lastUsedListId)) {
      setListId(lastUsedListId)
    }
  }, [isEdit, listId, lastUsedListId, lists])

  const selectedList = lists.find((l) => l.id === listId) ?? null
  const selectedListName = selectedList ? listOptionLabel(selectedList) : null
  const selectedAssignee = members.find((m) => m.id === assigneeId) ?? null
  const reminderOptions = getEnabledReminderOptions(
    customReminderPresets,
    reminderPresetOrder,
    reminderPresetDisabled,
  )
  const recurrenceOptions = getOrderedRecurrencePresets(
    customRecurrencePresets,
    recurrencePresetOrder,
    recurrencePresetDisabled,
    { enabledOnly: true },
  ).map((p) => ({ id: p.id, name: p.name }))
  const selectedPriorityName =
    PRIORITY_OPTIONS.find((o) => o.id === priority)?.name ?? null
  const selectedRecurrenceName =
    selectedRecurrencePresetId !== 'builtin:none'
      ? (findRecurrencePreset(selectedRecurrencePresetId, customRecurrencePresets)?.name ?? null)
      : preservedRecurrenceRule
        ? formatRecurrenceRuleSummary(preservedRecurrenceRule)
        : '不重复'
  const selectedReminderName =
    reminderSelection.type === 'none'
      ? '不提醒'
      : formatReminderSelectionLabel(reminderSelection, customReminderPresets)
  const displayedTags = tags.filter((t) => tagIds.includes(t.id))
  const statusReasonLog =
    isEdit && existing && isReasonStatus(existing.status)
      ? getLatestStatusReason(statusLogs, existing.status)
      : null
  const isSaving =
    createTodo.isPending || updateTodo.isPending || saveNegotiation.isPending
  const assignsToOther =
    Boolean(assigneeId && currentMemberId && assigneeId !== currentMemberId)
  const requireFeedback = deriveRequireFeedback(assigneeId, currentMemberId)
  const fieldsLocked = existing
    ? isFieldsLocked(existing.status, existing.requireFeedback)
    : false
  const canDelete =
    isEdit && existing ? canDeleteTodo(existing, currentMemberId) : false

  const startAt = isoFromDateField(startField, isAllDay)
  const dueAt = isoFromDateField(dueField, isAllDay)
  const startDate = startAt ? isoToLocalDate(startAt) ?? '' : ''
  const dueDate = dueAt ? isoToLocalDate(dueAt) ?? '' : ''

  function resolveRecurrenceRule(): RecurrenceRule | null {
    if (selectedRecurrencePresetId !== 'builtin:none') {
      const preset = findRecurrencePreset(selectedRecurrencePresetId, customRecurrencePresets)
      return preset ? presetToRecurrenceRule(preset, existing?.recurrenceRule) : null
    }
    if (recurrenceUserChanged) return null
    return preservedRecurrenceRule
  }

  const effectiveRecurrenceRule = resolveRecurrenceRule()

  const formState: NegotiationFormState = {
    title,
    description,
    priority,
    isAllDay,
    startAt,
    dueAt,
    startDate,
    dueDate,
    tagIds,
    selectedRecurrencePresetId,
    recurrenceRule: effectiveRecurrenceRule,
  }

  const changedFields =
    isEdit && existing
      ? getNegotiationChangedFields(existing, currentMemberId, formState)
      : new Set<NegotiationFieldKey>()

  const headerMode =
    isEdit && existing
      ? getDetailHeaderMode(existing, currentMemberId, formState, existing.negotiationSnapshot)
      : 'save'

  const isActionPending =
    isSaving || saveNegotiation.isPending || statusAction.isPending || deleteTodo.isPending

  function buildFormInput(): TodoFormInput {
    const recurrenceRule = resolveRecurrenceRule()
    const { privateListId, sharedListId } = listFormToPlacements(listId, lists)
    const customRemindAt =
      resolveReminderAt(reminderSelection, dueDate || null, customReminderPresets) ?? undefined
    return {
      title,
      description,
      privateListId,
      sharedListId,
      assigneeId,
      priority: priority || null,
      isAllDay,
      startAt,
      dueAt,
      startDate: startDate || undefined,
      dueDate: dueDate || null,
      requireFeedback,
      recurrenceRule,
      tagIds,
      customRemindAt,
    }
  }

  function persistListChoice() {
    if (listId) setLastUsedListId(listId)
  }

  function validateForm(): boolean {
    setError(null)
    setFieldErrors({})
    const nextFieldErrors: Partial<Record<FormFieldKey, string>> = {}
    if (!title.trim()) nextFieldErrors.title = '标题不能为空'
    if (!listId) nextFieldErrors.listId = '请选择清单'
    if (!assigneeId) nextFieldErrors.assigneeId = '请选择负责人'
    if (isAllDay && !dueAt) {
      nextFieldErrors.dateRange = '全天待办请选择截止日期'
    }
    if (startDate && dueDate && dueDate < startDate) {
      nextFieldErrors.dateRange = '截止日期不能早于开始日期'
    }
    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors)
      const firstField = (
        ['title', 'listId', 'assigneeId', 'dateRange'] as const
      ).find((key) => nextFieldErrors[key])
      if (firstField) scrollToField(firstField)
      return false
    }
    return true
  }

  async function runNegotiation(action: 'agree' | 'submit' | 'resend') {
    if (!id || !existing || !validateForm()) return
    try {
      await saveNegotiation.mutateAsync({
        id,
        action,
        patch: buildFormInput(),
        todo: existing,
      })
      persistListChoice()
      navigate('/todos')
    } catch (err) {
      setError(String((err as Error).message || '操作失败'))
    }
  }

  async function handleRejectNegotiation() {
    if (!id || !existing || !rejectReason.trim()) return
    try {
      await statusAction.mutateAsync({
        id,
        action: 'reject',
        reason: rejectReason.trim(),
        role: 'assignee',
        currentStatus: existing.status,
      })
      setRejectDialogOpen(false)
      navigate('/todos')
    } catch (err) {
      setError(String((err as Error).message || '操作失败'))
    }
  }

  async function handleVerify() {
    if (!id || !existing) return
    try {
      await statusAction.mutateAsync({
        id,
        action: 'verify',
        role: 'creator',
        currentStatus: existing.status,
      })
      navigate('/todos')
    } catch (err) {
      setError(String((err as Error).message || '操作失败'))
    }
  }

  async function handleReturn() {
    if (!id || !existing || !rejectReason.trim()) return
    try {
      await statusAction.mutateAsync({
        id,
        action: 'return',
        reason: rejectReason.trim(),
        role: 'creator',
        currentStatus: existing.status,
      })
      setRejectDialogOpen(false)
      navigate('/todos')
    } catch (err) {
      setError(String((err as Error).message || '操作失败'))
    }
  }

  async function handleSubmitReview() {
    if (!id || !existing) return
    try {
      await statusAction.mutateAsync({
        id,
        action: 'complete',
        role: 'assignee',
        currentStatus: existing.status,
      })
      setCompleteDialogOpen(false)
      navigate('/todos')
    } catch (err) {
      setError(String((err as Error).message || '操作失败'))
    }
  }

  async function handleDelete() {
    if (!id) return
    if (existing?.recurrenceRule || existing?.parentRecurrenceId) {
      const series = window.confirm('删除所有重复实例？取消则仅删除此项')
      await deleteTodo.mutateAsync({ id, deleteSeries: series })
    } else {
      await deleteTodo.mutateAsync({ id })
    }
    navigate('/todos')
  }

  function headerActions(): {
    leading?: Parameters<typeof PageHeaderBar>[0]['leading']
    trailing?: Parameters<typeof PageHeaderBar>[0]['trailing']
    trailingSecondary?: Parameters<typeof PageHeaderBar>[0]['trailingSecondary']
  } {
    const cancelLeading = {
      kind: 'button' as const,
      label: '取消',
      onClick: () => navigate('/todos'),
      variant: 'outline' as const,
    }

    const deleteSecondary = canDelete
      ? {
          kind: 'button' as const,
          label: '删除',
          onClick: () => void handleDelete(),
          variant: 'outline' as const,
          disabled: isActionPending,
        }
      : undefined

    switch (headerMode) {
      case 'agree_reject':
        return {
          leading: cancelLeading,
          trailingSecondary: {
            kind: 'button',
            label: '拒绝',
            onClick: () => {
              setRejectReason('')
              setRejectDialogOpen(true)
            },
            variant: 'outline',
            disabled: isActionPending,
          },
          trailing: {
            kind: 'button',
            label: '同意',
            onClick: () => void runNegotiation('agree'),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'submit_reject':
        return {
          leading: cancelLeading,
          trailingSecondary: {
            kind: 'button',
            label: '拒绝',
            onClick: () => {
              setRejectReason('')
              setRejectDialogOpen(true)
            },
            variant: 'outline',
            disabled: isActionPending,
          },
          trailing: {
            kind: 'button',
            label: '提交确认',
            onClick: () => void runNegotiation('submit'),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'agree_delete':
        return {
          leading: cancelLeading,
          trailingSecondary: deleteSecondary,
          trailing: {
            kind: 'button',
            label: '同意',
            onClick: () => void runNegotiation('agree'),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'submit_delete':
        return {
          leading: cancelLeading,
          trailingSecondary: deleteSecondary,
          trailing: {
            kind: 'button',
            label: '提交确认',
            onClick: () => void runNegotiation('submit'),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'resend_delete':
        return {
          leading: cancelLeading,
          trailingSecondary: deleteSecondary,
          trailing: {
            kind: 'button',
            label: '重新派发',
            onClick: () => void runNegotiation('resend'),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'submit_review':
        return {
          leading: cancelLeading,
          trailing: {
            kind: 'button',
            label: '提交验收',
            onClick: () => setCompleteDialogOpen(true),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'verify_return':
        return {
          leading: cancelLeading,
          trailingSecondary: {
            kind: 'button',
            label: '驳回',
            onClick: () => {
              setRejectReason('')
              setRejectDialogOpen(true)
            },
            variant: 'outline',
            disabled: isActionPending,
          },
          trailing: {
            kind: 'button',
            label: '同意',
            onClick: () => void handleVerify(),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      case 'delete':
        return {
          leading: cancelLeading,
          trailing: {
            kind: 'button',
            label: deleteTodo.isPending ? '删除中…' : '删除',
            onClick: () => void handleDelete(),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      default: {
        const saveLabel = assignsToOther
          ? isSaving
            ? '指派确认中…'
            : '指派确认'
          : isSaving
            ? '保存中…'
            : '保存'
        return {
          leading: cancelLeading,
          trailingSecondary: canDelete ? deleteSecondary : undefined,
          trailing: {
            kind: 'button',
            label: saveLabel,
            onClick: () => void handleSave(),
            variant: 'default',
            disabled: isActionPending,
          },
        }
      }
    }
  }

  const header = headerActions()

  function scrollToField(field: FormFieldKey | 'form') {
    const target =
      field === 'title'
        ? titleRowRef.current
        : field === 'listId'
          ? listRowRef.current
          : field === 'assigneeId'
            ? assigneeRowRef.current
            : field === 'dateRange'
              ? dateRowRef.current
              : formErrorRef.current

    target?.scrollIntoView({ behavior: 'smooth', block: 'center' })

    if (field === 'title') {
      window.setTimeout(() => titleInputRef.current?.focus(), 250)
    }
  }

  async function handleSave() {
    if (!validateForm()) return
    const input = buildFormInput()

    try {
      if (isEdit && id && existing) {
        await updateTodo.mutateAsync({
          id,
          patch: input,
          updateRecurrenceSeries: updateSeries,
        })
      } else {
        await createTodo.mutateAsync(input)
      }
      persistListChoice()
      navigate('/todos')
    } catch (err) {
      setError(String((err as Error).message || '保存失败'))
      window.setTimeout(() => scrollToField('form'), 0)
    }
  }

  async function handleAddList(name: string) {
    const list = await createList.mutateAsync({
      name,
      visibility: 'private',
      color: DEFAULT_TODO_LIST_COLOR,
    })
    setListId(list.id)
    setLastUsedListId(list.id)
    setNewListSheetOpen(false)
  }

  async function handleAddTag(name: string) {
    const tag = await createTag.mutateAsync({ name })
    setTagIds((prev) => [...prev, tag.id])
    setNewTagSheetOpen(false)
  }

  if (isEdit && todoLoading) {
    return (
      <div className="min-h-svh bg-bg">
        <p className="py-12 text-center text-sm text-text-secondary">加载中…</p>
      </div>
    )
  }

  if (isEdit && !todoLoading && !existing) {
    return (
      <div className="min-h-svh bg-bg">
        <p className="py-12 text-center text-sm text-text-secondary">待办不存在</p>
      </div>
    )
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-bg">
      <PageHeaderBar
        leading={header.leading}
        title={isEdit ? undefined : '新建待办'}
        trailing={header.trailing}
        trailingSecondary={header.trailingSecondary}
      />

      {statusReasonLog && existing && isReasonStatus(existing.status) ? (
        <div className="shrink-0 px-4 pt-2">
          <TodoStatusReasonBanner
            status={existing.status}
            log={statusReasonLog}
            members={members}
          />
        </div>
      ) : null}

      <div
        className={cn(
          'min-h-0 flex-1 overflow-y-auto',
          fieldsLocked && 'pointer-events-none opacity-90',
        )}
      >
        <div className="space-y-3 px-4 py-2">
        <FormCard>
          <FormRow
            label="标题 *"
            error={fieldErrors.title}
            rowRef={titleRowRef}
            highlighted={changedFields.has('title')}
          >
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="待办标题"
              className={fieldInputClass}
            />
          </FormRow>
          <FormRow label="描述" highlighted={changedFields.has('description')}>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="备注"
              className={fieldInputClass}
              rows={2}
            />
          </FormRow>
          <FormRow
            label="清单 *"
            error={fieldErrors.listId}
            rowRef={listRowRef}
          >
            <PickerButton
              value={selectedListName}
              onClick={() => setListSheetOpen(true)}
            />
          </FormRow>
          <div className="grid grid-cols-2 gap-0 divide-x divide-bg-hover">
            <FormRow
              label="负责人 *"
              error={fieldErrors.assigneeId}
              rowRef={assigneeRowRef}
            >
              <button
                type="button"
                onClick={() => {
                  if (isEdit && assignsToOther) return
                  setAssigneeSheetOpen(true)
                }}
                disabled={isEdit && assignsToOther}
                className={cn(
                  'flex w-full min-w-0 items-center justify-between rounded-button border border-bg-hover bg-bg px-3 py-2 text-left text-sm',
                  isEdit && assignsToOther && 'opacity-60',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  {selectedAssignee ? (
                    <>
                      <MemberAvatar member={selectedAssignee} size="sm" />
                      <span className="truncate text-text">{selectedAssignee.name}</span>
                    </>
                  ) : (
                    <span className="truncate text-text-tertiary">请选择</span>
                  )}
                </span>
                <ChevronRight className="size-4 shrink-0 text-text-tertiary" />
              </button>
            </FormRow>
            <FormRow label="优先级" highlighted={changedFields.has('priority')}>
              <PickerButton
                value={selectedPriorityName}
                onClick={() => setPrioritySheetOpen(true)}
              />
            </FormRow>
          </div>
          <div ref={dateRowRef}>
            <FormRow label="全天">
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox
                  checked={isAllDay}
                  onCheckedChange={(v) => {
                    const next = v === true
                    setIsAllDay(next)
                    if (!next) {
                      setStartField((prev) => (prev.iso ? { ...prev, hasTime: true } : prev))
                      setDueField((prev) => (prev.iso ? { ...prev, hasTime: true } : prev))
                    }
                  }}
                />
                <span>全天</span>
              </label>
              {isAllDay ? (
                <p className="mt-1 text-xs text-text-tertiary">
                  全天模式下仅选日期；取消勾选后可设置具体时间
                </p>
              ) : null}
            </FormRow>
            <FormRow
              label="开始日期"
              highlighted={changedFields.has('startAt') || changedFields.has('startDate')}
            >
              <DateField
                value={startField}
                onChange={setStartField}
                showTime={!isAllDay}
                allowClear
                placeholder="可选"
              />
            </FormRow>
            <FormRow
              label={isAllDay ? '截止日期 *' : '截止'}
              highlighted={changedFields.has('dueAt') || changedFields.has('dueDate')}
            >
              <DateField
                value={dueField}
                onChange={setDueField}
                showTime={!isAllDay}
                allowClear={!isAllDay}
                placeholder={isAllDay ? '必选' : '可选'}
              />
            </FormRow>
            {fieldErrors.dateRange ? (
              <p className="px-4 pb-2 text-xs text-status-expired">{fieldErrors.dateRange}</p>
            ) : null}
          </div>
          <FormRow label="重复" highlighted={changedFields.has('recurrenceRule')}>
            <PickerButton
              value={selectedRecurrenceName}
              onClick={() => setRecurrenceSheetOpen(true)}
            />
          </FormRow>
          <FormRow label="提醒">
            <PickerButton
              value={selectedReminderName}
              onClick={() => setReminderSheetOpen(true)}
            />
          </FormRow>
          <FormRow label="标签" highlighted={changedFields.has('tagIds')}>
            {fieldsLocked ? (
              <div className="flex flex-wrap gap-2">
                {displayedTags.length === 0 ? (
                  <span className="text-sm text-text-tertiary">无标签</span>
                ) : (
                  displayedTags.map((tag) => (
                    <span
                      key={tag.id}
                      className="rounded-full bg-bg-hover px-2.5 py-0.5 text-xs text-text"
                    >
                      {tag.name}
                    </span>
                  ))
                )}
              </div>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <label key={tag.id} className="flex items-center gap-1 text-sm">
                      <input
                        type="checkbox"
                        checked={tagIds.includes(tag.id)}
                        onChange={(e) => {
                          setTagIds((prev) =>
                            e.target.checked
                              ? [...prev, tag.id]
                              : prev.filter((tid) => tid !== tag.id),
                          )
                        }}
                      />
                      {tag.name}
                    </label>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setNewTagSheetOpen(true)}
                  className="mt-2 flex items-center gap-1 text-sm text-primary"
                >
                  <Plus className="size-4" />
                  新建标签
                </button>
              </>
            )}
          </FormRow>
        </FormCard>

        {isEdit && (existing?.recurrenceRule || existing?.parentRecurrenceId) ? (
          <label className="flex items-center gap-2 px-1 text-sm">
            <input
              type="checkbox"
              checked={updateSeries}
              onChange={(e) => setUpdateSeries(e.target.checked)}
            />
            此项及后续所有（更新重复规则）
          </label>
        ) : null}

        {error ? (
          <p ref={formErrorRef} className="px-1 text-sm text-status-expired">
            {error}
          </p>
        ) : null}
        </div>
      </div>

      <TodoActionDialog
        mode="confirm_complete"
        open={completeDialogOpen}
        todoTitle={title}
        onCancel={() => setCompleteDialogOpen(false)}
        onConfirm={() => void handleSubmitReview()}
        isPending={statusAction.isPending}
      />

      <TodoActionDialog
        mode="reject_reason"
        open={rejectDialogOpen}
        title={headerMode === 'verify_return' ? '驳回' : '拒绝'}
        placeholder={headerMode === 'verify_return' ? '请填写驳回理由' : '请填写拒绝理由'}
        reason={rejectReason}
        onReasonChange={setRejectReason}
        onCancel={() => setRejectDialogOpen(false)}
        onConfirm={() =>
          void (headerMode === 'verify_return' ? handleReturn() : handleRejectNegotiation())
        }
        isPending={statusAction.isPending}
      />

      <OptionSheet
        open={listSheetOpen}
        title="选择清单"
        options={selectableLists.map((l) => ({
          id: l.id,
          name: listOptionLabel(l),
          color: l.color,
          badge: l.visibility === 'shared' ? '共享' : undefined,
        }))}
        selectedId={listId || null}
        onSelect={setListId}
        onClose={() => setListSheetOpen(false)}
        onAddNew={() => {
          setNewListSheetOpen(true)
        }}
        addLabel="新建清单"
        manageHref="/todos/manage"
      />

      <OptionSheet
        open={assigneeSheetOpen}
        title="选择负责人"
        options={members.map((m) => ({ id: m.id, name: m.name, member: m }))}
        selectedId={assigneeId || null}
        onSelect={setAssigneeId}
        onClose={() => setAssigneeSheetOpen(false)}
        showMemberAvatar
      />

      <OptionSheet
        open={prioritySheetOpen}
        title="选择优先级"
        options={PRIORITY_OPTIONS}
        selectedId={priority}
        onSelect={(id) => setPriority(id as TodoPriority | '')}
        onClose={() => setPrioritySheetOpen(false)}
      />

      <OptionSheet
        open={recurrenceSheetOpen}
        title="选择重复"
        options={recurrenceOptions}
        selectedId={selectedRecurrencePresetId}
        onSelect={(id) => {
          setRecurrenceUserChanged(true)
          setSelectedRecurrencePresetId(id)
          setPreservedRecurrenceRule(null)
        }}
        onClose={() => setRecurrenceSheetOpen(false)}
        manageHref="/todos/manage?tab=recurrence"
        manageLabel="管理重复预设"
      />

      <OptionSheet
        open={reminderSheetOpen}
        title="选择提醒"
        options={reminderOptions}
        selectedId={
          reminderSelection.type === 'none'
            ? REMINDER_NONE_ID_LOCAL
            : reminderSelection.type === 'preset'
              ? reminderSelection.presetId
              : REMINDER_NONE_ID_LOCAL
        }
        onSelect={(id) => {
          if (id === REMINDER_NONE_ID_LOCAL) {
            setReminderSelection({ type: 'none' })
            return
          }
          setReminderSelection({ type: 'preset', presetId: id })
        }}
        onClose={() => setReminderSheetOpen(false)}
        manageHref="/todos/manage?tab=reminders"
        manageLabel="管理提醒预设"
      />

      <QuickAddSheet
        open={newListSheetOpen}
        title="新建清单"
        placeholder="清单名称"
        onClose={() => setNewListSheetOpen(false)}
        onSubmit={handleAddList}
        isPending={createList.isPending}
      />

      <QuickAddSheet
        open={newTagSheetOpen}
        title="新建标签"
        placeholder="标签名称"
        onClose={() => setNewTagSheetOpen(false)}
        onSubmit={handleAddTag}
        isPending={createTag.isPending}
      />
    </div>
  )
}
