
-- Create compliance-docs storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('compliance-docs', 'compliance-docs', false);

-- RLS: org members can upload
CREATE POLICY "Org members can upload compliance docs"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'compliance-docs'
  AND public.is_org_member_current(
    (string_to_array(name, '/'))[1]::uuid
  )
);

-- RLS: org members can read
CREATE POLICY "Org members can read compliance docs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'compliance-docs'
  AND public.is_org_member_current(
    (string_to_array(name, '/'))[1]::uuid
  )
);

-- RLS: org members can delete
CREATE POLICY "Org members can delete compliance docs"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'compliance-docs'
  AND public.is_org_member_current(
    (string_to_array(name, '/'))[1]::uuid
  )
);
