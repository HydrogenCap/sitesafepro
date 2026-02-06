-- Create storage bucket for project images
INSERT INTO storage.buckets (id, name, public)
VALUES ('project-images', 'project-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images to their organisation folder
CREATE POLICY "Users can upload project images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] IN (
    SELECT o.id::text FROM organisations o
    INNER JOIN organisation_members om ON om.organisation_id = o.id
    WHERE om.profile_id = auth.uid() AND om.status = 'active'
  )
);

-- Allow public read access to project images
CREATE POLICY "Project images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'project-images');

-- Allow users to delete their organisation's project images
CREATE POLICY "Users can delete their project images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'project-images' AND
  (storage.foldername(name))[1] IN (
    SELECT o.id::text FROM organisations o
    INNER JOIN organisation_members om ON om.organisation_id = o.id
    WHERE om.profile_id = auth.uid() AND om.status = 'active'
  )
);