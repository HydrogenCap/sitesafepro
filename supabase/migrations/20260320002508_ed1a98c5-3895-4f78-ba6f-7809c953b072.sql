
-- Finding 1+2: Add checked_items to site_induction_completions and link to site_visits
ALTER TABLE public.site_induction_completions
  ADD COLUMN IF NOT EXISTS checked_item_ids text[] DEFAULT '{}';

-- Finding 3: Add checkout_token to site_visits for secure checkout
ALTER TABLE public.site_visits
  ADD COLUMN IF NOT EXISTS checkout_token text;

-- Create index for checkout token lookup
CREATE INDEX IF NOT EXISTS idx_site_visits_checkout_token ON public.site_visits(checkout_token) WHERE checkout_token IS NOT NULL;
