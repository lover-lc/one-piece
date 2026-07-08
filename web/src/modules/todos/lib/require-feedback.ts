/** 非指派：负责人列表包含当前成员；指派：负责人全是他人 */
export function deriveRequireFeedback(
  assigneeIds: string[],
  currentMemberId: string | null,
): boolean {
  if (!currentMemberId || assigneeIds.length === 0) return false
  return !assigneeIds.includes(currentMemberId)
}

/** 非指派时将当前成员排到首位，作为 primary assignee_id */
export function normalizeAssigneeIds(
  assigneeIds: string[],
  currentMemberId: string | null,
): string[] {
  if (assigneeIds.length === 0) {
    return currentMemberId ? [currentMemberId] : []
  }
  if (currentMemberId && assigneeIds.includes(currentMemberId)) {
    return [currentMemberId, ...assigneeIds.filter((id) => id !== currentMemberId)]
  }
  return assigneeIds
}
