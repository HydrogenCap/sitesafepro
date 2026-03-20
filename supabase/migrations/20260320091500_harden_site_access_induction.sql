ALTER TABLE public.site_visits
ADD COLUMN IF NOT EXISTS checkout_token TEXT;

DROP INDEX IF EXISTS public.idx_site_visits_checkout_token;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_visits_checkout_token
ON public.site_visits(checkout_token)
WHERE checkout_token IS NOT NULL;

ALTER TABLE public.site_induction_completions
ADD COLUMN IF NOT EXISTS checked_item_ids TEXT[] DEFAULT '{}';

ALTER TABLE public.site_induction_completions
ALTER COLUMN checked_item_ids
TYPE UUID[]
USING COALESCE(
  ARRAY(
    SELECT item::uuid
    FROM unnest(COALESCE(checked_item_ids, '{}'::text[])) AS item
    WHERE item ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
  ),
  '{}'::uuid[]
);

ALTER TABLE public.site_induction_completions
ALTER COLUMN checked_item_ids SET DEFAULT '{}'::uuid[];

UPDATE public.site_induction_completions
SET checked_item_ids = '{}'::uuid[]
WHERE checked_item_ids IS NULL;

ALTER TABLE public.site_induction_completions
ALTER COLUMN checked_item_ids SET NOT NULL;

COMMENT ON COLUMN public.site_visits.checkout_token IS 'One-time token required for public self check-out';
COMMENT ON COLUMN public.site_induction_completions.checked_item_ids IS 'Checklist item IDs acknowledged during public induction';
