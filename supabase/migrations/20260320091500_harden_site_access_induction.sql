ALTER TABLE public.site_visits
ADD COLUMN IF NOT EXISTS checkout_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_visits_checkout_token
ON public.site_visits(checkout_token)
WHERE checkout_token IS NOT NULL;

ALTER TABLE public.site_induction_completions
ADD COLUMN IF NOT EXISTS checked_item_ids UUID[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.site_visits.checkout_token IS 'One-time token required for public self check-out';
COMMENT ON COLUMN public.site_induction_completions.checked_item_ids IS 'Checklist item IDs acknowledged during public induction';
