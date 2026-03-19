
-- 1. Add invite_expires_at to client_portal_users for token expiry
ALTER TABLE public.client_portal_users 
  ADD COLUMN IF NOT EXISTS invite_expires_at timestamp with time zone;

-- Set default expiry for existing tokens (7 days from invited_at)
UPDATE public.client_portal_users 
SET invite_expires_at = invited_at + INTERVAL '7 days'
WHERE invite_token IS NOT NULL AND invite_expires_at IS NULL;

-- 2. Replace overly permissive service role policy on document_exports
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Service can update exports" ON public.document_exports;

-- Create a dedicated RPC function for updating export status (restricts which fields can change)
CREATE OR REPLACE FUNCTION public.update_export_status(
  p_export_id uuid,
  p_status text,
  p_storage_path text DEFAULT NULL,
  p_error text DEFAULT NULL,
  p_completed_at timestamptz DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_status NOT IN ('pending', 'processing', 'completed', 'failed') THEN
    RAISE EXCEPTION 'Invalid export status: %', p_status;
  END IF;

  UPDATE public.document_exports
  SET 
    status = p_status,
    storage_path = COALESCE(p_storage_path, storage_path),
    error = COALESCE(p_error, error),
    completed_at = COALESCE(p_completed_at, completed_at)
  WHERE id = p_export_id;
END;
$$;
