-- Non-assigned todo multi-assignees + stop informational status notifications

CREATE TABLE IF NOT EXISTS public.todo_item_assignees (
  todo_item_id uuid NOT NULL REFERENCES public.todo_items (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (todo_item_id, member_id)
);

CREATE INDEX IF NOT EXISTS todo_item_assignees_member_id_idx
  ON public.todo_item_assignees (member_id);

-- Backfill existing non-assigned todos
INSERT INTO public.todo_item_assignees (todo_item_id, member_id)
SELECT id, assignee_id
FROM public.todo_items
WHERE require_feedback = false
ON CONFLICT DO NOTHING;

ALTER TABLE public.todo_item_assignees ENABLE ROW LEVEL SECURITY;

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

-- Expand todo_items visibility to junction assignees
DROP POLICY IF EXISTS todo_items_family ON public.todo_items;

CREATE POLICY todo_items_family ON public.todo_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND public.member_can_read_todo_item(todo_items.id, m.id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.todo_family_members m
      WHERE m.user_id = auth.uid()
        AND public.member_can_read_todo_item(todo_items.id, m.id)
    )
  );

-- Stop agreed / completed / verified notifications from DB trigger
CREATE OR REPLACE FUNCTION public.notify_todo_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  creator_name text;
  assignee_name text;
  msg text;
  notif_type public.todo_notification_type;
  recipient uuid;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO creator_name FROM public.todo_family_members WHERE id = NEW.creator_id;
  SELECT name INTO assignee_name FROM public.todo_family_members WHERE id = NEW.assignee_id;

  CASE NEW.status
    WHEN 'pending_accept' THEN
      notif_type := 'assigned';
      recipient := NEW.assignee_id;
      msg := creator_name || ' 分配了待办给你：' || NEW.title;
    WHEN 'accepted' THEN
      RETURN NEW;
    WHEN 'rejected' THEN
      notif_type := 'rejected';
      recipient := NEW.creator_id;
      msg := assignee_name || ' 拒绝了待办：' || NEW.title;
    WHEN 'pending_review' THEN
      RETURN NEW;
    WHEN 'completed' THEN
      RETURN NEW;
    WHEN 'returned' THEN
      notif_type := 'returned';
      recipient := NEW.assignee_id;
      msg := creator_name || ' 驳回了待办：' || NEW.title;
    ELSE
      RETURN NEW;
  END CASE;

  INSERT INTO public.todo_notifications (recipient_id, type, todo_item_id, message)
  VALUES (recipient, notif_type, NEW.id, msg);

  RETURN NEW;
END;
$$;
