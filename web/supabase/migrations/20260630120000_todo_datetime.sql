-- Todo datetime: all-day flag + timestamptz fields

ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS is_all_day boolean NOT NULL DEFAULT true;

ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS start_at timestamptz;

ALTER TABLE public.todo_items
  ADD COLUMN IF NOT EXISTS due_at timestamptz;

UPDATE public.todo_items
SET start_at = (start_date::text || 'T00:00:00')::timestamptz
WHERE start_date IS NOT NULL AND start_at IS NULL;

UPDATE public.todo_items
SET
  due_at = (due_date::text || 'T00:00:00')::timestamptz,
  is_all_day = true
WHERE due_date IS NOT NULL AND due_at IS NULL;
