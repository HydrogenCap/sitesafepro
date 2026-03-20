
-- Atomic founding 50 counter increment function
-- Returns the slot number BEFORE increment (0-based), so caller checks < 50
CREATE OR REPLACE FUNCTION public.claim_founding_fifty_slot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_val integer;
BEGIN
  -- Atomically read and increment in a single UPDATE ... RETURNING
  UPDATE app_settings
  SET value = to_jsonb((value::text)::integer + 1),
      updated_at = now()
  WHERE key = 'founding_fifty_count'
  RETURNING (value::text)::integer - 1 INTO current_val;

  -- If row didn't exist, create it
  IF current_val IS NULL THEN
    INSERT INTO app_settings (key, value, updated_at)
    VALUES ('founding_fifty_count', to_jsonb(1), now())
    ON CONFLICT (key) DO UPDATE
    SET value = to_jsonb((app_settings.value::text)::integer + 1),
        updated_at = now()
    RETURNING (value::text)::integer - 1 INTO current_val;
  END IF;

  RETURN COALESCE(current_val, 0);
END;
$$;
