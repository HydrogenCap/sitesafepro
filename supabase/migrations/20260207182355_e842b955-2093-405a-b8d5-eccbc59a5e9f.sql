-- Add DELETE policy for projects table
CREATE POLICY "Admins can delete projects"
ON public.projects
FOR DELETE
USING (
  organisation_id IN (
    SELECT organisation_members.organisation_id
    FROM organisation_members
    WHERE organisation_members.profile_id = auth.uid()
      AND organisation_members.role IN ('owner', 'admin')
      AND organisation_members.status = 'active'
  )
);