-- Fix infinite RLS recursion between todo_items and todo_item_assignees.
-- Use SECURITY DEFINER helpers so cross-table checks bypass RLS.

CREATE OR REPLACE FUNCTION public.member_can_read_todo_item(
  p_item_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.todo_items ti
    WHERE ti.id = p_item_id
      AND (
        ti.creator_id = p_member_id
        OR ti.assignee_id = p_member_id
        OR EXISTS (
          SELECT 1
          FROM public.todo_item_assignees a
          WHERE a.todo_item_id = p_item_id
            AND a.member_id = p_member_id
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.member_is_todo_creator_or_primary(
  p_item_id uuid,
  p_member_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.todo_items ti
    WHERE ti.id = p_item_id
      AND (ti.creator_id = p_member_id OR ti.assignee_id = p_member_id)
  );
$$;

GRANT EXECUTE ON FUNCTION public.member_can_read_todo_item(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.member_is_todo_creator_or_primary(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS todo_item_assignees_family ON public.todo_item_assignees;

CREATE POLICY todo_item_assignees_family ON public.todo_item_assignees
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND (
          todo_item_assignees.member_id = m.id
          OR public.member_is_todo_creator_or_primary(
            todo_item_assignees.todo_item_id,
            m.id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND public.member_is_todo_creator_or_primary(
          todo_item_assignees.todo_item_id,
          m.id
        )
    )
  );

DROP POLICY IF EXISTS todo_items_family ON public.todo_items;

CREATE POLICY todo_items_family ON public.todo_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND public.member_can_read_todo_item(todo_items.id, m.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND public.member_can_read_todo_item(todo_items.id, m.id)
    )
  );
