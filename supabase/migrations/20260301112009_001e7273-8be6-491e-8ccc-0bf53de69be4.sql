
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('evidence', 'evidence', false, 52428800, ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf','application/octet-stream']),
  ('exports', 'exports', false, 209715200, ARRAY['application/pdf']),
  ('signatures', 'signatures', false, 5242880, ARRAY['image/png']),
  ('org-assets', 'org-assets', false, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/svg+xml'])
ON CONFLICT (id) DO NOTHING;

-- Evidence bucket policies
CREATE POLICY "evidence_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL AND public.is_org_member_current((string_to_array(name, '/'))[2]::uuid));

CREATE POLICY "evidence_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidence' AND auth.uid() IS NOT NULL AND public.can_manage_documents((string_to_array(name, '/'))[2]::uuid));

CREATE POLICY "evidence_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'evidence' AND auth.uid() IS NOT NULL AND public.can_manage_documents((string_to_array(name, '/'))[2]::uuid));

-- Exports bucket policies (read by managers, write by service role only via edge function)
CREATE POLICY "exports_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'exports' AND auth.uid() IS NOT NULL AND public.can_manage_documents((string_to_array(name, '/'))[2]::uuid));

CREATE POLICY "exports_service_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'exports' AND (auth.role() = 'service_role' OR public.can_manage_documents((string_to_array(name, '/'))[2]::uuid)));

-- Signatures bucket policies
CREATE POLICY "signatures_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'signatures' AND auth.uid() IS NOT NULL AND public.is_org_member_current((string_to_array(name, '/'))[2]::uuid));

CREATE POLICY "signatures_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'signatures' AND auth.uid() IS NOT NULL AND public.is_org_member_current((string_to_array(name, '/'))[2]::uuid));

-- Org-assets bucket policies
CREATE POLICY "org_assets_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'org-assets' AND auth.uid() IS NOT NULL AND public.is_org_member_current((string_to_array(name, '/'))[2]::uuid));

CREATE POLICY "org_assets_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'org-assets' AND auth.uid() IS NOT NULL AND public.is_org_admin(auth.uid(), (string_to_array(name, '/'))[2]::uuid));
