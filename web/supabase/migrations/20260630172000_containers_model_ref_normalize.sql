-- Normalize model_ref values for Everything demo assets.
-- We store model_ref as relative paths (no leading slash, no base prefix).

-- 1) Strip leading slash if present.
UPDATE public.containers
SET model_ref = regexp_replace(model_ref, '^/', '')
WHERE model_ref ~ '^/';

-- 2) Strip accidental `one-piece/` base prefix.
UPDATE public.containers
SET model_ref = regexp_replace(model_ref, '^one-piece/', '')
WHERE model_ref ~ '^one-piece/';

-- 3) Legacy folder rename: `models/` -> `everything-models/`.
UPDATE public.containers
SET model_ref = regexp_replace(model_ref, '^models/', 'everything-models/')
WHERE model_ref ~ '^models/';

