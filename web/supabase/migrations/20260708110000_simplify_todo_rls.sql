-- Simplify todo RLS: visible if creator / primary assignee / junction assignee.
-- No SECURITY DEFINER helpers. INSERT only checks creator_id.

DROP FUNCTION IF EXISTS public.member_can_read_todo_item(uuid, uuid);
DROP FUNCTION IF EXISTS public.member_is_todo_creator_or_primary(uuid, uuid);

-- ── todo_items ──────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS todo_items_family ON public.todo_items;
DROP POLICY IF EXISTS todo_items_select_member ON public.todo_items;
DROP POLICY IF EXISTS todo_items_select_junction ON public.todo_items;
DROP POLICY IF EXISTS todo_items_insert ON public.todo_items;
DROP POLICY IF EXISTS todo_items_update ON public.todo_items;
DROP POLICY IF EXISTS todo_items_delete ON public.todo_items;

CREATE POLICY todo_items_select_member ON public.todo_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND (m.id = todo_items.creator_id OR m.id = todo_items.assignee_id)
    )
  );

CREATE POLICY todo_items_select_junction ON public.todo_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_item_assignees a
      INNER JOIN public.todo_family_members m ON m.id = a.member_id
      WHERE a.todo_item_id = todo_items.id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY todo_items_insert ON public.todo_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND m.id = todo_items.creator_id
    )
  );

CREATE POLICY todo_items_update ON public.todo_items
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND (
          m.id = todo_items.creator_id
          OR m.id = todo_items.assignee_id
          OR EXISTS (
            SELECT 1
            FROM public.todo_item_assignees a
            WHERE a.todo_item_id = todo_items.id
              AND a.member_id = m.id
          )
        )
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
          OR EXISTS (
            SELECT 1
            FROM public.todo_item_assignees a
            WHERE a.todo_item_id = todo_items.id
              AND a.member_id = m.id
          )
        )
    )
  );

CREATE POLICY todo_items_delete ON public.todo_items
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND m.id = todo_items.creator_id
    )
  );

-- ── todo_item_assignees ─────────────────────────────────────────────────────

DROP POLICY IF EXISTS todo_item_assignees_family ON public.todo_item_assignees;
DROP POLICY IF EXISTS todo_item_assignees_select ON public.todo_item_assignees;
DROP POLICY IF EXISTS todo_item_assignees_insert ON public.todo_item_assignees;
DROP POLICY IF EXISTS todo_item_assignees_delete ON public.todo_item_assignees;

CREATE POLICY todo_item_assignees_select ON public.todo_item_assignees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND m.id = todo_item_assignees.member_id
    )
    OR EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.id = ti.creator_id
      WHERE ti.id = todo_item_assignees.todo_item_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY todo_item_assignees_insert ON public.todo_item_assignees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.id = ti.creator_id
      WHERE ti.id = todo_item_assignees.todo_item_id
        AND m.user_id = auth.uid()
    )
  );

CREATE POLICY todo_item_assignees_delete ON public.todo_item_assignees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.id = ti.creator_id
      WHERE ti.id = todo_item_assignees.todo_item_id
        AND m.user_id = auth.uid()
    )
  );

-- ── todo_item_tags ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS todo_item_tags_family ON public.todo_item_tags;

CREATE POLICY todo_item_tags_family ON public.todo_item_tags
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_item_tags.todo_item_id
        AND (ti.creator_id = m.id OR ti.assignee_id = m.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_item_tags.todo_item_id
        AND ti.creator_id = m.id
    )
  );

-- ── todo_status_logs ────────────────────────────────────────────────────────

DROP POLICY IF EXISTS todo_status_logs_family ON public.todo_status_logs;

CREATE POLICY todo_status_logs_family ON public.todo_status_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_status_logs.todo_item_id
        AND (ti.creator_id = m.id OR ti.assignee_id = m.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_status_logs.todo_item_id
        AND (ti.creator_id = m.id OR ti.assignee_id = m.id)
    )
  );

-- ── todo_item_member_lists ──────────────────────────────────────────────────

DROP POLICY IF EXISTS todo_item_member_lists_family ON public.todo_item_member_lists;

CREATE POLICY todo_item_member_lists_family ON public.todo_item_member_lists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_item_member_lists.todo_item_id
        AND (ti.creator_id = m.id OR ti.assignee_id = m.id OR m.id = todo_item_member_lists.member_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_item_member_lists.todo_item_id
        AND (ti.creator_id = m.id OR m.id = todo_item_member_lists.member_id)
    )
  );

-- ── todo_item_shared_lists ──────────────────────────────────────────────────

DROP POLICY IF EXISTS todo_item_shared_lists_family ON public.todo_item_shared_lists;

CREATE POLICY todo_item_shared_lists_family ON public.todo_item_shared_lists
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_item_shared_lists.todo_item_id
        AND (ti.creator_id = m.id OR ti.assignee_id = m.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.todo_items ti
      INNER JOIN public.todo_family_members m ON m.user_id = auth.uid()
      WHERE ti.id = todo_item_shared_lists.todo_item_id
        AND ti.creator_id = m.id
    )
  );
