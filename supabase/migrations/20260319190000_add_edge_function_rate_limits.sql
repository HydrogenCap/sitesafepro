CREATE TABLE IF NOT EXISTS public.function_rate_limits (
  rate_key text NOT NULL,
  window_start timestamptz NOT NULL,
  request_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rate_key, window_start)
);

ALTER TABLE public.function_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage function rate limits" ON public.function_rate_limits;
CREATE POLICY "Service role can manage function rate limits"
ON public.function_rate_limits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.consume_rate_limit(
  p_rate_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS TABLE (
  allowed boolean,
  remaining integer,
  retry_after_seconds integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start timestamptz;
  v_request_count integer;
  v_retry_after integer;
BEGIN
  IF p_rate_key IS NULL OR length(trim(p_rate_key)) = 0 THEN
    RAISE EXCEPTION 'p_rate_key is required';
  END IF;

  IF p_limit <= 0 THEN
    RAISE EXCEPTION 'p_limit must be greater than zero';
  END IF;

  IF p_window_seconds <= 0 THEN
    RAISE EXCEPTION 'p_window_seconds must be greater than zero';
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds
  );

  INSERT INTO public.function_rate_limits (rate_key, window_start, request_count)
  VALUES (p_rate_key, v_window_start, 1)
  ON CONFLICT (rate_key, window_start)
  DO UPDATE
    SET request_count = public.function_rate_limits.request_count + 1,
        updated_at = now()
  RETURNING request_count INTO v_request_count;

  v_retry_after := GREATEST(
    1,
    CEIL(
      EXTRACT(
        epoch FROM (
          v_window_start + make_interval(secs => p_window_seconds) - now()
        )
      )
    )::integer
  );

  RETURN QUERY
  SELECT
    v_request_count <= p_limit,
    GREATEST(p_limit - v_request_count, 0),
    CASE
      WHEN v_request_count <= p_limit THEN 0
      ELSE v_retry_after
    END;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_rate_limit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, integer, integer) TO service_role;
