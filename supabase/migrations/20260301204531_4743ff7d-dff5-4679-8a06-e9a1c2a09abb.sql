-- Add attendance_token column to toolbox_talks for QR-code-based public attendance
ALTER TABLE public.toolbox_talks
  ADD COLUMN IF NOT EXISTS attendance_token TEXT UNIQUE;

-- Auto-generate token on insert via trigger
CREATE OR REPLACE FUNCTION public.generate_attendance_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.attendance_token IS NULL THEN
    NEW.attendance_token := replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_attendance_token
  BEFORE INSERT ON public.toolbox_talks
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_attendance_token();

-- Backfill existing talks with tokens
UPDATE public.toolbox_talks
  SET attendance_token = replace(replace(encode(gen_random_bytes(24), 'base64'), '+', '-'), '/', '_')
  WHERE attendance_token IS NULL;