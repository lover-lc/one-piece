-- Check-in module: diet / exercise / water tracking, daily snapshots, duels.
-- Phase 1 core schema; Phase 1.5 stakes/comments; Phase 2 health sync placeholder.

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.checkin_record_type AS ENUM ('diet', 'exercise', 'water');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.checkin_stake_period AS ENUM ('daily', 'weekly', 'monthly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.checkin_record_source AS ENUM ('manual', 'healthkit');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.checkin_shanghai_today()
RETURNS date
LANGUAGE sql
STABLE
AS $$
  SELECT (now() AT TIME ZONE 'Asia/Shanghai')::date;
$$;

CREATE OR REPLACE FUNCTION public.checkin_reject_locked_record_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.slot_date < public.checkin_shanghai_today() THEN
      RAISE EXCEPTION 'Cannot delete locked check-in record for date %', OLD.slot_date;
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.slot_date < public.checkin_shanghai_today() THEN
      RAISE EXCEPTION 'Cannot update locked check-in record for date %', OLD.slot_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.checkin_member_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL UNIQUE REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  height_cm numeric,
  weight_kg numeric,
  gender text,
  birth_date date,
  activity_level text,
  target_kcal numeric,
  target_fat_g numeric,
  target_protein_g numeric,
  target_carbs_g numeric,
  target_exercise_minutes numeric,
  target_water_ml numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_member_profiles_user_id_idx
  ON public.checkin_member_profiles (user_id);

CREATE TABLE IF NOT EXISTS public.checkin_food_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  kcal_per_100g numeric NOT NULL,
  protein_g_per_100g numeric NOT NULL DEFAULT 0,
  fat_g_per_100g numeric NOT NULL DEFAULT 0,
  carbs_g_per_100g numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_food_library_user_id_idx
  ON public.checkin_food_library (user_id);

CREATE INDEX IF NOT EXISTS checkin_food_library_name_idx
  ON public.checkin_food_library (name);

CREATE TABLE IF NOT EXISTS public.checkin_food_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  food_library_id uuid REFERENCES public.checkin_food_library (id) ON DELETE SET NULL,
  name text,
  kcal_per_100g numeric,
  protein_g_per_100g numeric,
  fat_g_per_100g numeric,
  carbs_g_per_100g numeric,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_food_presets_member_id_idx
  ON public.checkin_food_presets (member_id);

CREATE INDEX IF NOT EXISTS checkin_food_presets_user_id_idx
  ON public.checkin_food_presets (user_id);

CREATE TABLE IF NOT EXISTS public.checkin_exercise_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  unit text NOT NULL DEFAULT 'minutes',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_exercise_presets_member_id_idx
  ON public.checkin_exercise_presets (member_id);

CREATE INDEX IF NOT EXISTS checkin_exercise_presets_user_id_idx
  ON public.checkin_exercise_presets (user_id);

CREATE TABLE IF NOT EXISTS public.checkin_drink_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  name text NOT NULL,
  default_ml int NOT NULL DEFAULT 250,
  icon_key text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_drink_presets_member_id_idx
  ON public.checkin_drink_presets (member_id);

CREATE INDEX IF NOT EXISTS checkin_drink_presets_user_id_idx
  ON public.checkin_drink_presets (user_id);

CREATE TABLE IF NOT EXISTS public.checkin_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  record_type public.checkin_record_type NOT NULL,
  recorded_at timestamptz NOT NULL,
  slot_date date NOT NULL,
  payload jsonb NOT NULL,
  source public.checkin_record_source NOT NULL DEFAULT 'manual',
  healthkit_uuid text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_records_user_id_idx
  ON public.checkin_records (user_id);

CREATE INDEX IF NOT EXISTS checkin_records_member_id_idx
  ON public.checkin_records (member_id);

CREATE INDEX IF NOT EXISTS checkin_records_slot_date_idx
  ON public.checkin_records (slot_date);

CREATE INDEX IF NOT EXISTS checkin_records_member_slot_type_idx
  ON public.checkin_records (member_id, slot_date, record_type);

CREATE UNIQUE INDEX IF NOT EXISTS checkin_records_healthkit_uuid_uidx
  ON public.checkin_records (healthkit_uuid)
  WHERE healthkit_uuid IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.checkin_daily_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date NOT NULL,
  member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  diet_actual_kcal numeric NOT NULL DEFAULT 0,
  diet_target_kcal numeric NOT NULL DEFAULT 0,
  diet_rate numeric NOT NULL DEFAULT 0,
  diet_over_limit boolean NOT NULL DEFAULT false,
  exercise_actual numeric NOT NULL DEFAULT 0,
  exercise_target numeric NOT NULL DEFAULT 0,
  exercise_rate numeric NOT NULL DEFAULT 0,
  water_actual_ml numeric NOT NULL DEFAULT 0,
  water_target_ml numeric NOT NULL DEFAULT 0,
  water_rate numeric NOT NULL DEFAULT 0,
  locked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (snapshot_date, member_id)
);

CREATE INDEX IF NOT EXISTS checkin_daily_snapshots_snapshot_date_idx
  ON public.checkin_daily_snapshots (snapshot_date);

CREATE INDEX IF NOT EXISTS checkin_daily_snapshots_member_id_idx
  ON public.checkin_daily_snapshots (member_id);

CREATE TABLE IF NOT EXISTS public.checkin_daily_duels (
  snapshot_date date PRIMARY KEY,
  diet_winner_member_id uuid REFERENCES public.todo_family_members (id) ON DELETE SET NULL,
  exercise_winner_member_id uuid REFERENCES public.todo_family_members (id) ON DELETE SET NULL,
  water_winner_member_id uuid REFERENCES public.todo_family_members (id) ON DELETE SET NULL,
  locked_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.checkin_stakes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  stake_text text NOT NULL,
  period public.checkin_stake_period NOT NULL,
  active boolean NOT NULL DEFAULT true,
  reminder_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_stakes_user_id_idx
  ON public.checkin_stakes (user_id);

CREATE INDEX IF NOT EXISTS checkin_stakes_active_idx
  ON public.checkin_stakes (user_id, active)
  WHERE active;

CREATE TABLE IF NOT EXISTS public.checkin_stake_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stake_id uuid NOT NULL REFERENCES public.checkin_stakes (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  winner_member_id uuid REFERENCES public.todo_family_members (id) ON DELETE SET NULL,
  loser_member_id uuid REFERENCES public.todo_family_members (id) ON DELETE SET NULL,
  todo_id uuid REFERENCES public.todo_items (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stake_id, period_start)
);

CREATE INDEX IF NOT EXISTS checkin_stake_settlements_stake_id_idx
  ON public.checkin_stake_settlements (stake_id);

CREATE TABLE IF NOT EXISTS public.checkin_settlement_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date date,
  error_message text NOT NULL,
  details jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_settlement_logs_snapshot_date_idx
  ON public.checkin_settlement_logs (snapshot_date);

CREATE TABLE IF NOT EXISTS public.checkin_record_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  record_id uuid NOT NULL REFERENCES public.checkin_records (id) ON DELETE CASCADE,
  author_member_id uuid NOT NULL REFERENCES public.todo_family_members (id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_record_comments_record_id_idx
  ON public.checkin_record_comments (record_id);

CREATE TABLE IF NOT EXISTS public.checkin_health_sync_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  synced_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS checkin_health_sync_log_user_id_idx
  ON public.checkin_health_sync_log (user_id);

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS checkin_member_profiles_set_updated_at ON public.checkin_member_profiles;
CREATE TRIGGER checkin_member_profiles_set_updated_at
  BEFORE UPDATE ON public.checkin_member_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS checkin_food_library_set_updated_at ON public.checkin_food_library;
CREATE TRIGGER checkin_food_library_set_updated_at
  BEFORE UPDATE ON public.checkin_food_library
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS checkin_food_presets_set_updated_at ON public.checkin_food_presets;
CREATE TRIGGER checkin_food_presets_set_updated_at
  BEFORE UPDATE ON public.checkin_food_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS checkin_exercise_presets_set_updated_at ON public.checkin_exercise_presets;
CREATE TRIGGER checkin_exercise_presets_set_updated_at
  BEFORE UPDATE ON public.checkin_exercise_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS checkin_drink_presets_set_updated_at ON public.checkin_drink_presets;
CREATE TRIGGER checkin_drink_presets_set_updated_at
  BEFORE UPDATE ON public.checkin_drink_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS checkin_records_set_updated_at ON public.checkin_records;
CREATE TRIGGER checkin_records_set_updated_at
  BEFORE UPDATE ON public.checkin_records
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS checkin_reject_locked_record_update ON public.checkin_records;
CREATE TRIGGER checkin_reject_locked_record_update
  BEFORE UPDATE ON public.checkin_records
  FOR EACH ROW
  EXECUTE FUNCTION public.checkin_reject_locked_record_change();

DROP TRIGGER IF EXISTS checkin_reject_locked_record_delete ON public.checkin_records;
CREATE TRIGGER checkin_reject_locked_record_delete
  BEFORE DELETE ON public.checkin_records
  FOR EACH ROW
  EXECUTE FUNCTION public.checkin_reject_locked_record_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.checkin_member_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_food_library ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_food_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_exercise_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_drink_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_daily_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_daily_duels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_stake_settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_settlement_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_record_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checkin_health_sync_log ENABLE ROW LEVEL SECURITY;

-- Member profiles
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_member_profiles' AND policyname = 'checkin_member_profiles_own'
  ) THEN
    CREATE POLICY checkin_member_profiles_own ON public.checkin_member_profiles
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Food library: system rows readable by all; user rows owned
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_food_library' AND policyname = 'checkin_food_library_select'
  ) THEN
    CREATE POLICY checkin_food_library_select ON public.checkin_food_library
      FOR SELECT TO authenticated
      USING (user_id IS NULL OR user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_food_library' AND policyname = 'checkin_food_library_insert'
  ) THEN
    CREATE POLICY checkin_food_library_insert ON public.checkin_food_library
      FOR INSERT TO authenticated
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_food_library' AND policyname = 'checkin_food_library_update'
  ) THEN
    CREATE POLICY checkin_food_library_update ON public.checkin_food_library
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_food_library' AND policyname = 'checkin_food_library_delete'
  ) THEN
    CREATE POLICY checkin_food_library_delete ON public.checkin_food_library
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Food presets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_food_presets' AND policyname = 'checkin_food_presets_own'
  ) THEN
    CREATE POLICY checkin_food_presets_own ON public.checkin_food_presets
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Exercise presets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_exercise_presets' AND policyname = 'checkin_exercise_presets_own'
  ) THEN
    CREATE POLICY checkin_exercise_presets_own ON public.checkin_exercise_presets
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Drink presets
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_drink_presets' AND policyname = 'checkin_drink_presets_own'
  ) THEN
    CREATE POLICY checkin_drink_presets_own ON public.checkin_drink_presets
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Records
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_records' AND policyname = 'checkin_records_select'
  ) THEN
    CREATE POLICY checkin_records_select ON public.checkin_records
      FOR SELECT TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_records' AND policyname = 'checkin_records_insert'
  ) THEN
    CREATE POLICY checkin_records_insert ON public.checkin_records
      FOR INSERT TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_records' AND policyname = 'checkin_records_update'
  ) THEN
    CREATE POLICY checkin_records_update ON public.checkin_records
      FOR UPDATE TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_records' AND policyname = 'checkin_records_delete'
  ) THEN
    CREATE POLICY checkin_records_delete ON public.checkin_records
      FOR DELETE TO authenticated
      USING (user_id = auth.uid());
  END IF;
END $$;

-- Daily snapshots: read-only for clients (written by settlement job / service role)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_daily_snapshots' AND policyname = 'checkin_daily_snapshots_select'
  ) THEN
    CREATE POLICY checkin_daily_snapshots_select ON public.checkin_daily_snapshots
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Daily duels: read-only for clients
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_daily_duels' AND policyname = 'checkin_daily_duels_select'
  ) THEN
    CREATE POLICY checkin_daily_duels_select ON public.checkin_daily_duels
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.checkin_daily_snapshots s
          JOIN public.todo_family_members m ON m.id = s.member_id
          WHERE s.snapshot_date = checkin_daily_duels.snapshot_date
            AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Stakes (Phase 1.5)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_stakes' AND policyname = 'checkin_stakes_own'
  ) THEN
    CREATE POLICY checkin_stakes_own ON public.checkin_stakes
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Stake settlements via stake ownership
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_stake_settlements' AND policyname = 'checkin_stake_settlements_own'
  ) THEN
    CREATE POLICY checkin_stake_settlements_own ON public.checkin_stake_settlements
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.checkin_stakes s
          WHERE s.id = stake_id AND s.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.checkin_stakes s
          WHERE s.id = stake_id AND s.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Record comments (Phase 1.5) via record access
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_record_comments' AND policyname = 'checkin_record_comments_family'
  ) THEN
    CREATE POLICY checkin_record_comments_family ON public.checkin_record_comments
      FOR ALL TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.checkin_records r
          WHERE r.id = record_id AND r.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.checkin_records r
          WHERE r.id = record_id AND r.user_id = auth.uid()
        )
        AND EXISTS (
          SELECT 1 FROM public.todo_family_members m
          WHERE m.id = author_member_id AND m.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Health sync log (Phase 2 placeholder)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'checkin_health_sync_log' AND policyname = 'checkin_health_sync_log_own'
  ) THEN
    CREATE POLICY checkin_health_sync_log_own ON public.checkin_health_sync_log
      FOR ALL TO authenticated
      USING (user_id = auth.uid())
      WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_member_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_food_library TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_food_presets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_exercise_presets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_drink_presets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_records TO authenticated;
GRANT SELECT ON public.checkin_daily_snapshots TO authenticated;
GRANT SELECT ON public.checkin_daily_duels TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_stakes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_stake_settlements TO authenticated;
GRANT SELECT ON public.checkin_settlement_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_record_comments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkin_health_sync_log TO authenticated;

-- ---------------------------------------------------------------------------
-- Seed: sample system food library (~10 items; full seed in Task 4)
-- ---------------------------------------------------------------------------

INSERT INTO public.checkin_food_library (
  user_id, name, kcal_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g
)
SELECT v.user_id, v.name, v.kcal_per_100g, v.protein_g_per_100g, v.fat_g_per_100g, v.carbs_g_per_100g
FROM (
  VALUES
    (NULL::uuid, '白米饭', 116::numeric, 2.6::numeric, 0.3::numeric, 25.9::numeric),
    (NULL::uuid, '馒头', 223::numeric, 7.0::numeric, 1.1::numeric, 47.0::numeric),
    (NULL::uuid, '水煮蛋', 144::numeric, 13.3::numeric, 8.8::numeric, 1.1::numeric),
    (NULL::uuid, '鸡胸肉', 133::numeric, 19.4::numeric, 5.0::numeric, 2.5::numeric),
    (NULL::uuid, '西兰花', 34::numeric, 2.8::numeric, 0.4::numeric, 6.6::numeric),
    (NULL::uuid, '苹果', 52::numeric, 0.3::numeric, 0.2::numeric, 13.8::numeric),
    (NULL::uuid, '牛奶', 54::numeric, 3.0::numeric, 3.2::numeric, 4.8::numeric),
    (NULL::uuid, '油条', 386::numeric, 8.0::numeric, 22.0::numeric, 42.0::numeric),
    (NULL::uuid, '红烧肉', 395::numeric, 12.0::numeric, 35.0::numeric, 4.0::numeric),
    (NULL::uuid, '番茄炒蛋', 120::numeric, 6.5::numeric, 8.0::numeric, 5.5::numeric)
) AS v (user_id, name, kcal_per_100g, protein_g_per_100g, fat_g_per_100g, carbs_g_per_100g)
WHERE NOT EXISTS (
  SELECT 1 FROM public.checkin_food_library f
  WHERE f.user_id IS NULL AND f.name = v.name
);
