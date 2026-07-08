import { ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import AppMotionBottomSheet from '../../../shared/components/motion/AppMotionBottomSheet'
import DateField, {
  dateFieldFromIso,
  isoFromDateField,
  type DateFieldValue,
} from '../../../shared/components/DateField'
import { isoToLocalDate, composeAllDayIso } from '../../../shared/lib/datetime-utils'
import MemberAvatar from '../../../shared/components/MemberAvatar'
import PageHeaderBar from '../../../shared/components/PageHeaderBar'
import { useCurrentMember } from '../../../shared/hooks/use-current-member'
import { useFamilyMembers, type FamilyMember } from '../../../shared/hooks/use-family-members'
import {
  useCreateTodo,
  useDeleteTodo,
  useNegotiationAction,
  useTodo,
  useTodoLists,
  useTodoStatusAction,
  useTodoStatusLogs,
  useUpdateTodo,
} from '../hooks/use-todos'
import TodoActionDialog from '../components/TodoActionDialog'
import TodoStatusReasonBanner from '../components/TodoStatusReasonBanner'
import {
  deriveRequireFeedback,
  normalizeAssigneeIds,
} from '../lib/require-feedback'
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
import type { RecurrenceRule, TodoFormInput, TodoPriority } from '../types/todo-types'
import { cn } from '@/lib/utils'

type FormFieldKey = 'title' | 'listId' | 'assigneeId' | 'dateRange'

const REMINDER_NONE_ID_LOCAL = REMINDER_NONE_ID

const fieldInputClass =
  'w-full rounded-button border border-bg-hover bg-bg px-3 py-2 text-sm text-text outline-none focus:border-primary'

/** 与「开始日期」等宽，统一控件区左边缘 */
const formLabelColClass = 'w-[4rem] shrink-0 text-sm text-text-secondary'

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
  layout = 'horizontal',
  contentAlign = 'center',
}: {
  label?: ReactNode
  children: ReactNode
  error?: string | null
  rowRef?: RefObject<HTMLDivElement | null>
  highlighted?: boolean
  layout?: 'horizontal' | 'vertical'
  contentAlign?: 'center' | 'start'
}) {
  const rowClass = cn(
    'px-4 py-2',
    error && 'bg-status-expired/5 ring-2 ring-inset ring-status-expired/40',
    highlighted &&
      !error &&
      'bg-amber-50 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800/50',
  )

  if (layout === 'vertical') {
    return (
      <div ref={rowRef} className={rowClass}>
        {label ? (
          <label className="mb-1 block text-xs text-text-secondary">{label}</label>
        ) : null}
        {children}
        {error ? <p className="mt-1 text-xs text-status-expired">{error}</p> : null}
      </div>
    )
  }

  return (
    <div ref={rowRef} className={rowClass}>
      <div
        className={cn(
          'flex gap-1.5',
          contentAlign === 'start' ? 'items-start' : 'items-center',
        )}
      >
        {label != null && label !== '' ? (
          typeof label === 'string' ? (
            <span className={formLabelColClass}>{label}</span>
          ) : (
            <div className={cn(formLabelColClass, 'overflow-visible')}>{label}</div>
          )
        ) : null}
        <div className="min-w-0 flex-1">{children}</div>
      </div>
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

function MultiOptionSheet({
  open,
  title,
  options,
  selectedIds,
  onToggle,
  onConfirm,
  onClose,
  showMemberAvatar = false,
}: {
  open: boolean
  title: string
  options: {
    id: string
    name: string
    member?: FamilyMember
  }[]
  selectedIds: string[]
  onToggle: (id: string) => void
  onConfirm: () => void
  onClose: () => void
  showMemberAvatar?: boolean
}) {
  return (
    <AppMotionBottomSheet open={open} onClose={onClose} title={title}>
      <ul className="max-h-[50svh] overflow-y-auto">
        {options.map((opt) => {
          const selected = selectedIds.includes(opt.id)
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onToggle(opt.id)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-bg-hover ${
                  selected ? 'font-medium text-primary' : 'text-text'
                }`}
              >
                {showMemberAvatar && opt.member ? (
                  <MemberAvatar member={opt.member} size="sm" />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{opt.name}</span>
                <Checkbox checked={selected} aria-hidden tabIndex={-1} />
              </button>
            </li>
          )
        })}
      </ul>
      <div className="border-t border-bg-hover px-4 py-3">
        <Button type="button" className="w-full" onClick={onConfirm}>
          确定
        </Button>
      </div>
    </AppMotionBottomSheet>
  )
}

function OptionSheet({
  open,
  title,
  options,
  selectedId,
  onSelect,
  onClose,
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
  showMemberAvatar?: boolean
}) {
  return (
    <AppMotionBottomSheet open={open} onClose={onClose} title={title}>
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
    </AppMotionBottomSheet>
  )
}

export default function TodoFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const navigate = useNavigate()
  const { currentMemberId } = useCurrentMember()
  const { data: members = [] } = useFamilyMembers()
  const { data: lists = [] } = useTodoLists()
  const { data: existing, isLoading: todoLoading } = useTodo(id)
  const { data: statusLogs = [] } = useTodoStatusLogs(id)
  const createTodo = useCreateTodo()
  const updateTodo = useUpdateTodo()
  const saveNegotiation = useNegotiationAction()
  const statusAction = useTodoStatusAction()
  const deleteTodo = useDeleteTodo()
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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([])
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
  const [assigneeSheetOpen, setAssigneeSheetOpen] = useState(false)
  const [recurrenceSheetOpen, setRecurrenceSheetOpen] = useState(false)
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false)
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
    setAssigneeIds(
      existing.requireFeedback
        ? []
        : existing.assigneeIds?.length
          ? existing.assigneeIds
          : [existing.assigneeId],
    )
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
    if (currentMemberId) {
      setAssigneeId((prev) => prev || currentMemberId)
      setAssigneeIds((prev) => (prev.length > 0 ? prev : [currentMemberId]))
    }
  }, [currentMemberId])

  useEffect(() => {
    if (isEdit || listId) return
    if (lastUsedListId && lists.some((l) => l.id === lastUsedListId)) {
      setListId(lastUsedListId)
    }
  }, [isEdit, listId, lastUsedListId, lists])

  const selectedList = lists.find((l) => l.id === listId) ?? null
  const selectedListName = selectedList ? listOptionLabel(selectedList) : null
  const selectedAssignees = members.filter((m) =>
    normalizeAssigneeIds(assigneeIds, currentMemberId).includes(m.id),
  )
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
  const statusReasonLog =
    isEdit && existing && isReasonStatus(existing.status)
      ? getLatestStatusReason(statusLogs, existing.status)
      : null
  const isSaving =
    createTodo.isPending || updateTodo.isPending || saveNegotiation.isPending
  const normalizedAssigneeIds = normalizeAssigneeIds(assigneeIds, currentMemberId)
  const assignsToOther = deriveRequireFeedback(normalizedAssigneeIds, currentMemberId)
  const requireFeedback = assignsToOther
  const fieldsLocked = existing
    ? isFieldsLocked(existing.status, existing.requireFeedback)
    : false
  const canDelete =
    isEdit && existing ? canDeleteTodo(existing, currentMemberId) : false

  const assigneeLocked =
    isEdit && existing != null && existing.requireFeedback && fieldsLocked

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
    const ids = normalizeAssigneeIds(assigneeIds, currentMemberId)
    return {
      title,
      description,
      privateListId,
      sharedListId,
      assigneeId: ids[0] ?? assigneeId,
      assigneeIds: assignsToOther ? undefined : ids,
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
    if (normalizedAssigneeIds.length === 0) nextFieldErrors.assigneeId = '请选择负责人'
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
          <div
            ref={titleRowRef}
            className={cn(
              'px-4 py-2',
              fieldErrors.title &&
                'bg-status-expired/5 ring-2 ring-inset ring-status-expired/40',
              changedFields.has('title') &&
                !fieldErrors.title &&
                'bg-amber-50 ring-1 ring-inset ring-amber-200 dark:bg-amber-950/30 dark:ring-amber-800/50',
            )}
          >
            <input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="待办标题"
              className={fieldInputClass}
            />
            {fieldErrors.title ? (
              <p className="mt-1 text-xs text-status-expired">{fieldErrors.title}</p>
            ) : null}
          </div>
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
            label="清单"
            error={fieldErrors.listId}
            rowRef={listRowRef}
          >
            <PickerButton
              value={selectedListName}
              onClick={() => setListSheetOpen(true)}
            />
          </FormRow>
          <FormRow
            label="负责人"
            error={fieldErrors.assigneeId}
            rowRef={assigneeRowRef}
          >
            <button
              type="button"
              onClick={() => {
                if (assigneeLocked) return
                setAssigneeSheetOpen(true)
              }}
              disabled={assigneeLocked}
              className={cn(
                'flex w-full min-w-0 items-center justify-between rounded-button border border-bg-hover bg-bg px-2 py-2 text-left text-sm',
                assigneeLocked && 'opacity-60',
              )}
            >
              <span className="flex min-w-0 flex-1 items-center gap-2">
                {selectedAssignees.length > 0 ? (
                  <>
                    <span className="flex shrink-0 items-center">
                      {selectedAssignees.slice(0, 5).map((member, index) => (
                        <MemberAvatar
                          key={member.id}
                          member={member}
                          size="sm"
                          className={cn(index > 0 && '-ml-1.5 ring-2 ring-bg')}
                        />
                      ))}
                      {selectedAssignees.length > 5 ? (
                        <span
                          className={cn(
                            'inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-bg-hover text-[10px] font-medium text-text-secondary',
                            '-ml-1.5 ring-2 ring-bg',
                          )}
                        >
                          +{selectedAssignees.length - 5}
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 truncate text-text">
                      {selectedAssignees.map((m) => m.name).join('、')}
                    </span>
                  </>
                ) : (
                  <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed border-bg-hover text-text-tertiary">
                    <span className="text-sm leading-none">+</span>
                  </span>
                )}
              </span>
              <ChevronRight className="size-4 shrink-0 text-text-tertiary" />
            </button>
          </FormRow>
          <div ref={dateRowRef}>
            <FormRow
              label={
                <label className="inline-flex items-center gap-2 text-sm text-text">
                  <Checkbox
                    checked={isAllDay}
                    onCheckedChange={(v) => {
                      const next = v === true
                      setIsAllDay(next)
                      if (next) {
                        setStartField((prev) => {
                          if (!prev.iso) return prev
                          const date = isoToLocalDate(prev.iso)
                          return date ? { iso: composeAllDayIso(date), hasTime: false } : prev
                        })
                        setDueField((prev) => {
                          if (!prev.iso) return prev
                          const date = isoToLocalDate(prev.iso)
                          return date ? { iso: composeAllDayIso(date), hasTime: false } : prev
                        })
                      } else {
                        setStartField((prev) => (prev.iso ? { ...prev, hasTime: true } : prev))
                        setDueField((prev) => (prev.iso ? { ...prev, hasTime: true } : prev))
                      }
                    }}
                  />
                  <span>全天</span>
                </label>
              }
            >
              <span />
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
                compact
                hideIcon
              />
            </FormRow>
            <FormRow
              label="截止日期"
              highlighted={changedFields.has('dueAt') || changedFields.has('dueDate')}
            >
              <DateField
                value={dueField}
                onChange={setDueField}
                showTime={!isAllDay}
                allowClear
                placeholder="可选"
                compact
                hideIcon
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
      />

      <MultiOptionSheet
        open={assigneeSheetOpen}
        title="选择负责人"
        options={members.map((m) => ({ id: m.id, name: m.name, member: m }))}
        selectedIds={assigneeIds}
        onToggle={(id) => {
          setAssigneeIds((prev) => {
            if (prev.includes(id)) {
              if (prev.length === 1) {
                return isEdit ? prev : []
              }
              return prev.filter((memberId) => memberId !== id)
            }

            const tentative = [...prev, id]
            const includesSelf =
              Boolean(currentMemberId) && tentative.includes(currentMemberId)

            if (!includesSelf) {
              return [id]
            }

            return tentative
          })
        }}
        onConfirm={() => {
          const next = normalizeAssigneeIds(assigneeIds, currentMemberId)
          setAssigneeIds(next)
          setAssigneeId(next[0] ?? '')
          setAssigneeSheetOpen(false)
        }}
        onClose={() => setAssigneeSheetOpen(false)}
        showMemberAvatar
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
      />
    </div>
  )
}
