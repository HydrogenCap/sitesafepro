-- Allow active client portal users to read document files for projects they can access
CREATE POLICY "Client users can read document storage"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'documents'
  AND EXISTS (
    SELECT 1
    FROM public.client_portal_users cpu
    JOIN public.documents d
      ON d.file_path = name
     AND d.organisation_id = cpu.organisation_id
    WHERE cpu.profile_id = auth.uid()
      AND cpu.is_active = true
      AND cpu.can_view_documents = true
      AND cpu.organisation_id::text = (storage.foldername(name))[1]
      AND (
        array_length(cpu.project_ids, 1) IS NULL
        OR d.project_id IS NULL
        OR d.project_id = ANY(cpu.project_ids)
      )
  )
);

-- Prefer the newest accepted client portal record if legacy duplicates exist
CREATE OR REPLACE FUNCTION public.get_client_org_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organisation_id
  FROM public.client_portal_users
  WHERE profile_id = _user_id
    AND is_active = true
  ORDER BY accepted_at DESC NULLS LAST, created_at DESC
  LIMIT 1
$$;
