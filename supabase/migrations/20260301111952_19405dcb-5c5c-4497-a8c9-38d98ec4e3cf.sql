
-- Fix 1: Set search_path on function
CREATE OR REPLACE FUNCTION public.trg_protect_approved_evidence()
RETURNS trigger LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE v_immutable boolean;
BEGIN
  SELECT is_immutable INTO v_immutable
  FROM public.document_versions
  WHERE id = coalesce(NEW.document_version_id, OLD.document_version_id);

  IF v_immutable THEN
    RAISE EXCEPTION 'Cannot modify evidence for an approved (immutable) document version' USING ERRCODE = 'P0003';
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

-- Fix 2: Replace overly permissive export update policy with proper scoping
DROP POLICY IF EXISTS "Service can update exports" ON public.document_exports;

-- Only allow updating exports the user created, or if they're a manager
CREATE POLICY "Users can update own exports" ON public.document_exports FOR UPDATE
  USING (created_by = auth.uid() OR public.can_manage_documents(organisation_id));
