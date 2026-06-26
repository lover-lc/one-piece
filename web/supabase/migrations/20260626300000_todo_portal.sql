-- Todo portal: family members, lists, items, tags, notifications, reminders, push.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.todo_priority AS ENUM ('high', 'medium', 'low');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.todo_status AS ENUM (
    'draft',
    'pending_accept',
    'accepted',
    'rejected',
    'in_progress',
    'pending_review',
    'completed',
    'returned'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.todo_notification_type AS ENUM (
    'assigned',
    'agreed',
    'rejected',
    'completed',
    'verified',
    'returned',
    'reminder'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.todo_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  color text NOT NULL DEFAULT '#2c3e50',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todo_family_members_user_id_idx
  ON public.todo_family_members (user_id);

CREATE TABLE IF NOT EXISTS public.todo_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  color text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todo_lists_owner_id_idx ON public.todo_lists (owner_id);

CREATE TABLE IF NOT EXISTS public.todo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  list_id uuid NOT NULL REFERENCES public.todo_lists (id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE RESTRICT,
  assignee_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE RESTRICT,
  priority public.todo_priority NOT NULL DEFAULT 'medium',
  start_date date,
  due_date date,
  require_feedback boolean NOT NULL DEFAULT false,
  status public.todo_status NOT NULL DEFAULT 'draft',
  recurrence_rule jsonb,
  parent_recurrence_id uuid REFERENCES public.todo_items (id) ON DELETE SET NULL,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todo_items_list_id_idx ON public.todo_items (list_id);
CREATE INDEX IF NOT EXISTS todo_items_creator_id_idx ON public.todo_items (creator_id);
CREATE INDEX IF NOT EXISTS todo_items_assignee_id_idx ON public.todo_items (assignee_id);
CREATE INDEX IF NOT EXISTS todo_items_due_date_idx ON public.todo_items (due_date);
CREATE INDEX IF NOT EXISTS todo_items_status_idx ON public.todo_items (status);
CREATE INDEX IF NOT EXISTS todo_items_parent_recurrence_id_idx
  ON public.todo_items (parent_recurrence_id);

CREATE TABLE IF NOT EXISTS public.todo_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6b7280',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE IF NOT EXISTS public.todo_item_tags (
  todo_item_id uuid NOT NULL REFERENCES public.todo_items (id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.todo_tags (id) ON DELETE CASCADE,
  PRIMARY KEY (todo_item_id, tag_id)
);

CREATE TABLE IF NOT EXISTS public.todo_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  type public.todo_notification_type NOT NULL,
  todo_item_id uuid REFERENCES public.todo_items (id) ON DELETE CASCADE,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todo_notifications_recipient_id_idx
  ON public.todo_notifications (recipient_id);
CREATE INDEX IF NOT EXISTS todo_notifications_is_read_idx
  ON public.todo_notifications (is_read);

CREATE TABLE IF NOT EXISTS public.todo_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_item_id uuid NOT NULL REFERENCES public.todo_items (id) ON DELETE CASCADE,
  from_status public.todo_status,
  to_status public.todo_status NOT NULL,
  operator_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE RESTRICT,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todo_status_logs_todo_item_id_idx
  ON public.todo_status_logs (todo_item_id);

CREATE TABLE IF NOT EXISTS public.todo_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_item_id uuid NOT NULL REFERENCES public.todo_items (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  remind_at timestamptz NOT NULL,
  is_sent boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS todo_reminders_remind_at_idx
  ON public.todo_reminders (remind_at) WHERE NOT is_sent;

CREATE TABLE IF NOT EXISTS public.todo_push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  keys jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, endpoint)
);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS todo_items_set_updated_at ON public.todo_items;
CREATE TRIGGER todo_items_set_updated_at
  BEFORE UPDATE ON public.todo_items
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Recurrence: generate next instance when a recurring todo is completed
CREATE OR REPLACE FUNCTION public.handle_todo_recurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_id uuid;
  rule jsonb;
  freq text;
  interval_n int;
  end_type text;
  end_date date;
  end_count int;
  generated int;
  next_due date;
  next_start date;
  new_status public.todo_status;
BEGIN
  IF NEW.status <> 'completed' OR OLD.status = 'completed' THEN
    RETURN NEW;
  END IF;

  IF NEW.parent_recurrence_id IS NOT NULL THEN
    parent_id := NEW.parent_recurrence_id;
  ELSIF NEW.recurrence_rule IS NOT NULL THEN
    parent_id := NEW.id;
  ELSE
    RETURN NEW;
  END IF;

  SELECT recurrence_rule INTO rule
  FROM public.todo_items
  WHERE id = parent_id;

  IF rule IS NULL THEN
    RETURN NEW;
  END IF;

  freq := rule->>'frequency';
  interval_n := COALESCE((rule->>'interval')::int, 1);
  end_type := COALESCE(rule->>'endType', 'never');
  end_date := (rule->>'endDate')::date;
  end_count := (rule->>'endCount')::int;
  generated := COALESCE((rule->>'generatedCount')::int, 0);

  IF end_type = 'count' AND generated >= end_count THEN
    RETURN NEW;
  END IF;

  next_due := COALESCE(NEW.due_date, CURRENT_DATE);
  CASE freq
    WHEN 'daily' THEN next_due := next_due + (interval_n || ' days')::interval;
    WHEN 'weekly' THEN next_due := next_due + (interval_n * 7 || ' days')::interval;
    WHEN 'monthly' THEN next_due := next_due + (interval_n || ' months')::interval;
    ELSE next_due := next_due + (interval_n || ' days')::interval;
  END CASE;

  IF end_type = 'date' AND next_due > end_date THEN
    RETURN NEW;
  END IF;

  next_start := next_due;
  IF NEW.start_date IS NOT NULL AND NEW.due_date IS NOT NULL THEN
    next_start := next_due - (NEW.due_date - NEW.start_date);
  END IF;

  IF NEW.require_feedback THEN
    new_status := 'pending_accept';
  ELSE
    new_status := 'in_progress';
  END IF;

  INSERT INTO public.todo_items (
    title, description, list_id, creator_id, assignee_id,
    priority, start_date, due_date, require_feedback, status,
    parent_recurrence_id
  ) VALUES (
    NEW.title, NEW.description, NEW.list_id, NEW.creator_id, NEW.assignee_id,
    NEW.priority, next_start, next_due, NEW.require_feedback, new_status,
    parent_id
  );

  UPDATE public.todo_items
  SET recurrence_rule = jsonb_set(
    rule,
    '{generatedCount}',
    to_jsonb(generated + 1)
  )
  WHERE id = parent_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_todo_completed ON public.todo_items;
CREATE TRIGGER on_todo_completed
  AFTER UPDATE ON public.todo_items
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.handle_todo_recurrence();

-- Notification on status change
CREATE OR REPLACE FUNCTION public.notify_todo_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  operator_name text;
  creator_name text;
  assignee_name text;
  msg text;
  notif_type public.todo_notification_type;
  recipient uuid;
BEGIN
  IF TG_OP <> 'UPDATE' OR NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  SELECT name INTO operator_name FROM public.todo_family_members WHERE id = NEW.assignee_id;
  SELECT name INTO creator_name FROM public.todo_family_members WHERE id = NEW.creator_id;
  SELECT name INTO assignee_name FROM public.todo_family_members WHERE id = NEW.assignee_id;

  CASE NEW.status
    WHEN 'pending_accept' THEN
      notif_type := 'assigned';
      recipient := NEW.assignee_id;
      msg := creator_name || ' 分配了待办给你：' || NEW.title;
    WHEN 'accepted' THEN
      notif_type := 'agreed';
      recipient := NEW.creator_id;
      msg := assignee_name || ' 同意了待办：' || NEW.title;
    WHEN 'rejected' THEN
      notif_type := 'rejected';
      recipient := NEW.creator_id;
      msg := assignee_name || ' 拒绝了待办：' || NEW.title;
    WHEN 'pending_review' THEN
      notif_type := 'completed';
      recipient := NEW.creator_id;
      msg := assignee_name || ' 完成了待办：' || NEW.title;
    WHEN 'completed' THEN
      IF OLD.status = 'pending_review' THEN
        notif_type := 'verified';
        recipient := NEW.assignee_id;
        msg := creator_name || ' 验收通过了待办：' || NEW.title;
      ELSE
        RETURN NEW;
      END IF;
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

DROP TRIGGER IF EXISTS on_todo_status_notify ON public.todo_items;
CREATE TRIGGER on_todo_status_notify
  AFTER UPDATE ON public.todo_items
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status)
  EXECUTE FUNCTION public.notify_todo_status_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.todo_family_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_item_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_status_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todo_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Family members: own household only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'todo_family_members' AND policyname = 'todo_family_members_own'
  ) THEN
    CREATE POLICY todo_family_members_own ON public.todo_family_members
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Lists: via owner membership
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_lists' AND policyname = 'todo_lists_family'
  ) THEN
    CREATE POLICY todo_lists_family ON public.todo_lists
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_lists.owner_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_lists.owner_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Items: via creator family
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_items' AND policyname = 'todo_items_family'
  ) THEN
    CREATE POLICY todo_items_family ON public.todo_items
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_items.creator_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_items.creator_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Tags: household
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_tags' AND policyname = 'todo_tags_own'
  ) THEN
    CREATE POLICY todo_tags_own ON public.todo_tags
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Item tags: via item access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_item_tags' AND policyname = 'todo_item_tags_family'
  ) THEN
    CREATE POLICY todo_item_tags_family ON public.todo_item_tags
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_items ti
          JOIN public.todo_family_members m ON m.id = ti.creator_id
          WHERE ti.id = todo_item_tags.todo_item_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_items ti
          JOIN public.todo_family_members m ON m.id = ti.creator_id
          WHERE ti.id = todo_item_tags.todo_item_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Notifications: recipient family
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_notifications' AND policyname = 'todo_notifications_family'
  ) THEN
    CREATE POLICY todo_notifications_family ON public.todo_notifications
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_notifications.recipient_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_notifications.recipient_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Status logs: via item
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_status_logs' AND policyname = 'todo_status_logs_family'
  ) THEN
    CREATE POLICY todo_status_logs_family ON public.todo_status_logs
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_items ti
          JOIN public.todo_family_members m ON m.id = ti.creator_id
          WHERE ti.id = todo_status_logs.todo_item_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_items ti
          JOIN public.todo_family_members m ON m.id = ti.creator_id
          WHERE ti.id = todo_status_logs.todo_item_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Reminders
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_reminders' AND policyname = 'todo_reminders_family'
  ) THEN
    CREATE POLICY todo_reminders_family ON public.todo_reminders
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_reminders.member_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_reminders.member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Push subscriptions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'todo_push_subscriptions' AND policyname = 'todo_push_subscriptions_family'
  ) THEN
    CREATE POLICY todo_push_subscriptions_family ON public.todo_push_subscriptions
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_push_subscriptions.member_id AND m.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = todo_push_subscriptions.member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_family_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_lists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_item_tags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_status_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_reminders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.todo_push_subscriptions TO authenticated;
