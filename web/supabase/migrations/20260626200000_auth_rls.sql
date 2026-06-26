-- Restrict data access to authenticated users; revoke anon table access.
-- Run after creating household user in Supabase Dashboard (Auth).

-- ---------------------------------------------------------------------------
-- Drop open anon policies
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS areas_anon_all ON public.areas;
DROP POLICY IF EXISTS categories_anon_all ON public.categories;
DROP POLICY IF EXISTS items_anon_all ON public.items;
DROP POLICY IF EXISTS units_anon_all ON public.units;

-- ---------------------------------------------------------------------------
-- Authenticated-only policies (household shared data, no user_id)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'areas' AND policyname = 'areas_auth_all'
  ) THEN
    CREATE POLICY areas_auth_all ON public.areas
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'categories' AND policyname = 'categories_auth_all'
  ) THEN
    CREATE POLICY categories_auth_all ON public.categories
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'items' AND policyname = 'items_auth_all'
  ) THEN
    CREATE POLICY items_auth_all ON public.items
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'units' AND policyname = 'units_auth_all'
  ) THEN
    CREATE POLICY units_auth_all ON public.units
      FOR ALL
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Revoke anon direct table access
-- ---------------------------------------------------------------------------

REVOKE ALL ON public.areas FROM anon;
REVOKE ALL ON public.categories FROM anon;
REVOKE ALL ON public.items FROM anon;
REVOKE ALL ON public.units FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.areas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.units TO authenticated;

-- ---------------------------------------------------------------------------
-- Protect system-reserved rows at DB level
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.block_system_reserved_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' AND OLD.is_system_reserved THEN
    RAISE EXCEPTION 'system_reserved_delete_blocked';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_system_reserved THEN
    IF NEW.name IS DISTINCT FROM OLD.name
      OR NEW.is_system_reserved IS DISTINCT FROM OLD.is_system_reserved THEN
      RAISE EXCEPTION 'system_reserved_update_blocked';
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS areas_block_system_reserved ON public.areas;
CREATE TRIGGER areas_block_system_reserved
  BEFORE UPDATE OR DELETE ON public.areas
  FOR EACH ROW
  EXECUTE FUNCTION public.block_system_reserved_mutation();

DROP TRIGGER IF EXISTS categories_block_system_reserved ON public.categories;
CREATE TRIGGER categories_block_system_reserved
  BEFORE UPDATE OR DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.block_system_reserved_mutation();

DROP TRIGGER IF EXISTS units_block_system_reserved ON public.units;
CREATE TRIGGER units_block_system_reserved
  BEFORE UPDATE OR DELETE ON public.units
  FOR EACH ROW
  EXECUTE FUNCTION public.block_system_reserved_mutation();
