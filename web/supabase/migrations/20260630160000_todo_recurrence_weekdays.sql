-- Extend recurrence trigger: weekdays matching + start_at/due_at/is_all_day

CREATE OR REPLACE FUNCTION public.todo_iso_weekday(d date)
RETURNS int
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXTRACT(ISODOW FROM d)::int;
$$;

CREATE OR REPLACE FUNCTION public.todo_next_recurrence_due(
  rule jsonb,
  from_due date
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  freq text;
  interval_n int;
  weekdays jsonb;
  candidate date;
  wd int;
  i int;
BEGIN
  freq := rule->>'frequency';
  interval_n := GREATEST(COALESCE((rule->>'interval')::int, 1), 1);
  weekdays := rule->'weekdays';

  IF weekdays IS NOT NULL AND jsonb_array_length(weekdays) > 0 THEN
    FOR i IN 1..7 LOOP
      candidate := from_due + i;
      wd := public.todo_iso_weekday(candidate);
      IF weekdays @> to_jsonb(wd) THEN
        RETURN candidate;
      END IF;
    END LOOP;
    RETURN from_due + 1;
  END IF;

  CASE freq
    WHEN 'daily' THEN RETURN from_due + (interval_n || ' days')::interval;
    WHEN 'weekly' THEN RETURN from_due + (interval_n * 7 || ' days')::interval;
    WHEN 'monthly' THEN RETURN from_due + (interval_n || ' months')::interval;
    ELSE RETURN from_due + (interval_n || ' days')::interval;
  END CASE;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_todo_recurrence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  parent_id uuid;
  rule jsonb;
  end_type text;
  end_date date;
  end_count int;
  generated int;
  base_due date;
  next_due date;
  next_start date;
  duration_days int;
  new_status public.todo_status;
  next_due_at timestamptz;
  next_start_at timestamptz;
  duration_interval interval;
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

  end_type := COALESCE(rule->>'endType', 'never');
  end_date := (rule->>'endDate')::date;
  end_count := (rule->>'endCount')::int;
  generated := COALESCE((rule->>'generatedCount')::int, 0);

  IF end_type = 'count' AND generated >= end_count THEN
    RETURN NEW;
  END IF;

  base_due := COALESCE(NEW.due_at::date, NEW.due_date, CURRENT_DATE);
  next_due := public.todo_next_recurrence_due(rule, base_due);

  IF end_type = 'date' AND next_due > end_date THEN
    RETURN NEW;
  END IF;

  duration_days := 0;
  IF NEW.start_date IS NOT NULL AND NEW.due_date IS NOT NULL THEN
    duration_days := NEW.due_date - NEW.start_date;
  END IF;
  next_start := next_due - duration_days;

  IF NEW.require_feedback THEN
    new_status := 'pending_accept';
  ELSE
    new_status := 'in_progress';
  END IF;

  IF COALESCE(NEW.is_all_day, true) THEN
    INSERT INTO public.todo_items (
      title, description, list_id, creator_id, assignee_id,
      priority, is_all_day, start_date, due_date, start_at, due_at,
      require_feedback, status, parent_recurrence_id
    ) VALUES (
      NEW.title, NEW.description, NEW.list_id, NEW.creator_id, NEW.assignee_id,
      NEW.priority, true, next_start, next_due,
      next_start::timestamptz, next_due::timestamptz,
      NEW.require_feedback, new_status, parent_id
    );
  ELSE
    duration_interval := CASE
      WHEN NEW.start_at IS NOT NULL AND NEW.due_at IS NOT NULL
        THEN NEW.due_at - NEW.start_at
      ELSE interval '0'
    END;

    next_due_at := (next_due::timestamp + COALESCE(NEW.due_at, NEW.due_date::timestamptz)::time);
    next_start_at := CASE
      WHEN duration_interval > interval '0' THEN next_due_at - duration_interval
      WHEN NEW.start_at IS NOT NULL
        THEN (next_start::timestamp + NEW.start_at::time)
      ELSE next_due_at
    END;

    INSERT INTO public.todo_items (
      title, description, list_id, creator_id, assignee_id,
      priority, is_all_day, start_date, due_date, start_at, due_at,
      require_feedback, status, parent_recurrence_id
    ) VALUES (
      NEW.title, NEW.description, NEW.list_id, NEW.creator_id, NEW.assignee_id,
      NEW.priority, false, next_start, next_due, next_start_at, next_due_at,
      NEW.require_feedback, new_status, parent_id
    );
  END IF;

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
