CREATE TABLE public.app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read access (for the banner count)
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read app_settings"
  ON public.app_settings FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service_role can write (edge functions)
CREATE POLICY "Service role can manage app_settings"
  ON public.app_settings FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed the founding fifty counter
INSERT INTO public.app_settings (key, value)
VALUES ('founding_fifty_count', '0'::jsonb);