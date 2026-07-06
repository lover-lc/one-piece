-- Containers: per-area sort_order and orphan area_id cleanup

ALTER TABLE public.containers
ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

-- Assign orphan containers to system reserved「未分类」area
UPDATE public.containers c
SET area_id = a.id
FROM public.areas a
WHERE c.area_id IS NULL
  AND a.is_system_reserved = true
  AND a.name = '未分类';

-- Backfill sort_order by name within each area
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY area_id ORDER BY name) - 1 AS rn
  FROM public.containers
)
UPDATE public.containers c
SET sort_order = ranked.rn
FROM ranked
WHERE c.id = ranked.id;

CREATE INDEX IF NOT EXISTS containers_area_sort_idx
  ON public.containers(area_id, sort_order);
