-- Enable Supabase Realtime for todo tables used by client subscriptions.

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_notifications;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.todo_items;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
