-- Fix 3: Restrict overly permissive RLS policies to service_role only

-- document_exports: restrict update policy to service_role
DROP POLICY IF EXISTS "Service can update exports" ON public.document_exports;
CREATE POLICY "Service can update exports"
  ON public.document_exports
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- activity_logs: restrict insert policy to service_role  
DROP POLICY IF EXISTS "Service role can insert logs" ON public.activity_logs;
CREATE POLICY "Service role can insert logs"
  ON public.activity_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);