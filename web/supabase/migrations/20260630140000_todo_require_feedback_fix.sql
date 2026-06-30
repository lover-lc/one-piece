-- Cross-person assignments should always require feedback.

UPDATE public.todo_items
SET require_feedback = true
WHERE creator_id <> assignee_id
  AND require_feedback = false;
