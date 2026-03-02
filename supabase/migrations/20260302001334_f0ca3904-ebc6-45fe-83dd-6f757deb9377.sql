
-- Drop the overly permissive service role update policy
DROP POLICY IF EXISTS "Service can update exports" ON public.document_exports;

-- Recreate with proper service_role restriction
CREATE POLICY "Service can update exports" ON public.document_exports
  FOR UPDATE
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
