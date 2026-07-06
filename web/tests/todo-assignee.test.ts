import { describe, expect, it } from 'vitest'
import { getTodoAssigneeIds, isTodoAssignee } from '../src/modules/todos/lib/todo-assignee'

describe('todo-assignee', () => {
  it('uses assigneeIds when present', () => {
    expect(
      getTodoAssigneeIds({ assigneeId: 'a', assigneeIds: ['a', 'b'] }),
    ).toEqual(['a', 'b'])
  })

  it('falls back to assigneeId', () => {
    expect(getTodoAssigneeIds({ assigneeId: 'a' })).toEqual(['a'])
  })

  it('detects assignee membership from assigneeIds', () => {
    expect(isTodoAssignee({ assigneeId: 'a', assigneeIds: ['a', 'b'] }, 'b')).toBe(true)
    expect(isTodoAssignee({ assigneeId: 'a', assigneeIds: ['a', 'b'] }, 'c')).toBe(false)
  })
})
