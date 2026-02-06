-- Drop the overly permissive policy - service role bypasses RLS anyway
DROP POLICY IF EXISTS "Service role can insert logs" ON public.activity_logs;