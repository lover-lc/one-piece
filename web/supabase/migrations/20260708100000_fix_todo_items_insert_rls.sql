-- Fix INSERT failing on todo_items: WITH CHECK must not look up the row by id
-- before it exists. Keep member_can_read_todo_item for SELECT/UPDATE/DELETE.

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
        AND (
          m.id = todo_items.creator_id
          OR m.id = todo_items.assignee_id
        )
    )
  );
