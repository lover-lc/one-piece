import { describe, expect, it } from 'vitest'
import {
  canDeleteTodo,
  getDetailHeaderMode,
  getNegotiationChangedFields,
  shouldLoadProposalInForm,
  shouldShowNegotiationHighlights,
} from '../src/modules/todos/lib/negotiation-ui'
import type { NegotiationFormState } from '../src/modules/todos/lib/negotiation-snapshot'
import type { TodoItem } from '../src/modules/todos/types/todo-types'
import { getTodoDisplayTitle } from '../src/modules/todos/lib/todo-display'

const formState = (overrides: Partial<NegotiationFormState> = {}): NegotiationFormState => ({
  title: '标题',
  description: '',
  priority: '',
  isAllDay: true,
  startAt: null,
  dueAt: null,
  startDate: '',
  dueDate: '',
  tagIds: [],
  selectedRecurrencePresetId: 'builtin:none',
  recurrenceRule: null,
  ...overrides,
})

const todo = (overrides: Partial<TodoItem>): TodoItem => ({
  id: 't1',
  title: '标题',
  description: null,
  listId: 'l1',
  creatorId: 'a',
  assigneeId: 'b',
  priority: null,
  startDate: null,
  dueDate: null,
  requireFeedback: true,
  status: 'in_progress',
  awaitingMemberId: null,
  negotiationSnapshot: null,
  creatorAgreedAt: null,
  assigneeAgreedAt: null,
  recurrenceRule: null,
  parentRecurrenceId: null,
  completedAt: null,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  ...overrides,
})

describe('getDetailHeaderMode', () => {
  it('shows submit review only for feedback assignee in progress', () => {
    expect(
      getDetailHeaderMode(
        todo({ status: 'in_progress', requireFeedback: true }),
        'b',
        formState(),
        null,
      ),
    ).toBe('submit_review')
  })

  it('shows save for non-feedback in progress todos', () => {
    expect(
      getDetailHeaderMode(
        todo({ status: 'in_progress', requireFeedback: false }),
        'b',
        formState(),
        null,
      ),
    ).toBe('save')
  })

  it('shows save for self-assigned in progress todos', () => {
    expect(
      getDetailHeaderMode(
        todo({ status: 'in_progress', assigneeId: 'a', requireFeedback: true }),
        'a',
        formState(),
        null,
      ),
    ).toBe('save')
  })

  it('shows delete for completed assigned todos for creator or assignee', () => {
    const assigned = todo({
      status: 'completed',
      creatorId: 'a',
      assigneeId: 'b',
      requireFeedback: true,
    })
    expect(getDetailHeaderMode(assigned, 'a', formState(), null)).toBe('delete')
    expect(getDetailHeaderMode(assigned, 'b', formState(), null)).toBe('delete')
    expect(getDetailHeaderMode(assigned, 'c', formState(), null)).toBe('none')
  })
})

describe('canDeleteTodo', () => {
  it('allows creator or assignee to delete completed assigned todos', () => {
    const assigned = todo({
      status: 'completed',
      creatorId: 'a',
      assigneeId: 'b',
      requireFeedback: true,
    })
    expect(canDeleteTodo(assigned, 'a')).toBe(true)
    expect(canDeleteTodo(assigned, 'b')).toBe(true)
    expect(canDeleteTodo(assigned, 'c')).toBe(false)
  })

  it('blocks delete on pending review', () => {
    expect(
      canDeleteTodo(
        todo({ status: 'pending_review', creatorId: 'a', assigneeId: 'b' }),
        'a',
      ),
    ).toBe(false)
  })
})

describe('negotiation highlights', () => {
  it('shows highlights for awaiting assignee on pending accept', () => {
    expect(
      shouldShowNegotiationHighlights(
        todo({ status: 'pending_accept', awaitingMemberId: 'b' }),
        'b',
      ),
    ).toBe(true)
  })

  it('hides highlights for normal self todos', () => {
    expect(
      shouldShowNegotiationHighlights(
        todo({ status: 'in_progress', assigneeId: 'a', creatorId: 'a', requireFeedback: false }),
        'a',
      ),
    ).toBe(false)
  })

  it('loads proposal for awaiting member', () => {
    expect(
      shouldLoadProposalInForm(
        todo({
          status: 'pending_accept',
          awaitingMemberId: 'b',
          negotiationSnapshot: {
            title: '提案标题',
            description: null,
            priority: null,
            startDate: null,
            dueDate: null,
            tagIds: [],
            recurrenceRule: null,
          },
        }),
        'b',
      ),
    ).toBe(true)
  })

  it('diffs proposal against committed fields for awaiting creator', () => {
    const item = todo({
      status: 'pending_accept',
      creatorId: 'a',
      assigneeId: 'b',
      awaitingMemberId: 'a',
      title: '旧标题',
      negotiationSnapshot: {
        title: '新标题',
        description: null,
        priority: null,
        startDate: null,
        dueDate: null,
        tagIds: [],
        recurrenceRule: null,
      },
    })
    const changed = getNegotiationChangedFields(
      item,
      'a',
      formState({ title: '新标题' }),
    )
    expect(changed.has('title')).toBe(true)
  })
})

describe('getTodoDisplayTitle', () => {
  it('shows snapshot title during negotiation', () => {
    expect(
      getTodoDisplayTitle(
        todo({
          status: 'pending_accept',
          title: '旧标题',
          negotiationSnapshot: {
            title: '提案标题',
            description: null,
            priority: null,
            startDate: null,
            dueDate: null,
            tagIds: [],
            recurrenceRule: null,
          },
        }),
      ),
    ).toBe('提案标题')
  })
})
